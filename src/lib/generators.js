// Builds exercises (graph / table / equation) together with their fully narrated solutions.
// A problem = { kind, title, graph?, table?, eq?, parts: [...] }
// A part    = { id, title, prompt, say, type, ..., hint, points, solution: steps[] }
//   type 'nums'   -> fields [{id, label?}], answers [numbers], layout 'list' | 'table' | 'expr'
//   type 'choice' -> options [], answer index
//   type 'point'  -> answer [x, y] (tap on the graph)
//   type 'plot'   -> answers [[x, y], ...] (tap several points)
// A solution step uses the same shape as a lesson step: { say, text, graph?, table?, eq? }

import { fmt, say, par, body, sayBody, expr, sayExpr, xPlus, sayXPlus, mx, sayMx, subst, sayName, randInt, pick, shuffle, range } from './math.js';
import { C } from './colors.js';

const R6 = { xmin: -6, xmax: 6, ymin: -6, ymax: 6 };
const R10 = { xmin: -10, xmax: 10, ymin: -10, ymax: 10, labelEvery: 2 };
const pt = (x, y) => `(${fmt(x)}, ${fmt(y)})`;
const plusMinus = (b) => (b > 0 ? 'ועוד' : 'פחות');

/** lines of solving  m·x + b = c */
function linearRows(m, b, c) {
  const rows = [{ l: body(m, b), r: fmt(c) }];
  if (b !== 0) {
    rows[rows.length - 1].op = b > 0 ? `− ${b}` : `+ ${-b}`;
    rows.push({ l: mx(m), r: fmt(c - b) });
  }
  if (m !== 1) {
    rows[rows.length - 1].op = `÷ ${par(m)}`;
    rows.push({ l: 'x', r: fmt((c - b) / m) });
  }
  return rows;
}

// =====================================================================================
//  GRAPH  (the worksheet "נתון הגרף הבא המתאר את הפונקציה f(x)")
// =====================================================================================
export function makeGraphProblem({ m, b, name = 'f', parts = ['table', 'rate', 'zero', 'zeroPoint', 'yint'], xs, title }) {
  const f = (x) => m * x + b;
  const N = sayName(name);
  const up = m > 0;
  const am = Math.abs(m);
  const x0 = -b / m;
  const base = { ...R6, lines: [{ id: 'L', m, b }] };
  if (!xs) {
    const ok = range(-6, 6).filter((x) => Math.abs(f(x)) <= 6);
    const start = randInt(0, Math.max(0, ok.length - 5));
    xs = ok.slice(start, start + 5);
  }
  const ys = xs.map(f);
  // a comfortable place on the graph for two "stairs"
  const xa =
    range(-6, 4)
      .filter((x) => [x, x + 1, x + 2].every((v) => Math.abs(f(v)) <= 6))
      .sort((p, q) => Math.abs(f(p + 1)) + Math.abs(p + 1) - (Math.abs(f(q + 1)) + Math.abs(q + 1)))[0] ?? 0;
  const stair = (i) => ({ id: 's' + i, x: xa + i, y: f(xa + i), dx: 1, dy: m });
  const moveWord = up ? 'לעלות' : 'לרדת';

  const build = {
    table: () => ({
      id: 'table',
      title: 'טבלת ערכים',
      type: 'nums',
      layout: 'table',
      prompt: `מלאו את טבלת הערכים של $${name}(x)$ לפי הגרף.`,
      say: `מלאו את טבלת הערכים של ${N} של איקס, לפי הגרף.`,
      fields: xs.map((x, i) => ({ id: 'y' + i })),
      answers: ys,
      hint: 'לכל $x$ בטבלה: מצאו אותו על ציר $x$, עלו או רדו עד הגרף, ומשם לכו הצידה אל ציר $y$.',
      points: 15,
      solution: [
        {
          say: 'כדי למלא את הטבלה, נמצא לכל איקס את הנקודה המתאימה על הגרף.',
          text: 'לכל $x$ בטבלה נמצא את הנקודה המתאימה על הגרף.',
          graph: base,
          table: { name, xs, ys, show: 0 },
        },
        ...xs.map((x, i) => ({
          say: `כשאיקס שווה ${say(x)}, ${
            ys[i] === 0
              ? 'הגרף נמצא בדיוק על ציר איקס, אז הערך הוא 0.'
              : `${ys[i] > 0 ? 'עולים' : 'יורדים'} עד הגרף, והולכים הצידה אל ציר וואי. מקבלים ${say(ys[i])}.`
          }`,
          text: `כאשר $x = ${fmt(x)}$ מקבלים $${name}(${fmt(x)}) = ${fmt(ys[i])}$`,
          graph: {
            ...base,
            guides: [{ id: 'g' + i, x, y: ys[i] }],
            points: xs.slice(0, i + 1).map((xx, j) => ({ id: 'p' + j, x: xx, y: f(xx), color: j === i ? C.y : C.line })),
          },
          table: { name, xs, ys, show: i + 1, hi: [i] },
        })),
        {
          say: 'וזאת הטבלה המלאה. שימו לב שכל עמודה בטבלה היא נקודה על הגרף.',
          text: 'הטבלה המלאה. כל עמודה היא נקודה על הגרף.',
          graph: { ...base, points: xs.map((xx, j) => ({ id: 'p' + j, x: xx, y: f(xx), color: C.line })) },
          table: { name, xs, ys },
        },
      ],
    }),

    rate: () => ({
      id: 'rate',
      title: 'קצב השתנות',
      type: 'nums',
      layout: 'list',
      prompt: 'מהו קצב ההשתנות של הפונקציה?',
      say: 'מהו קצב ההשתנות של הפונקציה?',
      fields: [{ id: 'm', label: 'קצב ההשתנות =' }],
      answers: [m],
      hint: 'בחרו נקודה על הגרף, זוזו צעד אחד ימינה, וספרו כמה צריך לעלות או לרדת כדי לחזור אל הגרף. ירידה = מספר שלילי.',
      points: 10,
      solution: [
        {
          say: 'קצב ההשתנות אומר כמה הפונקציה משתנה כשאיקס גדל ב-1. נבחר נקודה על הגרף.',
          text: 'קצב השתנות = כמה הפונקציה משתנה כש־$x$ גדל ב־1.',
          graph: { ...base, points: [{ id: 'a', x: xa, y: f(xa), color: C.ink, label: pt(xa, f(xa)), lp: up ? 'l' : 'r' }] },
        },
        {
          say: `נזוז צעד אחד ימינה. כדי לחזור אל הגרף צריך ${moveWord} ${am}.`,
          text: `צעד אחד ימינה, ואז ${up ? 'עולים' : 'יורדים'} $${am}$.`,
          graph: { ...base, points: [{ id: 'a', x: xa, y: f(xa), color: C.ink }], stairs: [stair(0)] },
        },
        {
          say: 'נבדוק שוב מהנקודה הבאה. שוב צעד אחד ימינה, ושוב אותו שינוי בדיוק.',
          text: 'גם בצעד הבא – אותו שינוי בדיוק.',
          graph: { ...base, points: [{ id: 'a', x: xa, y: f(xa), color: C.ink }], stairs: [stair(0), stair(1)] },
        },
        {
          say: `לכן קצב ההשתנות הוא ${say(m)}. במילים: בכל פעם שאיקס גדל ב-1, הפונקציה ${up ? 'עולה' : 'יורדת'} ב-${am}.`,
          text: `**קצב ההשתנות הוא $${fmt(m)}$**\nבכל פעם ש־$x$ גדל ב־1, הפונקציה ${up ? 'עולה' : 'יורדת'} ב־$${am}$.`,
          graph: { ...base, stairs: [stair(0), stair(1)] },
        },
      ],
    }),

    yint: () => ({
      id: 'yint',
      title: 'הערך ב־x = 0',
      type: 'nums',
      layout: 'list',
      prompt: 'מה ערך הפונקציה עבור $x = 0$?',
      say: 'מה ערך הפונקציה, כשאיקס שווה 0?',
      fields: [{ id: 'b', label: `${name}(0) =` }],
      answers: [b],
      hint: 'כש־$x = 0$ נמצאים בדיוק על ציר $y$. איפה הגרף חוצה את ציר $y$?',
      points: 5,
      solution: [
        {
          say: 'כשאיקס שווה 0, נמצאים בדיוק על ציר וואי. לכן נחפש איפה הגרף חוצה את ציר וואי.',
          text: 'כש־$x = 0$ נמצאים על ציר $y$.',
          graph: { ...base, hiAxis: 'y' },
        },
        {
          say: `הגרף חוצה את ציר וואי ב-${say(b)}. לכן ${N} של 0 שווה ${say(b)}.`,
          text: `הגרף חוצה את ציר $y$ בנקודה $${pt(0, b)}$, ולכן **$${name}(0) = ${fmt(b)}$**`,
          graph: { ...base, hiAxis: 'y', points: [{ id: 'y0', x: 0, y: b, color: C.y, label: pt(0, b), pulse: true }] },
        },
      ],
    }),

    zero: () => ({
      id: 'zero',
      title: 'מתי הפונקציה שווה 0',
      type: 'nums',
      layout: 'list',
      prompt: `מצאו את הערך של $x$ שעבורו $${name}(x) = 0$.`,
      say: `מצאו את הערך של איקס, שעבורו ${N} של איקס שווה 0.`,
      fields: [{ id: 'x', label: 'x =' }],
      answers: [x0],
      hint: 'הפונקציה שווה 0 במקום שבו הגרף חוצה את ציר $x$ (שם הגובה הוא 0).',
      points: 10,
      solution: [
        {
          say: 'הפונקציה שווה 0 במקום שבו הגובה של הגרף הוא 0. זה קורה בדיוק על ציר איקס.',
          text: `$${name}(x) = 0$ במקום שבו הגרף חוצה את **ציר $x$**.`,
          graph: { ...base, hiAxis: 'x' },
        },
        {
          say: `הגרף חוצה את ציר איקס כשאיקס שווה ${say(x0)}.`,
          text: `הגרף חוצה את ציר $x$ בנקודה $${pt(x0, 0)}$.`,
          graph: { ...base, hiAxis: 'x', points: [{ id: 'z', x: x0, y: 0, color: C.x, label: pt(x0, 0), pulse: true }] },
        },
        {
          say: `אפשר גם לחשב. הגרף חוצה את ציר וואי ב-${say(b)}, וקצב ההשתנות הוא ${say(m)}. לכן הביטוי הוא: ${sayExpr(m, b, name)}.`,
          text: `בחישוב: נקודת ההתחלה $${fmt(b)}$ והקצב $${fmt(m)}$ נותנים את הביטוי:`,
          graph: { ...base, points: [{ id: 'y0', x: 0, y: b, color: C.y, label: pt(0, b) }], stairs: [stair(0)] },
          eq: { rows: [{ l: `${name}(x)`, r: body(m, b) }], big: true },
        },
        {
          say: 'נשווה את הביטוי ל-0, ונפתור את המשוואה.',
          text: 'משווים ל־0 ופותרים:',
          graph: { ...base, points: [{ id: 'z', x: x0, y: 0, color: C.x, label: pt(x0, 0) }] },
          eq: { rows: linearRows(m, b, 0) },
        },
        {
          say: `יצא איקס שווה ${say(x0)}, בדיוק כמו שראינו בגרף.`,
          text: `**$x = ${fmt(x0)}$** – בדיוק כמו בגרף!`,
          graph: { ...base, points: [{ id: 'z', x: x0, y: 0, color: C.x, label: pt(x0, 0), pulse: true }] },
          eq: { rows: linearRows(m, b, 0) },
        },
      ],
    }),

    zeroPoint: () => ({
      id: 'zeroPoint',
      title: 'סימון הנקודה',
      type: 'point',
      prompt: `סמנו על הגרף את הנקודה שבה $${name}(x) = 0$.`,
      say: `לחצו על הגרף, בנקודה שבה ${N} של איקס שווה 0.`,
      answer: [x0, 0],
      hint: 'זו הנקודה שבה הגרף חוצה את ציר $x$. ה־$y$ שלה הוא 0.',
      points: 5,
      solution: [
        {
          say: 'הפונקציה שווה 0 כשהגובה הוא 0, כלומר על ציר איקס.',
          text: `$${name}(x) = 0$ על **ציר $x$**.`,
          graph: { ...base, hiAxis: 'x' },
        },
        {
          say: `לכן הנקודה היא המקום שבו הגרף חוצה את ציר איקס: הנקודה ${say(x0)}, 0.`,
          text: `הנקודה היא $${pt(x0, 0)}$.`,
          graph: { ...base, hiAxis: 'x', points: [{ id: 'z', x: x0, y: 0, color: C.x, label: pt(x0, 0), pulse: true }] },
        },
      ],
    }),

    expr: () => ({
      id: 'expr',
      title: 'הביטוי של הפונקציה',
      type: 'nums',
      layout: 'expr',
      name,
      prompt: 'כתבו ביטוי לפונקציה לפי הגרף.',
      say: 'כתבו ביטוי לפונקציה לפי הגרף. מה הקצב, ומה המספר החופשי?',
      fields: [{ id: 'm' }, { id: 'b' }],
      answers: [m, b],
      hint: 'המספר שכופל את $x$ הוא **קצב ההשתנות**. המספר שמצטרף בסוף הוא **הערך ב־$x = 0$** (אם הוא שלילי – הקלידו אותו עם מינוס).',
      points: 10,
      solution: [
        {
          say: 'כדי לכתוב ביטוי צריך שני מספרים: נקודת ההתחלה, וקצב ההשתנות.',
          text: 'צריך שני מספרים: **נקודת ההתחלה** ו**קצב ההשתנות**.',
          graph: base,
        },
        {
          say: `נקודת ההתחלה: הגרף חוצה את ציר וואי ב-${say(b)}.`,
          text: `נקודת ההתחלה: $${name}(0) = ${fmt(b)}$`,
          graph: { ...base, points: [{ id: 'y0', x: 0, y: b, color: C.y, label: pt(0, b) }] },
        },
        {
          say: `קצב ההשתנות: צעד אחד ימינה, ו${up ? 'עולים' : 'יורדים'} ${am}. הקצב הוא ${say(m)}.`,
          text: `קצב ההשתנות: $${fmt(m)}$`,
          graph: { ...base, points: [{ id: 'y0', x: 0, y: b, color: C.y }], stairs: [stair(0), stair(1)] },
        },
        {
          say: `הקצב כופל את איקס, ונקודת ההתחלה מצטרפת בסוף. הביטוי הוא: ${sayExpr(m, b, name)}.`,
          text: 'הקצב כופל את $x$, ונקודת ההתחלה מצטרפת בסוף:',
          graph: { ...base, points: [{ id: 'y0', x: 0, y: b, color: C.y }], stairs: [stair(0), stair(1)] },
          eq: { rows: [{ l: `${name}(x)`, r: body(m, b) }], big: true },
        },
      ],
    }),
  };

  return {
    kind: 'graph',
    title: title || 'חקירת גרף',
    name,
    graph: base,
    table: { name, xs, ys },
    parts: parts.map((p) => build[p]()),
  };
}

// =====================================================================================
//  TABLE  (the worksheet "חקירת פונקציה לפי טבלה חלקית")
// =====================================================================================
export function makeTableProblem({ m, b, name = 'f', xs, evalXs, graphRange = R10, parts = ['const', 'rate', 'plot', 'expr', 'eval'], title }) {
  const f = (x) => m * x + b;
  const N = sayName(name);
  const ys = xs.map(f);
  const T = { name, xs, ys };
  const gaps = xs.slice(1).map((x, i) => ({ dx: x - xs[i], dy: ys[i + 1] - ys[i] }));
  const gapSteps = (upTo) =>
    gaps.slice(0, upTo).map((g, i) => ({
      say: `מ-${say(xs[i])} ל-${say(xs[i + 1])}: איקס גדל ב-${g.dx}, והפונקציה ${g.dy > 0 ? 'גדלה' : 'קטנה'} ב-${Math.abs(g.dy)}. ${say(g.dy)} חלקי ${g.dx} שווה ${say(m)}.`,
      text: `שינוי בפונקציה חלקי שינוי ב־$x$:  $${par(g.dy)} ÷ ${g.dx} = ${fmt(m)}$`,
      table: { ...T, arcs: range(0, i), hi: [i, i + 1], reserve: true },
    }));
  const inRange = xs
    .map((x, i) => [x, ys[i]])
    .filter(([x, y]) => x >= graphRange.xmin && x <= graphRange.xmax && y >= graphRange.ymin && y <= graphRange.ymax);
  const pts = (n, labels) =>
    inRange.slice(0, n).map(([x, y], i) => ({ id: 'p' + i, x, y, color: C.y, label: labels ? pt(x, y) : undefined, lp: m > 0 ? 'l' : 'r' }));
  const k = xs.includes(0) ? xs.indexOf(0) : 0; // the column used to find the free number
  const k2 = k === xs.length - 1 ? 0 : xs.length - 1; // a different column for checking
  const bigGap = Math.max(0, gaps.findIndex((g) => g.dx > 1));

  const build = {
    const: () => ({
      id: 'const',
      title: 'האם הקצב קבוע?',
      type: 'choice',
      prompt: 'האם הפונקציה מתארת קצב השתנות קבוע?',
      say: 'האם הפונקציה מתארת קצב השתנות קבוע?',
      options: ['כן, הקצב קבוע', 'לא, הקצב משתנה'],
      answer: 0,
      hint: 'בדקו כל קפיצה בטבלה: חלקו את השינוי בפונקציה בשינוי ב־$x$. שימו לב שהקפיצות ב־$x$ לא שוות!',
      points: 5,
      solution: [
        {
          say: 'נבדוק כל קפיצה בטבלה. בכל קפיצה נחלק את השינוי בפונקציה, בשינוי באיקס.',
          text: 'בכל קפיצה: **שינוי בפונקציה ÷ שינוי ב־$x$**',
          table: { ...T, reserve: true },
        },
        ...gapSteps(gaps.length),
        {
          say: `בכל הקפיצות קיבלנו ${say(m)}. לכן קצב ההשתנות קבוע.`,
          text: `בכל הקפיצות קיבלנו $${fmt(m)}$ ← **הקצב קבוע** (הגרף הוא קו ישר).`,
          table: { ...T, arcs: range(0, gaps.length - 1), reserve: true },
        },
      ],
    }),

    rate: () => ({
      id: 'rate',
      title: 'קצב השתנות',
      type: 'nums',
      layout: 'list',
      prompt: 'מהו קצב ההשתנות של הפונקציה?',
      say: 'מהו קצב ההשתנות של הפונקציה?',
      fields: [{ id: 'm', label: 'קצב ההשתנות =' }],
      answers: [m],
      hint: 'בחרו שתי עמודות. קצב = (שינוי בפונקציה) ÷ (שינוי ב־$x$).',
      points: 10,
      solution: [
        {
          say: 'קצב ההשתנות הוא השינוי בפונקציה, חלקי השינוי באיקס. נבחר שתי עמודות סמוכות.',
          text: 'קצב = **שינוי בפונקציה ÷ שינוי ב־$x$**',
          table: { ...T, reserve: true },
        },
        {
          say: `מ-${say(xs[bigGap])} ל-${say(xs[bigGap + 1])}: איקס גדל ב-${gaps[bigGap].dx}, והפונקציה ${gaps[bigGap].dy > 0 ? 'גדלה' : 'קטנה'} ב-${Math.abs(gaps[bigGap].dy)}. ${say(gaps[bigGap].dy)} חלקי ${gaps[bigGap].dx} שווה ${say(m)}.`,
          text: `$${par(gaps[bigGap].dy)} ÷ ${gaps[bigGap].dx} = ${fmt(m)}$`,
          table: { ...T, arcs: [bigGap], hi: [bigGap, bigGap + 1], reserve: true },
        },
        {
          say: `לכן קצב ההשתנות הוא ${say(m)}. בכל פעם שאיקס גדל ב-1, הפונקציה ${m > 0 ? 'עולה' : 'יורדת'} ב-${Math.abs(m)}.`,
          text: `**קצב ההשתנות הוא $${fmt(m)}$**`,
          table: { ...T, arcs: range(0, gaps.length - 1), reserve: true },
        },
      ],
    }),

    plot: () => ({
      id: 'plot',
      title: 'שרטוט הגרף',
      type: 'plot',
      prompt: 'שרטטו את הגרף: סמנו על מערכת הצירים את כל הנקודות מהטבלה.\n(לחיצה נוספת על נקודה מוחקת אותה)',
      say: 'שרטטו את הגרף. לחצו על מערכת הצירים, וסמנו את כל הנקודות מהטבלה.',
      answers: inRange,
      hint: 'כל עמודה היא נקודה: המספר העליון הוא $x$ (ימינה/שמאלה) והתחתון הוא $y$ (למעלה/למטה).',
      points: 5,
      solution: [
        {
          say: 'כל עמודה בטבלה היא נקודה. איקס אומר כמה ללכת ימינה או שמאלה, וערך הפונקציה אומר כמה לעלות או לרדת.',
          text: 'כל עמודה בטבלה היא נקודה $(x, y)$.',
          graph: { ...graphRange },
          table: T,
        },
        {
          say: `למשל העמודה הראשונה: איקס שווה ${say(inRange[0][0])}, והפונקציה שווה ${say(inRange[0][1])}. זו הנקודה ${say(inRange[0][0])}, ${say(inRange[0][1])}.`,
          text: `העמודה הראשונה היא הנקודה $${pt(...inRange[0])}$`,
          graph: { ...graphRange, guides: [{ id: 'o', x: inRange[0][0], y: inRange[0][1], from: 'origin' }], points: pts(1, true) },
          table: { ...T, hi: [0] },
        },
        {
          say: 'באותה דרך מסמנים את שאר הנקודות.',
          text: 'מסמנים את שאר הנקודות.',
          graph: { ...graphRange, points: pts(inRange.length, true) },
          table: T,
        },
        {
          say: 'הקצב קבוע, ולכן כל הנקודות נמצאות על קו ישר אחד. מעבירים דרכן קו, וזה הגרף של הפונקציה.',
          text: 'הקצב קבוע ← כל הנקודות על **קו ישר אחד**.',
          graph: { ...graphRange, lines: [{ id: 'L', m, b }], points: pts(inRange.length, false) },
          table: T,
        },
      ],
    }),

    expr: () => ({
      id: 'expr',
      title: 'הביטוי של הפונקציה',
      type: 'nums',
      layout: 'expr',
      name,
      prompt: `כתבו ביטוי לפונקציה $${name}(x)$.`,
      say: `כתבו ביטוי לפונקציה ${N} של איקס.`,
      fields: [{ id: 'm' }, { id: 'b' }],
      answers: [m, b],
      hint: 'המספר שכופל את $x$ הוא קצב ההשתנות. את המספר החופשי מוצאים בעזרת עמודה מהטבלה: כמה חסר (או מיותר) אחרי הכפל?',
      points: 10,
      solution: [
        {
          say: `קצב ההשתנות הוא ${say(m)}, ולכן הביטוי מתחיל ב-${sayMx(m)}. חסר לנו המספר החופשי.`,
          text: `הקצב הוא $${fmt(m)}$, אז הביטוי מתחיל ב־$${mx(m)}$. חסר המספר החופשי.`,
          table: T,
          eq: { rows: [{ l: `${name}(x)`, r: `${mx(m)} + ?` }], big: true },
        },
        xs.includes(0)
          ? {
              say: `המספר החופשי הוא ערך הפונקציה כשאיקס שווה 0. בטבלה רואים שהוא ${say(b)}.`,
              text: `המספר החופשי הוא הערך ב־$x = 0$, ובטבלה: $${fmt(b)}$`,
              table: { ...T, hi: [k] },
              eq: { rows: [{ l: `${name}(x)`, r: `${mx(m)} + ?` }], big: true },
            }
          : {
              say: `ניקח עמודה מהטבלה. כשאיקס שווה ${say(xs[k])}: ${say(m)} כפול ${say(xs[k])} זה ${say(m * xs[k])}. אבל בטבלה כתוב ${say(ys[k])}. ${
                b > 0 ? `חסר ${b}, אז צריך להוסיף ${b}` : `יש ${-b} יותר מדי, אז צריך להחסיר ${-b}`
              }.`,
              text: `עמודה $x = ${fmt(xs[k])}$:  $${par(m)}·${par(xs[k])} = ${fmt(m * xs[k])}$, אבל בטבלה $${fmt(ys[k])}$\nההפרש: $${fmt(ys[k])} − ${par(m * xs[k])} = ${fmt(b)}$`,
              table: { ...T, hi: [k] },
              eq: { rows: [{ l: `${name}(x)`, r: `${mx(m)} + ?` }], big: true },
            },
        {
          say: `לכן הביטוי הוא: ${sayExpr(m, b, name)}.`,
          text: 'הביטוי של הפונקציה:',
          table: T,
          eq: { rows: [{ l: `${name}(x)`, r: body(m, b) }], big: true },
        },
        {
          say: `נבדוק עם עמודה אחרת. כשאיקס שווה ${say(xs[k2])}: ${say(m)} כפול ${say(xs[k2])} זה ${say(m * xs[k2])}, ${plusMinus(b)} ${Math.abs(b)} זה ${say(ys[k2])}. מתאים לטבלה!`,
          text: `בדיקה ב־$x = ${fmt(xs[k2])}$:  $${subst(m, b, xs[k2])} = ${fmt(ys[k2])}$ ✓`,
          table: { ...T, hi: [k2] },
          eq: { rows: [{ l: `${name}(x)`, r: body(m, b) }], big: true },
        },
      ],
    }),

    eval: () => ({
      id: 'eval',
      title: 'חישוב ערכים',
      type: 'nums',
      layout: 'list',
      prompt: `חשבו את ערכי הפונקציה בנקודות $x = ${fmt(evalXs[0])}$ ו־$x = ${fmt(evalXs[1])}$.`,
      say: `חשבו את ערכי הפונקציה, כשאיקס שווה ${say(evalXs[0])}, וכשאיקס שווה ${say(evalXs[1])}.`,
      fields: evalXs.map((x, i) => ({ id: 'e' + i, label: `${name}(${fmt(x)}) =` })),
      answers: evalXs.map(f),
      hint: `מציבים את המספר במקום $x$ בביטוי של הפונקציה: קודם כפל, אחר כך חיבור או חיסור.`,
      points: 10,
      solution: [
        {
          say: `נשתמש בביטוי של הפונקציה: ${sayExpr(m, b, name)}. נציב את המספר במקום איקס.`,
          text: 'מציבים את המספר במקום $x$ בביטוי:',
          table: T,
          eq: { rows: [{ l: `${name}(x)`, r: body(m, b) }] },
        },
        ...evalXs.map((x, i) => ({
          say: `כשאיקס שווה ${say(x)}: ${say(m)} כפול ${say(x)} זה ${say(m * x)}, ${plusMinus(b)} ${Math.abs(b)} זה ${say(f(x))}.`,
          text: `**$${name}(${fmt(x)}) = ${fmt(f(x))}$**`,
          table: T,
          eq: {
            rows: [
              { l: `${name}(x)`, r: body(m, b) },
              ...evalXs.slice(0, i + 1).map((xx) => ({ l: `${name}(${fmt(xx)})`, r: `${subst(m, b, xx)} = ${fmt(f(xx))}` })),
            ],
          },
        })),
      ],
    }),
  };

  return {
    kind: 'table',
    title: title || 'חקירת טבלה',
    name,
    table: T,
    graph: { ...graphRange },
    line: { id: 'L', m, b },
    parts: parts.map((p) => build[p]()),
  };
}

/** small yes/no exercise: is the rate of change constant? (with the classic traps) */
export function makeTableCheck() {
  const name = pick(['f', 'g', 'h']);
  const linear = Math.random() < 0.5;
  const s = randInt(-2, 3);
  const xs = [s, s + 1, s + 3, s + pick([4, 6])];
  let ys;
  let m = null;
  if (linear) {
    m = pick([2, -2, 3, -3, 1, -1, 4]);
    const b = randInt(-4, 6);
    ys = xs.map((x) => m * x + b);
  } else {
    // the trap: f grows by the same amount every time, but the jumps in x are different
    const d = pick([2, 4, -2, -4, 6]);
    const y0 = randInt(-5, 8);
    ys = xs.map((_, i) => y0 + d * i);
  }
  const T = { name, xs, ys };
  const gaps = xs.slice(1).map((x, i) => ({ dx: x - xs[i], dy: ys[i + 1] - ys[i] }));
  const gapSay = (g, i) =>
    `מ-${say(xs[i])} ל-${say(xs[i + 1])}: איקס גדל ב-${g.dx}, והפונקציה ${g.dy > 0 ? 'גדלה' : 'קטנה'} ב-${Math.abs(g.dy)}. ${say(g.dy)} חלקי ${g.dx} שווה ${say(g.dy / g.dx)}.`;
  const solution = [
    {
      say: 'נבדוק כל קפיצה בטבלה. בכל קפיצה נחלק את השינוי בפונקציה, בשינוי באיקס.',
      text: 'בכל קפיצה: **שינוי בפונקציה ÷ שינוי ב־$x$**',
      table: { ...T, reserve: true },
    },
    ...(linear ? gaps : gaps.slice(0, 2)).map((g, i) => ({
      say: gapSay(g, i),
      text: `$${par(g.dy)} ÷ ${g.dx} = ${fmt(g.dy / g.dx)}$`,
      table: { ...T, arcs: range(0, i), hi: [i, i + 1], reserve: true },
    })),
    linear
      ? {
          say: `בכל הקפיצות קיבלנו ${say(m)}. לכן קצב ההשתנות קבוע.`,
          text: `בכל הקפיצות קיבלנו $${fmt(m)}$ ← **הקצב קבוע**.`,
          table: { ...T, arcs: range(0, gaps.length - 1), reserve: true },
        }
      : {
          say: `קיבלנו פעם ${say(gaps[0].dy / gaps[0].dx)}, ופעם ${say(gaps[1].dy / gaps[1].dx)}. הקצב לא קבוע! שימו לב: הפונקציה אמנם משתנה כל פעם באותו מספר, אבל הקפיצות באיקס שונות.`,
          text: `קיבלנו $${fmt(gaps[0].dy / gaps[0].dx)}$ וגם $${fmt(gaps[1].dy / gaps[1].dx)}$ ← **הקצב לא קבוע**.\nהמלכודת: הקפיצות ב־$x$ לא שוות!`,
          table: { ...T, arcs: range(0, gaps.length - 1), reserve: true },
        },
  ];
  return {
    kind: 'table',
    title: 'קצב קבוע או לא?',
    name,
    table: T,
    parts: [
      {
        id: 'const',
        title: 'האם הקצב קבוע?',
        type: 'choice',
        prompt: 'האם הפונקציה מתארת קצב השתנות קבוע?',
        say: 'האם הפונקציה מתארת קצב השתנות קבוע?',
        options: ['כן, הקצב קבוע', 'לא, הקצב משתנה'],
        answer: linear ? 0 : 1,
        hint: 'אל תסתכלו רק על השורה התחתונה! בכל קפיצה חלקו את השינוי בפונקציה בשינוי ב־$x$.',
        points: 5,
        solution,
      },
    ],
  };
}

// =====================================================================================
//  EQUATIONS   a(x + b) = c   and   ax + b = c
// =====================================================================================
export function makeEquation({ a, b, c, form = 'paren', title }) {
  let x, l, solution, hint;
  const shift = (v) => (v > 0 ? `נחסיר ${v} משני הצדדים` : `נוסיף ${-v} לשני הצדדים`);
  if (form === 'paren') {
    x = c / a - b;
    l = `${fmt(a)}(${xPlus(b)})`;
    const q = c / a;
    const rowsA = [
      { l, r: fmt(c), op: `÷ ${par(a)}` },
      { l: xPlus(b), r: fmt(q), op: b > 0 ? `− ${b}` : `+ ${-b}` },
      { l: 'x', r: fmt(x) },
    ];
    hint = 'קודם מחלקים את שני הצדדים במספר שלפני הסוגריים, ואז מבודדים את $x$. זהירות עם הסימנים!';
    solution = [
      {
        say:
          a === 1
            ? `המשוואה היא 1 כפול סוגריים, ${sayXPlus(b)}, שווה ${say(c)}. כפל ב-1 לא משנה דבר, אז נשאר ${sayXPlus(b)} שווה ${say(q)}.`
            : `המשוואה היא ${say(a)} כפול סוגריים, ${sayXPlus(b)}, שווה ${say(c)}. הסוגריים מוכפלים ב-${say(a)}, אז נחלק את שני הצדדים ב-${say(a)}. ${say(c)} חלקי ${say(a)} זה ${say(q)}.`,
        text: `מחלקים את שני הצדדים ב־$${fmt(a)}$:   $${fmt(c)} ÷ ${par(a)} = ${fmt(q)}$`,
        eq: { rows: rowsA, show: 2 },
      },
      {
        say: `עכשיו ${shift(b)}, ונקבל איקס שווה ${say(x)}.`,
        text: `${b > 0 ? `מחסירים $${b}$ משני הצדדים` : `מוסיפים $${-b}$ לשני הצדדים`}:   **$x = ${fmt(x)}$**`,
        eq: { rows: rowsA },
      },
      {
        say: `בדיקה: נציב ${say(x)} במקום איקס. ${say(x)} ${plusMinus(b)} ${Math.abs(b)} זה ${say(x + b)}. ${say(a)} כפול ${say(x + b)} זה ${say(c)}. יצא נכון!`,
        text: `בדיקה: מציבים $x = ${fmt(x)}$ ומקבלים $${fmt(c)}$ ✓`,
        eq: {
          rows: [
            ...rowsA,
            { note: 'בדיקה:' },
            { l: `${fmt(a)}(${fmt(x)} ${b > 0 ? '+' : '−'} ${Math.abs(b)})`, r: `${fmt(a)}·${par(x + b)} = ${fmt(c)}`, tag: '✓' },
          ],
        },
      },
      {
        say: `דרך נוספת: לפתוח סוגריים. ${say(a)} כפול איקס, ו-${say(a)} כפול ${say(b)}. מקבלים ${sayBody(a, a * b)} שווה ${say(c)}, וממשיכים כרגיל. שוב יוצא ${say(x)}.`,
        text: `דרך נוספת – **פותחים סוגריים**:  $${fmt(a)}·x$ ו־$${fmt(a)}·${par(b)} = ${fmt(a * b)}$`,
        eq: { rows: [{ l, r: fmt(c), op: 'פתיחת סוגריים' }, ...linearRows(a, a * b, c)] },
      },
    ];
  } else {
    x = (c - b) / a;
    l = body(a, b);
    const rows = linearRows(a, b, c);
    hint = 'קודם מעבירים את המספר החופשי (פעולה הפוכה בשני הצדדים), ואז מחלקים במספר שכופל את $x$.';
    solution = [];
    if (b !== 0)
      solution.push({
        say: `קודם ${shift(b)}. נשאר ${sayMx(a)} שווה ${say(c - b)}.`,
        text: `${b > 0 ? `מחסירים $${b}$ משני הצדדים` : `מוסיפים $${-b}$ לשני הצדדים`}:   $${mx(a)} = ${fmt(c - b)}$`,
        eq: { rows, show: 2 },
      });
    if (a !== 1)
      solution.push({
        say: `עכשיו נחלק את שני הצדדים ב-${say(a)}, ונקבל איקס שווה ${say(x)}.`,
        text: `מחלקים את שני הצדדים ב־$${fmt(a)}$:   **$x = ${fmt(x)}$**`,
        eq: { rows },
      });
    solution.push({
      say: `בדיקה: ${say(a)} כפול ${say(x)} זה ${say(a * x)}${b !== 0 ? `, ${plusMinus(b)} ${Math.abs(b)} זה ${say(c)}` : ''}. יצא נכון!`,
      text: `בדיקה:  $${subst(a, b, x)} = ${fmt(c)}$ ✓`,
      eq: { rows: [...rows, { note: 'בדיקה:' }, { l: subst(a, b, x), r: fmt(c), tag: '✓' }] },
    });
  }
  return {
    kind: 'eq',
    title: title || 'משוואה',
    eq: { l, r: fmt(c) },
    parts: [
      {
        id: 'x',
        title: 'פתרון משוואה',
        type: 'nums',
        layout: 'list',
        prompt: 'פתרו את המשוואה.',
        say: 'פתרו את המשוואה. מה שווה איקס?',
        fields: [{ id: 'x', label: 'x =' }],
        answers: [x],
        hint,
        points: 5,
        solution,
      },
    ],
  };
}

// =====================================================================================
//  random specs
// =====================================================================================
const NAMES = ['f', 'g', 'h'];

/** a line whose zero and values are whole numbers inside the −6..6 window */
export function randomLine({ intZero = true } = {}) {
  const m = pick([1, -1, 2, -2, 3, -3, 1, -1, 2, -2]);
  const name = pick(NAMES);
  if (!intZero) {
    let b = randInt(-4, 4);
    if (b === 0) b = pick([-3, 3]);
    return { m, b, name };
  }
  const maxX0 = Math.min(5, Math.floor(6 / Math.abs(m)));
  const x0 = randInt(1, maxX0) * pick([1, -1]);
  return { m, b: -m * x0, name };
}

/** a table with uneven jumps in x (like the worksheet), all points inside −10..10 */
export function randomTableSpec() {
  for (let tries = 0; tries < 400; tries++) {
    const m = pick([1, -1, 2, -2, 3, -3, 2, -2]);
    const b = randInt(-8, 8);
    if (b === 0) continue;
    let x = randInt(-3, 2);
    const xs = [x];
    for (let i = 0; i < 4; i++) {
      x += pick([1, 1, 2, 2, 3]);
      xs.push(x);
    }
    if (xs.includes(0)) continue;
    const ys = xs.map((v) => m * v + b);
    if (ys.some((y) => Math.abs(y) > 10) || xs.some((v) => Math.abs(v) > 10)) continue;
    if (new Set(xs.slice(1).map((v, i) => v - xs[i])).size < 2) continue;
    const far = xs[4] + randInt(2, 6);
    const near = pick([0, -4, -5, -6].filter((v) => !xs.includes(v)));
    return { m, b, xs, evalXs: [far, near], name: pick(NAMES) };
  }
  return { m: 1, b: 3, xs: [1, 3, 4, 5, 7], evalXs: [10, 0], name: 'f' };
}

export function randomEquation(form) {
  const kind = form || pick(['paren', 'paren', 'linear']);
  const x = randInt(-9, 9);
  if (kind === 'paren') {
    let a = randInt(2, 9) * pick([1, -1]);
    let b = randInt(1, 9) * pick([1, -1]);
    if (x + b === 0 && Math.random() < 0.7) b += b > 0 ? 1 : -1; // "= 0" equations only once in a while
    return makeEquation({ a, b, c: a * (x + b), form: 'paren' });
  }
  const a = randInt(2, 6) * pick([1, 1, -1]);
  const b = randInt(1, 12) * pick([1, -1]);
  return makeEquation({ a, b, c: a * x + b, form: 'linear' });
}

// =====================================================================================
//  practice sources per unit, the test, and the booklet
// =====================================================================================
export const practiceFor = {
  read: () => makeGraphProblem({ ...randomLine(), parts: ['table'] }),
  rate: () => makeGraphProblem({ ...randomLine(), parts: ['rate'] }),
  start: () => makeGraphProblem({ ...randomLine({ intZero: Math.random() < 0.5 }), parts: ['yint', 'rate', 'expr'] }),
  eq: (i) => randomEquation(i < 2 ? 'linear' : undefined),
  zero: () => makeGraphProblem({ ...randomLine(), parts: ['zero', 'zeroPoint'] }),
  table: (i) => (i % 2 === 0 ? makeTableCheck() : makeTableProblem({ ...randomTableSpec(), parts: ['rate', 'plot', 'expr', 'eval'] })),
};

export function buildTest(kind = 'full') {
  const short = kind === 'short';
  return [
    makeGraphProblem({ ...randomLine(), name: 'f', parts: short ? ['table', 'rate', 'zero'] : ['table', 'rate', 'zero', 'zeroPoint', 'yint'] }),
    makeTableProblem({ ...randomTableSpec(), name: 'g', parts: short ? ['rate', 'expr', 'eval'] : ['const', 'rate', 'plot', 'expr', 'eval'] }),
    ...shuffle(short ? ['linear', 'paren', 'paren'] : ['linear', 'paren', 'paren', 'paren', 'paren']).map((f) => randomEquation(f)),
  ];
}

const BOOK_EQS = [
  [7, 3, -14], [-5, 5, 25], [-7, -10, 21], [-3, 10, -12], [-6, 3, -72], [10, -3, 30], [1, -3, -8], [1, -1, -2],
  [-5, -2, -5], [4, -6, -56], [-5, 9, -65], [-5, -2, -35], [-9, -9, 162], [3, 9, 33], [-6, 1, 6], [2, -2, 4],
  [3, 8, 9], [2, 8, -2], [-10, -4, 70], [3, 3, 24], [-2, 1, 0], [4, 7, 36], [9, -8, -135], [8, -5, 0],
];

/** the brother's own worksheets, exactly as printed */
export const BOOKLET = [
  {
    id: 'g1',
    icon: 'chart',
    title: 'דף גרף 1',
    sub: 'הגרף שעובר דרך $(−2, 0)$',
    build: () => [makeGraphProblem({ m: -1, b: -2, xs: [-2, -1, 0, 1, 2], title: 'דף גרף 1' })],
  },
  {
    id: 'g2',
    icon: 'trending-down',
    title: 'דף גרף 2',
    sub: 'הגרף התלול',
    build: () => [makeGraphProblem({ m: -3, b: 6, xs: [0, 1, 2, 3, 4], title: 'דף גרף 2' })],
  },
  {
    id: 'g3',
    icon: 'chart',
    title: 'דף גרף 3',
    sub: 'הגרף שעובר דרך $(1, 0)$',
    build: () => [makeGraphProblem({ m: -1, b: 1, xs: [-2, -1, 0, 1, 2], title: 'דף גרף 3' })],
  },
  {
    id: 't1',
    icon: 'table',
    title: 'חקירת טבלה: f(x)',
    sub: '$x = 1, 3, 4, 5, 10$',
    build: () => [
      makeTableProblem({
        m: 1, b: 5, name: 'f', xs: [1, 3, 4, 5, 10], evalXs: [8, 13],
        graphRange: { xmin: -2, xmax: 16, ymin: -2, ymax: 16, labelEvery: 2 },
        title: 'חקירת טבלה: f(x)',
      }),
    ],
  },
  {
    id: 't2',
    icon: 'table',
    title: 'חקירת טבלה: m(x)',
    sub: '$x = 1, 3, 4, 8, 10$',
    build: () => [
      makeTableProblem({
        m: -2, b: 8, name: 'm', xs: [1, 3, 4, 8, 10], evalXs: [0, -3],
        graphRange: { xmin: -4, xmax: 12, ymin: -13, ymax: 9, labelEvery: 2 },
        title: 'חקירת טבלה: m(x)',
      }),
    ],
  },
  {
    id: 'eq',
    icon: 'scale',
    title: 'דף המשוואות',
    sub: '24 משוואות עם סוגריים',
    build: () => BOOK_EQS.map(([a, b, c], i) => makeEquation({ a, b, c, title: `משוואה ${i + 1} מתוך 24` })),
  },
];

// =====================================================================================
//  grading (shared by practice and test)
// =====================================================================================
const num = (v) => (v === undefined || v === '' || v === '-' ? null : Number(v));
export const isHebrew = (s) => /[֐-׿]/.test(s || '');

/** returns { score: 0..1, marks } ; marks = per-field 'ok' | 'bad' for 'nums' parts */
export function grade(part, value) {
  if (part.type === 'nums') {
    const marks = {};
    let ok = 0;
    part.fields.forEach((fld, i) => {
      const good = num(value?.[fld.id]) === part.answers[i];
      marks[fld.id] = good ? 'ok' : 'bad';
      if (good) ok++;
    });
    return { score: ok / part.fields.length, marks };
  }
  if (part.type === 'choice') return { score: value === part.answer ? 1 : 0 };
  if (part.type === 'point') return { score: value && value[0] === part.answer[0] && value[1] === part.answer[1] ? 1 : 0 };
  if (part.type === 'plot') {
    const key = (p) => p.join(',');
    const want = new Set(part.answers.map(key));
    const got = (value || []).map(key);
    const hit = got.filter((kk) => want.has(kk)).length;
    const miss = got.length - hit;
    return { score: Math.max(0, hit - miss) / want.size };
  }
  return { score: 0 };
}

export function isEmpty(part, value) {
  if (part.type === 'nums') return part.fields.some((fld) => num(value?.[fld.id]) === null);
  if (part.type === 'choice') return value === undefined || value === null;
  if (part.type === 'point') return !value;
  if (part.type === 'plot') return !value || value.length === 0;
  return true;
}

/** the correct answer as short display text (for the test review) */
export function answerText(part) {
  if (part.type === 'nums') {
    if (part.layout === 'expr') return `$${part.name}(x) = ${body(part.answers[0], part.answers[1])}$`;
    if (part.layout === 'table') return `$${part.answers.map(fmt).join(' ,  ')}$`;
    return part.fields
      .map((fld, i) => (isHebrew(fld.label) ? `${fld.label} $${fmt(part.answers[i])}$` : `$${fld.label} ${fmt(part.answers[i])}$`))
      .join('   ');
  }
  if (part.type === 'choice') return part.options[part.answer];
  if (part.type === 'point') return `$${pt(...part.answer)}$`;
  if (part.type === 'plot') return `$${part.answers.map((p) => pt(...p)).join('  ')}$`;
  return '';
}
