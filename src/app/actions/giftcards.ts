'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError, isRedirect } from '@/lib/api';
import type { GiftCardTradeDetail } from '@/lib/types-admin';

const message = (err: unknown, fallback: string) =>
  err instanceof ApiError ? err.message : fallback;

/** Every gift card screen, so a change on one is seen on the others. */
function refreshAll() {
  revalidatePath('/giftcards/categories');
  revalidatePath('/giftcards/brands');
  revalidatePath('/giftcards/types');
  revalidatePath('/giftcards/trades');
}

type Result<T> = { data?: T; error?: string };

async function send<T>(path: string, method: string, body?: unknown): Promise<Result<T>> {
  try {
    const data = await api<T>(path, {
      method,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    refreshAll();
    return { data };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'That did not save') };
  }
}

// ── catalogue ─────────────────────────────────────────────────

export async function saveCategory(input: { id?: string; name: string; isActive?: boolean }) {
  return send<{ id: string; name: string }>('/v1/admin/giftcards/categories', 'PUT', input);
}

export async function deleteCategory(id: string) {
  return send<{ deleted: true }>(`/v1/admin/giftcards/categories/${id}`, 'DELETE');
}

/**
 * `image` is a data URL. Omitting it leaves an existing logo alone, which is
 * what makes renaming a brand not also wipe its picture.
 */
export async function saveBrand(input: {
  id?: string;
  name: string;
  categoryId: string;
  image?: string;
  isActive?: boolean;
}) {
  return send<{ id: string; name: string }>('/v1/admin/giftcards/brands', 'PUT', input);
}

export async function deleteBrand(id: string) {
  return send<{ deleted: true }>(`/v1/admin/giftcards/brands/${id}`, 'DELETE');
}

export async function saveType(input: {
  id?: string;
  brandId: string;
  name: string;
  currency: string;
  minAmount: string;
  maxAmount: string;
  rateNgn: string;
  isActive?: boolean;
}) {
  return send<{ id: string }>('/v1/admin/giftcards/types', 'PUT', input);
}

export async function deleteType(id: string) {
  return send<{ deleted: true }>(`/v1/admin/giftcards/types/${id}`, 'DELETE');
}

// ── the queue ─────────────────────────────────────────────────

/** The only call that decrypts a voucher code. Reading one is audited. */
export async function loadTrade(id: string) {
  return send<GiftCardTradeDetail>(`/v1/admin/giftcards/trades/${id}`, 'GET');
}

/**
 * Accept a card in full.
 *
 * `actualRateNgn` is what the desk cleared it at. The user is paid at the rate
 * they were quoted whatever this is; the difference is the margin.
 */
export async function approveTrade(id: string, actualRateNgn: string) {
  return send<GiftCardTradeDetail>(`/v1/admin/giftcards/trades/${id}/approve`, 'POST', {
    actualRateNgn,
  });
}

/** Accept a card for less than was claimed. The reason is shown to the user. */
export async function partiallyApproveTrade(
  id: string,
  input: {
    approvedValue: string;
    approvedRateNgn: string;
    actualRateNgn: string;
    reason: string;
  },
) {
  return send<GiftCardTradeDetail>(`/v1/admin/giftcards/trades/${id}/partial`, 'POST', input);
}

/** Refuse a card. Nothing moves; the user is told why. */
export async function rejectTrade(id: string, reason: string) {
  return send<GiftCardTradeDetail>(`/v1/admin/giftcards/trades/${id}/reject`, 'POST', { reason });
}
