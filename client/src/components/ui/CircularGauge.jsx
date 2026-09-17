import React from 'react';

export function CircularGauge({ score = 0, size = 120, strokeWidth = 10, label = 'ATS Match' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let color = 'var(--apple-emerald)';
  let glow = 'rgba(48, 209, 88, 0.4)';
  if (score < 60) {
    color = 'var(--apple-rose)';
    glow = 'rgba(255, 55, 95, 0.4)';
  } else if (score < 80) {
    color = 'var(--apple-amber)';
    glow = 'rgba(255, 159, 10, 0.4)';
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background track */}
        <circle
          stroke="var(--nxt-border-subtle, rgba(0, 0, 0, 0.08))"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress ring */}
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{
            strokeDashoffset,
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
            filter: `drop-shadow(0 0 8px ${glow})`
          }}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {/* Center score */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}
      >
        <span style={{ fontSize: size * 0.28, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--nxt-text-primary)' }}>
          {score}%
        </span>
        {label && (
          <span style={{ fontSize: size * 0.1, color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '-2px' }}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
