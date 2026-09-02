import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/ui';
import { players } from '../data/mockData';

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateZones(seed) {
  const rand = seeded(seed);
  const cols = 12;
  const rows = 8;
  const zones = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // bias density toward attacking third for forwards, central for midfielders
      const bias = Math.max(0, 1 - Math.abs(c - 8) / 8) * 0.6 + rand() * 0.5;
      zones.push({ c, r, v: bias });
    }
  }
  return { cols, rows, zones };
}

export default function Heatmaps() {
  const [playerId, setPlayerId] = useState(players[0].id);
  const player = useMemo(() => players.find((p) => p.id === playerId), [playerId]);
  const grid = useMemo(() => generateZones(playerId.length * 17 + playerId.charCodeAt(0)), [playerId]);
  const maxV = Math.max(...grid.zones.map((z) => z.v));

  const cellW = 120 / grid.cols;
  const cellH = 80 / grid.rows;

  return (
    <div>
      <PageHeader
        title="Heatmaps"
        subtitle="Touch density derived from tracked event locations across analyzed matches"
        action={
          <div className="relative">
            <select
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              className="appearance-none bg-surface-2 border border-border rounded-lg pl-3 pr-9 py-2 text-[13px] font-medium text-ink-1 outline-none focus:border-brand cursor-pointer"
            >
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
          </div>
        }
      />

      <Card title={`${player.name} \u2014 Touch Map`}>
        <div className="rounded-lg overflow-hidden border border-border-soft">
          <svg viewBox="0 0 120 80" style={{ width: '100%', height: 420 }} preserveAspectRatio="xMidYMid meet">
            <rect x="0" y="0" width="120" height="80" fill="var(--pitch-fill)" />

            {grid.zones.map((z, i) => {
              const intensity = z.v / maxV;
              return (
                <rect
                  key={i}
                  x={z.c * cellW}
                  y={z.r * cellH}
                  width={cellW}
                  height={cellH}
                  fill="#6d5b95"
                  opacity={intensity * 0.6}
                />
              );
            })}

            <g stroke="var(--pitch-line)" strokeWidth="0.4" fill="none">
              <rect x="0.3" y="0.3" width="119.4" height="79.4" />
              <line x1="60" y1="0" x2="60" y2="80" />
              <circle cx="60" cy="40" r="9.15" />
              <rect x="0" y="18" width="18" height="44" />
              <rect x="0" y="30" width="6" height="20" />
              <rect x="102" y="18" width="18" height="44" />
              <rect x="114" y="30" width="6" height="20" />
            </g>
          </svg>
        </div>
        <p className="text-[12px] text-ink-3 mt-3">
          Density is illustrative, derived from mock touch locations for demo purposes. Once the pipeline
          ingests real StatsBomb event coordinates, this will reflect actual per-player positioning.
        </p>
      </Card>
    </div>
  );
}