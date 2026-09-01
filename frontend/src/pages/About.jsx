import { Database, GitBranch, Cpu, LineChart } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/ui';

const stages = [
  {
    icon: Database,
    title: 'Data Ingestion',
    body:
      'Match event JSON and 360\u00b0 freeze-frame data are collected from StatsBomb Open Data, matching event.id \u2194 event_uuid to link on-ball actions with tracked player positions.',
  },
  {
    icon: GitBranch,
    title: 'Sequence Reconstruction',
    body:
      'Related events are chained into possession sequences (Pass \u2192 Ball Receipt \u2192 Carry \u2192 Pressure \u2192 Pass), preserving spatial and contextual features at each decision point.',
  },
  {
    icon: Cpu,
    title: 'Value Estimation',
    body:
      'A model estimates the expected outcome value of a decision given the game state \u2014 player positions, pressure, and pass characteristics. This is the piece still being finalized.',
  },
  {
    icon: LineChart,
    title: 'Counterfactual Comparison',
    body:
      'Plausible alternative actions are generated for the same game state, valued with the same model, and compared against what was actually played.',
  },
];

export default function About() {
  return (
    <div>
      <PageHeader
        title="About"
        subtitle="Counterfactual Football Intelligence \u2014 project overview"
      />

      <Card className="mb-5">
        <p className="text-[13.5px] text-ink-2 leading-relaxed">
          This project analyzes player decision-making in context, rather than relying on traditional box-score
          statistics. Using StatsBomb's 2022 FIFA World Cup dataset \u2014 the 64 matches with 360\u00b0 freeze-frame
          data \u2014 the pipeline reconstructs on-ball possession sequences and evaluates each decision against
          the alternatives that were realistically available at that moment.
        </p>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stages.map((s, i) => (
          <Card key={i}>
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-surface-3 border border-border text-ink-2 flex items-center justify-center shrink-0">
                <s.icon size={16} strokeWidth={2} />
              </div>
              <div>
                <p className="text-[13.5px] font-semibold text-ink-1">{s.title}</p>
                <p className="text-[12.5px] text-ink-3 mt-1 leading-relaxed">{s.body}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-5">
        <p className="text-[12.5px] text-ink-3 leading-relaxed">
          <span className="text-ink-2 font-medium">Status:</span> data-understanding and processing stage.
          Event-to-360 linkage and sequence reconstruction are confirmed working. The ML target, feature set,
          model architecture, and counterfactual-generation method are not yet finalized \u2014 the frontend
          shown here uses representative mock data so the interface can be designed ahead of the modeling work.
        </p>
      </Card>
    </div>
  );
}
