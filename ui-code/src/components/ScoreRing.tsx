interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  delta?: number;
}

export default function ScoreRing({ score, size = 160, strokeWidth = 10, label, sublabel, delta }: ScoreRingProps) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 85 ? '#4CAF82' : score >= 70 ? '#D9B85F' : '#E07070';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 6px ${color}66)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-serif font-bold" style={{ fontSize: size * 0.28, color: 'var(--foreground)', lineHeight: 1 }}>{score}</span>
          {label && <span className="text-xs font-medium mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{label}</span>}
          {delta !== undefined && (
            <span className="text-xs font-semibold mt-1 px-2 py-0.5 rounded-full" style={{ background: delta >= 0 ? '#EAF4E7' : '#FEE2E2', color: delta >= 0 ? '#2D7A56' : '#C0392B' }}>
              {delta >= 0 ? '+' : ''}{delta}
            </span>
          )}
        </div>
      </div>
      {sublabel && <p className="text-xs text-center max-w-32" style={{ color: 'var(--muted-foreground)' }}>{sublabel}</p>}
    </div>
  );
}
