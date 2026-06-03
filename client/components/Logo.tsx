'use client';

let idCounter = 0;

// The Podium mark — a lectern/podium in the brand indigo gradient.
export function PodiumMark({ size = 24 }: { size?: number }) {
  // Unique gradient id per instance so multiple marks on a page render correctly
  const gid = `pm-${++idCounter}`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#818cf8" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <path d="M9 8.5 H23 L21.2 15 H10.8 Z" fill={`url(#${gid})`} />
      <rect x="14" y="15" width="4" height="7" fill={`url(#${gid})`} />
      <rect x="9.5" y="22" width="13" height="3" rx="1.5" fill={`url(#${gid})`} />
    </svg>
  );
}

// Brand lockup: icon + PODIUM wordmark. Optional onClick (e.g. go home).
export function Brand({
  size = 18,
  onClick,
}: {
  size?: number;
  onClick?: () => void;
}) {
  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '9px',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      <PodiumMark size={size + 6} />
      <span style={{ fontSize: `${size}px`, fontWeight: 900, letterSpacing: '-0.5px', color: '#fff' }}>
        PODIUM
      </span>
    </span>
  );
}
