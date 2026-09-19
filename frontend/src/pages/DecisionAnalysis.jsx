import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, RotateCcw } from 'lucide-react';
import Pitch from '../components/Pitch';
import Timeline from '../components/Timeline';
import { Panel, Toolbar, Button, Select, Th, Td, Loading, DataError } from '../components/ui';
import { useFootballData, formatMatchTime, toPoint } from '../data/footballData';

function freezeFrameOf(action) {
  const context = action?.context || {};
  const points = (list) =>
    Array.isArray(list)
      ? list
          .filter((p) => Array.isArray(p?.position) && p.position.length >= 2)
          .map((p, i) => ({
            id: p?.id || i,
            name: p?.name,
            x: Number(p.position[0]),
            y: Number(p.position[1]),
            keeper: Boolean(p?.keeper),
          }))
      : [];
  return { teammates: points(context.teammates), opponents: points(context.opponents) };
}

function nearestTeammate(candidate, action) {
  const target = candidate?.target_location;
  const teammates = action?.context?.teammates;
  if (!Array.isArray(target) || !Array.isArray(teammates)) return null;
  let best = null;
  let bestDistance = Infinity;
  for (const teammate of teammates) {
    const position = teammate?.position;
    if (!Array.isArray(position) || position.length < 2) continue;
    const distance = Math.hypot(position[0] - target[0], position[1] - target[1]);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = teammate;
    }
  }
  return best?.name || null;
}

function Legend({ showAlt }) {
  const items = [
    ['Teammate', <span key="a" className="h-2.5 w-2.5 rounded-full bg-ink-2" />],
    [
      'Opponent',
      <span key="b" className="h-2.5 w-2.5 rounded-full border-[1.5px] border-ink-2" />,
    ],
    ['Ball carrier and actual pass', <span key="c" className="h-2.5 w-2.5 rounded-full bg-actual" />],
  ];
  if (showAlt) {
    items.push([
      'Alternative target',
      <span key="d" className="h-2.5 w-2.5 rounded-full border-[1.5px] border-alt bg-alt" />,
    ]);
  }
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] text-ink-3">
      {items.map(([label, swatch]) => (
        <span key={label} className="flex items-center gap-1.5">
          {swatch}
          {label}
        </span>
      ))}
    </div>
  );
}

function Fact({ label, value, tone }) {
  return (
    <div className="flex items-baseline justify-between border-b border-line-2 py-1.5 last:border-0">
      <span className="text-[12.5px] text-ink-3">{label}</span>
      <span
        className={`num text-[13.5px] font-medium ${
          tone === 'alt' ? 'text-alt' : tone === 'pos' ? 'text-pos' : 'text-ink'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function DecisionAnalysis() {
  const { data, loading, error } = useFootballData();
  const [searchParams, setSearchParams] = useSearchParams();

  const [decisionId, setDecisionId] = useState('');
  const [team, setTeam] = useState('all');
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [showAlt, setShowAlt] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [ballAt, setBallAt] = useState(null);

  const decisions = useMemo(() => {
    if (!data) return [];
    return data.decisions.filter(
      (d) => (team === 'all' || d.team === team) && (!onlyGaps || d.gap > 0)
    );
  }, [data, team, onlyGaps]);

  useEffect(() => {
    if (!decisions.length) return;
    const requested = searchParams.get('event');
    const match = decisions.find((d) => d.id === requested);
    if (match) {
      setDecisionId(match.id);
      return;
    }
    if (!decisions.some((d) => d.id === decisionId)) setDecisionId(decisions[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decisions]);

  const decision = useMemo(
    () => decisions.find((d) => d.id === decisionId) || decisions[0] || null,
    [decisions, decisionId]
  );

  const action = decision?.action || null;
  const freezeFrame = useMemo(() => freezeFrameOf(action), [action]);

  const origin = useMemo(() => {
    if (Array.isArray(action?.location)) return toPoint(action.location);
    if (Array.isArray(action?.context?.actor?.position)) {
      return toPoint(action.context.actor.position);
    }
    return null;
  }, [action]);

  const actualEnd = useMemo(() => toPoint(decision?.actual?.end_location), [decision]);

  const selectedCandidate = useMemo(
    () => decision?.candidates.find((c) => c.candidate_id === selectedCandidateId) || null,
    [decision, selectedCandidateId]
  );

  const select = (id) => {
    setDecisionId(id);
    setShowAlt(false);
    setSelectedCandidateId(null);
    setBallAt(null);
    setSearchParams(id ? { event: id } : {}, { replace: true });
  };

  const move = (direction) => {
    if (!decision) return;
    const position = decisions.findIndex((d) => d.id === decision.id);
    const next = decisions[Math.min(decisions.length - 1, Math.max(0, position + direction))];
    if (next) select(next.id);
  };

  /* Play the actual pass, then reveal the generated alternatives. The ball
     moving is what makes a decision legible; a static arrow is not. */
  const play = () => {
    if (!decision) return;
    setShowAlt(false);
    setBallAt(origin);
    const best = decision.best?.candidate_id ?? decision.candidates[0]?.candidate_id ?? null;
    window.setTimeout(() => setBallAt(actualEnd || origin), 60);
    window.setTimeout(() => {
      setShowAlt(true);
      setSelectedCandidateId(best);
    }, 780);
  };

  const reset = () => {
    setShowAlt(false);
    setSelectedCandidateId(null);
    setBallAt(null);
  };

  const pickCandidate = (candidate) => {
    setSelectedCandidateId(candidate.candidate_id);
    setBallAt(toPoint(candidate.target_location));
  };

  if (loading) return <Loading what="decision data" />;
  if (error) return <DataError message={error} />;

  if (!decision) {
    return (
      <div>
        <Toolbar title="Decision analysis" />
        <Panel>
          <p className="text-[13.5px] text-ink-2">
            No decisions match these filters. Clear the team filter or turn off &ldquo;better
            option available&rdquo;.
          </p>
        </Panel>
      </div>
    );
  }

  const position = decisions.findIndex((d) => d.id === decision.id);
  const altEnd = selectedCandidate ? toPoint(selectedCandidate.target_location) : null;

  return (
    <div>
      <Toolbar
        title="Decision analysis"
        meta={`${decision.player || 'Unknown player'} · ${decision.team} · ${
          decision.period === 1 ? 'first half' : 'second half'
        } ${formatMatchTime(decision.timestamp)}`}
      >
        <Select value={team} onChange={(e) => setTeam(e.target.value)} label="Filter by team">
          <option value="all">Both teams</option>
          {data.teams.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>

        <label className="flex cursor-pointer items-center gap-2 rounded-[3px] border border-line bg-panel px-2.5 py-1.5 text-[13px] text-ink-2">
          <input
            type="checkbox"
            checked={onlyGaps}
            onChange={(e) => setOnlyGaps(e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--alt)]"
          />
          Better option available
        </label>

        <div className="flex items-center gap-1">
          <Button onClick={() => move(-1)} disabled={position === 0} aria-label="Previous decision">
            <ChevronLeft size={15} />
          </Button>
          <span className="num min-w-[92px] text-center text-[12.5px] text-ink-3">
            {(position + 1).toLocaleString()} / {decisions.length.toLocaleString()}
          </span>
          <Button
            onClick={() => move(1)}
            disabled={position === decisions.length - 1}
            aria-label="Next decision"
          >
            <ChevronRight size={15} />
          </Button>
        </div>
      </Toolbar>

      <div className="mb-4">
        <Timeline decisions={decisions} current={decision} onSelect={select} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
        <Panel padded={false}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-2 px-4 py-2.5">
            <div>
              <h2 className="cond text-[16px] capitalize leading-tight text-ink">
                {decision.actual?.type || 'Action'}
                {decision.actual?.recipient ? ` to ${decision.actual.recipient}` : ''}
              </h2>
              <p className="text-[12px] text-ink-3">
                {freezeFrame.teammates.length + freezeFrame.opponents.length} players tracked in the
                freeze frame
              </p>
            </div>
            {showAlt ? (
              <Button onClick={reset}>
                <RotateCcw size={14} />
                Reset
              </Button>
            ) : (
              <Button variant="alt" onClick={play}>
                <Play size={14} fill="currentColor" />
                Play alternatives
              </Button>
            )}
          </div>

          {freezeFrame.teammates.length || freezeFrame.opponents.length ? (
            <Pitch
              freezeFrame={freezeFrame}
              location={origin}
              endLocation={actualEnd}
              altEndLocation={altEnd}
              ballAt={ballAt}
              showAlt={showAlt}
              markers={decision.candidates.slice(0, 6).map((c, i) => ({
                ...toPoint(c.target_location),
                id: c.candidate_id,
                label: i + 1,
                variant: c.candidate_id === selectedCandidateId ? 'selected' : 'candidate',
              }))}
              height={430}
            />
          ) : (
            <div className="flex h-[430px] items-center justify-center bg-panel-2 px-6 text-center">
              <p className="max-w-sm text-[13px] text-ink-3">
                This event loaded, but no 360° freeze frame was matched to it. Pick another
                decision from the timeline.
              </p>
            </div>
          )}

          <div className="border-t border-line-2 px-4 py-2.5">
            <Legend showAlt={showAlt} />
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="This decision">
            <div className="mb-3 flex items-end gap-4 border-b border-line pb-3">
              <div>
                <div className="cond num text-[38px] leading-none text-ink">
                  {decision.actualValue.toFixed(1)}
                </div>
                <div className="text-[12px] text-ink-3">Value of what happened</div>
              </div>
              <div className="ml-auto text-right">
                <div
                  className={`cond num text-[24px] leading-none ${
                    decision.gap > 0 ? 'text-alt' : 'text-pos'
                  }`}
                >
                  {decision.gap > 0 ? '+' : ''}
                  {decision.gap.toFixed(1)}
                </div>
                <div className="text-[12px] text-ink-3">Gap to best alternative</div>
              </div>
            </div>

            <Fact label="Outcome" value={decision.actual?.outcome || 'Not recorded'} />
            {decision.actual?.pass_length != null && (
              <Fact label="Pass length" value={`${Number(decision.actual.pass_length).toFixed(1)} m`} />
            )}
            <Fact
              label="Pressure"
              value={decision.actual?.under_pressure ? 'Under pressure' : 'Not under pressure'}
            />
            <Fact label="Alternatives generated" value={decision.candidates.length} />
          </Panel>

          <Panel
            title="Alternatives"
            meta={showAlt ? 'Ranked by predicted value. Select one to draw it.' : undefined}
            padded={false}
          >
            {!showAlt ? (
              <p className="px-4 py-6 text-[13px] leading-relaxed text-ink-3">
                {decision.candidates.length} alternative passes were generated from this freeze
                frame. Play the decision to compare them with what the player chose.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <Th className="w-8">#</Th>
                      <Th>Target</Th>
                      <Th align="right">Value</Th>
                      <Th align="right">Δ</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {decision.candidates.map((candidate, i) => {
                      const value = Number(candidate.predicted_value || 0);
                      const delta = value - decision.actualValue;
                      const active = candidate.candidate_id === selectedCandidateId;
                      return (
                        <tr
                          key={`${candidate.candidate_id}-${i}`}
                          onClick={() => pickCandidate(candidate)}
                          className={`cursor-pointer ${active ? 'bg-alt/10' : 'hover:bg-panel-2'}`}
                        >
                          <Td className="num text-ink-3">{i + 1}</Td>
                          <Td>
                            <span className="block font-medium">
                              {nearestTeammate(candidate, action) || 'Open space'}
                            </span>
                            <span className="num block text-[11.5px] text-ink-3">
                              {Number(candidate.distance || 0).toFixed(0)} m ·{' '}
                              {candidate.lane_blocked ? 'lane blocked' : 'lane open'} · defender{' '}
                              {Number(candidate.nearest_defender_to_lane || 0).toFixed(1)} m
                            </span>
                          </Td>
                          <Td align="right" className="font-semibold">
                            {value.toFixed(1)}
                          </Td>
                          <Td
                            align="right"
                            className={delta > 0 ? 'font-semibold text-alt' : 'text-ink-3'}
                          >
                            {delta > 0 ? '+' : ''}
                            {delta.toFixed(1)}
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <p className="text-[12px] leading-relaxed text-ink-3">
            A higher value means the model rates that option more highly given the positions on the
            pitch at that instant. It is an estimate of what was available, not evidence that the
            player chose wrongly.
          </p>
        </div>
      </div>
    </div>
  );
}
