import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Panel, Toolbar, Select, Th, Td, Loading, DataError, Tag } from '../components/ui';
import { useFootballData, formatMatchTime, initials, qualityLabel } from '../data/footballData';

/* Small inline chart: one bar per decision in match order. Dense enough to
   show a run of poor decisions, small enough to sit inside a panel header. */
function ValueTrace({ decisions }) {
  const recent = decisions.slice(-40);
  if (!recent.length) return null;

  return (
    <div className="flex h-[92px] items-end gap-[2px]">
      {recent.map((d) => (
        <div
          key={d.id}
          className="flex-1 bg-ink-2"
          style={{ height: `${Math.max(2, d.actualValue)}%`, opacity: d.gap > 0 ? 0.45 : 1 }}
          title={`${formatMatchTime(d.timestamp)} — ${d.actualValue.toFixed(1)}`}
        />
      ))}
    </div>
  );
}

export default function PlayerAnalysis() {
  const { data, loading, error } = useFootballData();
  const [team, setTeam] = useState('all');
  const [name, setName] = useState('');

  const squad = useMemo(() => {
    if (!data) return [];
    return data.players
      .filter((p) => team === 'all' || p.team === team)
      .filter((p) => p.decisionCount > 0)
      .sort((a, b) => b.decisionCount - a.decisionCount);
  }, [data, team]);

  const player = useMemo(
    () => squad.find((p) => p.name === name) || squad[0] || null,
    [squad, name]
  );

  if (loading) return <Loading what="player data" />;
  if (error) return <DataError message={error} />;
  if (!player) {
    return (
      <div>
        <Toolbar title="Players" />
        <Panel>
          <p className="text-[13.5px] text-ink-2">No players with modelled decisions in this team.</p>
        </Panel>
      </div>
    );
  }

  const quality = qualityLabel(player.avgValue);

  const actionMix = Object.entries(
    player.decisions.reduce((acc, d) => {
      const key = d.actual?.type || 'other';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const maxMix = actionMix[0]?.[1] || 1;

  return (
    <div>
      <Toolbar title="Players" meta="Ranked by the number of decisions the model could score">
        <Select value={team} onChange={(e) => setTeam(e.target.value)} label="Filter by team">
          <option value="all">Both teams</option>
          {data.teams.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </Toolbar>

      <div className="grid gap-4 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
        <Panel padded={false} className="lg:max-h-[720px] lg:overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-panel">
              <tr>
                <Th>Player</Th>
                <Th align="right">Dec</Th>
                <Th align="right">Mean</Th>
              </tr>
            </thead>
            <tbody>
              {squad.map((p) => {
                const active = p.name === player.name;
                return (
                  <tr
                    key={p.name}
                    onClick={() => setName(p.name)}
                    className={`cursor-pointer ${active ? 'bg-panel-3' : 'hover:bg-panel-2'}`}
                  >
                    <Td>
                      <span className="block truncate font-medium">{p.name}</span>
                      <span className="block text-[11.5px] text-ink-3">{p.team}</span>
                    </Td>
                    <Td align="right" className="text-ink-3">
                      {p.decisionCount}
                    </Td>
                    <Td align="right" className="font-semibold">
                      {p.avgValue.toFixed(1)}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>

        <div className="space-y-4">
          <Panel padded={false}>
            <div className="flex flex-wrap items-center gap-4 border-b border-line-2 p-4">
              <span className="cond flex h-12 w-12 items-center justify-center rounded-full bg-panel-3 text-[16px] text-ink-2">
                {initials(player.name)}
              </span>
              <div className="min-w-0">
                <h2 className="cond text-[22px] leading-tight text-ink">{player.name}</h2>
                <p className="text-[12.5px] text-ink-3">
                  {player.team} — {player.actions.length} events on the ball
                </p>
              </div>
              <div className="ml-auto">
                <Tag tone={quality.tone}>{quality.label} decision making</Tag>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-line-2 sm:grid-cols-4">
              {[
                ['Mean value', player.avgValue.toFixed(1)],
                ['Decisions', player.decisionCount],
                ['Better option', `${player.betterOptionsPct.toFixed(0)}%`],
                ['Mean gap', player.avgGap.toFixed(1)],
              ].map(([label, value]) => (
                <div key={label} className="p-4">
                  <div className="cond num text-[24px] leading-none text-ink">{value}</div>
                  <div className="mt-1 text-[12px] text-ink-3">{label}</div>
                </div>
              ))}
            </div>
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Decision value in sequence" meta="Last 40 decisions, faded where a better option existed">
              <ValueTrace decisions={player.decisions} />
            </Panel>

            <Panel title="Action mix">
              <div className="space-y-2">
                {actionMix.slice(0, 6).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 truncate text-[12.5px] capitalize text-ink-2">
                      {type}
                    </span>
                    <span className="h-[6px] flex-1 bg-panel-3">
                      <span
                        className="block h-full bg-ink-2"
                        style={{ width: `${(count / maxMix) * 100}%` }}
                      />
                    </span>
                    <span className="num w-8 text-right text-[12.5px] text-ink-3">{count}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <Panel title="Decision log" meta="Most recent first" padded={false}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse">
                <thead>
                  <tr>
                    <Th className="w-14">Min</Th>
                    <Th>Action</Th>
                    <Th>Outcome</Th>
                    <Th align="right">Value</Th>
                    <Th align="right">Gap</Th>
                    <Th align="right" className="w-16" />
                  </tr>
                </thead>
                <tbody>
                  {[...player.decisions]
                    .reverse()
                    .slice(0, 14)
                    .map((d) => (
                      <tr key={d.id} className="hover:bg-panel-2">
                        <Td className="num text-ink-3">{formatMatchTime(d.timestamp)}</Td>
                        <Td className="capitalize">{d.actual?.type || '—'}</Td>
                        <Td className="text-ink-3">{d.actual?.outcome || '—'}</Td>
                        <Td align="right" className="font-semibold">
                          {d.actualValue.toFixed(1)}
                        </Td>
                        <Td align="right" className={d.gap > 0 ? 'text-alt' : 'text-ink-3'}>
                          {d.gap > 0 ? '+' : ''}
                          {d.gap.toFixed(1)}
                        </Td>
                        <Td align="right">
                          <Link
                            to={`/decision-analysis?event=${d.id}`}
                            className="text-[12.5px] font-medium text-ink-2 hover:text-alt"
                          >
                            View
                          </Link>
                        </Td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
