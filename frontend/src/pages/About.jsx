import { Panel, Toolbar, Loading, DataError } from '../components/ui';
import { useFootballData } from '../data/footballData';

export default function About() {
  const { data, loading, error } = useFootballData();

  if (loading) return <Loading what="project data" />;
  if (error) return <DataError message={error} />;

  /* A numbered list is right here: this genuinely is a pipeline, and each
     stage only makes sense after the one before it. */
  const stages = [
    [
      'Link events to positions',
      `Each on-ball event is matched to its 360° freeze frame through the event id, giving the positions of every tracked teammate and opponent at that instant. ${data.match.actions.toLocaleString()} events carry that context in this match.`,
    ],
    [
      'Rebuild possessions',
      `Events are chained back into ${data.match.possessions} possession sequences, so a pass is read together with the carry that set it up and the pressure applied to it.`,
    ],
    [
      'Score what happened',
      'The value model scores the action the player chose, given the state of the pitch at that moment. The interface shows the saved model output; it does not compute a score of its own.',
    ],
    [
      'Generate the alternatives',
      `For ${data.match.decisions.toLocaleString()} decision points, plausible alternative passes are generated from the same freeze frame and scored the same way. The difference between the best alternative and the actual action is the decision gap.`,
    ],
  ];

  return (
    <div>
      <Toolbar
        title="How this works"
        meta="Football IQ estimates what was available to a player at the moment they had the ball"
      />

      <Panel className="mb-4">
        <p className="max-w-[68ch] text-[14px] leading-relaxed text-ink-2">
          A decision gap is not a mistake. It says the model rated another option more highly given
          what it could see, which is a partial view: it has positions, not intent, fatigue, the
          shout from a teammate, or what the player knew about the opponent in front of them. Read
          it as a prompt to look at the clip, not as a verdict.
        </p>
      </Panel>

      <Panel padded={false}>
        <ol className="divide-y divide-line-2">
          {stages.map(([title, body], i) => (
            <li key={title} className="flex gap-4 p-4">
              <span className="cond num w-6 shrink-0 text-[20px] leading-none text-ink-3">
                {i + 1}
              </span>
              <div>
                <h3 className="cond text-[16px] leading-tight text-ink">{title}</h3>
                <p className="mt-1 max-w-[64ch] text-[13.5px] leading-relaxed text-ink-2">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel className="mt-4" title="Data in this build">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ['Events', data.match.actions.toLocaleString()],
            ['Possessions', data.match.possessions.toLocaleString()],
            ['Decision points', data.match.decisions.toLocaleString()],
            ['Players', data.players.length],
          ].map(([label, value]) => (
            <div key={label}>
              <dd className="cond num text-[24px] leading-none text-ink">{value}</dd>
              <dt className="mt-1 text-[12px] text-ink-3">{label}</dt>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  );
}
