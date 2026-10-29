/* Letter rendering, ported from the prototype's renderLetter(): the 7
 * templates plus the official-trip format. Instead of an HTML string it
 * returns a small document model, so the same letter can be shown on screen
 * (src/components/letter.tsx) and written to PDF (src/server/pdf.ts).
 * Wording is unchanged from the prototype, except (v0.2):
 * - no document reference number (letters issued before v0.2 keep theirs);
 * - rejoiners: the employment sentence is the one verified by Employee Relations;
 * - Total Rewards letters are signed by the template's configured signatory. */
import { FOOTER, isTrType, SIGNERS } from "./config";
import { marksFor, type Marks } from "./assets";
import { aan, cap, dateList, fmtDate, money, rangeText, service } from "./format";
import { isVerified, needsVerification, pr, signerOf } from "./model";
import { durationText, totalService } from "./rejoiner";
import type { Req, World } from "./types";

/** Inline content: plain text, a value filled from records, or a missing value. */
export type Inline = string | { f: string } | { m: string } | { b: Inline[] };
export type Block =
  | { k: "p"; c: Inline[] }
  | { k: "title"; text: string }
  | { k: "rec"; rows: ({ h: string } | { l: string; c: Inline[] })[] };
/** `ref` is only set for letters issued before v0.2 with a document reference number. */
export interface Letter { ref: string | null; date: string; blocks: Block[]; sign: Inline[]; footer: string; miss: string[]; marks: Marks }

export function renderLetter(w: World, r: Req): Letter {
  const e = w.emp[r.emp], p = pr(e), f = r.fields, d = r.draft, miss: string[] = [];
  const v = (val: string | null | undefined | false, label?: string): Inline => (val ? { f: val } : (miss.push(label!), { m: label! }));
  const lines = (t: string | undefined, label: string): Inline => (t && t.trim() ? { f: t.trim() } : (miss.push(label), { m: label }));
  const marks = marksFor(w, r);
  // ER letters: the signing authority chosen by the ER Lead. TR letters: the configured signature's signatory.
  const sg = isTrType(r.type) ? (marks.signature?.signer ?? (r.issuedAt ? r.signedBy ?? null : null)) : signerOf(r);
  const sign: Inline[] = sg ? [{ b: [v(SIGNERS[sg].name)] }, "\n", v(SIGNERS[sg].title)] : [v("", isTrType(r.type) ? "signatory (template signature in Settings)" : "signing authority")];
  // Rejoiners: the employment sentence and periods come only from ER's verification.
  const rj = needsVerification(r), ver = r.verification ?? null;
  const stmt = (): Inline => v(ver?.statement?.trim(), "verified employment history (rejoiner)");
  const nm = `${e.sal} ${e.name}`;
  const sal = r.salary ? money(r.salary.amount) : null;
  const employer: ({ h: string } | { l: string; c: Inline[] })[] = [{ h: "The Employer" }, { l: "Name", c: ["Bank of Maldives PLC"] }, { l: "Address", c: ["Head Office, No. 11, Boduthakurufaanu Magu, Male’ 20094"] }, { l: "Nature of business", c: ["Commercial Bank"] }];
  const blocks: Block[] = [];
  const P = (...c: Inline[]) => blocks.push({ k: "p", c });
  switch (r.type) {
    case "visa": {
      if (f.trip === "official") {
        const att = f.attendees || [], n = att.length, who = n === 2 ? "both attendees" : n > 2 ? "all attendees" : "the attendee";
        blocks.push({ k: "title", text: "TO WHOM IT MAY CONCERN" });
        P("Please be advised that the following personnel from Bank of Maldives PLC will be attending the ", v(f.event, "event name"), " held in ", v(f.location, "location"), ". The event will be held from ", v(!!(f.start && f.end) && rangeText(f.start!, f.end!), "event dates"), "." + (f.sponsored ? ` The Bank will sponsor the meeting expenses for ${who}.` : ""));
        for (const a of att) {
          const x = w.emp[a.emp], parts = x.name.split(" "), sur = parts[parts.length - 1];
          blocks.push({ k: "rec", rows: [{ l: "Surname", c: [v(sur.toUpperCase())] }, { l: "Other Names", c: [v(parts.slice(0, -1).join(" ").toUpperCase())] }, { l: "Job Title", c: [v(x.position.toUpperCase())] }, { l: "Passport Number", c: [v(a.passport, "passport number")] }] });
        }
        P("Kindly please arrange to issue ", ...(f.visaType ? [v(f.visaType), " "] : []), "VISA for the above purpose.");
      } else {
        const from = f.leaveFrom || f.start, to = f.leaveTo || f.end;
        P(lines(d.addressee, "embassy address"));
        P("Dear Sir/Madam,");
        P("Please be advised that ", v(nm), " holding Maldivian Passport Number ", v(f.passport, "passport number"), " has been employed with Bank of Maldives since ", v(fmtDate(e.doj)), `. ${cap(p.he)} is currently working as ${aan(e.position)} `, v(e.position), " at our ", v(e.unit), ...(f.includeSalary ? [" and earns a monthly gross salary of ", v(sal, "gross salary from Total Rewards")] : []), ".");
        P(`We understand that ${p.he} is applying for visa to travel during ${p.his} Annual Leave period from `, v(from && fmtDate(from), "leave start"), " to ", v(to && fmtDate(to), "leave end"), ", for which we have no objection.");
      }
      break;
    }
    case "academic_excuse": {
      const dates = f.approvedDates || f.dates || []; const inst = f.institution || "";
      const kind = /college/i.test(inst) ? "College" : /universit/i.test(inst) ? "University" : /school/i.test(inst) ? "School" : "institution";
      P(lines(d.recipient, "college address"));
      P("Dear Sir/Madam,");
      P("This is to inform that ", v(nm), ", National Identity Card (", v(e.nid), `), working as ${aan(e.position)} `, v(e.position), " at our ", v(e.unit), ` and currently a student at your esteemed ${kind} was unable to attend classes on `, v(dateList(dates), "dates approved by line manager"), ` as ${p.he} was required to attend important work related responsibilities.`);
      P(`We understand that 80% attendance is required to be eligible to sit in the exam. Therefore, we humbly request you to excuse ${p.him} for the above mentioned classes without affecting ${p.his} eligibility to sit for exam.`);
      break;
    }
    case "academic_reference":
      P(lines(d.recipient, "institution address"));
      P("Dear Sir/Madam,");
      if (rj) P("This is to confirm that ", v(nm), " (NID: ", v(e.nid), ") ", stmt(), `. Currently, ${p.he} is working as ${aan(e.position)} `, v(e.position), " in our ", v(e.unit), ".");
      else P("This is to confirm that ", v(nm), " (NID: ", v(e.nid), ") has been employed with Bank of Maldives PLC since ", v(fmtDate(e.doj)), `. Currently, ${p.he} is working as ${aan(e.position)} `, v(e.position), " in our ", v(e.unit), ".");
      P(`We understand that to develop professionally and improve ${p.his} career prospects, ${p.he} intends to pursue further education. In this regard, we believe ${p.he} will make a valuable contribution to any endeavor ${p.he} wishes to undertake.`);
      break;
    case "financial_reference":
      blocks.push({ k: "title", text: "EMPLOYMENT RECORD" });
      blocks.push({ k: "rec", rows: [...employer, { h: "The Employee" }, { l: "Name", c: [v(e.name)] }, { l: "Identity Card number", c: [v(e.nid)] }, { l: "Date of appointment", c: [v(fmtDate(e.doj))] }, { l: "Service period", c: [v(service(e.doj, w.today))] }, { l: "Present position", c: [v(e.position)] }, { l: "Place of employment", c: [v(e.unit + ", " + e.dept), "."] }, { l: "Employment type", c: [v(e.etype), "."] }, { l: "Gross Salary", c: [v(sal && sal + " per month", "gross salary from Total Rewards"), "."] }] });
      break;
    case "job_opportunity": {
      const h = f.earlier && e.history && e.history.length ? w.positions[e.history[0]] : null;
      const intro: Inline[] = rj
        ? ["You ", stmt(), ". ", ...(h ? [`Initially you joined as ${aan(h.title)} `, v(h.title), " at our ", v(h.unit), " and presently"] : ["Presently"]), ` you are working as ${aan(e.position)} `, v(e.position), " at our ", v(e.unit), "."]
        : h
        ? ["You have been employed with Bank of Maldives PLC since ", v(fmtDate(e.doj)), `. Initially you joined as ${aan(h.title)} `, v(h.title), " at our ", v(h.unit), ` and presently you are working as ${aan(e.position)} `, v(e.position), " at our ", v(e.unit), "."]
        : ["You have been employed with Bank of Maldives PLC since ", v(fmtDate(e.doj)), ` as ${aan(e.position)} `, v(e.position), " at our ", v(e.unit), "."];
      P(v(nm), "\n", v(e.position), "\n", v(e.unit), "\n", v(e.dept), "\n", v(e.div), "\nBank of Maldives PLC");
      P("Dear ", v(e.first), ",");
      P(...intro);
      P(`As ${aan(e.position)} `, v(e.position), ", you are ", v(d.jd, "role summary"), ".");
      if (d.extra && d.extra.trim()) P(v(d.extra.trim()));
      if (f.includeSalary) P("Your current monthly gross salary is ", v(sal, "gross salary from Total Rewards"), ".");
      P("We wish you success in your career pursuits.");
      break;
    }
    case "release_reference":
      P({ b: ["Reference letter of: ", v(nm), " (NID: ", v(e.nid), ")"] });
      blocks.push({ k: "title", text: "TO WHOM IT MAY CONCERN" });
      if (rj) P("This is to confirm that ", v(nm), " ", stmt(), ` as ${aan(e.position)} `, v(e.position), " at our ", v(e.unit), ".");
      else P("This is to confirm that ", v(nm), " was employed with Bank of Maldives PLC from ", v(fmtDate(e.doj)), " to ", v(e.dor && fmtDate(e.dor), "release date"), ` as ${aan(e.position)} `, v(e.position), " at our ", v(e.unit), ".");
      P(`As ${aan(e.position)} `, v(e.position), `, ${p.he} was `, v(d.jd, "role summary"), ".");
      P(`We wish ${p.him} success in ${p.his} future endeavors.`);
      break;
    case "release_general":
      blocks.push({ k: "title", text: "EMPLOYMENT RECORD" });
      blocks.push({ k: "rec", rows: [...employer, { h: "The Employee" }, { l: "Name", c: [v(e.name)] }, { l: "Identity Card number", c: [v(e.nid)] }, ...(rj
        ? [{ l: "Duration", c: [v(ver && durationText(ver), "verified employment periods (rejoiner)")] }, { l: "Service period", c: [v(ver && durationText(ver) && totalService(ver, w.today), "verified service period (rejoiner)")] }]
        : [{ l: "Duration", c: [v(fmtDate(e.doj)), " – ", v(e.dor && fmtDate(e.dor), "release date")] }, { l: "Service period", c: [v(service(e.doj, e.dor || w.today))] }]), { l: "Job position", c: [v(e.position)] }, { l: "Place of employment", c: [v(e.unit + ", " + e.dept), "."] }] });
      break;
  }
  if (rj && !isVerified(r)) miss.push("rejoiner verification by Employee Relations");
  return { ref: r.ref ?? null, date: fmtDate(r.issuedAt || w.today), blocks, sign, footer: FOOTER, miss, marks };
}
/** Plain text of a letter (tests, search, hashing). */
export function letterText(L: Letter) {
  const t = (c: Inline[]): string => c.map((x) => (typeof x === "string" ? x : "f" in x ? x.f : "m" in x ? `[${x.m}]` : t(x.b))).join("");
  return [...(L.ref ? [`Reference No: ${L.ref}`] : []), `Date: ${L.date}`, ...L.blocks.map((b) => (b.k === "title" ? b.text : b.k === "p" ? t(b.c) : b.rows.map((r) => ("h" in r ? r.h : `${r.l}: ${t(r.c)}`)).join("\n"))), "Yours sincerely,", t(L.sign), L.footer].join("\n\n");
}
