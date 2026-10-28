/**
 * Whether a click on a link is about to load another dashboard page in this
 * tab, which is when the thin progress bar along the top should start.
 */
export function startsNavigation(
  e: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean },
  a: { href: string; target: string; download: boolean },
  current: string,
): boolean {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  if ((a.target && a.target !== '_self') || a.download) return false;
  let to: URL;
  let from: URL;
  try {
    to = new URL(a.href, current);
    from = new URL(current);
  } catch {
    return false;
  }
  if (to.origin !== from.origin) return false;
  return to.pathname + to.search !== from.pathname + from.search;
}
