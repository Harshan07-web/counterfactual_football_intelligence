import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Lightbulb,
  Loader2,
  Play,
  RotateCcw,
  Target,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Pitch from '../components/Pitch';
import { Card, Pill } from '../components/ui';

const COUNTERFACTUAL_URL = '/data/counterfactuals_3857276.json';
const SEQUENCE_URL = '/data/football_sequences_3857276_clean.json';

function normalizeDecision(item, index) {
  const actual = item?.actual_action || {};
  const candidates = Array.isArray(item?.ranked_candidates)
    ? [...item.ranked_candidates].sort(
        (a, b) => Number(b?.predicted_value || 0) - Number(a?.predicted_value || 0)
      )
    : [];

  return {
    ...item,
    id: item?.event_id || String(index),
    index,
    actual,
    candidates,
    best: item?.best_alternative || candidates[0] || null,
    actualValue: Number(item?.actual_predicted_value ?? 0),
    gap: Number(item?.decision_gap ?? 0),
  };
}

function buildActionIndex(possessions) {
  const index = new Map();

  if (!Array.isArray(possessions)) return index;

  for (const possession of possessions) {
    const actions = Array.isArray(possession?.actions) ? possession.actions : [];
    for (const action of actions) {
      if (action?.event_id) index.set(action.event_id, action);
    }
  }

  return index;
}

function toPoint(location) {
  if (!Array.isArray(location) || location.length < 2) return null;
  return { x: Number(location[0]), y: Number(location[1]) };
}

function extractFreezeFrame(action) {
  const context = action?.context || {};

  const toPoints = (list) =>
    Array.isArray(list)
      ? list
          .filter((player) => Array.isArray(player?.position) && player.position.length >= 2)
          .map((player, index) => ({
            id: player?.id || index,
            x: Number(player.position[0]),
            y: Number(player.position[1]),
            keeper: Boolean(player?.keeper),
          }))
      : [];

  return {
    teammates: toPoints(context.teammates),
    opponents: toPoints(context.opponents),
  };
}


function nearestTeammateName(candidate, action) {
  const target = candidate?.target_location;
  const teammates = action?.context?.teammates;
  if (!Array.isArray(target) || !Array.isArray(teammates)) return null;
  let best = null;
  let bestDistance = Infinity;
  for (const teammate of teammates) {
    const position = teammate?.position;
    if (!Array.isArray(position) || position.length < 2) continue;
    const distance = Math.hypot(Number(position[0]) - Number(target[0]), Number(position[1]) - Number(target[1]));
    if (distance < bestDistance) { bestDistance = distance; best = teammate; }
  }
  return best?.name || null;
}

function formatTime(timestamp) {
  if (!timestamp) return '—';
  const parts = String(timestamp).split(':');
  return parts.length === 3 ? `${parts[1]}:${parts[2]}` : String(timestamp);
}

function ActionBadge({ type }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-surface-2 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-2">
      {String(type || 'action').replaceAll('_', ' ')}
    </span>
  );
}

function Legend({ simulated }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-ink-3">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-accent" />
        Teammate
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-bad" />
        Opponent
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-brand" />
        Player on ball
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full border-2 border-brand" />
        Actual destination
      </span>
      {simulated && (
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-warn" />
          Alternative target
        </span>
      )}
    </div>
  );
}

function ValueBar({ value, actualValue, maxValue, selected }) {
  const width = maxValue > 0 ? Math.max(3, Math.min(100, (value / maxValue) * 100)) : 0;
  const delta = value - actualValue;

  return (
    <div className="mt-2">
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            selected ? 'bg-warn' : 'bg-brand/60'
          }`}
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-mono tabular-nums">
        <span className="text-ink-2">{value.toFixed(2)}</span>
        <span className={delta > 0 ? 'text-warn' : 'text-ink-3'}>
          {delta >= 0 ? '+' : ''}
          {delta.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

function AlternativeCard({ candidate, rank, actualValue, maxValue, selected, onClick, targetName }) {
  const value = Number(candidate?.predicted_value || 0);
  const improvement = value - actualValue;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border p-3 text-left transition ${
        selected
          ? 'border-warn bg-warn/5 shadow-sm'
          : 'border-border bg-surface hover:border-border-strong hover:bg-surface-2'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
            rank === 1 ? 'bg-warn text-white' : 'bg-surface-3 text-ink-2'
          }`}
        >
          {rank}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[12.5px] font-semibold text-ink-1">
                {rank === 1 ? 'Best alternative' : `Candidate ${candidate?.candidate_id}`}
              </p>
              <p className="mt-0.5 text-[10.5px] text-ink-3">{targetName || 'Generated target'} · {candidate?.lane_blocked ? 'Lane blocked' : 'Lane open'}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold font-mono tabular-nums text-ink-1">
                {value.toFixed(2)}
              </p>
              <p className={`text-[10px] font-mono ${improvement > 0 ? 'text-warn' : 'text-ink-3'}`}>
                {improvement >= 0 ? '+' : ''}
                {improvement.toFixed(2)}
              </p>
            </div>
          </div>

          <ValueBar
            value={value}
            actualValue={actualValue}
            maxValue={maxValue}
            selected={selected}
          />

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-ink-3">
            <span>{Number(candidate?.distance || 0).toFixed(2)}m pass</span>
            <span>
              Forward Δ {Number(candidate?.forward_delta || 0).toFixed(2)}
            </span>
            <span>
              Defender {Number(candidate?.nearest_defender_to_lane || 0).toFixed(2)}m
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function EventSelector({ decisions, decision, onChange }) {
  return (
    <div className="relative min-w-0">
      <select
        value={decision?.id || ''}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none rounded-lg border border-border bg-surface-2 py-2.5 pl-3 pr-9 text-[12px] font-medium text-ink-1 outline-none focus:border-brand cursor-pointer"
      >
        {decisions.map((item, index) => (
          <option key={item.id} value={item.id}>
            {index + 1}. {item.player || 'Unknown'} · {formatTime(item.timestamp)} ·{' '}
            {item.actual?.type || 'action'}
          </option>
        ))}
      </select>
      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3"
      />
    </div>
  );
}

export default function DecisionAnalysis() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [decisions, setDecisions] = useState([]);
  const [actionIndex, setActionIndex] = useState(new Map());
  const [decisionId, setDecisionId] = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [simulated, setSimulated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError('');

        const [counterfactualResponse, sequenceResponse] = await Promise.all([
          fetch(COUNTERFACTUAL_URL),
          fetch(SEQUENCE_URL),
        ]);

        if (!counterfactualResponse.ok) {
          throw new Error(`Could not load ${COUNTERFACTUAL_URL}`);
        }

        const counterfactualData = await counterfactualResponse.json();
        const sequenceData = sequenceResponse.ok ? await sequenceResponse.json() : [];

        if (cancelled) return;

        const normalized = Array.isArray(counterfactualData)
          ? counterfactualData.map(normalizeDecision).filter((item) => item.actual)
          : [];

        setDecisions(normalized);
        setActionIndex(buildActionIndex(sequenceData));

        const requestedEvent = searchParams.get('event');
        const initial = normalized.find((item) => item.id === requestedEvent) || normalized[0];

        if (initial) setDecisionId(initial.id);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load decision data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const decision = useMemo(
    () => decisions.find((item) => item.id === decisionId) || decisions[0],
    [decisions, decisionId]
  );

  const action = useMemo(
    () => (decision ? actionIndex.get(decision.id) : null),
    [decision, actionIndex]
  );

  const freezeFrame = useMemo(() => extractFreezeFrame(action), [action]);

  const actualLocation = useMemo(() => {
    if (Array.isArray(action?.location)) return toPoint(action.location);
    if (Array.isArray(action?.context?.actor?.position)) {
      return toPoint(action.context.actor.position);
    }
    return null;
  }, [action]);

  const actualEndLocation = useMemo(
    () => toPoint(decision?.actual?.end_location),
    [decision]
  );

  const selectedCandidate = useMemo(
    () =>
      decision?.candidates.find(
        (candidate) => candidate.candidate_id === selectedCandidateId
      ) || null,
    [decision, selectedCandidateId]
  );

  const maxValue = useMemo(
    () =>
      decision
        ? Math.max(
            decision.actualValue,
            ...decision.candidates.map((candidate) =>
              Number(candidate?.predicted_value || 0)
            )
          )
        : 0,
    [decision]
  );

  const changeDecision = (id) => {
    setDecisionId(id);
    setSelectedCandidateId(null);
    setSimulated(false);
    setSearchParams(id ? { event: id } : {});
  };

  const moveDecision = (direction) => {
    if (!decision || !decisions.length) return;
    const nextIndex = Math.max(
      0,
      Math.min(decisions.length - 1, decision.index + direction)
    );
    changeDecision(decisions[nextIndex].id);
  };

  const simulate = () => {
    setSimulated(true);
    setSelectedCandidateId(
      decision?.best?.candidate_id ?? decision?.candidates?.[0]?.candidate_id ?? null
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-ink-3">
        <Loader2 size={18} className="animate-spin" />
        Loading match decisions...
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Decision Analysis"
          subtitle="Inspect real events and simulate counterfactual decisions"
        />
        <Card>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-warn" size={18} />
            <div>
              <p className="text-sm font-semibold text-ink-1">Could not load the analysis</p>
              <p className="mt-1 text-sm text-ink-3">{error}</p>
              <p className="mt-2 text-xs text-ink-3">
                Confirm that both JSON files are inside public/data/.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!decision) {
    return (
      <div>
        <PageHeader title="Decision Analysis" subtitle="Counterfactual decision analysis" />
        <Card>
          <p className="text-sm text-ink-2">No decision points were found.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="pb-10 max-w-[1450px] mx-auto">
      <PageHeader
        title="Decision Analysis"
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink-2">{decision.team || 'Unknown team'}</span>
            <span className="text-ink-3">·</span>
            <span className="text-ink-3">{decision.period === 1 ? '1H' : '2H'}</span>
            <span className="text-ink-3">·</span>
            <span className="font-mono tabular-nums text-ink-3">
              {formatTime(decision.timestamp)}
            </span>
          </span>
        }
      />

      <Card className="mb-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
          <div className="min-w-0">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-3">
              Match event
            </p>
            <EventSelector
              decisions={decisions}
              decision={decision}
              onChange={changeDecision}
            />
          </div>

          <div className="flex items-center justify-between gap-2 lg:justify-end">
            <button
              type="button"
              onClick={() => moveDecision(-1)}
              disabled={decision.index === 0}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-ink-2 hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-[82px] text-center text-[11px] font-mono tabular-nums text-ink-3">
              {decision.index + 1} / {decisions.length}
            </span>
            <button
              type="button"
              onClick={() => moveDecision(1)}
              disabled={decision.index === decisions.length - 1}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-ink-2 hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-good" />
            <span className="text-[11px] text-ink-3">360° data</span>
            <span className="text-[11px] font-semibold text-ink-1">
              {freezeFrame.teammates.length + freezeFrame.opponents.length} players
            </span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card
            title="What actually happened"
            subtitle={`${decision.player || 'Unknown player'} · ${formatTime(decision.timestamp)}`}
          >
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_250px]">
              <div>
                {freezeFrame.teammates.length || freezeFrame.opponents.length ? (
                  <Pitch
                    freezeFrame={freezeFrame}
                    location={actualLocation}
                    endLocation={actualEndLocation}
                    altEndLocation={
                      simulated && selectedCandidate
                        ? toPoint(selectedCandidate.target_location)
                        : null
                    }
                    markers={simulated ? decision.candidates.slice(0, 6).map((candidate, index) => ({
                      ...toPoint(candidate.target_location),
                      label: index + 1,
                      variant:
                        candidate.candidate_id === selectedCandidateId ? 'selected' : index === 0 ? 'best' : 'candidate',
                    })).filter(Boolean) : []}
                    height={410}
                  />
                ) : (
                  <div className="flex min-h-[410px] items-center justify-center rounded-xl border border-border bg-surface-2">
                    <div className="max-w-sm px-6 text-center">
                      <CircleDot size={26} className="mx-auto mb-3 text-ink-3" />
                      <p className="text-sm font-semibold text-ink-1">
                        360° position data unavailable
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-ink-3">
                        The event is loaded, but its freeze-frame could not be matched.
                      </p>
                    </div>
                  </div>
                )}
                <div className="mt-3">
                  <Legend simulated={simulated} />
                </div>
              </div>

              <div className="flex flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  <ActionBadge type={decision.actual?.type} />
                  {decision.actual?.outcome && <Pill tone="good">{decision.actual.outcome}</Pill>}
                </div>

                <p className="mt-3 text-2xl font-semibold tracking-tight text-ink-1">
                  {decision.actual?.type || 'Action'}
                </p>

                {decision.actual?.recipient && (
                  <div className="mt-2 flex items-center gap-2 text-[13px] text-ink-2">
                    <ArrowRight size={14} className="text-ink-3" />
                    {decision.actual.recipient}
                  </div>
                )}

                {decision.actual?.pass_length != null && (
                  <p className="mt-1 text-[11px] text-ink-3">
                    Pass length {Number(decision.actual.pass_length).toFixed(2)}m
                  </p>
                )}

                {decision.actual?.under_pressure != null && (
                  <p className="mt-1 text-[11px] text-ink-3">
                    {decision.actual.under_pressure ? 'Under pressure' : 'Not under pressure'}
                  </p>
                )}

                <div className="mt-5 border-t border-border pt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                    Actual model value
                  </p>
                  <p className="mt-1 text-4xl font-semibold font-mono tabular-nums tracking-tight text-ink-1">
                    {decision.actualValue.toFixed(2)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-ink-3">decision value / 100</p>
                </div>

                {!simulated ? (
                  <button
                    type="button"
                    onClick={simulate}
                    className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-[12.5px] font-semibold text-white transition hover:opacity-90"
                  >
                    <Play size={15} fill="currentColor" />
                    Simulate Alternatives
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSimulated(false);
                      setSelectedCandidateId(null);
                    }}
                    className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface-2 px-4 py-3 text-[12.5px] font-semibold text-ink-2 transition hover:bg-surface-3"
                  >
                    <RotateCcw size={14} />
                    Reset Simulation
                  </button>
                )}
              </div>
            </div>
          </Card>

          {simulated && selectedCandidate && (
            <Card
              title="Selected alternative"
              subtitle="Click another candidate on the right to change the hypothetical route."
            >
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-warn/25 bg-warn/5 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-warn">
                    Predicted value
                  </p>
                  <p className="mt-1 text-xl font-semibold font-mono tabular-nums text-ink-1">
                    {Number(selectedCandidate.predicted_value).toFixed(2)}
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-surface-2 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                    vs actual
                  </p>
                  <p
                    className={`mt-1 text-xl font-semibold font-mono tabular-nums ${
                      Number(selectedCandidate.predicted_value) > decision.actualValue
                        ? 'text-warn'
                        : 'text-ink-1'
                    }`}
                  >
                    {Number(selectedCandidate.predicted_value) - decision.actualValue >= 0
                      ? '+'
                      : ''}
                    {(Number(selectedCandidate.predicted_value) - decision.actualValue).toFixed(2)}
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-surface-2 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                    Distance
                  </p>
                  <p className="mt-1 text-xl font-semibold font-mono tabular-nums text-ink-1">
                    {Number(selectedCandidate.distance || 0).toFixed(2)}m
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-surface-2 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                    Lane
                  </p>
                  <p className="mt-1.5 text-[13px] font-semibold text-ink-1">
                    {selectedCandidate.lane_blocked ? 'Blocked' : 'Open'}
                  </p>
                  <p className="mt-0.5 text-[10px] text-ink-3">
                    Nearest defender {Number(selectedCandidate.nearest_defender_to_lane || 0).toFixed(2)}m
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          {!simulated ? (
            <Card>
              <div className="flex items-start gap-3">
                <Target size={18} className="mt-0.5 shrink-0 text-brand" />
                <div>
                  <p className="text-sm font-semibold text-ink-1">Counterfactual simulation</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-3">
                    Start from the real 360° situation. The model will reveal the generated
                    alternative passes and their predicted values.
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <Card
              title="Alternative decisions"
              subtitle={`${decision.candidates.length} generated options · ranked by predicted value`}
            >
              <div className="space-y-2">
                {decision.candidates.map((candidate, index) => (
                  <AlternativeCard
                    key={`${candidate.candidate_id}-${index}`}
                    candidate={candidate}
                    rank={index + 1}
                    actualValue={decision.actualValue}
                    maxValue={maxValue}
                    selected={candidate.candidate_id === selectedCandidateId}
                    onClick={() => setSelectedCandidateId(candidate.candidate_id)}
                    targetName={nearestTeammateName(candidate, action)}
                  />
                ))}
              </div>
            </Card>
          )}

          <Card title="Decision summary">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-3">Actual value</span>
                <span className="font-mono font-semibold tabular-nums text-ink-1">
                  {decision.actualValue.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-3">Best alternative</span>
                <span className="font-mono font-semibold tabular-nums text-ink-1">
                  {decision.best ? Number(decision.best.predicted_value).toFixed(2) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-xs font-semibold text-ink-2">Decision gap</span>
                <span
                  className={`font-mono font-semibold tabular-nums ${
                    decision.gap > 0 ? 'text-warn' : 'text-good'
                  }`}
                >
                  {decision.gap >= 0 ? '+' : ''}
                  {decision.gap.toFixed(2)}
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex gap-3">
              <Lightbulb size={17} className="mt-0.5 shrink-0 text-warn" />
              <div>
                <p className="text-[12px] font-semibold text-ink-1">How to read this</p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink-3">
                  A higher score means the trained model predicts a higher decision value for
                  that generated option. It is a counterfactual analysis, not proof that the
                  original player made a mistake.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
