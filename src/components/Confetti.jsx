import { useMemo } from 'react';

const COLORS = ['#7a5af8', '#2f7df6', '#ff7a2f', '#12a875', '#ef476f', '#ffc93c'];

/** A short celebration burst. Change `fire` to launch a new one; 0 = nothing. */
export default function Confetti({ fire, count = 36 }) {
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        dx: (Math.random() - 0.5) * 520,
        dy: -160 - Math.random() * 300,
        rot: Math.random() * 720 - 360,
        color: COLORS[i % COLORS.length],
        delay: Math.random() * 0.12,
        w: 8 + Math.random() * 8,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fire, count],
  );
  if (!fire) return null;
  return (
    <div className="confetti" key={fire} aria-hidden="true">
      {bits.map((b, i) => (
        <i
          key={i}
          style={{
            '--dx': b.dx + 'px',
            '--dy': b.dy + 'px',
            '--rot': b.rot + 'deg',
            background: b.color,
            width: b.w,
            height: b.w * 0.6,
            animationDelay: b.delay + 's',
          }}
        />
      ))}
    </div>
  );
}
