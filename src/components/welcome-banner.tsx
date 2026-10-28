/**
 * The top of the Overview (shadcnspace's "Analytics Dashboard" card): the
 * greeting, two headline figures and a small illustration in the brand blues.
 */
export function WelcomeBanner({
  title,
  subtitle,
  figures,
  action,
}: {
  title: string;
  subtitle: React.ReactNode;
  figures: { label: string; value: string; hint?: string }[];
  action?: React.ReactNode;
}) {
  return (
    <section className="border-border bg-card relative overflow-hidden rounded-xl border p-6 shadow-xs">
      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="t-display">{title}</h1>
          <p className="text-muted-foreground t-body mt-1">{subtitle}</p>
          {figures.length ? (
            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-4">
              {figures.map((f, i) => (
                <div key={f.label} className={i > 0 ? 'border-border/70 sm:border-l sm:pl-8' : undefined}>
                  <p className="text-muted-foreground t-caption">{f.label}</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{f.value}</p>
                  {f.hint ? <p className="text-muted-foreground t-caption mt-0.5">{f.hint}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-4">
          {action}
          <Illustration />
        </div>
      </div>
    </section>
  );
}

/** A phone with a rising chart beside a stack of coins, in DavoChain blues. */
function Illustration() {
  return (
    <svg viewBox="0 0 240 140" className="hidden h-32 w-auto md:block" aria-hidden>
      <defs>
        <linearGradient id="wb-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#135CF7" />
          <stop offset="1" stopColor="#0b3fb0" />
        </linearGradient>
        <linearGradient id="wb-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#66B3FF" stopOpacity="0.55" />
          <stop offset="1" stopColor="#66B3FF" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* floor shadow */}
      <ellipse cx="128" cy="132" rx="96" ry="6" fill="currentColor" className="text-foreground" opacity="0.06" />
      {/* phone */}
      <rect x="92" y="6" width="78" height="124" rx="14" fill="url(#wb-screen)" />
      <rect x="98" y="16" width="66" height="104" rx="9" fill="#ffffff" opacity="0.96" />
      <rect x="120" y="10" width="22" height="3" rx="1.5" fill="#ffffff" opacity="0.5" />
      <path d="M104 96 L116 84 L128 90 L140 70 L152 76 L158 56 L158 112 L104 112 Z" fill="url(#wb-area)" />
      <path d="M104 96 L116 84 L128 90 L140 70 L152 76 L158 56" fill="none" stroke="#135CF7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="158" cy="56" r="4.5" fill="#ffffff" stroke="#135CF7" strokeWidth="2.5" />
      <rect x="104" y="26" width="30" height="5" rx="2.5" fill="#135CF7" opacity="0.85" />
      <rect x="104" y="35" width="44" height="4" rx="2" fill="#135CF7" opacity="0.2" />
      {/* coin stack */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(0 ${-i * 11})`}>
          <ellipse cx="52" cy="116" rx="26" ry="8" fill="#0b3fb0" />
          <rect x="26" y="108" width="52" height="8" fill="#0b3fb0" />
          <ellipse cx="52" cy="108" rx="26" ry="8" fill={i === 3 ? '#66B3FF' : '#135CF7'} />
        </g>
      ))}
      <text x="52" y="78.5" textAnchor="middle" fontSize="10" fontWeight="700" fill="#ffffff">
        ₦
      </text>
      {/* a coin in the air */}
      <g transform="translate(206 44)">
        <circle r="17" fill="#66B3FF" />
        <circle r="12.5" fill="#135CF7" />
        <text y="4.5" textAnchor="middle" fontSize="13" fontWeight="700" fill="#ffffff">
          ₿
        </text>
      </g>
      <circle cx="190" cy="92" r="4" fill="#66B3FF" opacity="0.7" />
      <circle cx="78" cy="30" r="3" fill="#135CF7" opacity="0.35" />
    </svg>
  );
}
