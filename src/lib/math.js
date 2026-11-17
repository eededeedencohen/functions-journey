// ---------- display + spoken helpers for numbers and expressions ----------

/** number for display, with a real minus sign */
export const fmt = (n) => (n < 0 ? '−' + Math.abs(n) : String(n));

/** number with an explicit sign: +2 / −3 */
export const signed = (n) => (n < 0 ? '−' + Math.abs(n) : '+' + n);

/** number wrapped in parentheses when negative: (−3) */
export const par = (n) => (n < 0 ? `(${fmt(n)})` : String(n));

/** spoken number (the Hebrew voice reads the digits itself) */
export const say = (n) => (n < 0 ? 'מינוס ' + Math.abs(n) : String(n));

/** "x + 3" / "x − 3" / "x" */
export const xPlus = (b) => (b === 0 ? 'x' : b > 0 ? `x + ${b}` : `x − ${-b}`);
export const sayXPlus = (b) => (b === 0 ? 'איקס' : b > 0 ? `איקס ועוד ${b}` : `איקס פחות ${-b}`);

/** "3x" / "−x" / "x" */
export const mx = (m) => (m === 1 ? 'x' : m === -1 ? '−x' : fmt(m) + 'x');
export const sayMx = (m) => (m === 1 ? 'איקס' : m === -1 ? 'מינוס איקס' : say(m) + ' איקס');

/** body of a linear expression: "−3x + 6" */
export function body(m, b) {
  if (m === 0) return fmt(b);
  if (b === 0) return mx(m);
  return `${mx(m)} ${b > 0 ? '+' : '−'} ${Math.abs(b)}`;
}
export function sayBody(m, b) {
  if (m === 0) return say(b);
  if (b === 0) return sayMx(m);
  return `${sayMx(m)} ${b > 0 ? 'ועוד' : 'פחות'} ${Math.abs(b)}`;
}

/** "f(x) = −3x + 6" */
export const expr = (m, b, name = 'f') => `${name}(x) = ${body(m, b)}`;
export const sayName = (name = 'f') => (name === 'm' ? 'אֶם' : name === 'g' ? 'גִ׳י' : name === 'h' ? 'אֵייץ׳' : 'אֶף');
export const sayExpr = (m, b, name = 'f') => `${sayName(name)} של איקס שווה ${sayBody(m, b)}`;

/** the substitution written out: "−3·2 + 6" */
export function subst(m, b, x) {
  const first = `${par(m)}·${par(x)}`;
  if (b === 0) return first;
  return `${first} ${b > 0 ? '+' : '−'} ${Math.abs(b)}`;
}

// ---------- random helpers ----------
export const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
