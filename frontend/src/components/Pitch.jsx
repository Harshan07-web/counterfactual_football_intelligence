// StatsBomb pitch coordinate convention: 120 (length) x 80 (width), origin top-left.
const PITCH_W = 120;
const PITCH_H = 80;

export default function Pitch({ freezeFrame, location, endLocation, height = 340 }) {
  const { teammates = [], opponents = [] } = freezeFrame || {};

  return (
    <div className="rounded-lg overflow-hidden border border-border-soft">
      <svg
        viewBox={`0 0 ${PITCH_W} ${PITCH_H}`}
        style={{ height, width: '100%' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <marker id="arrowHead" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#6d5b95" />
          </marker>
        </defs>

        <rect x="0" y="0" width={PITCH_W} height={PITCH_H} fill="var(--pitch-fill)" />
        {/* mow stripes — flat, no gradient */}
        {Array.from({ length: 12 }).map((_, i) => (
          <rect
            key={i}
            x={(i * PITCH_W) / 12}
            y="0"
            width={PITCH_W / 12}
            height={PITCH_H}
            fill={i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'transparent'}
          />
        ))}

        {/* pitch lines */}
        <g stroke="var(--pitch-line)" strokeWidth="0.4" fill="none">
          <rect x="0.3" y="0.3" width={PITCH_W - 0.6} height={PITCH_H - 0.6} />
          <line x1={PITCH_W / 2} y1="0" x2={PITCH_W / 2} y2={PITCH_H} />
          <circle cx={PITCH_W / 2} cy={PITCH_H / 2} r="9.15" />
          <circle cx={PITCH_W / 2} cy={PITCH_H / 2} r="0.4" fill="var(--pitch-line)" />
          {/* left box */}
          <rect x="0" y={(PITCH_H - 44) / 2} width="18" height="44" />
          <rect x="0" y={(PITCH_H - 20) / 2} width="6" height="20" />
          {/* right box */}
          <rect x={PITCH_W - 18} y={(PITCH_H - 44) / 2} width="18" height="44" />
          <rect x={PITCH_W - 6} y={(PITCH_H - 20) / 2} width="6" height="20" />
        </g>

        {/* opponents */}
        {opponents.map((p) => (
          <g key={p.id} transform={`translate(${p.x}, ${p.y})`}>
            <circle r="2.1" fill="#a15364" stroke="var(--pitch-fill)" strokeWidth="0.4" />
            <text y="0.9" textAnchor="middle" fontSize="2" fill="#fff" fontWeight="700">{p.jersey}</text>
          </g>
        ))}

        {/* teammates */}
        {teammates.map((p) => (
          <g key={p.id} transform={`translate(${p.x}, ${p.y})`}>
            <circle r="2.1" fill="#a082a6" stroke="var(--pitch-fill)" strokeWidth="0.4" />
            <text y="0.9" textAnchor="middle" fontSize="2" fill="#fff" fontWeight="700">{p.jersey}</text>
          </g>
        ))}

        {/* pass vector */}
        {location && endLocation && (
          <line
            x1={location.x}
            y1={location.y}
            x2={endLocation.x}
            y2={endLocation.y}
            stroke="#6d5b95"
            strokeWidth="0.6"
            strokeDasharray="1.6 1"
            markerEnd="url(#arrowHead)"
          />
        )}

        {/* selected player (ball origin) */}
        {location && (
          <g transform={`translate(${location.x}, ${location.y})`}>
            <circle r="2.6" fill="#6d5b95" stroke="var(--pitch-fill)" strokeWidth="0.5" />
            <circle r="4" fill="none" stroke="#6d5b95" strokeWidth="0.3" opacity="0.5" />
          </g>
        )}
      </svg>
    </div>
  );
}