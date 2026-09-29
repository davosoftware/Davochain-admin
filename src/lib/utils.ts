import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Money formatting.
 *
 * Amounts arrive from the API as STRINGS and stay strings until the moment
 * they are rendered. Parsing to a float would lose precision on an 8-decimal
 * BTC balance, and this is a dashboard about money.
 */
export function formatNaira(value: string | number, decimals = 2): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  return '₦' + n.toLocaleString('en-NG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatUsd(value: string | number, decimals = 2): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  return '$' + n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Trim trailing zeros without touching significant digits. */
export function formatCoin(value: string | number, maxDecimals = 8): string {
  const s = String(value);
  if (!s || s === '0') return '0';
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n.toLocaleString('en-US', { maximumFractionDigits: maxDecimals });
}

export function formatPercent(value: string | number, decimals = 1): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  return (n > 0 ? '+' : '') + n.toFixed(decimals) + '%';
}

export function relativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.round((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

/**
 * A compact number that never lies: 12 → "12", 12.5 → "12.5", 1.50 → "1.5".
 *
 * Fees are prices. Rounding one to a whole number to save two characters
 * misstates what somebody is charged.
 */
export function trimNumber(value: string | number, maxDecimals = 2): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  // The dot must be escaped. Unescaped it matches ANY character, so "2.50"
  // loses the "5" along with the zero and reads as "2." — a fee shown wrong on
  // every screen that prices anything.
  return n.toFixed(maxDecimals).replace(/\.?0+$/, '');
}

/**
 * The words out of a fragment of HTML, for a list row or a summary line.
 *
 * Not a sanitiser and not a substitute for one — this is for text that is about
 * to be rendered as a plain string, where the only risk is showing somebody
 * `<p>` instead of a paragraph. Anything going into the DOM as markup is
 * cleaned on the server before it is stored.
 */
export function plainText(html: string): string {
  return (html ?? '')
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
