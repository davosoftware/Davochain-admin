'use server';

import { api, ApiError, isRedirect } from '@/lib/api';
import type { EarningRow } from '@/lib/types-admin';

const message = (err: unknown, fallback: string) =>
  err instanceof ApiError ? err.message : fallback;

/**
 * One CSV cell.
 *
 * Quoted always, so a comma in somebody's name cannot shift every column after
 * it by one. The leading apostrophe is not decoration: a cell beginning =, +,
 * -, @, tab or carriage return is run as a FORMULA by Excel and Sheets, and
 * these cells hold names and email addresses that users chose. `=cmd|...` in a
 * display name would otherwise become a live command in the finance team's
 * spreadsheet, so the value is forced to be text before it can be read as code.
 */
function cell(value: string | number): string {
  const text = String(value ?? '');
  const escaped = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${escaped.replace(/"/g, '""')}"`;
}

const HEADERS = [
  'S/No.',
  'Transaction ID',
  'Full Name',
  'Email',
  'Amount',
  'Total Amount',
  'Fee',
  'Charged in',
  'Transaction Type',
  'Earned from',
  'Assets',
  'Created On',
];

const TYPE_LABEL: Record<string, string> = {
  BUY: 'Buy crypto',
  SELL: 'Sell crypto',
  SWAP: 'Coin swap',
  WITHDRAWAL: 'Withdrawal',
};

const KIND_LABEL: Record<string, string> = {
  RATE: 'Buy & sell rate fee',
  SWAP: 'Swap fee',
  WITHDRAWAL: 'Crypto withdrawal fee',
  NGN_WITHDRAWAL: 'Naira withdrawal fee',
};

/**
 * Every earning matching the current filters, as a spreadsheet.
 *
 * Built here rather than in the browser because the whole matching set has to
 * be fetched with the admin's token, which never leaves the server. The client
 * receives finished text and saves it.
 *
 * Amounts go out unformatted — plain decimals with no thousands separators and
 * no currency symbol — because a spreadsheet has to be able to add them up.
 * The currency lives in its own column instead, which is also the only honest
 * way to ship naira and dollars in one file.
 */
export async function exportEarnings(
  search: string,
): Promise<{ csv?: string; filename?: string; rows?: number; truncated?: boolean; error?: string }> {
  try {
    const params = new URLSearchParams(search);
    // Paging is meaningless for an export and the endpoint rejects nothing it
    // does not know, so only the filters are forwarded.
    params.delete('page');
    params.delete('pageSize');

    const result = await api<{ rows: EarningRow[]; truncated: boolean }>(
      `/v1/admin/earnings/export?${params}`,
    );

    const lines = [
      HEADERS.map(cell).join(','),
      ...result.rows.map((r, i) =>
        [
          i + 1,
          r.reference,
          r.name,
          r.email,
          r.amount,
          r.total,
          r.fee,
          r.currency,
          TYPE_LABEL[r.type] ?? r.type,
          KIND_LABEL[r.kind] ?? r.kind,
          [r.fromAsset, r.toAsset].filter(Boolean).join(' to ').toUpperCase(),
          new Date(r.createdAt).toISOString(),
        ]
          .map(cell)
          .join(','),
      ),
    ];

    const stamp = new Date().toISOString().slice(0, 10);
    return {
      // CRLF, which is what RFC 4180 says and what Excel is happiest with.
      csv: lines.join('\r\n'),
      filename: `davochain-earnings-${stamp}.csv`,
      rows: result.rows.length,
      truncated: result.truncated,
    };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not export those earnings') };
  }
}
