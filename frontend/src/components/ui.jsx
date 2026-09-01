export function Card({ title, action, children, className = '', padded = true, onClick }) {
  return (
    <div
      className={`bg-surface rounded-[10px] border border-border ${
        onClick ? 'cursor-pointer transition-colors hover:border-ink-3/40' : ''
      } ${className}`}
      onClick={onClick}
    >
      {title && (
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-soft">
          <h3 className="text-[13px] font-semibold text-ink-1">{title}</h3>
          {action}
        </div>
      )}
      <div className={padded ? (title ? 'px-5 pt-4 pb-5' : 'p-5') : ''}>{children}</div>
    </div>
  );
}

const toneStyles = {
  good: 'bg-good-soft text-good border-good/25',
  warn: 'bg-warn-soft text-warn border-warn/25',
  bad: 'bg-bad-soft text-bad border-bad/25',
  neutral: 'bg-surface-3 text-ink-2 border-border',
  brand: 'bg-brand-soft text-brand border-brand/25',
};

export function Pill({ tone = 'neutral', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold leading-5 ${toneStyles[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function StatTile({ label, value, sublabel, tone }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] text-ink-3 font-medium">{label}</span>
      <span className="text-2xl font-semibold text-ink-1 font-mono tabular-nums tracking-tight">{value}</span>
      {sublabel && (
        <span
          className={`text-[12px] font-medium ${
            tone === 'good' ? 'text-good' : tone === 'bad' ? 'text-bad' : tone === 'warn' ? 'text-warn' : 'text-ink-3'
          }`}
        >
          {sublabel}
        </span>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {Icon && (
        <div className="h-10 w-10 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-ink-3">
          <Icon size={18} strokeWidth={1.75} />
        </div>
      )}
      <div>
        <p className="text-sm font-semibold text-ink-2">{title}</p>
        {subtitle && <p className="text-[13px] text-ink-3 mt-1 max-w-xs">{subtitle}</p>}
      </div>
    </div>
  );
}
