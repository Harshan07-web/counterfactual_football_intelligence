import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Panel,
  Toolbar,
  Stat,
  StatRow,
  Th,
  Td,
  Loading,
  DataError,
  Button,
} from '../components/ui';
import { useFootballData, formatMatchTime, initials } from '../data/footballData';

/* Mirrored bars, read outward from the middle. This is how a match stats
   panel compares two sides and it needs no legend. */
function TeamCompare({ label, home, away, format = (v) => v.toFixed(1) }) {
  const total = home + away || 1;
  const homeShare = (home / total) * 100;

  return (
    <div className="py-2.5">
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="num cond text-[17px] text-ink">{format(home)}</span>
        <span className="text-[12.5px] text-ink-3">{label}</span>
        <span className="num cond text-[17px] text-ink">{format(away)}</span>
      </div>
      <div className="mt-1.5 flex h-[5px] gap-[2px]">
        <div className="flex flex-1 justify-end bg-panel-3">
          <div className="h-full bg-ink-2" style={{ width: `${homeShare}%` }} />
        </div>
        <div className="flex flex-1 bg-panel-3">
          <div className="h-full bg-ink-3" style={{ width: `${100 - homeShare}%` }} />
        </div>
      </div>
    </div>
  );
}

function Distribution({ decisions }) {
  const buckets = useMemo(() => {
    const edges = [0, 20, 40, 60, 80, 100];
    const counts = new Array(5).fill(0);
    for (const d of decisions) {
      const v = d.actualValue;
      const i = v < 20 ? 0 : v < 40 ? 1 : v < 60 ? 2 : v < 80 ? 3 : 4;
      counts[i] += 1;
    }
    const max = Math.max(...counts, 1);
    return counts.map((count, i) => ({
      range: `${edges[i]}–${edges[i + 1]}`,
      count,
      height: (count / max) * 100,
      share: decisions.length ? (count / decisions.length) * 100 : 0,
    }));
  }, [decisions]);

  return (
    <div>
      <div className="flex h-[150px] items-end gap-2">
        {buckets.map((b) => (
          <div key={b.range} className="flex flex-1 flex-col items-center justify-end gap-1.5">
            <span className="num text-[12px] text-ink-3">{b.count}</span>
            <div
              className="w-full bg-ink-2"
              style={{ height: `${Math.max(2, b.height)}%` }}
              title={`${b.count} decisions (${b.share.toFixed(1)}%)`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 border-t border-line pt-2">
        {buckets.map((b) => (
          <span key={b.range} className="num flex-1 text-center text-[11.5px] text-ink-3">
            {b.range}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, loading, error } = useFootballData();

  const summary = useMemo(() => {
    if (!data) return null;
    const values = data.decisions.map((d) => d.actualValue);
    const avg = values.reduce((a, b) => a + b, 0) / (values.length || 1);
    const better = data.decisions.filter((d) => d.gap > 0);
    const missed = [...data.decisions].sort((a, b) => b.gap - a.gap).slice(0, 8);
    const top = [...data.players]
      .filter((p) => p.decisionCount >= 5)
      .sort((a, b) => b.avgValue - a.avgValue)
      .slice(0, 8);
    return { avg, better, missed, top };
  }, [data]);

  if (loading) return <Loading />;
  if (error) return <DataError message={error} />;

  const [home, away] = data.teamStats;

  return (
    <div>
      <Toolbar
        title="Match report"
        meta={`${data.match.possessions} possession sequences reconstructed from the 360° event feed`}
      >
        <Link to="/decision-analysis">
          <Button variant="solid">Open decision analysis</Button>
        </Link>
      </Toolbar>

      <Panel padded={false} className="mb-4">
        <StatRow className="p-4">
          <div className="pr-4">
            <Stat label="Decision points" value={data.match.decisions.toLocaleString()} />
          </div>
          <div className="px-4">
            <Stat label="Events with 360° context" value={data.match.actions.toLocaleString()} />
          </div>
          <div className="px-4">
            <Stat label="Mean decision value" value={summary.avg.toFixed(1)} />
          </div>
          <div className="px-4">
            <Stat
              label="Had a better option"
              value={summary.better.length.toLocaleString()}
              delta={`${((summary.better.length / data.match.decisions) * 100).toFixed(0)}% of all decisions`}
              tone="alt"
            />
          </div>
        </StatRow>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
        <div className="space-y-4">
          <Panel
            title="Where the model disagreed most"
            meta="Largest gap between the actual decision and the best generated alternative"
            padded={false}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse">
                <thead>
                  <tr>
                    <Th className="w-14">Min</Th>
                    <Th>Player</Th>
                    <Th>Action</Th>
                    <Th align="right">Actual</Th>
                    <Th align="right">Best alt</Th>
                    <Th align="right">Gap</Th>
                  </tr>
                </thead>
                <tbody>
                  {summary.missed.map((d) => (
                    <tr key={d.id} className="hover:bg-panel-2">
                      <Td className="num text-ink-3">{formatMatchTime(d.timestamp)}</Td>
                      <Td>
                        <Link
                          to={`/decision-analysis?event=${d.id}`}
                          className="font-medium text-ink hover:text-alt"
                        >
                          {d.player || 'Unknown'}
                        </Link>
                        <span className="ml-2 text-[12px] text-ink-3">{d.team}</span>
                      </Td>
                      <Td className="capitalize text-ink-2">{d.actual?.type || '—'}</Td>
                      <Td align="right">{d.actualValue.toFixed(1)}</Td>
                      <Td align="right">
                        {d.best ? Number(d.best.predicted_value).toFixed(1) : '—'}
                      </Td>
                      <Td align="right" className="font-semibold text-alt">
                        +{d.gap.toFixed(1)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel
            title="Decision value distribution"
            meta="Model value assigned to the action the player actually chose"
          >
            <Distribution decisions={data.decisions} />
          </Panel>
        </div>

        <div className="space-y-4">
          {home && away && (
            <Panel title="Team comparison">
              <div className="mb-1 flex items-center justify-between">
                <span className="cond text-[15px] text-ink">{home.code}</span>
                <span className="cond text-[15px] text-ink">{away.code}</span>
              </div>
              <div className="divide-y divide-line-2">
                <TeamCompare label="Decisions modelled" home={home.decisions} away={away.decisions} format={(v) => v.toLocaleString()} />
                <TeamCompare label="Mean decision value" home={home.avgValue} away={away.avgValue} />
                <TeamCompare
                  label="Better option available"
                  home={home.betterOptionsPct}
                  away={away.betterOptionsPct}
                  format={(v) => `${v.toFixed(0)}%`}
                />
                <TeamCompare label="Passes" home={home.passes} away={away.passes} format={(v) => v.toLocaleString()} />
              </div>
            </Panel>
          )}

          <Panel title="Best decision makers" meta="Minimum five modelled decisions" padded={false}>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th className="w-8">#</Th>
                  <Th>Player</Th>
                  <Th align="right">Mean</Th>
                </tr>
              </thead>
              <tbody>
                {summary.top.map((p, i) => (
                  <tr key={p.name} className="hover:bg-panel-2">
                    <Td className="num text-ink-3">{i + 1}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="cond flex h-6 w-6 items-center justify-center rounded-full bg-panel-3 text-[11px] text-ink-2">
                          {initials(p.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{p.name}</span>
                          <span className="block text-[11.5px] text-ink-3">
                            {p.decisionCount} decisions
                          </span>
                        </span>
                      </div>
                    </Td>
                    <Td align="right" className="font-semibold">
                      {p.avgValue.toFixed(1)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>
      </div>

      <p className="mt-4 text-[12px] text-ink-3">
        Last event recorded at {formatMatchTime(data.match.lastTimestamp)}. Every figure on this
        page is computed from the match files at load time.
      </p>
    </div>
  );
}
