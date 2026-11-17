import { fmt, signed } from '../lib/math.js';

/**
 * Table of values (x on top, f(x) below), always left-to-right like a number line.
 * show:  how many columns have their f(x) revealed (default: all)
 * hi:    indices of highlighted columns
 * ghost: indices of "helper" columns that are not in the original table
 * arcs:  indices of gaps to annotate (gap i = between column i and i+1) with Δx, Δf and Δf÷Δx
 * cell:  optional render function (i) => node, used to put answer slots in the f(x) row
 */
export default function ValueTable({ name = 'f', xs, ys, show, hi = [], ghost = [], arcs, cell, reserve }) {
  const n = xs.length;
  const shown = show === undefined ? n : show;
  const withArcs = !!arcs || reserve;
  const r0 = withArcs ? 2 : 1; // grid row of the x row
  return (
    <div className="vt" dir="ltr" style={{ gridTemplateColumns: `auto repeat(${2 * n}, minmax(0, 1fr))` }}>
      {withArcs && <div className="vt-spacer" style={{ gridRow: 1, gridColumn: 1 }} />}
      {(arcs || []).map((i) => (
        <div key={'t' + i} className="vt-arc top" style={{ gridRow: 1, gridColumn: `${3 + 2 * i} / span 2` }}>
          <span>{signed(xs[i + 1] - xs[i])}</span>
        </div>
      ))}

      <div className="vt-h" style={{ gridRow: r0, gridColumn: 1 }}>
        x
      </div>
      {xs.map((x, i) => (
        <div
          key={'x' + i}
          className={`vt-c vt-x ${hi.includes(i) ? 'hi' : ''} ${ghost.includes(i) ? 'ghost' : ''}`}
          style={{ gridRow: r0, gridColumn: `${2 + 2 * i} / span 2` }}
        >
          {fmt(x)}
        </div>
      ))}

      <div className="vt-h" style={{ gridRow: r0 + 1, gridColumn: 1 }}>
        {name}(x)
      </div>
      {xs.map((_, i) => (
        <div
          key={'y' + i}
          className={`vt-c vt-y ${hi.includes(i) ? 'hi' : ''} ${ghost.includes(i) ? 'ghost' : ''} ${cell ? 'slot-cell' : ''}`}
          style={{ gridRow: r0 + 1, gridColumn: `${2 + 2 * i} / span 2` }}
        >
          {cell ? (
            cell(i)
          ) : i < shown ? (
            <span key="v" className="vt-val">
              {fmt(ys[i])}
            </span>
          ) : (
            <span className="vt-q">?</span>
          )}
        </div>
      ))}

      {withArcs && <div className="vt-spacer tall" style={{ gridRow: r0 + 2, gridColumn: 1 }} />}
      {(arcs || []).map((i) => {
        const dx = xs[i + 1] - xs[i];
        const dy = ys[i + 1] - ys[i];
        const r = dy / dx;
        return (
          <div key={'b' + i} className="vt-arc bottom" style={{ gridRow: r0 + 2, gridColumn: `${3 + 2 * i} / span 2` }}>
            <span>{signed(dy)}</span>
            <em>
              {dx === 1 ? '' : `${fmt(dy)} ÷ ${dx} = `}
              <b>{Number.isInteger(r) ? fmt(r) : `${fmt(dy)}/${dx}`}</b>
            </em>
          </div>
        );
      })}
    </div>
  );
}
