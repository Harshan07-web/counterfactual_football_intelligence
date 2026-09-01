import { useMemo, useState } from 'react';
import { ChevronDown, Lightbulb } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { Card, Pill } from '../components/ui';
import Pitch from '../components/Pitch';
import { decisions, getMatch, getPlayer, teams, qualityLabel } from '../data/mockData';

function Gauge({ value }) {
  const pct = Math.max(0, Math.min(1, value));
  const angle = pct * 180;
  const r = 70;
  const cx = 90;
  const cy = 84;
  const startX = cx - r;
  const endX = cx + r * Math.cos(Math.PI - (angle * Math.PI) / 180);
  const endY = cy - r * Math.sin(Math.PI - (angle * Math.PI) / 180);
  const large = angle > 180 ? 1 : 0;
  const { label, tone } = qualityLabel(value);
  const toneColor =
    tone === 'good' ? 'var(--color-good)' : tone === 'warn' ? 'var(--color-warn)' : 'var(--color-bad)';

  return (
    <div className="flex flex-col items-center">
      <svg width="180" height="104" viewBox="0 0 180 104">
        <path
          d={`M ${startX} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="var(--color-surface-3)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d={`M ${startX} ${cy} A ${r} ${r} 0 ${large} 1 ${endX} ${endY}`}
          fill="none"
          stroke={toneColor}
          strokeWidth="14"
          strokeLinecap="round"
        />
      </svg>
      <div className="-mt-9 text-center">
        <p className="text-3xl font-semibold text-ink-1 font-mono tabular-nums tracking-tight">{value.toFixed(2)}</p>
        <p className="text-[11px] text-ink-3">/ 1.00</p>
      </div>
      <Pill tone={tone} className="mt-3">{label}</Pill>
    </div>
  );
}

export default function DecisionAnalysis() {
  const [decisionId, setDecisionId] = useState(decisions[0].id);
  const decision = useMemo(() => decisions.find((d) => d.id === decisionId), [decisionId]);
  const match = getMatch(decision.matchId);
  const player = getPlayer(decision.playerId);
  const home = teams[match.home];
  const away = teams[match.away];

  const sortedAlts = useMemo(
    () => [...decision.alternatives].sort((a, b) => b.value - a.value),
    [decision]
  );
  const bestValue = Math.max(decision.actualValue, ...decision.alternatives.map((a) => a.value));
  const hadBetterOption = bestValue > decision.actualValue + 0.001;

  return (
    <div>
      <PageHeader
        title="Decision Analysis"
        subtitle={
          <span className="flex items-center gap-2">
            <span className="font-semibold text-ink-2">{home.short}</span>
            <span className="font-mono tabular-nums">{match.homeScore}&ndash;{match.awayScore}</span>
            <span className="font-semibold text-ink-2">{away.short}</span>
            <span className="text-ink-3">&middot; {match.date}</span>
          </span>
        }
        action={
          <div className="relative">
            <select
              value={decisionId}
              onChange={(e) => setDecisionId(e.target.value)}
              className="appearance-none bg-surface-2 border border-border rounded-lg pl-3 pr-9 py-2 text-[13px] font-medium text-ink-1 outline-none focus:border-brand cursor-pointer max-w-[260px]"
            >
              {decisions.map((d) => {
                const p = getPlayer(d.playerId);
                return (
                  <option key={d.id} value={d.id}>
                    {p.name} &middot; {d.minute}&prime; &middot; {d.actionType}
                  </option>
                );
              })}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_260px] gap-5">
        <Card title="Event Timeline" padded={false}>
          <ul className="px-2 pb-3">
            {decision.timeline.map((ev, i) => (
              <li
                key={i}
                className={`relative pl-6 pr-2 py-2 rounded-lg ${ev.active ? 'bg-brand-soft' : ''}`}
              >
                <span
                  className={`absolute left-2 top-3.5 h-2 w-2 rounded-full ${
                    ev.active ? 'bg-brand' : 'bg-ink-3'
                  }`}
                />
                {i < decision.timeline.length - 1 && (
                  <span className="absolute left-[11px] top-5 h-full w-px bg-border" />
                )}
                <p className="text-[11.5px] text-ink-3 font-mono tabular-nums">{ev.t}</p>
                <p className={`text-[13px] font-medium ${ev.active ? 'text-brand' : 'text-ink-1'}`}>
                  {ev.label}
                </p>
                <p className="text-[12px] text-ink-3">{ev.sub}</p>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-5">
          <Card title={`Situation Overview (${decision.minute}:${String(decision.second).padStart(2, '0')})`}>
            <Pitch
              freezeFrame={decision.freezeFrame}
              location={decision.location}
              endLocation={decision.endLocation}
            />
            <div className="flex items-center gap-4 mt-3 text-[12px] text-ink-3">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#3d6fd6' }} /> Teammate
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#d1493c' }} /> Opponent
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#f2b632' }} /> Selected Player
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full border border-ink-3" /> Ball
              </span>
            </div>
          </Card>

          <Card>
            <div className="flex gap-3">
              <Lightbulb size={18} className="text-warn shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <p className="text-[13px] font-semibold text-ink-1 mb-0.5">Insight</p>
                <p className="text-[13px] text-ink-2 leading-relaxed">{decision.insight}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Action Comparison">
            <div className="space-y-2">
              <div className="rounded-lg border border-brand/30 bg-brand-soft px-3 py-2.5">
                <p className="text-[11px] font-semibold text-brand mb-0.5">Actual Action</p>
                <div className="flex items-center justify-between">
                  <p className="text-[12.5px] text-ink-1">{decision.description}</p>
                  <p className="text-[13px] font-semibold text-ink-1 font-mono tabular-nums">{decision.actualValue.toFixed(2)}</p>
                </div>
              </div>
              {sortedAlts.map((alt, i) => (
                <div key={i} className="rounded-lg border border-border px-3 py-2.5">
                  <p className="text-[11px] font-semibold text-ink-3 mb-0.5">Alternative {i + 1}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-[12.5px] text-ink-2">{alt.label}</p>
                    <p className="text-[13px] font-semibold text-ink-1 font-mono tabular-nums">{alt.value.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Decision Quality">
            <Gauge value={decision.actualValue} />
            <p className="text-[12px] text-ink-3 text-center mt-2">
              {hadBetterOption ? 'Better options were available' : 'This was the best option available'}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
