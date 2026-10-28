/**
 * Which sidebar item a path belongs to, for the page title in the top bar
 * ("People / Users"). The longest matching link wins, and "/x" never matches
 * "/x-other".
 */
export function matchNav(
  groups: { label: string; items: { href: string; label: string }[] }[],
  pathname: string,
): { group: string; label: string; href: string } | null {
  let best: { group: string; label: string; href: string } | null = null;
  for (const group of groups) {
    for (const item of group.items) {
      const hit =
        item.href === '/'
          ? pathname === '/'
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (hit && (!best || item.href.length > best.href.length)) {
        best = { group: group.label, label: item.label, href: item.href };
      }
    }
  }
  return best;
}
