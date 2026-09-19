import { useMemo } from 'react';
import { Download } from 'lucide-react';
import { Panel, Toolbar, Button, Th, Td, Loading, DataError } from '../components/ui';
import { useFootballData, formatMatchTime } from '../data/footballData';

export default function Reports() {
  const { data, loading, error } = useFootballData();

  const summary = useMemo(() => {
    if (!data) return null;
    const values = data.decisions.map((d) => d.actualValue);
    const avg = values.reduce((a, b) => a + b, 0) / (values.length || 1);
    const better = data.decisions.filter((d) => d.gap > 0);
    const widest = [...data.decisions].sort((a, b) => b.gap - a.gap)[0] || null;
    return { avg, better, widest };
  }, [data]);

  if (loading) return <Loading what="report data" />;
  if (error) return <DataError message={error} />;

  const download = (scope) => {
    const base = {
      match: data.match,
      generated_at: new Date().toISOString(),
      decision_points: data.match.decisions,
      average_decision_value: summary.avg,
      decisions_with_better_option: summary.better.length,
      largest_gap: summary.widest?.gap ?? 0,
    };

    const payload =
      scope === 'players'
        ? {
            ...base,
            players: data.players.map((p) => ({
              name: p.name,
              team: p.team,
              decisions: p.decisionCount,
              average_value: p.avgValue,
              better_options_pct: p.betterOptionsPct,
            })),
          }
        : {
            ...base,
            decisions: data.decisions.map((d) => ({
              event_id: d.id,
              player: d.player,
              team: d.team,
              timestamp: d.timestamp,
              action: d.actual?.type,
              actual_value: d.actualValue,
              best_alternative: d.best ? Number(d.best.predicted_value) : null,
              gap: d.gap,
            })),
          };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `football-iq-${data.match.id}-${scope}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Toolbar
        title="Reports"
        meta={`Computed from match ${data.match.id} at load time — nothing is cached server-side`}
      >
        <Button variant="solid" onClick={() => download('decisions')}>
          <Download size={14} />
          Export decisions
        </Button>
        <Button onClick={() => download('players')}>
          <Download size={14} />
          Export players
        </Button>
      </Toolbar>

      <Panel padded={false} className="mb-4">
        <div className="grid grid-cols-2 divide-x divide-line-2 sm:grid-cols-4">
          {[
            ['Decision points', data.match.decisions.toLocaleString()],
            ['Mean decision value', summary.avg.toFixed(1)],
            ['Better option available', summary.better.length.toLocaleString()],
            ['Largest single gap', (summary.widest?.gap ?? 0).toFixed(1)],
          ].map(([label, value]) => (
            <div key={label} className="p-4">
              <div className="cond num text-[26px] leading-none text-ink">{value}</div>
              <div className="mt-1 text-[12px] text-ink-3">{label}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title="Squad report"
        meta="Every player the model scored, ordered by mean decision value"
        padded={false}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                <Th>Player</Th>
                <Th>Team</Th>
                <Th align="right">Events</Th>
                <Th align="right">Decisions</Th>
                <Th align="right">Mean value</Th>
                <Th align="right">Better option</Th>
                <Th align="right">Mean gap</Th>
              </tr>
            </thead>
            <tbody>
              {[...data.players]
                .filter((p) => p.decisionCount > 0)
                .sort((a, b) => b.avgValue - a.avgValue)
                .map((p) => (
                  <tr key={p.name} className="hover:bg-panel-2">
                    <Td className="font-medium">{p.name}</Td>
                    <Td className="text-ink-3">{p.team}</Td>
                    <Td align="right" className="text-ink-3">
                      {p.actions.length}
                    </Td>
                    <Td align="right">{p.decisionCount}</Td>
                    <Td align="right" className="font-semibold">
                      {p.avgValue.toFixed(1)}
                    </Td>
                    <Td align="right">{p.betterOptionsPct.toFixed(0)}%</Td>
                    <Td align="right" className={p.avgGap > 0 ? 'text-alt' : 'text-ink-3'}>
                      {p.avgGap.toFixed(1)}
                    </Td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <p className="mt-4 text-[12px] text-ink-3">
        Widest gap in the match: {summary.widest?.player || '—'} at{' '}
        {formatMatchTime(summary.widest?.timestamp)}, {(summary.widest?.gap ?? 0).toFixed(1)} above
        the action taken.
      </p>
    </div>
  );
}
