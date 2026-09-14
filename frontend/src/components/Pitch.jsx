const PITCH_W = 120;
const PITCH_H = 80;

export default function Pitch({
  freezeFrame,
  location,
  endLocation,
  altEndLocation,
  markers = [],
  height = 380,
}) {
  const { teammates = [], opponents = [] } = freezeFrame || {};

  return (
    <div className="overflow-hidden rounded-xl border border-border-soft">
      <svg
        viewBox={`0 0 ${PITCH_W} ${PITCH_H}`}
        style={{ height, width: '100%' }}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="360 degree football pitch showing player positions and decision routes"
      >
        <defs>
          <marker id="footballActualArrow" markerWidth="6" markerHeight="6" refX="4.8" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--brand)" />
          </marker>
          <marker id="footballAlternativeArrow" markerWidth="6" markerHeight="6" refX="4.8" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--warn)" />
          </marker>
        </defs>

        <rect x="0" y="0" width={PITCH_W} height={PITCH_H} fill="var(--pitch-fill)" />

        {Array.from({ length: 12 }).map((_, index) => (
          <rect
            key={index}
            x={(index * PITCH_W) / 12}
            y="0"
            width={PITCH_W / 12}
            height={PITCH_H}
            fill={index % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'transparent'}
          />
        ))}

        <g stroke="var(--pitch-line)" strokeWidth="0.4" fill="none">
          <rect x="0.3" y="0.3" width={PITCH_W - 0.6} height={PITCH_H - 0.6} />
          <line x1="60" y1="0" x2="60" y2="80" />
          <circle cx="60" cy="40" r="9.15" />
          <circle cx="60" cy="40" r="0.45" fill="var(--pitch-line)" />
          <rect x="0" y="18" width="18" height="44" />
          <rect x="0" y="30" width="6" height="20" />
          <rect x="102" y="18" width="18" height="44" />
          <rect x="114" y="30" width="6" height="20" />
        </g>

        {opponents.map((player, index) => (
          <g key={`opponent-${player.id ?? index}`}>
            <circle
              cx={player.x}
              cy={player.y}
              r={player.keeper ? 2.45 : 2.15}
              fill="var(--bad)"
              stroke="var(--pitch-fill)"
              strokeWidth="0.45"
            />
            {player.keeper && (
              <circle cx={player.x} cy={player.y} r="3.15" fill="none" stroke="var(--bad)" strokeWidth="0.35" />
            )}
          </g>
        ))}

        {teammates.map((player, index) => (
          <g key={`teammate-${player.id ?? index}`}>
            <circle
              cx={player.x}
              cy={player.y}
              r={player.keeper ? 2.45 : 2.15}
              fill="var(--accent)"
              stroke="var(--pitch-fill)"
              strokeWidth="0.45"
            />
            {player.keeper && (
              <circle cx={player.x} cy={player.y} r="3.15" fill="none" stroke="var(--accent)" strokeWidth="0.35" />
            )}
          </g>
        ))}

        {location && altEndLocation && (
          <line
            x1={location.x}
            y1={location.y}
            x2={altEndLocation.x}
            y2={altEndLocation.y}
            stroke="var(--warn)"
            strokeWidth="1.05"
            strokeDasharray="2 1.4"
            markerEnd="url(#footballAlternativeArrow)"
          />
        )}

        {location && endLocation && (
          <line
            x1={location.x}
            y1={location.y}
            x2={endLocation.x}
            y2={endLocation.y}
            stroke="var(--brand)"
            strokeWidth="0.85"
            markerEnd="url(#footballActualArrow)"
          />
        )}

        {endLocation && (
          <circle
            cx={endLocation.x}
            cy={endLocation.y}
            r="2.7"
            fill="transparent"
            stroke="var(--brand)"
            strokeWidth="0.65"
          />
        )}

        {markers.map((marker, index) => {
          if (marker?.x == null || marker?.y == null) return null;

          const selected = marker.variant === 'selected';
          const best = marker.variant === 'best';

          return (
            <g key={`candidate-${marker.id ?? index}`}>
              {selected && (
                <circle
                  cx={marker.x}
                  cy={marker.y}
                  r="5"
                  fill="none"
                  stroke="var(--warn)"
                  strokeWidth="0.45"
                  opacity="0.7"
                />
              )}
              <circle
                cx={marker.x}
                cy={marker.y}
                r={selected || best ? 2.8 : 2.15}
                fill={selected || best ? 'var(--warn)' : 'var(--surface)'}
                stroke="var(--warn)"
                strokeWidth={selected || best ? 0.55 : 0.65}
              />
              {marker.label != null && (
                <text
                  x={marker.x}
                  y={marker.y - 3.2}
                  textAnchor="middle"
                  fontSize="3"
                  fontWeight="700"
                  fill="var(--color-ink-1)"
                  stroke="var(--color-surface)"
                  strokeWidth="0.6"
                  paintOrder="stroke"
                >
                  {marker.label}
                </text>
              )}
            </g>
          );
        })}

        {location && (
          <g transform={`translate(${location.x}, ${location.y})`}>
            <circle r="3" fill="var(--brand)" stroke="var(--pitch-fill)" strokeWidth="0.55" />
            <circle r="4.7" fill="none" stroke="var(--brand)" strokeWidth="0.4" opacity="0.65" />
          </g>
        )}
      </svg>
    </div>
  );
}
