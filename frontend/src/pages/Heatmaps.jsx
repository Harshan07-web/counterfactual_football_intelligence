import { useMemo, useState } from 'react';
import { Panel, Toolbar, Select, Loading, DataError } from '../components/ui';
import { useFootballData } from '../data/footballData';

const COLS = 12;
const ROWS = 8;

function HeatPitch({ locations }) {
  const cells = useMemo(() => {
    const cellW = 120 / COLS;
    const cellH = 80 / ROWS;
    const grid = Array.from({ length: COLS * ROWS }, (_, i) => ({
      x: (i % COLS) * cellW,
      y: Math.floor(i / COLS) * cellH,
      n: 0,
    }));
    for (const [x, y] of locations) {
      const c = Math.max(0, Math.min(COLS - 1, Math.floor(x / cellW)));
      const r = Math.max(0, Math.min(ROWS - 1, Math.floor(y / cellH)));
      grid[r * COLS + c].n += 1;
    }
    const max = Math.max(1, ...grid.map((g) => g.n));
    return { grid, max, cellW, cellH };
  }, [locations]);

  return (
    <svg viewBox="0 0 120 80" className="block h-auto w-full" preserveAspectRatio="xMidYMid meet">
      <rect width="120" height="80" fill="var(--pitch)" />

      {cells.grid.map((c, i) => (
        <rect
          key={i}
          x={c.x}
          y={c.y}
          width={cells.cellW}
          height={cells.cellH}
          fill="#ffffff"
          opacity={c.n ? 0.06 + 0.62 * (c.n / cells.max) : 0}
        />
      ))}

      <g stroke="var(--pitch-line)" strokeWidth="0.35" fill="none">
        <rect x="0.4" y="0.4" width="119.2" height="79.2" />
        <line x1="60" y1="0.4" x2="60" y2="79.6" />
        <circle cx="60" cy="40" r="9.15" />
        <rect x="0.4" y="18" width="17.6" height="44" />
        <rect x="0.4" y="30" width="5.6" height="20" />
        <rect x="102" y="18" width="17.6" height="44" />
        <rect x="114" y="30" width="5.6" height="20" />
      </g>
      <circle cx="60" cy="40" r="0.45" fill="var(--pitch-line)" />
    </svg>
  );
}

export default function Heatmaps() {
  const { data, loading, error } = useFootballData();
  const [team, setTeam] = useState('all');
  const [name, setName] = useState('');

  const roster = useMemo(() => {
    if (!data) return [];
    return data.players.filter((p) => team === 'all' || p.team === team);
  }, [data, team]);

  const player = useMemo(() => roster.find((p) => p.name === name) || roster[0], [roster, name]);

  if (loading) return <Loading what="positional data" />;
  if (error) return <DataError message={error} />;
  if (!player) {
    return (
      <div>
        <Toolbar title="Heatmaps" />
        <Panel>
          <p className="text-[13.5px] text-ink-2">No tracked players in this team.</p>
        </Panel>
      </div>
    );
  }

  const zones = [
    ['Defensive third', player.locations.filter(([x]) => x < 40).length],
    ['Middle third', player.locations.filter(([x]) => x >= 40 && x < 80).length],
    ['Final third', player.locations.filter(([x]) => x >= 80).length],
  ];
  const totalLocations = player.locations.length || 1;

  return (
    <div>
      <Toolbar title="Heatmaps" meta="On-ball event locations taken straight from the match feed">
        <Select value={team} onChange={(e) => setTeam(e.target.value)} label="Filter by team">
          <option value="all">Both teams</option>
          {data.teams.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select value={player.name} onChange={(e) => setName(e.target.value)} label="Select player">
          {roster.map((p) => (
            <option key={p.name}>{p.name}</option>
          ))}
        </Select>
      </Toolbar>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
        <Panel padded={false}>
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line-2 px-4 py-2.5">
            <h2 className="cond text-[17px] leading-tight text-ink">{player.name}</h2>
            <p className="num text-[12.5px] text-ink-3">
              {player.locations.length} on-ball locations
            </p>
          </div>

          <HeatPitch locations={player.locations} />

          <div className="flex items-center justify-between border-t border-line-2 px-4 py-2 text-[12px] text-ink-3">
            <span>Own goal</span>
            <span className="flex items-center gap-2">
              Attacking direction
              <svg width="42" height="8" aria-hidden="true">
                <line x1="0" y1="4" x2="34" y2="4" stroke="currentColor" strokeWidth="1" />
                <path d="M34 1 L41 4 L34 7 Z" fill="currentColor" />
              </svg>
            </span>
            <span>Opponent goal</span>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Territory">
            <div className="space-y-3">
              {zones.map(([label, count]) => (
                <div key={label}>
                  <div className="flex items-baseline justify-between text-[12.5px]">
                    <span className="text-ink-2">{label}</span>
                    <span className="num text-ink-3">
                      {count} · {((count / totalLocations) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <span className="mt-1 block h-[6px] bg-panel-3">
                    <span
                      className="block h-full bg-ink-2"
                      style={{ width: `${(count / totalLocations) * 100}%` }}
                    />
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Involvement" padded={false}>
            <dl className="divide-y divide-line-2">
              {[
                ['Events on the ball', player.actions.length],
                ['Decisions modelled', player.decisionCount],
                ['Passes', player.actions.filter((a) => a.action === 'pass').length],
                ['Carries', player.actions.filter((a) => a.action === 'carry').length],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between px-4 py-2">
                  <dt className="text-[12.5px] text-ink-3">{label}</dt>
                  <dd className="num text-[13.5px] font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <p className="text-[12px] leading-relaxed text-ink-3">
            Shading is the share of this player&rsquo;s recorded events falling in each zone of the
            pitch. Nothing is smoothed or interpolated.
          </p>
        </div>
      </div>
    </div>
  );
}
