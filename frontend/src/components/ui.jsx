import { ChevronDown } from 'lucide-react';

/* A flat bordered surface. No shadow, no large radius — panels are separated
   by hairlines the way a stats sheet is, not by floating above the page. */
export function Panel({ title, meta, action, children, padded = true, className = '' }) {
  return (
    <section className={`rounded-[3px] border border-line bg-panel ${className}`}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-2 px-4 py-2.5">
          <div className="min-w-0">
            {title && <h2 className="cond text-[16px] leading-tight text-ink">{title}</h2>}
            {meta && <p className="text-[12px] leading-tight text-ink-3">{meta}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={padded ? 'p-4' : ''}>{children}</div>
    </section>
  );
}

/* One line: what you're looking at on the left, the controls that change it
   on the right. Used at the top of every page instead of a marketing header. */
export function Toolbar({ title, meta, children }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
      <div className="min-w-0">
        <h1 className="cond text-[22px] leading-none text-ink">{title}</h1>
        {meta && <p className="mt-1 text-[12.5px] text-ink-3">{meta}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Tag({ tone = 'neutral', children }) {
  const tones = {
    neutral: 'border-line bg-panel-2 text-ink-2',
    pos: 'border-pos/30 bg-pos/10 text-pos',
    neg: 'border-neg/30 bg-neg/10 text-neg',
    alt: 'border-alt/35 bg-alt/10 text-alt',
  };
  return (
    <span
      className={`inline-flex items-center rounded-[2px] border px-1.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/* Figure with its label underneath, scoreboard order. */
export function Stat({ label, value, delta, tone }) {
  const toneClass = tone === 'pos' ? 'text-pos' : tone === 'neg' ? 'text-neg' : tone === 'alt' ? 'text-alt' : 'text-ink';
  return (
    <div>
      <div className={`cond num text-[26px] leading-none ${toneClass}`}>{value}</div>
      <div className="mt-1 text-[12px] leading-tight text-ink-3">{label}</div>
      {delta && <div className="text-[11.5px] leading-tight text-ink-3">{delta}</div>}
    </div>
  );
}

export function StatRow({ children, className = '' }) {
  return (
    <div className={`grid grid-cols-2 divide-x divide-line-2 sm:grid-cols-4 ${className}`}>
      {children}
    </div>
  );
}

export function Select({ value, onChange, children, label }) {
  return (
    <label className="relative block">
      {label && <span className="sr-only">{label}</span>}
      <select
        value={value}
        onChange={onChange}
        className="w-full appearance-none rounded-[3px] border border-line bg-panel py-1.5 pl-2.5 pr-8 text-[13px] text-ink"
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-3"
      />
    </label>
  );
}

export function Button({ variant = 'quiet', children, ...props }) {
  const styles = {
    solid: 'bg-ink text-canvas hover:opacity-90',
    quiet: 'border border-line bg-panel text-ink-2 hover:bg-panel-2',
    alt: 'bg-alt text-[#1a1406] hover:opacity-90',
  };
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-[3px] px-3 py-1.5 text-[13px] font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

/* Column headers in condensed caps are legible at small sizes and are the
   convention on every printed and broadcast football stats sheet. */
export function Th({ children, align = 'left', className = '' }) {
  return (
    <th
      className={`cond border-b border-line px-3 py-2 text-[12.5px] font-semibold uppercase tracking-wide text-ink-3 ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, align = 'left', className = '' }) {
  return (
    <td
      className={`border-b border-line-2 px-3 py-2 text-[13px] ${
        align === 'right' ? 'num text-right' : ''
      } ${className}`}
    >
      {children}
    </td>
  );
}

export function Loading({ what = 'match data' }) {
  return <div className="py-20 text-center text-[13px] text-ink-3">Loading {what}…</div>;
}

export function DataError({ message }) {
  return (
    <Panel>
      <p className="cond text-[16px] text-neg">Data did not load</p>
      <p className="mt-1 text-[13px] text-ink-2">{message}</p>
      <p className="mt-2 text-[12.5px] text-ink-3">
        Both JSON files need to be in <code>public/data/</code>. Restart the dev server after adding
        them.
      </p>
    </Panel>
  );
}
