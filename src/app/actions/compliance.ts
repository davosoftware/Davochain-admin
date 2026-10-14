'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError, isRedirect } from '@/lib/api';

type Result = { ok?: true; status?: string; error?: string };

async function post(id: string, step: string, body: unknown, fallback: string): Promise<Result> {
  try {
    const r = await api<{ status?: string; rescreenCount?: number }>(`/v1/admin/compliance/cases/${encodeURIComponent(id)}/${step}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    revalidatePath('/compliance');
    revalidatePath(`/compliance/${id}`);
    return { ok: true, status: r.status };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: err instanceof ApiError ? err.message : fallback };
  }
}

export async function decideCase(
  id: string,
  body: { decision: string; reason: string; reportedToAuthority?: boolean; reportReference?: string; reportedAt?: string },
): Promise<Result> {
  return post(id, 'decide', body, 'Could not save the decision');
}

export async function confirmCase(id: string, confirm: boolean, reason: string): Promise<Result> {
  return post(id, 'confirm', { confirm, reason }, 'Could not save the confirmation');
}

export async function withdrawProposal(id: string, reason: string): Promise<Result> {
  return post(id, 'withdraw', { reason }, 'Could not withdraw the proposal');
}

export async function rescreenCase(id: string, reason: string): Promise<Result> {
  return post(id, 'rescreen', { reason }, 'Could not start the re-screen');
}
