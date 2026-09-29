'use client';

import { useEffect, useRef, useState } from 'react';

/** Long enough to read as deliberate, short enough not to be in the way. */
const DURATION_MS = 900;

/**
 * How much later each figure starts than the one before it, capped.
 *
 * A dashboard of thirty numbers all landing on the same frame looks like a
 * glitch; thirty numbers each 40ms apart takes over a second and feels slow.
 * A small stagger with a ceiling gives the sweep without the wait.
 */
const STAGGER_MS = 45;
const MAX_STAGGER_MS = 260;

/**
 * Somebody who has asked their system not to animate things means it.
 *
 * The only thing that stops the count. Everything else — every reload, every
 * navigation back to the dashboard, every change of the date range — counts up
 * again, because seeing the figures arrive is the point.
 */
function shouldAnimate(): boolean {
  try {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Position in the current sweep, for the stagger.
 *
 * Module state, not component state, because the figures need to agree on who
 * goes first and they only know about themselves. Reset once the sweep is over
 * so the next one starts from the top rather than every figure landing on the
 * capped delay together.
 */
let ordinal = 0;
let resetting: ReturnType<typeof setTimeout> | null = null;

function nextInSweep(): number {
  const delay = Math.min(ordinal++ * STAGGER_MS, MAX_STAGGER_MS);
  if (resetting) clearTimeout(resetting);
  resetting = setTimeout(() => {
    ordinal = 0;
    resetting = null;
  }, DURATION_MS + MAX_STAGGER_MS + 200);
  return delay;
}

/**
 * The number inside a formatted figure, and the text either side of it.
 *
 * Values reach the dashboard already formatted — "₦5,087", "12", "$1,204.50",
 * "0.00067342". Rather than plumb raw numbers and a formatter through every
 * card, the number is lifted back out of the finished string and the prefix and
 * suffix are put back around it on each frame. The last frame renders the
 * original string verbatim, so what settles on screen is exactly what the
 * server sent — no rounding of its own, no drift.
 */
function parse(value: string): { prefix: string; target: number; suffix: string; decimals: number } | null {
  const match = /-?\d[\d,]*(\.\d+)?/.exec(value);
  if (!match) return null;

  const target = Number(match[0].replace(/,/g, ''));
  if (!Number.isFinite(target)) return null;

  return {
    prefix: value.slice(0, match.index),
    target,
    suffix: value.slice(match.index + match[0].length),
    decimals: match[1] ? match[1].length - 1 : 0,
  };
}

/** Fast at the start, easing into the answer. */
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * A figure that counts up to itself when the dashboard is first opened.
 *
 * Renders the finished value on the server and during the first client render,
 * so the number is in the HTML, is what a screen reader announces, and is
 * correct with JavaScript off. The animation only ever replaces a value that
 * was already there.
 */
export function CountUp({
  value,
  className,
}: {
  value: string | number;
  className?: string;
}) {
  const text = String(value);

  // Not a number — "—", "all stocked". Nothing to count.
  if (!parse(text)) return <span className={className}>{text}</span>;

  return <Counting text={text} className={className} />;
}

function Counting({ text, className }: { text: string; className?: string }) {
  // Starts as the final text so the server's markup and the first client render
  // agree. Anything else is a hydration mismatch and a flash of the wrong
  // number.
  const [display, setDisplay] = useState(text);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!shouldAnimate()) return;

    // Parsed in here rather than passed in: a fresh object on every render
    // would be a new dependency on every render, and the effect would restart
    // mid-count.
    const parsed = parse(text);
    if (!parsed) return;

    const { prefix, target, suffix, decimals } = parsed;
    if (target === 0) return;

    const delay = nextInSweep();
    const format = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    const started = performance.now() + delay;
    let primed = false;

    const tick = (now: number) => {
      const elapsed = now - started;
      if (elapsed < 0) {
        /*
         * Waiting out this figure's stagger.
         *
         * Drop to the bottom on the first frame rather than sitting on the
         * finished number until the turn comes — otherwise the value is shown,
         * then thrown away, then climbed back to, which reads as a glitch.
         * Done here rather than before the loop because setting state straight
         * out of an effect is its own bug.
         */
        if (!primed) {
          primed = true;
          setDisplay(`${prefix}${format.format(0)}${suffix}`);
        }
        frame.current = requestAnimationFrame(tick);
        return;
      }
      if (elapsed >= DURATION_MS) {
        // The original string, not a re-format of it — see parse().
        setDisplay(text);
        frame.current = null;
        return;
      }
      const at = target * easeOut(elapsed / DURATION_MS);
      setDisplay(`${prefix}${format.format(at)}${suffix}`);
      frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
    // Also re-runs when the value itself changes — narrowing the date range,
    // say — and counting to the new figure is the right thing there too.
  }, [text]);

  /*
   * A number changing under a screen reader is noise, not information — some
   * announce every frame. The finished value is on the element for assistive
   * technology to read once, and the counting is marked as decoration.
   */
  return (
    <>
      <span className={className} aria-hidden>
        {display}
      </span>
      <span className="sr-only">{text}</span>
    </>
  );
}
