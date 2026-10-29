/* Formatting helpers, ported from the prototype (er-automation-prototype.html, "helpers"). */
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const ord = (n: number) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
/** Letter date: "27th October 2026" */
export const fmtDate = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return `${ord(d)} ${MONTHS[m - 1]} ${y}`; };
/** UI date: "27 Oct 2026" */
export const sd = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return `${d} ${MONTHS[m - 1].slice(0, 3)} ${y}`; };
export const joinAnd = (a: string[]) => (a.length > 1 ? a.slice(0, -1).join(", ") + " and " + a[a.length - 1] : a[0] || "");
/** "19th, 21st and 22nd October 2026" when all dates share a month. */
export function dateList(arr: string[]) {
  const ds = [...arr].sort(); if (!ds.length) return "";
  if (ds.every((x) => x.slice(0, 7) === ds[0].slice(0, 7))) { const [y, m] = ds[0].split("-").map(Number); return `${joinAnd(ds.map((x) => ord(+x.slice(8))))} ${MONTHS[m - 1]} ${y}`; }
  return joinAnd(ds.map(fmtDate));
}
export function rangeText(a: string, b: string) {
  const [y1, m1, d1] = a.split("-").map(Number), [y2, m2, d2] = b.split("-").map(Number);
  return `${ord(d1)} ${MONTHS[m1 - 1]}${y1 !== y2 ? " " + y1 : ""} to ${ord(d2)} ${MONTHS[m2 - 1]} ${y2}`;
}
/** Whole months from one date to another (the prototype's service-period rule). */
export function monthsBetween(from: string, to: string) {
  const a = from.split("-").map(Number), b = to.split("-").map(Number);
  let m = (b[0] - a[0]) * 12 + (b[1] - a[1]); if (b[2] < a[2]) m--;
  return Math.max(0, m);
}
export function fmtMonths(m: number) {
  const y = Math.floor(m / 12), mm = m % 12;
  return [y ? `${y} year${y > 1 ? "s" : ""}` : "", mm ? `${mm} month${mm > 1 ? "s" : ""}` : ""].filter(Boolean).join(" ") || "Less than one month";
}
/** Service period in years and months. */
export const service = (from: string, to: string) => fmtMonths(monthsBetween(from, to));
export const dayCount = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5) + 1;
export const ageOf = (iso: string, today: string) => { const d = Math.round((Date.parse(today) - Date.parse(iso)) / 864e5); return d <= 0 ? "Today" : d === 1 ? "1 day" : d + " days"; };
export const money = (n: number) => "MVR " + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const aan = (w: string) => (/^[aeiou]/i.test(w) ? "an" : "a");
export const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
