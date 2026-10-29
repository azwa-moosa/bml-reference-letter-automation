/* Workflow rules, ported line by line from the prototype ("workflow",
 * "q", "todoCount", "navFor", "badgeFor", "summary", "fieldRows",
 * "staffTimeline", "makeDraft"). Behaviour is intentionally unchanged;
 * known differences from the spec are listed in docs/BASELINE.md. */
import { ASSET_ADMIN_ROLES, embLabel, EMBASSIES, isTrType, REJOINER_FLAG, REJOINER_TYPES, ROLES, TYPES, type LetterType, type RoleKey } from "./config";
import { dayCount, sd } from "./format";
import type { Emp, Fields, Draft, Position, Req, Viewer, World } from "./types";

export interface Stage { k: "submit" | "lm" | "tr" | "er" | "appr" | "done" | "prep" | "trrev" | "trdoc"; label: string; owner: string }
const S = (k: Stage["k"], label: string, owner: string): Stage => ({ k, label, owner });
const DONE = S("done", "Letter viewable to staff", "");

/** v0.2 route. Financial Reference and Visa letters go to Total Rewards only
 * (TR Review → Document Preparation → Completed) with no signee approval.
 * The other letters keep the v0.1 Employee Relations route. */
export function route(r: Pick<Req, "type" | "fields">): Stage[] {
  const t = r.type, f = r.fields || {}, official = t === "visa" && f.trip === "official";
  if (isTrType(t)) {
    const out = [S("submit", "Staff request", "Staff")];
    if (t === "visa") out.push(S("lm", official ? "Line manager approves the official trip" : "Line manager approves the leave duration", "Line manager"));
    out.push(S("trrev", "Total Rewards reviews the request", "Total Rewards"), S("trdoc", "Total Rewards prepares the document", "Total Rewards"), S("done", "Completed · letter viewable to staff", ""));
    return out;
  }
  return routeV1(r);
}
/** The v0.1 route (prototype). Still used for Employee Relations letters, and
 * by the one-off step remap of Financial/Visa requests created before v0.2. */
export function routeV1(r: Pick<Req, "type" | "fields">): Stage[] {
  const t = r.type, f = r.fields || {}, official = t === "visa" && f.trip === "official";
  const out = [t.startsWith("release") ? S("submit", "Request logged by Employee Relations", "Employee Relations Lead") : S("submit", "Staff request", "Staff")];
  if (t === "academic_excuse") out.push(S("lm", "Line manager approves the class dates", "Line manager"));
  if (t === "visa") out.push(S("lm", official ? "Line manager approves the official trip" : "Line manager approves the leave duration", "Line manager"));
  if (t === "financial_reference" || (t === "job_opportunity" && f.includeSalary) || (t === "visa" && !official && f.includeSalary)) out.push(S("tr", "Total Rewards enters gross salary", "Total Rewards"));
  out.push(S("er", t === "academic_reference" || t.startsWith("release") ? "Employee Relations Lead drafts and reviews" : "Employee Relations Lead reviews", "Employee Relations Lead"));
  out.push(S("appr", "ER & Engagement Manager or Head of TR & ER approves", "Approver"));
  out.push(DONE);
  return out;
}
export const key = (r: Req) => route(r)[r.step].k;
export const isOpen = (r: Req) => !r.closed && key(r) !== "done";
export type Tone = "green" | "amber" | "blue" | "red" | "grey" | "violet";
export function status(r: Req, forStaff = false): [string, Tone] {
  if (r.closed === "declined") return ["Declined", "red"];
  if (r.closed === "cancelled") return ["Cancelled", "grey"];
  if (r.returned) return [forStaff ? "Returned to you" : "Returned to staff", "red"];
  const k = key(r);
  if (k === "lm") return ["With line manager", "amber"];
  if (k === "done") return [r.delivery === "printed" ? "Ready for collection" : isTrType(r.type) ? "Completed" : "Issued", "green"];
  if (forStaff) return ["In progress", "blue"];
  if (k === "trrev") return ["TR review", "amber"];
  if (k === "trdoc") return ["Document preparation", "blue"];
  if (k === "tr") return ["With Total Rewards", "amber"];
  if (k === "appr") return ["Awaiting approval", "amber"];
  if (needsVerification(r) && !isVerified(r)) return [REJOINER_FLAG, "violet"];
  return ["With Employee Relations Lead", "blue"];
}
/** v0.2 rejoiner rules. */
export const asksRejoiner = (t: LetterType) => REJOINER_TYPES.includes(t);
export const needsVerification = (r: Pick<Req, "type" | "fields">) => asksRejoiner(r.type) && r.fields?.rejoiner === "yes";
export const isVerified = (r: Pick<Req, "verification">) => !!r.verification?.ack;
export const isAssetAdmin = (role: RoleKey) => ASSET_ADMIN_ROLES.includes(role);
export const tplName = (r: Req) => (r.type === "visa" && r.fields.trip === "official" ? "Visa Letter (official trip format)" : TYPES[r.type].tpl);

export const isSenior = (e: Emp) => /\b(director|chief)\b/i.test(e.position);
export const mgrName = (w: World, e: Emp) => (e.mgr ? w.emp[e.mgr].name : e.mgrName || "Not recorded");
export const pr = (e: Emp) => (e.g === "f" ? { he: "she", him: "her", his: "her" } : { he: "he", him: "him", his: "his" });
export const activeEmps = (w: World) => Object.values(w.emp).filter((e) => e.status === "active");

export function makeDraft(type: LetterType, e: Emp, f: Fields, positions: Record<string, Position>): Draft {
  // Total Rewards letters have no signee step: the signatory comes from the template's configured signature.
  const d: Draft = { signer: isTrType(type) || isSenior(e) ? "" : "ere" };
  if (type === "visa" && f.trip !== "official") d.addressee = EMBASSIES[f.embassy ?? ""] || f.embassy || "";
  if (type === "academic_excuse" || type === "academic_reference") d.recipient = `The Registrar\n${f.institution}\nMalé, Republic of Maldives`;
  if (type === "job_opportunity" || type === "release_reference") { d.jd = positions[e.pos].summary; d.jdSource = "Position master"; }
  if (type === "job_opportunity") d.extra = f.extra || "";
  return d;
}

/* ---------- queues (prototype q) ---------- */
export function queues(w: World, v: Viewer) {
  const R = w.reqs, ER = R.filter((r) => !isTrType(r.type)), TR = R.filter((r) => isTrType(r.type));
  return {
    mine: () => R.filter((r) => r.emp === v.emp),
    team: () => R.filter((r) => isOpen(r) && !r.returned && key(r) === "lm" && w.emp[r.emp].mgr === v.emp),
    /* Employee Relations: letters outside the Total Rewards workflow */
    er: () => ER.filter((r) => isOpen(r) && !r.returned && key(r) === "er"),
    waiting: () => ER.filter((r) => isOpen(r) && !r.returned && ["lm", "tr", "appr"].includes(key(r))),
    returned: () => ER.filter((r) => isOpen(r) && r.returned),
    done: () => ER.filter((r) => !isOpen(r)),
    erAll: () => ER,
    /* Total Rewards: salary entry for ER letters (Job Opportunity with salary) */
    tr: () => R.filter((r) => isOpen(r) && key(r) === "tr"),
    /* Total Rewards workflow (Financial Reference, Visa) */
    trrev: () => TR.filter((r) => isOpen(r) && !r.returned && key(r) === "trrev"),
    trdoc: () => TR.filter((r) => isOpen(r) && !r.returned && key(r) === "trdoc"),
    trLm: () => TR.filter((r) => isOpen(r) && !r.returned && key(r) === "lm"),
    trReturned: () => TR.filter((r) => isOpen(r) && r.returned),
    trDone: () => TR.filter((r) => !isOpen(r)),
    trAll: () => TR,
    appr: () => ER.filter((r) => isOpen(r) && key(r) === "appr" && (v.role === "ere" || v.role === "head" ? r.draft.signer === v.role : true)),
  };
}
export const viewerOf = (role: RoleKey): Viewer => ({ role, emp: ROLES[role].emp, name: ROLES[role].name });
export function todoCount(w: World, role: RoleKey) {
  const q = queues(w, viewerOf(role));
  const own = q.mine().filter((r) => r.returned && isOpen(r)).length + q.team().length;
  return own + ({ staff: 0, manager: 0, tr: q.tr().length + q.trrev().length + q.trdoc().length, erl: q.er().length, ere: q.appr().length, head: q.appr().length } as Record<RoleKey, number>)[role];
}

/* ---------- navigation (prototype NAV, navFor, badgeFor) ---------- */
export interface NavItem { v: string; label: string; icon: string; stub?: boolean; href?: string }
export interface NavSec { sec: string; items: NavItem[] }
const it = (v: string, label: string, icon: string): NavItem => (v === "stub" ? { v, label, icon, stub: true } : { v, label, icon, href: "/" + v });
const MYLETTERS: NavSec = { sec: "My letters", items: [it("letters", "Reference Letters", "file")] };
const NAV: Record<RoleKey, NavSec[]> = {
  staff: [{ sec: "Employee Relations", items: [it("stub", "EmployeeVoice", "mega"), it("stub", "Disciplinary History", "hist"), it("stub", "PM Appeals", "trend"), it("letters", "Reference Letters", "file"), it("stub", "My PIP", "target"), it("stub", "My Records", "archive")] }],
  manager: [{ sec: "Employee Relations", items: [it("letters", "Reference Letters", "file"), it("stub", "PM Appeals", "trend"), it("stub", "My Records", "archive")] }],
  tr: [{ sec: "Total Rewards", items: [it("tr", "Total Rewards Letters", "wallet"), it("salary", "Salary Information", "bank")] }, MYLETTERS],
  erl: [{ sec: "Reference Letters", items: [it("inbox", "Letter Inbox", "inbox"), it("behalf", "Request on Behalf of Staff", "userplus"), it("log", "Log Former Staff Request", "door")] }, { sec: "Drafting", items: [it("positions", "Position Master", "layers"), it("library", "Letter Library", "books")] }, MYLETTERS],
  ere: [{ sec: "Approvals", items: [it("approve", "Letters to Approve", "pen")] }, { sec: "Reference Letters", items: [it("inbox", "Letter Inbox", "inbox"), it("library", "Letter Library", "books")] }, MYLETTERS],
  head: [{ sec: "Approvals", items: [it("approve", "Letters to Approve", "pen")] }, { sec: "Reference Letters", items: [it("inbox", "Letter Inbox", "inbox"), it("library", "Letter Library", "books")] }, MYLETTERS],
};
const SETTINGS: NavSec = { sec: "Settings", items: [it("settings", "Signatures & Stamps", "stamp")] };
export const hasReports = (w: World, empKey: string) => Object.values(w.emp).some((e) => e.mgr === empKey);
export function navFor(w: World, v: Viewer): NavSec[] {
  const n = NAV[v.role].map((s) => ({ ...s, items: [...s.items] }));
  if (hasReports(w, v.emp)) n.push({ sec: "Manager", items: [it("team", "Team Approvals", "checksq")] });
  if (isAssetAdmin(v.role)) n.push(SETTINGS);
  return n;
}
export function badgeFor(w: World, v: Viewer, view: string) {
  const q = queues(w, v);
  if (view === "letters") return q.mine().filter((r) => r.returned && isOpen(r)).length;
  if (view === "team") return q.team().length;
  if (view === "inbox" && v.role === "erl") return q.er().length;
  if (view === "salary") return q.tr().length;
  if (view === "tr") return q.trrev().length + q.trdoc().length;
  if (view === "approve") return q.appr().length;
  return 0;
}
/** Which views each role may open (the prototype enforced this only by its menus). */
export function canView(w: World, v: Viewer, view: string) {
  return navFor(w, v).some((s) => s.items.some((i) => i.v === view));
}

/* ---------- shared display data ---------- */
export function summary(r: Req) {
  const f = r.fields;
  switch (r.type) {
    case "visa": return f.trip === "official" ? `Official trip · ${f.event} · ${sd(f.start!)} to ${sd(f.end!)}` : `Annual leave · ${f.embassy} · ${sd(f.start!)} to ${sd(f.end!)}${f.includeSalary ? " · with salary" : ""}`;
    case "academic_excuse": return `${f.institution} · ${(f.dates || []).length} class date${(f.dates || []).length === 1 ? "" : "s"}`;
    case "academic_reference": return f.institution ?? "";
    case "financial_reference": return f.purpose ?? "";
    case "job_opportunity": return f.includeSalary ? "Employment reference · with salary" : "Employment reference";
    default: return "Former employee";
  }
}
export function fieldRows(w: World, r: Req, forStaff: boolean): [string, string][] {
  const f = r.fields, rows: [string, string][] = [];
  if (r.type === "visa") {
    rows.push(["Purpose", f.trip === "official" ? "Official Trip" : "Annual Leave"], ["Letter for", embLabel(f.embassy ?? "")]);
    if (f.trip === "official") {
      rows.push(["Event", f.event ?? ""], ["Location", f.location ?? ""], ["Event dates", `${sd(f.start!)} to ${sd(f.end!)}`], ["Expenses", f.sponsored ? "Sponsored by the Bank" : "Not sponsored"]);
      if (f.visaType) rows.push(["Visa type", f.visaType]);
      rows.push(["Attendees", (f.attendees || []).map((a) => `${w.emp[a.emp].name} (${a.passport})`).join(", ")]);
    } else {
      rows.push(["Travel dates", `${sd(f.start!)} to ${sd(f.end!)} (${dayCount(f.start!, f.end!)} days)`]);
      if (f.leaveFrom) rows.push(["Leave approved", `${sd(f.leaveFrom)} to ${sd(f.leaveTo!)}`]);
      rows.push(["Passport number", f.passport ?? ""], ["Salary in letter", f.includeSalary ? "Yes" : "No"]);
    }
  }
  if (r.type === "academic_excuse") {
    rows.push(["Institution", f.institution ?? ""], ["Class dates missed", (f.dates || []).map(sd).join(", ")]);
    if (f.approvedDates) rows.push(["Dates approved", f.approvedDates.map(sd).join(", ") || "None"]);
    rows.push([forStaff ? "Work reason" : "Work reason (manager and ER only)", f.reason ?? ""]);
  }
  if (r.type === "academic_reference") rows.push(["Institution", f.institution ?? ""]);
  if (r.type === "financial_reference") rows.push(["Purpose", f.purpose ?? ""]);
  if (r.type === "job_opportunity") { rows.push(["Earlier roles", f.earlier ? "Mention earlier roles" : "Current role only"], ["Salary in letter", f.includeSalary ? "Yes" : "No"]); if (f.extra) rows.push(["Additional information", f.extra]); }
  if (asksRejoiner(r.type) && f.rejoiner) rows.push(["Left BML and rejoined", f.rejoiner === "yes" ? "Yes" : "No"]);
  if (r.via) rows.push(["Received via", r.via]);
  if (f.note) rows.push(["Note", f.note]);
  if (r.type === "visa") rows.push(["Copy", r.delivery === "printed" ? "Digital and printed (collect from Employee Relations)" : "Digital only"]);
  return rows;
}
export interface TimelineItem { label: string; cls: "" | "done" | "cur" | "ret"; sub: string }
export function staffTimeline(w: World, r: Req): TimelineItem[] {
  const full = route(r), hasLm = full.some((s) => s.k === "lm");
  const R = [full[0], ...(hasLm ? [S("lm", "Line manager confirms the dates", "")] : []), S("prep", "Letter being prepared", ""), S("done", "Letter issued", "")];
  const k = key(r), cs = k === "submit" ? 0 : k === "lm" ? 1 : k === "done" ? R.length - 1 : R.length - 2;
  return R.map((s, i) => {
    let cls: TimelineItem["cls"] = "", sub = "";
    if (r.closed && i >= cs) { cls = i === cs ? "ret" : ""; sub = i === cs ? (r.closed === "declined" ? "Declined" : "Cancelled") : ""; }
    else if (i < cs || (i === cs && s.k === "done")) { cls = "done"; sub = i === 0 ? sd(r.submitted) : s.k === "done" && r.issuedAt ? `${sd(r.issuedAt)}${r.ref ? " · " + r.ref : ""}` : ""; }
    else if (i === cs) { cls = r.returned ? "ret" : "cur"; sub = r.returned ? "Returned to you for changes" : s.k === "lm" ? `With ${mgrName(w, w.emp[r.emp])}` : "In progress"; }
    return { label: s.label, cls, sub };
  });
}
export const toApprove = (r: Req) => { const f = r.fields; if (r.type === "visa") return f.trip === "official" ? `Official trip, ${sd(f.start!)} to ${sd(f.end!)}` : `Leave ${sd(f.start!)} to ${sd(f.end!)} (${dayCount(f.start!, f.end!)} days)`; return `${f.dates!.length} class date${f.dates!.length === 1 ? "" : "s"}`; };
/** Part of an earlier letter after "you/he/she are/is/was/were (currently)". */
export const coreOf = (t: string) => { const m = t.match(/,\s*(?:you|he|she)\s+(?:are|is|was|were)\s+(?:currently\s+)?(.+?)\.?$/i); return m ? m[1] : null; };
export const signerOf = (r: Req) => { const s = r.draft.signer; return s === "ere" || s === "head" ? s : null; };

/* ---------- v0.2 letter access (preview images, PDFs) ---------- */
export const isIssued = (r: Req) => !r.closed && key(r) === "done";
/** Who may see a letter's content (preview, signature/stamp images on it). */
export function canSeeLetter(v: Viewer, r: Req) {
  if (r.emp === v.emp && isIssued(r)) return true;
  if (v.role === "tr") return isTrType(r.type);
  if (v.role === "erl" || v.role === "ere" || v.role === "head") return !isTrType(r.type);
  return false;
}
/** Final PDF: the employee, and Total Rewards for its own completed letters. */
export const canDownloadFinal = (v: Viewer, r: Req) => isIssued(r) && (r.emp === v.emp || (v.role === "tr" && isTrType(r.type)));
/** Draft PDF (no signature or stamp, watermarked): the team at the drafting step. */
export const canDownloadDraft = (v: Viewer, r: Req) => isOpen(r) && !r.returned && ((v.role === "tr" && isTrType(r.type) && key(r) === "trdoc") || (v.role === "erl" && key(r) === "er"));
