import Rich from './Rich.jsx';

/**
 * Equation solved line by line.
 * rows: { l, r, op?, tag? } — "op" is what we do to both sides to reach the next line.
 *       { note } — a full-width remark between lines.
 * show: how many rows are visible (default: all)
 */
export default function EquationSteps({ rows, show, big }) {
  const n = show === undefined ? rows.length : show;
  return (
    <div className={`eqs ${big ? 'big' : ''}`} dir="ltr">
      {rows.slice(0, n).map((r, i) =>
        r.note ? (
          <div key={i} className="eq-note" dir="rtl">
            <Rich text={r.note} />
          </div>
        ) : (
          <div
            key={i}
            className={`eq-row ${i === n - 1 ? 'last' : ''} ${r.tag ? 'tagged' : ''}`}
            dir={/^[֐-׿]/.test(r.l) ? 'rtl' : 'ltr'}
          >
            <span className="eq-l">{r.l}</span>
            <span className="eq-eq">=</span>
            <span className="eq-r" dir="ltr">
              {r.r}
            </span>
            {r.tag && <span className="eq-tag">{r.tag}</span>}
            {r.op && i < n - 1 && (
              <span className="eq-op">
                <i>↓</i> {r.op}
              </span>
            )}
          </div>
        ),
      )}
    </div>
  );
}
