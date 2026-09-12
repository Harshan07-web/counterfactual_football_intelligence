import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Lightbulb, Loader2, AlertTriangle } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Pitch from '../components/Pitch';
import { Card, Pill } from '../components/ui';

const COUNTERFACTUAL_URL = '/data/counterfactuals_3857276.json';
const SEQUENCE_URL = '/data/football_sequences_3857276_clean.json';

// ---------------------------------------------------------------------------
// Data shaping
// ---------------------------------------------------------------------------

function normalizeDecision(item, index) {
  const actual = item.actual_action || {};
  const candidates = Array.isArray(item.ranked_candidates) ? item.ranked_candidates : [];

  return {
    ...item,
    id: item.event_id || String(index),
    index,
    actual,
    candidates,
    best: item.best_alternative || candidates[0] || null,
    actualValue: Number(item.actual_predicted_value ?? 0),
    gap: Number(item.decision_gap ?? 0),
  };
}

// The sequence file is an array of POSSESSIONS, each holding an `actions`
// array — event ids live one level down, inside `possession.actions[]`.
// Flatten once into a Map so lookups are O(1) instead of re-scanning a
// ~3,300-action array on every selection.
function buildActionIndex(possessions) {
  const index = new Map();
  if (!Array.isArray(possessions)) return index;

  for (const possession of possessions) {
    const actions = Array.isArray(possession.actions) ? possession.actions : [];
    for (const action of actions) {
      if (action?.event_id) index.set(action.event_id, action);
    }
  }
  return index;
}

// Player positions live at context.teammates / context.opponents as
// { position: [x, y], keeper, ... } — not a flat `freeze_frame` array, and
// there's no `teammate` boolean to split on since the two arrays already
// come pre-split from the source data.
function extractFreezeFrame(action) {
  const context = action?.context || {};
  const toPoints = (list) =>
    Array.isArray(list)
      ? list
          .filter((p) => Array.isArray(p.position) && p.position.length >= 2)
          .map((p) => ({ x: p.position[0], y: p.position[1], keeper: !!p.keeper }))
      : [];

  return {
    teammates: toPoints(context.teammates),
    opponents: toPoints(context.opponents),
  };
}

function toPoint(loc) {
  return Array.isArray(loc) && loc.length >= 2 ? { x: loc[0], y: loc[1] } : null;
}

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

function Gauge({ value, gap }) {
  const pct = Math.max(0, Math.min(1, value / 100));
  const angle = pct * 180;
  const r = 70;
  const cx = 90;
  const cy = 84;
  const startX = cx - r;
  const endX = cx + r * Math.cos(Math.PI - (angle * Math.PI) / 180);
  const endY = cy - r * Math.sin(Math.PI - (angle * Math.PI) / 180);

  const tone = value >= 60 ? 'var(--color-good)' : value >= 40 ? 'var(--color-warn)' : 'var(--color-bad)';

  return (
    <div className="flex flex-col items-center">
      <svg width="180" height="104" viewBox="0 0 180 104">
        <path
          d={`M ${startX} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="var(--color-surface-3)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d={`M ${startX} ${cy} A ${r} ${r} 0 ${angle > 180 ? 1 : 0} 1 ${endX} ${endY}`}
          fill="none"
          stroke={tone}
          strokeWidth="14"
          strokeLinecap="round"
        />
      </svg>
      <div className="-mt-9 text-center">
        <p className="text-3xl font-semibold text-ink-1 font-mono tabular-nums tracking-tight">
          {Number(value || 0).toFixed(2)}
        </p>
        <p className="text-[11px] text-ink-3">/ 100</p>
      </div>
      <Pill tone={gap > 0 ? 'warn' : 'good'} className="mt-3">
        {gap > 0 ? `+${gap.toFixed(2)} opportunity` : 'No better alternative found'}
      </Pill>
    </div>
  );
}

function LegendDot({ color, label, outline }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="h-2.5 w-2.5 rounded-full shrink-0"
        style={outline ? { border: `1.5px solid ${color}`, background: 'transparent' } : { background: color }}
      />
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DecisionAnalysis() {
  const [decisions, setDecisions] = useState([]);
  const [actionIndex, setActionIndex] = useState(new Map());
  const [decisionId, setDecisionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [freezeFrameMissing, setFreezeFrameMissing] = useState(false);

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

        let sequenceData = [];
        if (sequenceResponse.ok) {
          sequenceData = await sequenceResponse.json();
        }

        if (cancelled) return;

        const normalized = Array.isArray(counterfactualData)
          ? counterfactualData.map(normalizeDecision).filter((d) => d.actual)
          : [];

        setDecisions(normalized);
        setActionIndex(buildActionIndex(sequenceData));
        setFreezeFrameMissing(!sequenceResponse.ok);

        if (normalized.length) {
          setDecisionId(normalized[0].id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load decision data.');
        }
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
    () => decisions.find((d) => d.id === decisionId) || decisions[0],
    [decisions, decisionId]
  );

  const action = useMemo(
    () => (decision ? actionIndex.get(decision.id) : null),
    [decision, actionIndex]
  );

  const freezeFrame = useMemo(() => extractFreezeFrame(action), [action]);

  const actorPoint = useMemo(() => {
    if (Array.isArray(action?.location)) return toPoint(action.location);
    if (Array.isArray(action?.context?.actor?.position)) return toPoint(action.context.actor.position);
    return null;
  }, [action]);

  const candidates = decision?.candidates || [];
  const topCandidates = candidates.slice(0, 6);
  const bestValue = decision
    ? Math.max(decision.actualValue, ...candidates.map((c) => Number(c.predicted_value || 0)))
    : 0;

  const pitchMarkers = useMemo(
    () =>
      topCandidates
        .map((c, i) => {
          const p = toPoint(c.target_location);
          if (!p) return null;
          return { ...p, label: i + 1, variant: i === 0 ? 'best' : 'candidate' };
        })
        .filter(Boolean),
    [topCandidates]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-ink-3 gap-2">
        <Loader2 size={18} className="animate-spin" />
        Loading counterfactual decisions...
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Decision Analysis" subtitle="Counterfactual decision evaluation" />
        <Card>
          <p className="text-sm font-semibold text-ink-1 mb-1">Could not load decision data</p>
          <p className="text-sm text-ink-3">{error}</p>
          <p className="text-xs text-ink-3 mt-3">
            Put both JSON files inside the frontend public/data directory: counterfactuals_3857276.json and
            football_sequences_3857276_clean.json.
          </p>
        </Card>
      </div>
    );
  }

  if (!decision) {
    return (
      <div>
        <PageHeader title="Decision Analysis" subtitle="Counterfactual decision evaluation" />
        <Card>
          <p className="text-sm text-ink-2">No counterfactual decisions were found.</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Decision Analysis"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-semibold text-ink-2">{decision.team || 'Unknown team'}</span>
            <span className="text-ink-3">&middot; {decision.period === 1 ? '1H' : '2H'}</span>
            <span className="text-ink-3 font-mono tabular-nums">&middot; {decision.timestamp}</span>
          </span>
        }
        action={
          <div className="relative">
            <select
              value={decisionId}
              onChange={(e) => setDecisionId(e.target.value)}
              className="appearance-none bg-surface-2 border border-border rounded-lg pl-3 pr-9 py-2 text-[13px] font-medium text-ink-1 outline-none focus:border-brand cursor-pointer max-w-[330px]"
            >
              {decisions.map((d, index) => (
                <option key={d.id} value={d.id}>
                  {d.player || 'Unknown player'} · {d.timestamp || `Decision ${index + 1}`} · {d.actual?.type || 'action'}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3"
            />
          </div>
        }
      />

      {freezeFrameMissing && (
        <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-warn/30 bg-warn-soft px-4 py-3">
          <AlertTriangle size={16} className="text-warn shrink-0 mt-0.5" />
          <p className="text-[12.5px] text-ink-2">
            Player-position data (<code className="font-mono">football_sequences_3857276_clean.json</code>) failed
            to load, so the pitch below only shows candidate targets — teammates and opponents aren&apos;t plotted.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_300px] gap-5">
        <Card title="Decision Timeline" padded={false}>
          <ul className="px-2 pb-3 max-h-[640px] overflow-y-auto">
            {decisions
              .slice(Math.max(0, decision.index - 8), Math.min(decisions.length, decision.index + 9))
              .map((d) => (
                <li
                  key={d.id}
                  onClick={() => setDecisionId(d.id)}
                  className={`relative pl-6 pr-2 py-2 rounded-lg cursor-pointer ${
                    d.id === decision.id ? 'bg-brand-soft' : 'hover:bg-surface-2'
                  }`}
                >
                  <span
                    className={`absolute left-2 top-3.5 h-2 w-2 rounded-full ${
                      d.id === decision.id ? 'bg-brand' : 'bg-ink-3'
                    }`}
                  />
                  <p className="text-[11px] text-ink-3 font-mono tabular-nums">{d.timestamp}</p>
                  <p className={`text-[13px] font-medium ${d.id === decision.id ? 'text-brand' : 'text-ink-1'}`}>
                    {d.actual?.type || 'Action'}
                  </p>
                  <p className="text-[12px] text-ink-3 truncate">{d.player || 'Unknown player'}</p>
                </li>
              ))}
          </ul>
        </Card>

        <div className="space-y-5">
          <Card title={`360° Situation · ${decision.timestamp}`}>
            <Pitch
              freezeFrame={freezeFrame}
              location={actorPoint}
              endLocation={toPoint(decision.actual?.end_location)}
              altEndLocation={toPoint(decision.best?.target_location)}
              markers={pitchMarkers}
              height={380}
            />

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-[12px] text-ink-3">
              <LegendDot color="#8b7cae" label="Teammate" />
              <LegendDot color="#a15364" label="Opponent" />
              <LegendDot color="#6d5b95" label="Player on ball" />
              <LegendDot color="#6d5b95" label="Actual pass" outline />
              <LegendDot color="#c79b3b" label="Best alternative" />
              <LegendDot color="#c79b3b" label="Other candidates" outline />
            </div>
          </Card>

          <Card>
            <div className="flex gap-3">
              <Lightbulb size={18} className="text-warn shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <p className="text-[13px] font-semibold text-ink-1 mb-0.5">Counterfactual Insight</p>
                <p className="text-[13px] text-ink-2 leading-relaxed">
                  {decision.gap > 0
                    ? `The model estimates that candidate ${decision.best?.candidate_id ?? '—'} had a ${decision.gap.toFixed(2)} point higher decision value than the actual action. This is a model-based alternative, not proof that the original decision was wrong.`
                    : 'The model did not identify a higher-valued candidate among the generated alternatives.'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Action Comparison">
            <div className="space-y-2">
              <div className="rounded-lg border border-brand/30 bg-brand-soft px-3 py-2.5">
                <p className="text-[11px] font-semibold text-brand mb-0.5">Actual Action</p>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[12.5px] text-ink-1">
                      {decision.actual?.type || 'Action'}
                      {decision.actual?.recipient ? ` → ${decision.actual.recipient}` : ''}
                    </p>
                    {decision.actual?.outcome && (
                      <p className="text-[11px] text-ink-3 mt-0.5">{decision.actual.outcome}</p>
                    )}
                  </div>
                  <p className="text-[13px] font-semibold text-ink-1 font-mono tabular-nums">
                    {decision.actualValue.toFixed(2)}
                  </p>
                </div>
              </div>

              {topCandidates.map((candidate, i) => {
                const value = Number(candidate.predicted_value || 0);
                const isBest = i === 0;

                return (
                  <div
                    key={`${candidate.candidate_id}-${i}`}
                    className={`rounded-lg border px-3 py-2.5 ${isBest ? 'border-warn/40 bg-warn/5' : 'border-border'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className={`text-[11px] font-semibold ${isBest ? 'text-warn' : 'text-ink-3'}`}>
                          {isBest ? 'Best Alternative' : `Alternative ${i + 1}`}
                        </p>
                        <p className="text-[12.5px] text-ink-2">Candidate {candidate.candidate_id}</p>
                      </div>
                      <p className="text-[13px] font-semibold text-ink-1 font-mono tabular-nums">
                        {value.toFixed(2)}
                      </p>
                    </div>
                    <div className="mt-1.5 text-[10.5px] text-ink-3 flex flex-wrap gap-x-3 gap-y-1">
                      <span>Distance {Number(candidate.distance || 0).toFixed(2)}</span>
                      <span>Forward Δ {Number(candidate.forward_delta || 0).toFixed(2)}</span>
                      <span>{candidate.lane_blocked ? 'Lane blocked' : 'Lane open'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Decision Value">
            <Gauge value={decision.actualValue} gap={decision.gap} />

            <div className="mt-4 border-t border-border pt-3 space-y-2">
              <div className="flex justify-between text-[12px]">
                <span className="text-ink-3">Actual</span>
                <span className="font-mono tabular-nums text-ink-1">{decision.actualValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-ink-3">Best alternative</span>
                <span className="font-mono tabular-nums text-ink-1">{bestValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[12px] font-semibold">
                <span className="text-ink-2">Decision gap</span>
                <span className={decision.gap > 0 ? 'text-warn font-mono' : 'text-good font-mono'}>
                  {decision.gap > 0 ? '+' : ''}
                  {decision.gap.toFixed(2)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}