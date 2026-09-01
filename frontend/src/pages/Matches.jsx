import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Card, Pill } from '../components/ui';
import { matches, teams, qualityLabel } from '../data/mockData';

export default function Matches() {
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        title="Matches"
        subtitle={`${matches.length} fixtures with 360\u00b0 freeze-frame data available`}
      />

      <div className="grid grid-cols-1 gap-3">
        {matches.map((m) => {
          const home = teams[m.home];
          const away = teams[m.away];
          const q = qualityLabel(m.avgDecisionQuality);
          return (
            <Card key={m.id} onClick={() => navigate('/decision-analysis')}>
              <div className="flex flex-wrap items-center justify-between gap-4 py-1">
                <div className="flex items-center gap-4 min-w-[220px]">
                  <div className="text-right w-20">
                    <p className="text-[13.5px] font-semibold text-ink-1">{home.name}</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-surface-2 border border-border">
                    <span className="text-[15px] font-semibold text-ink-1 font-mono tabular-nums">{m.homeScore}</span>
                    <span className="text-ink-3">&ndash;</span>
                    <span className="text-[15px] font-semibold text-ink-1 font-mono tabular-nums">{m.awayScore}</span>
                  </div>
                  <div className="w-20">
                    <p className="text-[13.5px] font-semibold text-ink-1">{away.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-[12.5px] text-ink-3">
                  <span>{m.stage}</span>
                  <span>{m.date}</span>
                  {m.penalties && <span>Pens {m.penalties}</span>}
                </div>

                <div className="flex items-center gap-5">
                  <div className="text-right">
                    <p className="text-[11px] text-ink-3">Decisions</p>
                    <p className="text-[13px] font-semibold text-ink-1 font-mono tabular-nums">{m.decisionsAnalyzed.toLocaleString()}</p>
                  </div>
                  <div className="text-right w-20">
                    <p className="text-[11px] text-ink-3">Avg Quality</p>
                    <p className="text-[13px] font-semibold text-ink-1 font-mono tabular-nums">{m.avgDecisionQuality.toFixed(2)}</p>
                  </div>
                  <Pill tone={q.tone}>{q.label}</Pill>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
