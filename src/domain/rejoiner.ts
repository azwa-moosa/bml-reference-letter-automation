/* v0.2 · Rejoiner validation (Job Opportunity, Academic Reference, Staff Release letters).
 * When staff answer "Yes", Employee Relations enters the employment periods from HR
 * records and checks the employment sentence before the letter can be sent or issued.
 * Nothing here is derived from the employee master's single joining date: service is
 * never assumed to be continuous, and periods are never merged. */
import { fmtDate, fmtMonths, monthsBetween } from "./format";
import type { LetterType } from "./config";
import type { Period, Verification } from "./types";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
/** All periods in order: earlier ones, then the current (or last) one. */
export const periodsOf = (v: Verification): Period[] => [...v.earlier, { from: v.rejoined, to: v.lastTo || "" }];

/** Problems with the entered history, in the order shown to the reviewer. */
export function checkVerification(v: Verification, former: boolean, today: string): string[] {
  const E: string[] = [];
  if (!v.earlier.length) E.push("Add at least one earlier employment period (joined and left).");
  v.earlier.forEach((p, i) => {
    if (!ISO.test(p.from) || !ISO.test(p.to)) E.push(`Earlier period ${i + 1}: enter both the joining and the leaving date.`);
    else if (p.to < p.from) E.push(`Earlier period ${i + 1}: the leaving date is before the joining date.`);
  });
  for (let i = 1; i < v.earlier.length; i++) if (ISO.test(v.earlier[i].from) && ISO.test(v.earlier[i - 1].to) && v.earlier[i].from <= v.earlier[i - 1].to) E.push(`Earlier period ${i + 1} must start after period ${i} ended.`);
  if (!ISO.test(v.rejoined)) E.push("Enter the date the employee rejoined the Bank.");
  else {
    const last = v.earlier[v.earlier.length - 1];
    if (last && ISO.test(last.to) && v.rejoined <= last.to) E.push("The rejoining date must be after the last leaving date.");
    if (v.rejoined > today) E.push("The rejoining date can't be in the future.");
  }
  if (former) { if (!v.lastTo || !ISO.test(v.lastTo)) E.push("Enter the date the employee last left the Bank."); else if (ISO.test(v.rejoined) && v.lastTo < v.rejoined) E.push("The last leaving date is before the rejoining date."); }
  if (!v.statement.trim()) E.push("Write the employment sentence for the letter.");
  return E;
}

/** Suggested employment sentence, built only from the periods ER entered. ER checks and edits it. */
export function suggestStatement(type: LetterType, v: Verification): string {
  const verb = type === "job_opportunity" ? "were" : "was";
  const earlier = v.earlier.filter((p) => ISO.test(p.from) && ISO.test(p.to)).map((p) => `from ${fmtDate(p.from)} to ${fmtDate(p.to)}`).join(", ");
  if (!earlier || !ISO.test(v.rejoined)) return "";
  const tail = v.lastTo && ISO.test(v.lastTo) ? `and again from ${fmtDate(v.rejoined)} to ${fmtDate(v.lastTo)}` : `and rejoined the Bank on ${fmtDate(v.rejoined)}`;
  return `${verb} employed with Bank of Maldives PLC ${earlier}, ${tail}`;
}

/** Total service as the sum of the separate periods (not from the earliest joining date). */
export function totalService(v: Verification, today: string) {
  return fmtMonths(periodsOf(v).reduce((m, p) => m + (ISO.test(p.from) ? monthsBetween(p.from, ISO.test(p.to) ? p.to : today) : 0), 0));
}
/** "13th March 2010 – 30th June 2014; 1st March 2016 – 31st August 2025" */
export const durationText = (v: Verification) => periodsOf(v).filter((p) => ISO.test(p.from) && ISO.test(p.to)).map((p) => `${fmtDate(p.from)} – ${fmtDate(p.to)}`).join("; ");
export const emptyVerification = (lastTo?: string | null): Verification => ({ earlier: [{ from: "", to: "" }], rejoined: "", lastTo: lastTo ?? "", statement: "", notes: "", ack: false });
