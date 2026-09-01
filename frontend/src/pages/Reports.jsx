import { FileBarChart, Download } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/ui';
import { matches, players, teams } from '../data/mockData';

const reports = [
  {
    title: 'Tournament Decision Quality Summary',
    scope: 'All 8 analyzed matches',
    generated: '2024-04-02',
    stat: '0.27 avg decision quality',
  },
  {
    title: 'Top Underperforming Decisions',
    scope: 'Ranked by expected-value gap',
    generated: '2024-04-02',
    stat: '312 decisions with better alternatives',
  },
  {
    title: 'Player Comparison: Playmakers',
    scope: `${players.length} midfielders & forwards`,
    generated: '2024-03-29',
    stat: 'Modric leads at 0.63',
  },
  {
    title: 'Final: Argentina vs France — Full Breakdown',
    scope: `${teams.ARG.name} vs ${teams.FRA.name}`,
    generated: '2024-03-27',
    stat: '1,842 decisions analyzed',
  },
];

export default function Reports() {
  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Generated summaries of decision-quality analysis across matches and players"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((r, i) => (
          <Card key={i}>
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-brand-soft text-brand flex items-center justify-center shrink-0">
                <FileBarChart size={17} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-ink-1">{r.title}</p>
                <p className="text-[12.5px] text-ink-3 mt-0.5">{r.scope}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[12px] text-ink-2 font-medium">{r.stat}</span>
                  <span className="text-[11.5px] text-ink-3 font-mono tabular-nums">{r.generated}</span>
                </div>
              </div>
            </div>
            <button className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-surface-2 border border-border text-ink-1 text-[13px] font-semibold py-2 hover:bg-surface-3 transition-colors">
              <Download size={14} /> Export PDF
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
