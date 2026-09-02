import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { ChevronDown } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { Card, Pill } from '../components/ui';
import {
  matches,
  players,
  teams,
  decisionQualityDistribution,
  qualityLabel,
} from '../data/mockData';

// Low → high decision quality: muted rose through to deep purple, calm
// rather than neon so it sits quietly on either a white or dark card.
const bucketColors = ['#a15364', '#a082a6', '#cdbed6', '#8b7cae', '#4b3f72'];

function PossessionDonut({ home, away, homeLabel, awayLabel }) {
  const size = 92;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const homeLen = (home / 100) * c;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-bad)" strokeWidth={stroke} fill="none" opacity="0.85" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="var(--color-brand)"
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${homeLen} ${c - homeLen}`}
            strokeLinecap="butt"
          />
        </g>
        <text x="50%" y="46%" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--color-ink-1)">
          {home}%
        </text>
        <text x="50%" y="63%" textAnchor="middle" fontSize="8" fill="var(--color-ink-3)">
          / {away}%
        </text>
      </svg>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[13px]">
          <span className="h-2.5 w-2.5 rounded-sm bg-brand" />
          <span className="font-semibold text-ink-1 font-mono tabular-nums">{home}%</span>
          <span className="text-ink-3">{homeLabel}</span>
        </div>
        <div className="flex items-center gap-2 text-[13px]">
          <span className="h-2.5 w-2.5 rounded-sm bg-bad" />
          <span className="font-semibold text-ink-1 font-mono tabular-nums">{away}%</span>
          <span className="text-ink-3">{awayLabel}</span>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [matchId, setMatchId] = useState(matches[0].id);
  const match = useMemo(() => matches.find((m) => m.id === matchId), [matchId]);

  const homeTeam = teams[match.home];
  const awayTeam = teams[match.away];
  const homePossession = 58;
  const awayPossession = 42;

  const topPlayers = useMemo(
    () => [...players].sort((a, b) => b.avgDecisionQuality - a.avgDecisionQuality).slice(0, 5),
    []
  );

  const totalDecisions = useMemo(
    () => matches.reduce((sum, m) => sum + m.decisionsAnalyzed, 0),
    []
  );
  const avgDecisionQuality = useMemo(
    () => matches.reduce((sum, m) => sum + m.avgDecisionQuality, 0) / matches.length,
    []
  );
  const qLabel = qualityLabel(avgDecisionQuality);

  return (
    <div>
      <PageHeader
        title="Match Overview"
        subtitle="Decision intelligence across analyzed World Cup fixtures"
        action={
          <div className="relative">
            <select
              value={matchId}
              onChange={(e) => setMatchId(e.target.value)}
              className="appearance-none bg-surface-2 border border-border rounded-lg pl-3 pr-9 py-2 text-[13px] font-medium text-ink-1 outline-none focus:border-brand cursor-pointer"
            >
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {teams[m.home].short} vs {teams[m.away].short} &mdash; {m.stage}
                </option>
              ))}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
          </div>
        }
      />

      {/* Top stat row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        <Card>
          <p className="text-[12px] text-ink-3 font-medium mb-3">Possession</p>
          <PossessionDonut
            home={homePossession}
            away={awayPossession}
            homeLabel={homeTeam.short}
            awayLabel={awayTeam.short}
          />
        </Card>

        <Card>
          <p className="text-[12px] text-ink-3 font-medium mb-2">Decision Quality (Avg)</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-ink-1 font-mono tabular-nums tracking-tight">
              {avgDecisionQuality.toFixed(2)}
            </span>
          </div>
          <Pill tone={qLabel.tone} className="mt-2">{qLabel.label}</Pill>
        </Card>

        <Card>
          <p className="text-[12px] text-ink-3 font-medium mb-2">Total Decisions Analyzed</p>
          <span className="text-3xl font-semibold text-ink-1 font-mono tabular-nums tracking-tight">
            {totalDecisions.toLocaleString()}
          </span>
          <p className="text-[12px] text-ink-3 mt-2">In this match: {match.decisionsAnalyzed.toLocaleString()}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Decision Quality Distribution">
          <div className="h-64 -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={decisionQualityDistribution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-soft)" vertical={false} />
                <XAxis
                  dataKey="bucket"
                  tick={{ fill: 'var(--color-ink-3)', fontSize: 11 }}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--color-ink-3)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                  width={34}
                />
                <Tooltip
                  cursor={{ fill: 'var(--color-surface-2)' }}
                  contentStyle={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'var(--color-ink-2)' }}
                  formatter={(v) => [`${v}%`, 'Share']}
                />
                <Bar dataKey="pct" radius={[3, 3, 0, 0]} maxBarSize={44}>
                  {decisionQualityDistribution.map((_, i) => (
                    <Cell key={i} fill={bucketColors[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11.5px] text-ink-3 text-center -mt-1">Decision Quality Score</p>
        </Card>

        <Card title="Top Players by Decision Quality">
          <ul className="divide-y divide-border-soft">
            {topPlayers.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5">
                <span className="w-4 text-[12px] font-semibold text-ink-3 font-mono tabular-nums">{i + 1}</span>
                <div className="h-8 w-8 rounded-full bg-surface-3 border border-border flex items-center justify-center text-[11px] font-bold text-ink-2">
                  {p.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-medium text-ink-1 truncate">{p.name}</p>
                  <p className="text-[11.5px] text-ink-3">{teams[p.team].name}</p>
                </div>
                <span className="text-[13.5px] font-semibold text-ink-1 font-mono tabular-nums">
                  {p.avgDecisionQuality.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
          <button className="mt-4 w-full rounded-lg bg-brand text-white text-[13px] font-semibold py-2.5 hover:bg-brand-strong transition-colors">
            View Full Report
          </button>
        </Card>
      </div>
    </div>
  );
}