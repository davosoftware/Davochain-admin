'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError, isRedirect } from '@/lib/api';
import { setToken } from '@/lib/session';
import type { AdminInvite, AdminProfile, AdminRole, AdminSessionRow } from '@/lib/types-admin';

const message = (err: unknown, fallback: string) =>
  err instanceof ApiError ? err.message : fallback;

export async function updateProfile(input: {
  name?: string;
  email?: string;
  currentPassword?: string;
}): Promise<{ profile?: AdminProfile; error?: string }> {
  try {
    const profile = await api<AdminProfile>('/v1/admin/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    revalidatePath('/settings');
    revalidatePath('/', 'layout');
    return { profile };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not save your profile') };
  }
}

/**
 * Swaps the session cookie for the replacement token.
 *
 * The API revokes every token issued before the change — including the one in
 * this browser. Without storing the replacement the admin would be signed out
 * by their own password change, which reads as a bug however correct it is.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ ok?: true; error?: string }> {
  try {
    const { accessToken } = await api<{ accessToken: string }>('/v1/admin/me/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    await setToken(accessToken);
    revalidatePath('/settings');
    return { ok: true };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not change your password') };
  }
}

export async function setAvatar(dataUrl: string): Promise<{ profile?: AdminProfile; error?: string }> {
  try {
    const profile = await api<AdminProfile>('/v1/admin/me/avatar', {
      method: 'PUT',
      body: JSON.stringify({ dataUrl }),
    });
    revalidatePath('/settings');
    revalidatePath('/', 'layout');
    return { profile };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not save that picture') };
  }
}

export async function removeAvatar(): Promise<{ profile?: AdminProfile; error?: string }> {
  try {
    const profile = await api<AdminProfile>('/v1/admin/me/avatar', { method: 'DELETE' });
    revalidatePath('/settings');
    revalidatePath('/', 'layout');
    return { profile };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not remove that picture') };
  }
}

/**
 * Add someone to the team.
 *
 * Returns where the invitation went, not a password — none is generated any
 * more. A generated password has to travel to its owner somehow, and every
 * route it can take leaves a live credential sitting somewhere readable.
 */
export async function addAdmin(input: {
  email: string;
  name: string;
  role: AdminRole;
  permissions: string[];
}): Promise<{ admin?: AdminProfile; invite?: AdminInvite; error?: string }> {
  try {
    const created = await api<{ admin: AdminProfile; invite: AdminInvite }>('/v1/admin/admins', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/settings');
    return created;
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not add that admin') };
  }
}

/** For a link that expired before somebody got round to using it. */
export async function resendInvite(
  id: string,
): Promise<{ invite?: AdminInvite; error?: string }> {
  try {
    const invite = await api<AdminInvite>(`/v1/admin/admins/${id}/invite`, { method: 'POST' });
    revalidatePath('/settings');
    return { invite };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not send the invitation') };
  }
}

export async function setAdminActive(
  id: string,
  isActive: boolean,
): Promise<{ ok?: true; error?: string }> {
  try {
    await api(`/v1/admin/admins/${id}/${isActive ? 'reactivate' : 'deactivate'}`, {
      method: 'POST',
    });
    revalidatePath('/settings');
    return { ok: true };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not change that account') };
  }
}

export async function setPermissions(
  id: string,
  permissions: string[],
): Promise<{ admin?: AdminProfile; error?: string }> {
  try {
    const admin = await api<AdminProfile>(`/v1/admin/admins/${id}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    });
    revalidatePath('/settings');
    // The nav is built from permissions, so it has to be rebuilt too.
    revalidatePath('/', 'layout');
    return { admin };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not save those permissions') };
  }
}

export async function setRole(
  id: string,
  role: AdminRole,
): Promise<{ admin?: AdminProfile; error?: string }> {
  try {
    const admin = await api<AdminProfile>(`/v1/admin/admins/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
    revalidatePath('/settings');
    revalidatePath('/', 'layout');
    return { admin };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not change that role') };
  }
}

export async function loadSessions(): Promise<{ sessions?: AdminSessionRow[]; error?: string }> {
  try {
    return { sessions: await api<AdminSessionRow[]>('/v1/admin/me/sessions') };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not load your sessions') };
  }
}

export async function endOtherSessions(): Promise<{ ended?: number; error?: string }> {
  try {
    const result = await api<{ ended: number }>('/v1/admin/me/sessions/end-others', {
      method: 'POST',
    });
    revalidatePath('/settings');
    return result;
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not end those sessions') };
  }
}
