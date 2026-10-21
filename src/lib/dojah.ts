/** Dojah screen helpers: plain words for the checks and the settings (pure, tested). */

export type DojahSettingKey =
  | 'minBalance'
  | 'lowBalanceWarn'
  | 'dailyAttempts'
  | 'totalAttempts'
  | 'basicEnabled'
  | 'advancedEnabled'
  | 'advancedDailyAttempts'
  | 'advancedTotalAttempts'
  | 'livenessMin'
  | 'faceMatchPass'
  | 'faceMatchReview'
  | 'addressRecencyMonths';

export interface DojahSettings {
  minBalance: number;
  lowBalanceWarn: number | null;
  dailyAttempts: number;
  totalAttempts: number;
  basicEnabled: boolean;
  /** Advanced checks (spec 2026-10-21). Older API builds leave these out. */
  advancedEnabled?: boolean;
  advancedDailyAttempts?: number;
  advancedTotalAttempts?: number;
  livenessMin?: number;
  faceMatchPass?: number;
  faceMatchReview?: number;
  addressRecencyMonths?: number;
  source: Record<DojahSettingKey, 'screen' | 'server'>;
}

/** null = go back to the server default. */
export type DojahSettingsPatch = Partial<Record<'minBalance' | 'lowBalanceWarn' | 'dailyAttempts' | 'totalAttempts', number | null>>;

/** The Advanced numbers an owner can change. null = back to the default. */
export type AdvancedSettingsPatch = Partial<
  Record<'advancedDailyAttempts' | 'advancedTotalAttempts' | 'livenessMin' | 'faceMatchPass' | 'faceMatchReview' | 'addressRecencyMonths', number | null>
>;

/** What each check means. The API sends what to do about a failing one (`fix`). */
export const CHECK_TEXT: Record<string, { title: string; meaning: string }> = {
  mode: { title: 'Live or test mode', meaning: 'The live server must talk to the real Dojah, not the test copy.' },
  credentials: { title: 'Dojah keys', meaning: 'Our Dojah App ID and secret key are saved, so we can call Dojah.' },
  keysAndIp: { title: 'Dojah accepts us', meaning: "Dojah accepted our keys and this server's internet address." },
  wallet: { title: 'Dojah wallet', meaning: 'There is enough money in our Dojah wallet to pay for checks.' },
  recipients: { title: 'Someone gets the alerts', meaning: 'At least one person is emailed when something goes wrong with Dojah or a screening.' },
};

const LABEL: Record<keyof DojahSettingsPatch, string> = {
  minBalance: 'Hard stop',
  lowBalanceWarn: 'Warning level',
  dailyAttempts: 'Tries per day',
  totalAttempts: 'Tries in total',
};

const naira = (n: number) => '₦' + n.toLocaleString('en-NG');

function show(key: keyof DojahSettingsPatch, v: number | null): string {
  if (v === null) return 'not set';
  return key === 'minBalance' || key === 'lowBalanceWarn' ? naira(v) : String(v);
}

/** One line per change, for the confirm box before saving. Empty = nothing changed. */
export function settingsChanges(current: DojahSettings, patch: DojahSettingsPatch): string[] {
  const lines: string[] = [];
  for (const key of Object.keys(LABEL) as Array<keyof DojahSettingsPatch>) {
    if (!(key in patch)) continue;
    const next = patch[key];
    const was = current[key];
    if (next === null) {
      if (current.source[key] === 'screen') lines.push(`${LABEL[key]}: ${show(key, was)} → server default`);
      continue;
    }
    if (next !== undefined && next !== was) lines.push(`${LABEL[key]}: ${show(key, was)} → ${show(key, next)}`);
  }
  return lines;
}
