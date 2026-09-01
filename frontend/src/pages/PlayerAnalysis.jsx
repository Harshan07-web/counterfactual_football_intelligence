import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import PageHeader from '../components/PageHeader';
import { Card, Pill } from '../components/ui';
import {
  players,
  teams,
  getPlayerDecisions,
  getMatch,
  decisionQualityOverTime,
  decisionTypesDistribution,
  qualityLabel,
} from '../data/mockData';

function DonutLegendChart() {
  const size = 128;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {decisionTypesDistribution.map((d, i) => {
            const len = (d.pct / 100) * c;
            const seg = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={d.color}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return seg;
          })}
        </g>
      </svg>
      <ul className="space-y-1.5">
        {decisionTypesDistribution.map((d) => (
          <li key={d.type} className="flex items-center gap-2 text-[12.5px]">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
            <span className="text-ink-1 font-medium w-12">{d.type}</span>
            <span className="text-ink-3 font-mono tabular-nums">{d.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PlayerAnalysis() {
  const [playerId, setPlayerId] = useState(players[0].id);
  const player = useMemo(() => players.find((p) => p.id === playerId), [playerId]);
  const decisions = useMemo(() => getPlayerDecisions(playerId).slice(0, 5), [playerId]);
  const qLabel = qualityLabel(player.avgDecisionQuality);

  return (
    <div>
      <PageHeader
        title="Player Analysis"
        subtitle="Decision-making profile derived from tracked possession actions"
        action={
          <div className="relative">
            <select
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              className="appearance-none bg-surface-2 border border-border rounded-lg pl-3 pr-9 py-2 text-[13px] font-medium text-ink-1 outline-none focus:border-brand cursor-pointer"
            >
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
          </div>
        }
      />

      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-6 py-1">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-surface-3 border border-border flex items-center justify-center text-[15px] font-bold text-ink-2">
              {player.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <div>
              <p className="text-[15px] font-semibold text-ink-1">{player.name}</p>
              <p className="text-[12.5px] text-ink-3">{player.position} &middot; {teams[player.team].name}</p>
              <p className="text-[11.5px] text-ink-3">Matches Analyzed: 10</p>
            </div>
          </div>
          <div className="h-10 w-px bg-border hidden sm:block" />
          <div>
            <p className="text-[11.5px] text-ink-3 font-medium">Avg Decision Quality</p>
            <p className="text-2xl font-semibold text-ink-1 font-mono tabular-nums tracking-tight">{player.avgDecisionQuality.toFixed(2)}</p>
            <Pill tone={qLabel.tone} className="mt-1">{qLabel.label}</Pill>
          </div>
          <div className="h-10 w-px bg-border hidden sm:block" />
          <div>
            <p className="text-[11.5px] text-ink-3 font-medium">Decisions Analyzed</p>
            <p className="text-2xl font-semibold text-ink-1 font-mono tabular-nums tracking-tight">{player.decisionsAnalyzed}</p>
          </div>
          <div className="h-10 w-px bg-border hidden sm:block" />
          <div>
            <p className="text-[11.5px] text-ink-3 font-medium">Better Options Available</p>
            <p className="text-2xl font-semibold text-bad font-mono tabular-nums tracking-tight">{player.betterOptionsPct}%</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card title="Decision Quality Over Time">
          <div className="h-56 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={decisionQualityOverTime} margin={{ top: 10, right: 14, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-soft)" vertical={false} />
                <XAxis
                  dataKey="match"
                  tick={{ fill: 'var(--color-ink-3)', fontSize: 11 }}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  tickLine={false}
                  label={{ value: 'Match Index', position: 'insideBottom', offset: -2, fill: 'var(--color-ink-3)', fontSize: 11 }}
                />
                <YAxis
                  domain={[0, 1]}
                  tick={{ fill: 'var(--color-ink-3)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                  label={{ value: 'Quality Score', angle: -90, position: 'insideLeft', fill: 'var(--color-ink-3)', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'var(--color-ink-2)' }}
                />
                <Line type="monotone" dataKey="quality" stroke="var(--color-brand)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-brand)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Decision Types Distribution">
          <div className="flex items-center justify-center h-56">
            <DonutLegendChart />
          </div>
        </Card>
      </div>

      <Card title="Recent Decision Analysis">
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="text-[11.5px] text-ink-3 border-b border-border-soft">
                <th className="font-medium pb-2 pr-4">Match</th>
                <th className="font-medium pb-2 pr-4">Time</th>
                <th className="font-medium pb-2 pr-4">Action</th>
                <th className="font-medium pb-2 pr-4">Value</th>
                <th className="font-medium pb-2">Rating</th>
              </tr>
            </thead>
            <tbody>
              {decisions.map((d) => {
                const m = getMatch(d.matchId);
                const q = qualityLabel(d.actualValue);
                return (
                  <tr key={d.id} className="border-b border-border-soft last:border-0">
                    <td className="py-2.5 pr-4 text-ink-1">
                      vs {teams[m.home === player.team ? m.away : m.home].name} &middot; {m.date}
                    </td>
                    <td className="py-2.5 pr-4 text-ink-2 font-mono tabular-nums">{d.minute}:{String(d.second).padStart(2, '0')}</td>
                    <td className="py-2.5 pr-4 text-ink-2">{d.actionType}</td>
                    <td className="py-2.5 pr-4 text-ink-1 font-semibold font-mono tabular-nums">{d.actualValue.toFixed(2)}</td>
                    <td className="py-2.5">
                      <Pill tone={q.tone}>{q.label}</Pill>
                    </td>
                  </tr>
                );
              })}
              {decisions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-ink-3">
                    No tracked decisions for this player yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <button className="mt-4 w-full rounded-lg bg-surface-2 border border-border text-ink-1 text-[13px] font-semibold py-2.5 hover:bg-surface-3 transition-colors">
          View All Decisions
        </button>
      </Card>
    </div>
  );
}
