const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * A verified date of birth ("YYYY-MM-DD", from the BVN/NIN record) as
 * "1 May 2000 · age 26", for the opened customer row (28 Oct 2026).
 */
export function formatDateOfBirth(iso: string | null | undefined, now: Date = new Date()): string {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return 'Not verified yet';
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (month < 1 || month > 12 || day < 1 || day > 31) return 'Not verified yet';
  const hadBirthday = now.getUTCMonth() + 1 > month || (now.getUTCMonth() + 1 === month && now.getUTCDate() >= day);
  const age = now.getUTCFullYear() - year - (hadBirthday ? 0 : 1);
  return `${day} ${MONTHS[month - 1]} ${year} · age ${age}`;
}

/** "3 Mar 1995", for two dates side by side (Advanced checks → Recently rejected). */
export function formatDay(iso: string | null | undefined): string {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return 'unknown';
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}
