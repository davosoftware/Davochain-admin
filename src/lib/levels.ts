export type Tier = 'TIER_0' | 'TIER_1' | 'TIER_2' | 'TIER_3';

const NAMES: Record<Tier, string> = { TIER_0: 'None', TIER_1: 'Basic', TIER_2: 'Advanced (in progress)', TIER_3: 'Advanced' };

/** "Tier N" is never shown: people read None / Basic / Advanced (spec §6.2). */
export function levelLabel(tier: string | null | undefined): string {
  return NAMES[(tier ?? 'TIER_0') as Tier] ?? 'None';
}

export const LEVEL_OPTIONS: Array<{ value: Tier; label: string }> = [
  { value: 'TIER_1', label: 'Basic' },
  { value: 'TIER_2', label: 'Advanced (in progress)' },
  { value: 'TIER_3', label: 'Advanced' },
];
