'use client';

import { useSyncExternalStore } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Slice } from '@/lib/overview-charts';
import { formatUsd } from '@/lib/utils';

const REDUCED = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  const m = window.matchMedia(REDUCED);
  m.addEventListener('change', onChange);
  return () => m.removeEventListener('change', onChange);
}

/** Charts grow in, unless the computer asks for less motion. */
function useAnimate(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => !window.matchMedia(REDUCED).matches,
    () => true,
  );
}

const short = (n: number) => String(Number(n.toFixed(1)));
const compactUsd = (v: number) =>
  v >= 1_000_000 ? `$${short(v / 1_000_000)}m` : v >= 1_000 ? `$${short(v / 1_000)}k` : `$${Math.round(v)}`;

function ChartTip({ active, payload, money }: { active?: boolean; payload?: { name?: string; value?: number; payload?: { label?: string } }[]; money?: boolean }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="bg-popover text-popover-foreground border-border/60 rounded-lg border px-3 py-2 shadow-md">
      <p className="text-muted-foreground t-caption">{p.payload?.label ?? p.name}</p>
      <p className="t-small font-semibold tabular-nums">
        {money ? formatUsd(p.value ?? 0) : (p.value ?? 0).toLocaleString('en-US')}
      </p>
    </div>
  );
}

/** Dollars of crypto moved by kind. Bars grow up from the axis on load. */
export function CryptoBarChart({ data }: { data: { label: string; value: number }[] }) {
  const animate = useAnimate();
  if (data.every((d) => d.value === 0)) {
    return <p className="text-muted-foreground py-16 text-center text-sm">No crypto has moved in this period yet.</p>;
  }
  return (
    <div className="h-[19rem] w-full px-2 pb-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
          <YAxis
            width={52}
            tickLine={false}
            axisLine={false}
            tickFormatter={compactUsd}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          />
          <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.6, radius: 8 }} content={<ChartTip money />} />
          <Bar
            dataKey="value"
            fill="var(--chart-1)"
            radius={[8, 8, 8, 8]}
            maxBarSize={46}
            background={{ fill: 'var(--muted)', radius: 8 }}
            isAnimationActive={animate}
            animationDuration={900}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** How the transactions split by kind. The ring sweeps round on load. */
export function MixDonut({ data }: { data: Slice[] }) {
  const animate = useAnimate();
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return <p className="text-muted-foreground py-16 text-center text-sm">No transactions in this period yet.</p>;
  }
  return (
    <div className="flex flex-col gap-4 px-5 pb-5">
      <div className="relative mx-auto h-48 w-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ChartTip />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="72%"
              outerRadius="100%"
              paddingAngle={2}
              cornerRadius={5}
              stroke="none"
              startAngle={90}
              endAngle={-270}
              isAnimationActive={animate}
              animationDuration={900}
              animationEasing="ease-out"
            >
              {data.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-muted-foreground t-caption">Total</span>
          <span className="t-title tabular-nums">{total.toLocaleString('en-US')}</span>
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {data.map((d) => (
          <li key={d.key} className="t-small flex items-center gap-2">
            <span className="h-3.5 w-1 rounded-full" style={{ background: d.color }} />
            <span className="flex-1">{d.label}</span>
            <span className="font-medium tabular-nums">{d.value.toLocaleString('en-US')}</span>
            <span className="text-muted-foreground bg-muted t-caption w-12 rounded-md py-0.5 text-center tabular-nums">
              {Math.round((d.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
