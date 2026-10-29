/* "Today" for business dates. The prototype fixed it to 2026-10-27 so the
 * sample data stays consistent; APP_TODAY keeps that for the demo. Leave
 * APP_TODAY empty for live use (then the date in APP_TIMEZONE is used). */
export function today(): string {
  const fixed = process.env.APP_TODAY;
  if (fixed && /^\d{4}-\d{2}-\d{2}$/.test(fixed)) return fixed;
  return new Intl.DateTimeFormat("en-CA", { timeZone: process.env.APP_TIMEZONE || "Indian/Maldives", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
/** Year printed in RL-YYYY-#### and BML/HR-####/YYYY (hard-coded 2026 in the prototype). */
export const refYear = () => process.env.REF_YEAR || today().slice(0, 4);
