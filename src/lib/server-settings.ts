/** One row of System → Server settings, as GET /v1/admin/server-settings sends it. */
export interface ServerSetting {
  key: string;
  group: string;
  label: string;
  help: string;
  /** boolean | int | decimal | duration | string | account | timezone | asset */
  kind: string;
  unit: string | null;
  min: number | null;
  max: number | null;
  value: unknown;
  /** 'dashboard': saved on this screen. 'server': the value in the server's .env file. */
  source: 'dashboard' | 'server';
  serverDefault: unknown;
  /** false: takes effect when the API next restarts. */
  live: boolean;
  /** Money-related: every owner is emailed when it changes. */
  money: boolean;
}

export interface ServerSettingsView {
  owner: boolean;
  settings: ServerSetting[];
}

/** What the owner types to confirm signing every customer out. */
export const SIGN_OUT_PHRASE = 'SIGN OUT ALL';

/** Settings by group, groups in the order the API lists them. */
export function groupSettings(settings: ServerSetting[]): { name: string; settings: ServerSetting[] }[] {
  const groups: { name: string; settings: ServerSetting[] }[] = [];
  for (const s of settings) {
    let g = groups.find((x) => x.name === s.group);
    if (!g) groups.push((g = { name: s.group, settings: [] }));
    g.settings.push(s);
  }
  return groups;
}

/** A value in plain words: On/Off, a number with its unit, "(empty)" or "Not set". */
export function displayValue(s: Pick<ServerSetting, 'kind' | 'unit' | 'value'>): string {
  const v = s.value;
  if (v === null || v === undefined) return 'Not set';
  if (s.kind === 'boolean') return v === true || v === 'true' ? 'On' : 'Off';
  const text = String(v);
  if (text === '') return '(empty)';
  return s.unit ? `${text} ${s.unit}` : text;
}

/**
 * Turns what was typed into the value to send, or a message to show. The API
 * checks again (and more: Payrep accounts, coins, time zones); this only saves
 * a round trip for the obvious mistakes.
 */
export function parseSettingInput(
  s: Pick<ServerSetting, 'kind' | 'min' | 'max'>,
  raw: string | boolean,
): { value?: unknown; error?: string } {
  if (s.kind === 'boolean') return { value: raw === true || raw === 'true' };
  const text = String(raw).trim();
  if (s.kind === 'int' || s.kind === 'decimal') {
    const n = Number(text);
    if (text === '' || !Number.isFinite(n)) {
      return { error: s.kind === 'int' ? 'Enter a whole number.' : 'Enter a number.' };
    }
    if (s.kind === 'int' && !Number.isInteger(n)) return { error: 'Enter a whole number.' };
    if ((s.min !== null && n < s.min) || (s.max !== null && n > s.max)) {
      return { error: `Enter a number between ${s.min ?? '…'} and ${s.max ?? '…'}.` };
    }
    return { value: n };
  }
  return { value: text };
}

/** The API wants a reason of at least 10 characters for every change. */
export function reasonProblem(reason: string): string | null {
  return reason.trim().length >= 10 ? null : 'Say why, in at least 10 characters. It is kept in the audit log.';
}
