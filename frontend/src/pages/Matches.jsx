import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Panel, Toolbar, Tag, Th, Td, Loading, DataError } from '../components/ui';
import { useFootballData, teamCode } from '../data/footballData';

export default function Matches() {
  const { data, loading, error } = useFootballData();

  if (loading) return <Loading />;
  if (error) return <DataError message={error} />;

  const { match } = data;
  const [home, away] = match.teams;

  return (
    <div>
      <Toolbar title="Matches" meta="Fixtures processed into the counterfactual dataset" />

      <Panel padded={false} className="mb-4">
        <Link
          to="/decision-analysis"
          className="flex items-center gap-4 px-4 py-4 hover:bg-panel-2"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="cond w-11 text-right text-[16px] text-ink">{teamCode(home)}</span>
            <span className="cond num rounded-[3px] bg-panel-3 px-2.5 py-1 text-[17px] leading-none text-ink">
              {match.score[home] ?? 0} – {match.score[away] ?? 0}
            </span>
            <span className="cond w-11 text-[16px] text-ink">{teamCode(away)}</span>
            <span className="ml-3 hidden truncate text-[13px] text-ink-2 sm:block">
              {home} v {away}
            </span>
          </div>
          <Tag tone="pos">360° available</Tag>
          <ChevronRight size={16} className="shrink-0 text-ink-3" />
        </Link>

        <table className="w-full border-collapse border-t border-line-2">
          <thead>
            <tr>
              <Th>Match</Th>
              <Th align="right">Possessions</Th>
              <Th align="right">Events</Th>
              <Th align="right">Decisions</Th>
              <Th align="right">Players</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td className="num text-ink-3">{match.id}</Td>
              <Td align="right">{match.possessions.toLocaleString()}</Td>
              <Td align="right">{match.actions.toLocaleString()}</Td>
              <Td align="right">{match.decisions.toLocaleString()}</Td>
              <Td align="right">{data.players.length}</Td>
            </tr>
          </tbody>
        </table>
      </Panel>

      <Panel>
        <p className="text-[13px] leading-relaxed text-ink-2">
          One match is loaded. To add another, drop its sequence and counterfactual files into{' '}
          <code className="rounded-[2px] bg-panel-2 px-1">public/data/</code> and point the two URLs
          at the top of <code className="rounded-[2px] bg-panel-2 px-1">data/footballData.js</code>{' '}
          at them.
        </p>
      </Panel>
    </div>
  );
}
