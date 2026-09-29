'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError, isRedirect } from '@/lib/api';
import type { TxRow } from '@/lib/types-admin';

const message = (err: unknown, fallback: string) =>
  err instanceof ApiError ? err.message : fallback;

/**
 * Credit a naira deposit that was held over the depositor's tier limit.
 *
 * The API is the thing that decides whether this is allowed — it re-checks the
 * status inside a serializable write, so two admins clicking at once credit the
 * balance once and the second is told so.
 */
export async function releaseDeposit(id: string): Promise<{ row?: TxRow; error?: string }> {
  try {
    const row = await api<TxRow>(`/v1/admin/transactions/${id}/release`, { method: 'POST' });
    revalidatePath('/transactions');
    return { row };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not release that deposit') };
  }
}

/** Refuse a held naira deposit. No money moves; the user is told the reason. */
export async function rejectDeposit(
  id: string,
  reason: string,
): Promise<{ row?: TxRow; error?: string }> {
  try {
    const row = await api<TxRow>(`/v1/admin/transactions/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    revalidatePath('/transactions');
    return { row };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not reject that deposit') };
  }
}

/**
 * One CSV cell.
 *
 * Quoted always, so a comma in somebody's name cannot shift every column after
 * it. The leading apostrophe is not decoration: a cell beginning =, +, -, @,
 * tab or carriage return is run as a FORMULA by Excel and Sheets, and these
 * cells hold names and email addresses that users chose for themselves.
 */
function cell(value: string | number | null): string {
  const text = String(value ?? '');
  const escaped = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${escaped.replace(/"/g, '""')}"`;
}

const HEADERS = [
  'S/No.',
  'Full Name',
  'Email',
  'Transaction ID',
  'Total Amount',
  'Amount',
  'Fee',
  'Currency',
  'Transaction Type',
  'Amount Type',
  'Mode of payment',
  'Assets',
  'Status',
  'Created On',
  'Completed On',
  'Reason',
];

const TYPE_LABEL: Record<string, string> = {
  BUY: 'Buy crypto',
  SELL: 'Sell crypto',
  SWAP: 'Coin swap',
  DEPOSIT: 'Deposit',
  WITHDRAWAL: 'Withdrawal',
  FEE_CLAIM: 'Fee claim',
  INTERNAL: 'Internal',
};

/**
 * Every transaction matching the current filters, as a spreadsheet.
 *
 * Built on the server because the whole matching set is fetched with the
 * admin's token, which never reaches the browser. Amounts go out as plain
 * decimals with the currency in its own column, so a spreadsheet can total
 * them — which is also the only honest way to ship naira, dollars and eight
 * different coins in one file.
 */
export async function exportTransactions(
  search: string,
): Promise<{ csv?: string; filename?: string; rows?: number; truncated?: boolean; error?: string }> {
  try {
    const params = new URLSearchParams(search);
    params.delete('page');
    params.delete('pageSize');

    const result = await api<{ rows: TxRow[]; truncated: boolean }>(
      `/v1/admin/transactions/manager/export?${params}`,
    );

    const lines = [
      HEADERS.map(cell).join(','),
      ...result.rows.map((r, i) =>
        [
          i + 1,
          r.name,
          r.email,
          r.reference,
          r.total,
          r.amount,
          r.fee,
          r.unit,
          TYPE_LABEL[r.type] ?? r.type,
          r.amountType,
          r.modeLabel,
          [r.fromAsset, r.toAsset].filter(Boolean).join(' to ').toUpperCase(),
          r.status,
          new Date(r.createdAt).toISOString(),
          r.completedAt ? new Date(r.completedAt).toISOString() : '',
          r.failureReason ?? '',
        ]
          .map(cell)
          .join(','),
      ),
    ];

    const stamp = new Date().toISOString().slice(0, 10);
    return {
      // CRLF, which is what RFC 4180 says and what Excel is happiest with.
      csv: lines.join('\r\n'),
      filename: `davochain-transactions-${stamp}.csv`,
      rows: result.rows.length,
      truncated: result.truncated,
    };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not export those transactions') };
  }
}
