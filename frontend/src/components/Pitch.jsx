const W = 120;
const H = 80;

/* Pitch markings to StatsBomb's 120x80 coordinate space. Mown stripes run
   across the pitch, as they do at most grounds, so the eye can read depth. */
function Markings() {
  return (
    <>
      <rect x="0" y="0" width={W} height={H} fill="var(--pitch)" />
      {Array.from({ length: 10 }).map((_, i) => (
        <rect
          key={i}
          x={(i * W) / 10}
          y="0"
          width={W / 10}
          height={H}
          fill={i % 2 === 0 ? 'rgba(255,255,255,0.028)' : 'transparent'}
        />
      ))}
      <g stroke="var(--pitch-line)" strokeWidth="0.35" fill="none">
        <rect x="0.4" y="0.4" width={W - 0.8} height={H - 0.8} />
        <line x1="60" y1="0.4" x2="60" y2={H - 0.4} />
        <circle cx="60" cy="40" r="9.15" />
        <rect x="0.4" y="18" width="17.6" height="44" />
        <rect x="0.4" y="30" width="5.6" height="20" />
        <rect x={W - 18} y="18" width="17.6" height="44" />
        <rect x={W - 6} y="30" width="5.6" height="20" />
        <path d="M18 32.5 A 9.15 9.15 0 0 1 18 47.5" />
        <path d="M102 32.5 A 9.15 9.15 0 0 0 102 47.5" />
      </g>
      <g fill="var(--pitch-line)">
        <circle cx="60" cy="40" r="0.45" />
        <circle cx="12" cy="40" r="0.45" />
        <circle cx="108" cy="40" r="0.45" />
      </g>
    </>
  );
}

export default function Pitch({
  freezeFrame,
  location,
  endLocation,
  altEndLocation,
  markers = [],
  ballAt = null,
  showAlt = false,
  height = 420,
}) {
  const { teammates = [], opponents = [] } = freezeFrame || {};

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ height, width: '100%', display: 'block' }}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Pitch showing the 360 freeze-frame, the actual pass and its alternatives"
    >
      <defs>
        <marker id="headActual" markerWidth="5" markerHeight="5" refX="4.2" refY="2.5" orient="auto">
          <path d="M0,0 L5,2.5 L0,5 Z" fill="var(--actual)" />
        </marker>
        <marker id="headAlt" markerWidth="5" markerHeight="5" refX="4.2" refY="2.5" orient="auto">
          <path d="M0,0 L5,2.5 L0,5 Z" fill="var(--alt)" />
        </marker>
      </defs>

      <Markings />

      {/* Opponents drawn hollow, teammates solid: the analyst's own side reads first. */}
      {opponents.map((p, i) => (
        <circle
          key={`o-${p.id ?? i}`}
          cx={p.x}
          cy={p.y}
          r={p.keeper ? 2.1 : 1.8}
          fill="none"
          stroke="rgba(255,255,255,0.85)"
          strokeWidth="0.55"
        />
      ))}

      {teammates.map((p, i) => (
        <circle
          key={`t-${p.id ?? i}`}
          cx={p.x}
          cy={p.y}
          r={p.keeper ? 2.1 : 1.8}
          fill="rgba(255,255,255,0.92)"
        />
      ))}

      {showAlt &&
        markers.map((m, i) => {
          if (m?.x == null || m?.y == null) return null;
          const active = m.variant === 'selected';
          return (
            <g key={`c-${m.id ?? i}`} opacity={active ? 1 : 0.55}>
              <circle
                cx={m.x}
                cy={m.y}
                r={active ? 2.4 : 1.9}
                fill={active ? 'var(--alt)' : 'none'}
                stroke="var(--alt)"
                strokeWidth="0.55"
              />
              {m.label != null && (
                <text
                  x={m.x}
                  y={m.y + 0.9}
                  textAnchor="middle"
                  fontSize="2.4"
                  fontWeight="700"
                  fontFamily="Barlow Condensed, sans-serif"
                  fill={active ? '#1a1406' : 'var(--alt)'}
                >
                  {m.label}
                </text>
              )}
            </g>
          );
        })}

      {/* Hypothetical route dashed in yellow, the convention every broadcast
          telestrator uses for "what could have happened". */}
      {showAlt && location && altEndLocation && (
        <line
          x1={location.x}
          y1={location.y}
          x2={altEndLocation.x}
          y2={altEndLocation.y}
          stroke="var(--alt)"
          strokeWidth="0.75"
          strokeDasharray="2.2 1.6"
          markerEnd="url(#headAlt)"
        />
      )}

      {location && endLocation && (
        <line
          x1={location.x}
          y1={location.y}
          x2={endLocation.x}
          y2={endLocation.y}
          stroke="var(--actual)"
          strokeWidth="0.8"
          markerEnd="url(#headActual)"
        />
      )}

      {location && (
        <circle
          cx={location.x}
          cy={location.y}
          r="2.4"
          fill="var(--actual)"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="0.5"
        />
      )}

      {ballAt && (
        <circle
          cx="0"
          cy="0"
          r="1.5"
          fill="#ffffff"
          stroke="rgba(0,0,0,0.35)"
          strokeWidth="0.3"
          style={{
            transform: `translate(${ballAt.x}px, ${ballAt.y}px)`,
            transition: 'transform 700ms cubic-bezier(.3,.7,.3,1)',
          }}
        />
      )}
    </svg>
  );
}
