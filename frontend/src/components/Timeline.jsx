import { useMemo, useRef } from 'react';

const H = 56;

/* Every decision point in the match plotted against the clock. Tick height
   carries the size of the counterfactual gap, so the minutes where the model
   most disagrees with the players are visible before you click anything.

   The SVG stretches horizontally (preserveAspectRatio="none") so the track
   always fills its container; every stroke is non-scaling and all text lives
   in the HTML layer above it, so nothing is distorted by the stretch. */
export default function Timeline({ decisions, current, onSelect }) {
  const ref = useRef(null);

  const { maxMinute, maxGap, gridMinutes } = useMemo(() => {
    const lastMinute = decisions.reduce((m, d) => Math.max(m, d.minute), 0);
    const widestGap = decisions.reduce((m, d) => Math.max(m, d.gap), 0);
    const max = Math.max(90, Math.ceil(lastMinute / 5) * 5);
    const grid = [];
    for (let m = 0; m <= max; m += 15) grid.push(m);
    return { maxMinute: max, maxGap: widestGap || 1, gridMinutes: grid };
  }, [decisions]);

  const pct = (minute) => (minute / maxMinute) * 100;

  const pick = (clientX) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || !decisions.length) return;
    const minute = ((clientX - rect.left) / rect.width) * maxMinute;
    let nearest = decisions[0];
    let best = Infinity;
    for (const d of decisions) {
      const distance = Math.abs(d.minute - minute);
      if (distance < best) {
        best = distance;
        nearest = d;
      }
    }
    if (nearest.id !== current?.id) onSelect(nearest.id);
  };

  const step = (direction) => {
    if (!current) return;
    const position = decisions.findIndex((d) => d.id === current.id);
    const next = decisions[Math.min(decisions.length - 1, Math.max(0, position + direction))];
    if (next) onSelect(next.id);
  };

  return (
    <div className="rounded-[3px] border border-line bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-2 px-4 py-2">
        <h2 className="cond text-[16px] leading-tight text-ink">Match timeline</h2>
        <p className="text-[12px] text-ink-3">
          Tick height is the gap to the best alternative. Click or drag to move through the match.
        </p>
      </div>

      <div className="px-4 pb-2 pt-3">
        <div
          ref={ref}
          className="relative cursor-crosshair touch-none select-none"
          style={{ height: H }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            pick(e.clientX);
          }}
          onPointerMove={(e) => e.buttons === 1 && pick(e.clientX)}
          onKeyDown={(e) => {
            const direction = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
            if (!direction) return;
            e.preventDefault();
            step(direction);
          }}
          role="slider"
          tabIndex={0}
          aria-label="Match timeline"
          aria-valuemin={1}
          aria-valuemax={decisions.length}
          aria-valuenow={(current?.index ?? 0) + 1}
          aria-valuetext={
            current ? `Decision ${current.index + 1}, minute ${Math.round(current.minute)}` : ''
          }
        >
          <svg
            viewBox={`0 0 1000 ${H}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <line
              x1="0"
              y1={H - 0.5}
              x2="1000"
              y2={H - 0.5}
              stroke="var(--line)"
              vectorEffect="non-scaling-stroke"
            />

            {gridMinutes.map((m) => (
              <line
                key={`g-${m}`}
                x1={pct(m) * 10}
                y1="0"
                x2={pct(m) * 10}
                y2={H}
                stroke="var(--line-2)"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            <line
              x1={pct(45) * 10}
              y1="0"
              x2={pct(45) * 10}
              y2={H}
              stroke="var(--line)"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />

            {decisions.map((d) => {
              const height = 3 + (Math.max(0, d.gap) / maxGap) * (H - 8);
              const isCurrent = current?.id === d.id;
              return (
                <line
                  key={d.id}
                  x1={pct(d.minute) * 10}
                  y1={H}
                  x2={pct(d.minute) * 10}
                  y2={H - height}
                  stroke={isCurrent ? 'var(--ink)' : d.gap > 0 ? 'var(--alt)' : 'var(--line)'}
                  strokeWidth={isCurrent ? 2 : 1}
                  opacity={isCurrent ? 1 : d.gap > 0 ? 0.6 : 1}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>

          {current && (
            <div
              className="pointer-events-none absolute -top-1 h-2 w-2 -translate-x-1/2 rotate-45 bg-ink"
              style={{ left: `${pct(current.minute)}%` }}
            />
          )}
        </div>

        <div className="relative mt-1 h-4">
          {gridMinutes.map((m) => (
            <span
              key={`l-${m}`}
              className="num absolute -translate-x-1/2 text-[11px] text-ink-3"
              style={{ left: `${pct(m)}%` }}
            >
              {m}&rsquo;
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
