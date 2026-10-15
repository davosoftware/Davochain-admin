/** GET /v1/admin/levels — what None, Basic and Advanced may do (level policy spec §6.1). */
export type PolicyLevel = 'NONE' | 'BASIC' | 'ADVANCED';
export type LimitCurrency = 'NGN' | 'USD';

export interface LevelRuleView {
  level: string;
  action: string;
  allowed: boolean;
  currency: string;
  /** null = no limit. */
  minPerTx: string | null;
  maxPerTx: string | null;
  maxPerDay: string | null;
}

export interface LevelCooloffView {
  level: string;
  afterSignupHours: number;
  afterCredentialChangeHours: number;
  afterNewPayeeHours: number;
}

export interface LevelsView {
  actions: Array<{ action: string; label: string; unit: string }>;
  rules: LevelRuleView[];
  cooloffs: LevelCooloffView[];
  platform: { tradingMaxPerDay: string | null; currency: string };
}

export const LEVELS: Array<{ level: PolicyLevel; title: string }> = [
  { level: 'NONE', title: 'None' },
  { level: 'BASIC', title: 'Basic' },
  { level: 'ADVANCED', title: 'Advanced' },
];

const titleOf = (level: string) => LEVELS.find((l) => l.level === level)?.title ?? level;
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const blank = (v: string | null | undefined) => v == null || v.trim() === '';
const AMOUNT = /^\d+(\.\d+)?$/;

/** ₦1,000,000 or $5,000; "No limit" for nothing. Read by a person, not parsed. */
export function money(value: string | null, currency: string): string {
  if (blank(value)) return 'No limit';
  const n = Number(value);
  return currency === 'USD'
    ? '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 })
    : '₦' + n.toLocaleString('en-NG', { maximumFractionDigits: 2 });
}

/** The same rules, in the same words, as the API (level-admin.service.ts). */
export function fieldError(rule: Pick<LevelRuleView, 'minPerTx' | 'maxPerTx' | 'maxPerDay'>): string | null {
  const nums = [rule.minPerTx, rule.maxPerTx, rule.maxPerDay];
  if (nums.some((n) => !blank(n) && n!.trim().startsWith('-'))) return 'Amounts cannot be negative.';
  if (nums.some((n) => !blank(n) && !AMOUNT.test(n!.trim()))) return 'Enter a plain number, e.g. 50000 or 50000.50.';
  const [min, max, day] = nums.map((n) => (blank(n) ? null : Number(n)));
  if (min != null && max != null && min > max) return 'The minimum is above the maximum per transaction.';
  if (max != null && day != null && max > day) return 'The maximum per transaction is above the daily maximum.';
  return null;
}

/** What a save would change, one line each, for the review dialog. Empty = nothing changed. */
export function changeSummary(before: LevelsView, after: LevelsView): string[] {
  const lines: string[] = [];
  const labelOf = (action: string) => capital(after.actions.find((a) => a.action === action)?.label ?? action);

  for (const r of after.rules) {
    const b = before.rules.find((x) => x.level === r.level && x.action === r.action);
    const where = `${titleOf(r.level)} · ${labelOf(r.action)}`;
    const was: Pick<LevelRuleView, 'allowed' | 'currency' | 'minPerTx' | 'maxPerTx' | 'maxPerDay'> = b ?? { allowed: false, currency: r.currency, minPerTx: null, maxPerTx: null, maxPerDay: null };
    if (was.allowed !== r.allowed) lines.push(`${where} · Allowed: ${was.allowed ? 'Yes' : 'No'} → ${r.allowed ? 'Yes' : 'No'}`);
    if (was.currency !== r.currency) lines.push(`${where} · Currency: ${was.currency} → ${r.currency}`);
    const fields: Array<['minPerTx' | 'maxPerTx' | 'maxPerDay', string]> = [
      ['minPerTx', 'Min per transaction'],
      ['maxPerTx', 'Max per transaction'],
      ['maxPerDay', 'Max per day'],
    ];
    for (const [key, name] of fields) {
      const from = money(was[key], was.currency);
      const to = money(r[key], r.currency);
      if (from !== to) lines.push(`${where} · ${name}: ${from} → ${to}`);
    }
  }

  for (const c of after.cooloffs) {
    const b = before.cooloffs.find((x) => x.level === c.level);
    const hours: Array<[keyof LevelCooloffView, string]> = [
      ['afterSignupHours', 'After sign-up (hours)'],
      ['afterCredentialChangeHours', 'After password/email change (hours)'],
      ['afterNewPayeeHours', 'After new address/bank (hours)'],
    ];
    for (const [key, name] of hours) {
      const from = b ? b[key] : 0;
      if (from !== c[key]) lines.push(`${titleOf(c.level)} · Cool-offs · ${name}: ${from} → ${c[key]}`);
    }
  }

  const p0 = before.platform;
  const p1 = after.platform;
  if (p0.currency !== p1.currency) lines.push(`Platform · Currency: ${p0.currency} → ${p1.currency}`);
  const from = money(p0.tradingMaxPerDay, p0.currency);
  const to = money(p1.tradingMaxPerDay, p1.currency);
  if (from !== to) lines.push(`Platform · Max trading per day: ${from} → ${to}`);
  return lines;
}
