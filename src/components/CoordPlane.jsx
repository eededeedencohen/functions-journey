import { useId } from 'react';
import { fmt, signed, range } from '../lib/math.js';

import { C } from '../lib/colors.js';

export { C };

/**
 * Animated coordinate plane. Everything is declarative: pass lines / points / guides / stairs
 * with stable ids — an element animates in the first time its id appears.
 *
 * lines:  { id, m, b, color?, dashed? }
 * points: { id, x, y, color?, label?, pulse?, lp?: 'l' | 'r' | 'b' }
 * guides: { id, x, y, from?: 'x' | 'y' | 'origin', stage?: 1 | 2 }  "walk" from an axis to the graph and on to the other axis
 * stairs: { id, x, y, dx, dy, v?: boolean }  one step right, then up/down (rate of change)
 */
export default function CoordPlane({
  xmin = -6,
  xmax = 6,
  ymin = -6,
  ymax = 6,
  labelEvery = 1,
  lines = [],
  points = [],
  guides = [],
  stairs = [],
  hiAxis,
  onTap,
  className = '',
}) {
  const clip = useId();
  const U = 480 / Math.max(xmax - xmin, ymax - ymin);
  const P = 30;
  const W = (xmax - xmin) * U + 2 * P;
  const H = (ymax - ymin) * U + 2 * P;
  const X = (x) => P + (x - xmin) * U;
  const Y = (y) => P + (ymax - y) * U;
  const fs = Math.max(12, Math.min(16, U * 0.4));
  // axes sit on 0 when it is in view, otherwise on the nearest edge
  const ax = Math.min(Math.max(0, xmin), xmax);
  const ay = Math.min(Math.max(0, ymin), ymax);

  const tap = (e) => {
    if (!onTap) return;
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    const gx = Math.round(xmin + (p.x - P) / U);
    const gy = Math.round(ymax - (p.y - P) / U);
    if (gx < xmin || gx > xmax || gy < ymin || gy > ymax) return;
    onTap(gx, gy);
  };

  const badge = (key, cx, cy, value, color, delay) => {
    const t = fmt(value);
    const w = 14 + t.length * 9;
    return (
      <g key={key} className="cp-pop" style={{ animationDelay: delay + 's' }}>
        <rect x={cx - w / 2} y={cy - 12} width={w} height={24} rx={8} fill={color} />
        <text x={cx} y={cy + 5} textAnchor="middle" className="cp-badge">
          {t}
        </text>
      </g>
    );
  };

  return (
    <svg
      className={`cp ${onTap ? 'cp-tappable' : ''} ${className}`}
      viewBox={`0 0 ${W} ${H}`}
      style={{ '--ar': W / H }}
      onPointerDown={tap}
      role="img"
      aria-label="מערכת צירים"
    >
      <defs>
        <clipPath id={clip}>
          <rect x={P - 6} y={P - 6} width={W - 2 * P + 12} height={H - 2 * P + 12} rx={6} />
        </clipPath>
      </defs>
      <rect x={P} y={P} width={W - 2 * P} height={H - 2 * P} className="cp-bg" />

      {/* grid */}
      {range(xmin, xmax).map((x) => (
        <line key={'gx' + x} x1={X(x)} y1={P} x2={X(x)} y2={H - P} className="cp-grid" />
      ))}
      {range(ymin, ymax).map((y) => (
        <line key={'gy' + y} x1={P} y1={Y(y)} x2={W - P} y2={Y(y)} className="cp-grid" />
      ))}

      {/* axes */}
      <line x1={P - 10} y1={Y(ay)} x2={W - P + 12} y2={Y(ay)} className="cp-axis" />
      <line x1={X(ax)} y1={H - P + 10} x2={X(ax)} y2={P - 12} className="cp-axis" />
      <path d={`M${W - P + 20},${Y(ay)} l-10,-6 v12 z`} className="cp-arrow" />
      <path d={`M${X(ax)},${P - 20} l-6,10 h12 z`} className="cp-arrow" />
      <text x={W - P + 14} y={Y(ay) - 12} className="cp-axis-name" textAnchor="middle">
        x
      </text>
      <text x={X(ax) + 16} y={P - 12} className="cp-axis-name" textAnchor="middle">
        y
      </text>
      {hiAxis && hiAxis !== 'y' && (
        <line x1={P - 10} y1={Y(ay)} x2={W - P + 12} y2={Y(ay)} className="cp-hi" stroke={C.x} />
      )}
      {hiAxis && hiAxis !== 'x' && (
        <line x1={X(ax)} y1={H - P + 10} x2={X(ax)} y2={P - 12} className="cp-hi" stroke={C.y} />
      )}

      {/* numbers */}
      {range(xmin, xmax)
        .filter((x) => x !== 0 && x % labelEvery === 0)
        .map((x) => (
          <text key={'lx' + x} x={X(x)} y={Y(ay) + fs + 5} textAnchor="middle" fontSize={fs} className="cp-num">
            {fmt(x)}
          </text>
        ))}
      {range(ymin, ymax)
        .filter((y) => y !== 0 && y % labelEvery === 0)
        .map((y) => (
          <text key={'ly' + y} x={X(ax) - 8} y={Y(y) + fs * 0.36} textAnchor="end" fontSize={fs} className="cp-num">
            {fmt(y)}
          </text>
        ))}
      {xmin <= 0 && xmax >= 0 && ymin <= 0 && ymax >= 0 && (
        <text x={X(0) - 8} y={Y(0) + fs + 5} textAnchor="end" fontSize={fs} className="cp-num">
          0
        </text>
      )}

      {/* function lines */}
      <g clipPath={`url(#${clip})`}>
        {lines.map((l) => (
          <line
            key={l.id}
            x1={X(xmin - 1)}
            y1={Y(l.m * (xmin - 1) + l.b)}
            x2={X(xmax + 1)}
            y2={Y(l.m * (xmax + 1) + l.b)}
            pathLength="1"
            className={`cp-line cp-draw ${l.dashed ? 'cp-ghost' : ''}`}
            stroke={l.color || C.line}
          />
        ))}
      </g>

      {/* rate-of-change stairs */}
      {stairs.map((s) => {
        const x2 = s.x + s.dx;
        const y2 = s.y + s.dy;
        const below = s.dy > 0;
        return (
          <g key={s.id}>
            <line x1={X(s.x)} y1={Y(s.y)} x2={X(x2)} y2={Y(s.y)} pathLength="1" className="cp-stair cp-draw" stroke={C.x} />
            <text
              x={(X(s.x) + X(x2)) / 2}
              y={Y(s.y) + (below ? 19 : -9)}
              textAnchor="middle"
              className="cp-step cp-fade"
              fill={C.x}
            >
              {signed(s.dx)}
            </text>
            {s.v !== false && (
              <g key="v">
                <line
                  x1={X(x2)}
                  y1={Y(s.y)}
                  x2={X(x2)}
                  y2={Y(y2)}
                  pathLength="1"
                  className="cp-stair cp-draw cp-d1"
                  stroke={C.y}
                />
                <text x={X(x2) + 8} y={(Y(s.y) + Y(y2)) / 2 + 6} className="cp-step cp-fade cp-d1" fill={C.y}>
                  {signed(s.dy)}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* guides: axis -> graph -> other axis */}
      {guides.map((g) => {
        const from = g.from || 'x';
        const a = from === 'x' ? [g.x, 0] : from === 'y' ? [0, g.y] : [0, 0];
        const mid = from === 'x' ? [g.x, g.y] : from === 'y' ? [g.x, g.y] : [g.x, 0];
        const end = from === 'x' ? [0, g.y] : from === 'y' ? [g.x, 0] : [g.x, g.y];
        const both = g.stage !== 1;
        const chained = g.stage === undefined; // both legs appear together -> second one waits
        return (
          <g key={g.id}>
            <line x1={X(a[0])} y1={Y(a[1])} x2={X(mid[0])} y2={Y(mid[1])} pathLength="1" className="cp-guide cp-draw" />
            {both && (
              <line
                key="leg2"
                x1={X(mid[0])}
                y1={Y(mid[1])}
                x2={X(end[0])}
                y2={Y(end[1])}
                pathLength="1"
                className={`cp-guide cp-draw ${chained ? 'cp-d2' : ''}`}
              />
            )}
            {from === 'x' && badge('bx', X(g.x), Y(0), g.x, C.x, 0)}
            {from === 'x' && both && badge('by', X(0), Y(g.y), g.y, C.y, chained ? 1.2 : 0.5)}
            {from === 'y' && badge('by', X(0), Y(g.y), g.y, C.y, 0)}
            {from === 'y' && both && badge('bx', X(g.x), Y(0), g.x, C.x, chained ? 1.2 : 0.5)}
          </g>
        );
      })}

      {/* points */}
      {points.map((p) => {
        const left = p.lp === 'l';
        const bottom = p.lp === 'b';
        return (
          <g key={p.id}>
            {p.pulse && <circle cx={X(p.x)} cy={Y(p.y)} r={9} className="cp-pulse" stroke={p.color || C.ink} />}
            <circle cx={X(p.x)} cy={Y(p.y)} r={p.r || 7.5} fill={p.color || C.ink} className="cp-point cp-pop" />
            {p.label && (
              <text
                x={X(p.x) + (bottom ? 0 : left ? -12 : 12)}
                y={Y(p.y) + (bottom ? 26 : -11)}
                textAnchor={bottom ? 'middle' : left ? 'end' : 'start'}
                className="cp-label cp-fade"
                fill={p.color || C.ink}
              >
                {p.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
