/* Workflow actions (prototype "actions" section, §3.5 of the spec).
 * Each action re-checks on the server what the prototype only enforced by
 * showing or hiding buttons: the signed-in role, the request's stage, and
 * the same validation messages. Changes are saved with an optimistic
 * version check and appended to the request history. */
import "server-only";
import { z } from "zod";
import { EMBASSIES, INSTITUTIONS, isTrType, RECEIVED_VIA, RELEASE_TYPES, ROLES, SIGNERS, STAFF_TYPES, type LetterType, type SignerKey } from "@/domain/config";
import type { Marks } from "@/domain/assets";
import { money, sd } from "@/domain/format";
import { renderLetter } from "@/domain/letter";
import { asksRejoiner, coreOf, isOpen, isVerified, key, makeDraft, needsVerification, route } from "@/domain/model";
import { checkVerification } from "@/domain/rejoiner";
import type { Draft, Fields, Req, Verification, Viewer, World } from "@/domain/types";
import type { Db, Tx } from "./db";
import { conflict, forbidden, invalid, notFound } from "./errors";
import { loadWorld } from "./world";

export interface Ctx { db: Db; viewer: Viewer }
type Trail = string[];
const J = (v: unknown) => (v === undefined || v === null ? null : JSON.stringify(v));

/** Persists a changed request (all mutable columns) with a version check, then appends history lines. */
async function save(tx: Tx, before: Req, r: Req, lines: Trail, ctx: Ctx, w: World) {
  const res = await tx.letterRequest.updateMany({
    where: { id: r.id, version: before.version },
    data: {
      step: r.step, delivery: r.delivery, fields: JSON.stringify(r.fields), draft: JSON.stringify(r.draft), salary: J(r.salary),
      returned: J(r.returned), closed: r.closed, closeBy: r.closeBy ?? null, closeNote: r.closeNote ?? null, apprReturn: J(r.apprReturn),
      ref: r.ref ?? null, issuedAt: r.issuedAt ?? null, signedBy: r.signedBy ?? null, verification: J(r.verification), assets: J(r.assets),
      version: before.version + 1, updatedAt: new Date(),
    },
  });
  if (res.count !== 1) throw conflict();
  for (const what of lines) await tx.trailEntry.create({ data: { requestId: r.id, d: w.today, who: ctx.viewer.name, what, role: ctx.viewer.role, at: new Date() } });
}

/** Loads the request, lets `fn` change a copy and return history lines, then saves. */
async function mutate(ctx: Ctx, id: string, fn: (r: Req, w: World) => Trail | Promise<Trail>, extra?: (tx: Tx, r: Req, w: World) => Promise<void>) {
  const w = await loadWorld(ctx.db);
  const before = w.reqs.find((x) => x.id === id);
  if (!before) throw notFound();
  const r: Req = structuredClone(before);
  const lines = await fn(r, w);
  await ctx.db.$transaction(async (tx) => {
    if (extra) await extra(tx, r, w);
    await save(tx, before, r, lines, ctx, w);
  });
  return { r, w };
}
const atStage = (r: Req, k: string) => isOpen(r) && !r.returned && key(r) === k;

/* ------------------------------------------------------------ request form */
export const FormInput = z.object({
  forEmp: z.string().nullable().optional(),
  type: z.enum(["academic_excuse", "academic_reference", "financial_reference", "job_opportunity", "visa"]),
  values: z.record(z.string(), z.union([z.string(), z.boolean()])),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).default([]),
  attendees: z.array(z.object({ emp: z.string(), passport: z.string().trim().min(1) })).default([]),
  editing: z.string().nullable().optional(),
});
export type FormInput = z.infer<typeof FormInput>;

/** Validation from the prototype's submitForm(); returns the error list shown above the form. */
export function validateForm(F: FormInput, today: string): string[] {
  const V = F.values as Record<string, string | boolean | undefined>, E: string[] = [];
  // v0.2: mandatory rejoiner question (Job Opportunity, Academic Reference); asked first on the form.
  if (asksRejoiner(F.type as LetterType) && V.rejoiner !== "yes" && V.rejoiner !== "no") E.push(F.forEmp ? "Answer whether the staff member previously worked at BML, left the Bank and rejoined." : "Answer whether you previously worked at BML, left the Bank and rejoined.");
  const s = (k: string) => (typeof V[k] === "string" ? (V[k] as string).trim() : "");
  const official = F.type === "visa" && V.trip === "official";
  if (F.type === "academic_excuse") { if (!s("institution")) E.push("Choose the institution."); if (!F.dates.length) E.push("Add at least one class date."); if (!s("reason")) E.push("Explain the work reason for the line manager."); }
  if (F.type === "academic_reference" && !s("institution")) E.push("Choose the institution.");
  if (V.institution === "Other" && !s("institutionOther")) E.push("Type the institution name.");
  if (F.type === "financial_reference" && !s("purpose")) E.push("Say what the letter is for.");
  if (F.type === "visa") {
    if (!s("embassy")) E.push("Choose the embassy the letter is for.");
    if (V.embassy === "Other" && !s("embassyOther")) E.push("Type the embassy name.");
    if (official) { if (!s("event")) E.push("Enter the event or meeting."); if (!s("location")) E.push("Enter where it is held."); }
    if (!s("start") || !s("end")) E.push(official ? "Enter both event dates." : "Enter both travel dates.");
    else if (s("end") < s("start")) E.push("The end date is before the start date.");
    else if (s("start") <= today) E.push("Travel must start after today.");
    if (!s("passport")) E.push("Enter the passport number.");
  }
  // Same rule as the prototype's date adder: class dates must be today or earlier.
  if (F.type === "academic_excuse" && F.dates.some((d) => d > today)) E.push("Class dates must be today or earlier.");
  return E;
}

export async function submitRequest(ctx: Ctx, raw: unknown): Promise<{ id: string; errors?: string[]; behalf: boolean; name: string; tr?: boolean }> {
  const p = FormInput.safeParse(raw); if (!p.success) throw invalid("The form could not be read. Reload and try again.");
  const F = p.data; const v = ctx.viewer;
  const w = await loadWorld(ctx.db);
  if (F.forEmp) {
    if (v.role !== "erl") throw forbidden("Only the Employee Relations Lead can request on behalf of staff.");
    if (w.emp[F.forEmp]?.status !== "active") throw invalid("Choose the staff member.");
  }
  if (!STAFF_TYPES.includes(F.type as LetterType)) throw invalid("Choose a letter.");
  const errors = validateForm(F, w.today);
  const empId = F.forEmp || v.emp, e = w.emp[empId];
  if (errors.length) return { id: "", errors, behalf: !!F.forEmp, name: e.name };
  const V = F.values as Record<string, string | boolean>;
  const official = F.type === "visa" && V.trip === "official";
  // prototype: fields = {...V}; delete delivery; resolve "Other"; sort dates; attendees
  const fields: Record<string, unknown> = { ...V }; delete fields.delivery;
  if (fields.institution === "Other") fields.institution = String(fields.institutionOther ?? "").trim(); delete fields.institutionOther;
  if (fields.embassy === "Other") fields.embassy = String(fields.embassyOther ?? "").trim(); delete fields.embassyOther;
  if (F.type === "academic_excuse") fields.dates = [...new Set(F.dates)].sort();
  if (F.type === "visa") {
    fields.trip = fields.trip || "annual";
    if (official) {
      fields.includeSalary = false;
      const others = F.attendees.filter((a) => a.emp !== empId && w.emp[a.emp]?.status === "active");
      fields.attendees = [{ emp: empId, passport: String(V.passport) }, ...others];
    }
  }
  for (const k of ["institution", "embassy", "reason", "purpose", "extra", "event", "location", "visaType", "passport", "start", "end"]) if (typeof fields[k] === "string") fields[k] = (fields[k] as string).trim();
  if (!asksRejoiner(F.type as LetterType)) delete fields.rejoiner;
  const rejoinLine = fields.rejoiner === "yes" ? ["Answered Yes to the rejoiner question: flagged for manual verification by Employee Relations"] : [];
  const delivery = F.type === "visa" && V.delivery === "printed" ? "printed" : "digital";
  const f = fields as Fields;

  if (F.editing) {
    // Update and resubmit (staff, own returned request)
    const { r } = await mutate(ctx, F.editing, (r, w2) => {
      if (r.emp !== v.emp) throw forbidden("You can only resubmit your own request.");
      if (!r.returned || !isOpen(r)) throw invalid("This request is no longer waiting for your changes.");
      if (r.type !== F.type) throw invalid("The letter type cannot be changed.");
      r.fields = f; r.delivery = delivery; r.step = 1; r.returned = null; r.draft = makeDraft(r.type, w2.emp[r.emp], f, w2.positions); r.salary = null;
      // A resubmitted rejoiner request is verified again; a "No" answer drops the verification.
      r.verification = f.rejoiner === "yes" && r.verification ? { ...r.verification, ack: false, by: undefined, d: undefined } : null;
      return ["Updated and resubmitted the request", ...rejoinLine];
    });
    return { id: r.id, behalf: false, name: e.name };
  }
  const id = await ctx.db.$transaction(async (tx) => {
    const c = await tx.counter.update({ where: { key: "request" }, data: { next: { increment: 1 } } });
    const id = `RL-${w.refYear}-${String(c.next - 1).padStart(4, "0")}`;
    await tx.letterRequest.create({ data: {
      id, type: F.type, empKey: empId, step: 1, submitted: w.today, delivery, via: null, fields: JSON.stringify(f), routeVersion: 2,
      draft: JSON.stringify(makeDraft(F.type as LetterType, e, f, w.positions)), createdAt: new Date(), updatedAt: new Date(),
      trail: { create: [F.forEmp ? `Submitted on behalf of ${e.name}` : "Submitted the request in OneUI", ...rejoinLine].map((what) => ({ d: w.today, who: v.name, what, role: v.role, at: new Date() })) },
    } });
    return id;
  });
  return { id, behalf: !!F.forEmp, name: e.name, tr: isTrType(F.type as LetterType) };
}

/* ------------------------------------------------------ log former staff */
export async function logFormer(ctx: Ctx, raw: unknown) {
  if (ctx.viewer.role !== "erl") throw forbidden();
  const p = z.object({ emp: z.string(), type: z.string(), via: z.string(), note: z.string().max(4000).default(""), rejoiner: z.string().optional() }).safeParse(raw);
  if (!p.success || !p.data.emp) throw invalid("Choose the former employee.");
  const { emp, type, via, note, rejoiner } = p.data;
  if (!RELEASE_TYPES.includes(type as LetterType)) throw invalid("Choose the letter.");
  if (!RECEIVED_VIA.includes(via)) throw invalid("Choose how the request was received.");
  // v0.2: mandatory rejoiner question for Staff Release letters.
  if (rejoiner !== "yes" && rejoiner !== "no") throw invalid("Answer whether the former employee previously worked at BML, left the Bank and rejoined.");
  const w = await loadWorld(ctx.db); const e = w.emp[emp];
  if (!e || e.status !== "released") throw invalid("Choose the former employee.");
  const f: Fields = { note: note.trim(), rejoiner };
  return ctx.db.$transaction(async (tx) => {
    const c = await tx.counter.update({ where: { key: "request" }, data: { next: { increment: 1 } } });
    const id = `RL-${w.refYear}-${String(c.next - 1).padStart(4, "0")}`;
    await tx.letterRequest.create({ data: {
      id, type, empKey: emp, step: 1, submitted: w.today, delivery: "digital", via, fields: JSON.stringify(f), routeVersion: 2,
      draft: JSON.stringify(makeDraft(type as LetterType, e, f, w.positions)), createdAt: new Date(), updatedAt: new Date(),
      trail: { create: [`Logged a request received by ${via.toLowerCase()}`, ...(rejoiner === "yes" ? ["Answered Yes to the rejoiner question: flagged for manual verification by Employee Relations"] : [])].map((what) => ({ d: w.today, who: ctx.viewer.name, what, role: "erl", at: new Date() })) },
    } });
    return id;
  });
}

/* --------------------------------------------------------- line manager */
const LmInput = z.object({ comment: z.string().max(4000).default(""), leaveFrom: z.string().optional(), leaveTo: z.string().optional(), dates: z.array(z.string()).optional() });
function lmGuard(ctx: Ctx, r: Req, w: World) {
  if (!atStage(r, "lm")) throw invalid("This request is no longer waiting for line manager approval.");
  if (w.emp[r.emp].mgr !== ctx.viewer.emp) throw forbidden("Only the requester's line manager can act on this.");
}
export async function lmApprove(ctx: Ctx, id: string, raw: unknown) {
  const i = LmInput.parse(raw ?? {});
  return mutate(ctx, id, (r, w) => {
    lmGuard(ctx, r, w); const f = r.fields; const lines: Trail = [];
    if (r.type === "visa" && f.trip === "official") lines.push(`Approved the official trip, ${sd(f.start!)} to ${sd(f.end!)}`);
    else if (r.type === "visa") {
      const a = i.leaveFrom ?? "", b = i.leaveTo ?? "";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b) || b < a) throw invalid("Enter a valid leave period.");
      f.leaveFrom = a; f.leaveTo = b; lines.push(`Approved leave duration ${sd(a)} to ${sd(b)}`);
    } else {
      const ds = (i.dates ?? []).filter((d) => (f.dates ?? []).includes(d));
      if (!ds.length) throw invalid("Tick at least one date, or decline the request.");
      f.approvedDates = ds; lines.push(`Approved ${ds.length} of ${f.dates!.length} class dates`);
    }
    r.step++;
    if (i.comment.trim()) lines.push(`Comment: ${i.comment.trim()}`);
    return lines;
  });
}
export async function lmReturnOrDecline(ctx: Ctx, id: string, decision: "return" | "decline", comment: string) {
  return mutate(ctx, id, (r, w) => {
    lmGuard(ctx, r, w); const c = (comment ?? "").trim();
    if (!c) throw invalid(`Add a comment so ${w.emp[r.emp].name} knows why.`);
    if (decision === "return") { r.returned = { by: ctx.viewer.name, note: c }; return [`Returned to staff: ${c}`]; }
    r.closed = "declined"; r.closeBy = ctx.viewer.name; r.closeNote = c; return [`Declined: ${c}`];
  });
}

/* ------------------------------------------------------- Total Rewards */
export async function saveSalary(ctx: Ctx, id: string, amountRaw: unknown) {
  if (ctx.viewer.role !== "tr") throw forbidden("Only Total Rewards can enter salaries.");
  const amt = typeof amountRaw === "number" ? amountRaw : parseFloat(String(amountRaw));
  return mutate(ctx, id, (r, w) => {
    if (!isOpen(r) || key(r) !== "tr") throw invalid("This request is not waiting for a salary.");
    if (!(amt > 0) || !Number.isFinite(amt)) throw invalid("Enter the gross monthly salary.");
    const amount = Math.round(amt * 100) / 100;
    r.salary = { amount, by: ctx.viewer.name, d: w.today }; r.step++;
    return [`Entered gross salary ${money(amount)}`];
  });
}

/* --------------------------------------------- Employee Relations Lead */
const canEdit = (ctx: Ctx, r: Req) => ctx.viewer.role === "erl" && atStage(r, "er");
/** v0.2: Total Rewards edits the draft of its own letters at document preparation (embassy address only). */
const trCanEdit = (ctx: Ctx, r: Req) => ctx.viewer.role === "tr" && isTrType(r.type) && atStage(r, "trdoc");
const DraftInput = z.object({ addressee: z.string().max(4000).optional(), recipient: z.string().max(4000).optional(), jd: z.string().max(4000).optional(), extra: z.string().max(4000).optional(), signer: z.enum(["", "ere", "head"]).optional() });
/** Draft edits are saved as the ER Lead types. Like the prototype, they are not written to the history (spec §8 "Not logged"). */
export async function updateDraft(ctx: Ctx, id: string, raw: unknown) {
  const i = DraftInput.parse(raw ?? {});
  return mutate(ctx, id, (r) => {
    if (trCanEdit(ctx, r)) { if (i.addressee !== undefined && "addressee" in r.draft) r.draft.addressee = i.addressee; return []; }
    if (!canEdit(ctx, r)) throw forbidden("Only the Employee Relations Lead can edit the draft at their step.");
    const d: Draft = r.draft;
    for (const k of ["addressee", "recipient", "extra"] as const) if (i[k] !== undefined && k in d) d[k] = i[k];
    if (i.jd !== undefined && "jd" in d && i.jd !== d.jd) { d.jd = i.jd; d.jdSource = "Edited by Employee Relations Lead"; }
    if (i.signer !== undefined) d.signer = i.signer as SignerKey | "";
    return [];
  });
}
export async function applyWording(ctx: Ctx, id: string, src: { ref?: string; positionMaster?: boolean }) {
  return mutate(ctx, id, (r, w) => {
    if (!canEdit(ctx, r) || !("jd" in r.draft)) throw forbidden();
    if (src.positionMaster) { r.draft.jd = w.positions[w.emp[r.emp].pos].summary; r.draft.jdSource = "Position master"; return []; }
    const l = w.library.find((x) => x.ref === src.ref); const c = l && coreOf(l.text);
    if (!l || !c) throw invalid("That wording can't be used.");
    r.draft.jd = c; r.draft.jdSource = "Earlier letter " + l.ref; return [];
  });
}
export async function erSend(ctx: Ctx, id: string) {
  return mutate(ctx, id, (r, w) => {
    if (!canEdit(ctx, r)) throw forbidden("Only the Employee Relations Lead can send this for approval.");
    if (needsVerification(r) && !isVerified(r)) throw invalid("Rejoiner — verify the employment history before sending this for approval.");
    const L = renderLetter(w, r);
    if (L.miss.length) throw invalid(`Still missing: ${L.miss.join(", ")}.`);
    r.apprReturn = null; r.step++;
    return ["Reviewed the draft and sent it for approval"];
  });
}
export async function erReturn(ctx: Ctx, id: string, note: string) {
  return mutate(ctx, id, (r) => {
    if (!canEdit(ctx, r)) throw forbidden();
    if (r.type.startsWith("release")) throw invalid("Former-staff requests can't be returned.");
    const c = (note ?? "").trim(); if (!c) throw invalid("Write a note to the staff member before returning.");
    r.returned = { by: ctx.viewer.name + ", Employee Relations", note: c };
    return [`Returned to staff: ${c}`];
  });
}

/* ------------------------------------------------------------ approvers */
function apprGuard(ctx: Ctx, r: Req) {
  if (ctx.viewer.role !== "ere" && ctx.viewer.role !== "head") throw forbidden("Only a signing authority can do this.");
  if (!isOpen(r) || key(r) !== "appr") throw invalid("This letter is not waiting for approval.");
  if (r.draft.signer !== ctx.viewer.role) throw forbidden("This letter was sent to the other signing authority.");
}
/** Trail lines naming the images applied (asset id and SHA-256 prefix; no image data). */
const assetLines = (m: Marks) => [m.signature ? `Applied signature "${m.signature.label}" (asset ${m.signature.id}, SHA-256 ${m.signature.sha256.slice(0, 12)})` : "", m.stamp ? `Applied stamp "${m.stamp.label}" (asset ${m.stamp.id}, SHA-256 ${m.stamp.sha256.slice(0, 12)})` : ""].filter(Boolean);
const assetBlock = (m: Marks) => (m.missing.length ? invalid(`Can't issue yet: no ${m.missing.join(" or ")} has been set up. An administrator adds it in Settings › Signatures & Stamps.`) : null);

/** v0.2: no document reference number is allocated. The approving signatory's authorised signature
 * (and the template's stamp) are applied and recorded on the request. */
export async function approveAndIssue(ctx: Ctx, id: string, comment: string) {
  return mutate(ctx, id, (r, w) => {
    apprGuard(ctx, r);
    if (needsVerification(r) && !isVerified(r)) throw invalid("Rejoiner — the employment history has not been verified by Employee Relations.");
    const L = renderLetter(w, r);
    if (L.miss.length) throw invalid(`Still missing: ${L.miss.join(", ")}.`);
    const block = assetBlock(L.marks); if (block) throw block;
    const lines: Trail = []; const c = (comment ?? "").trim();
    if (c) lines.push(`Comment: ${c}`);
    r.signedBy = r.draft.signer as SignerKey; r.issuedAt = w.today; r.step = route(r).length - 1;
    r.assets = { signature: L.marks.signature, stamp: L.marks.stamp };
    lines.push("Approved and issued the letter", ...assetLines(L.marks));
    return lines;
  });
}
export async function apprReturnToEr(ctx: Ctx, id: string, comment: string) {
  return mutate(ctx, id, (r) => {
    apprGuard(ctx, r); const c = (comment ?? "").trim();
    if (!c) throw invalid("Add a comment for the Employee Relations Lead.");
    r.step--; r.apprReturn = { by: ctx.viewer.name, note: c };
    return [`Returned to Employee Relations Lead: ${c}`];
  });
}

/* ------------------------------------- Total Rewards workflow (v0.2) */
function trGuard(ctx: Ctx, r: Req, stage: "trrev" | "trdoc" | "any") {
  if (ctx.viewer.role !== "tr") throw forbidden("Only the Total Rewards team can do this.");
  if (!isTrType(r.type)) throw forbidden("This letter is handled by Employee Relations.");
  if (stage === "any" ? !(atStage(r, "trrev") || atStage(r, "trdoc")) : !atStage(r, stage)) throw invalid(stage === "trdoc" ? "This request is not at document preparation." : "This request is not waiting for Total Rewards review.");
}
export const trNeedsSalary = (r: Pick<Req, "type" | "fields">) => r.type === "financial_reference" || (r.type === "visa" && r.fields.trip !== "official" && !!r.fields.includeSalary);
const TrReviewInput = z.object({ salary: z.union([z.string(), z.number()]).optional(), passport: z.string().max(40).optional(), purpose: z.string().max(400).optional() });
/** TR Review: check the request, correct permitted fields (passport number, letter purpose), enter the salary. */
export async function trReview(ctx: Ctx, id: string, raw: unknown) {
  const i = TrReviewInput.parse(raw ?? {});
  return mutate(ctx, id, (r, w) => {
    trGuard(ctx, r, "trrev"); const f = r.fields, lines: Trail = [];
    if (i.passport !== undefined && r.type === "visa") {
      const pp = i.passport.trim(); if (!pp) throw invalid("Enter the passport number.");
      if (pp !== f.passport) {
        f.passport = pp;
        if (f.attendees?.length) f.attendees[0] = { ...f.attendees[0], passport: pp };
        lines.push("Corrected the passport number");
      }
    }
    if (i.purpose !== undefined && r.type === "financial_reference") {
      const pu = i.purpose.trim(); if (!pu) throw invalid("Say what the letter is for.");
      if (pu !== f.purpose) { f.purpose = pu; lines.push("Corrected the letter purpose"); }
    }
    if (trNeedsSalary(r)) {
      const amt = typeof i.salary === "number" ? i.salary : parseFloat(String(i.salary ?? ""));
      if (!(amt > 0) || !Number.isFinite(amt)) throw invalid("Enter the gross monthly salary.");
      const amount = Math.round(amt * 100) / 100;
      if (!r.salary || r.salary.amount !== amount) { r.salary = { amount, by: ctx.viewer.name, d: w.today }; lines.push(`Entered gross salary ${money(amount)}`); }
    }
    r.step++;
    lines.push("Reviewed the request and moved it to document preparation");
    return lines;
  });
}
export async function trBackToReview(ctx: Ctx, id: string) {
  return mutate(ctx, id, (r) => { trGuard(ctx, r, "trdoc"); r.step--; return ["Moved back to TR review"]; });
}
export async function trReturn(ctx: Ctx, id: string, note: string) {
  return mutate(ctx, id, (r) => {
    trGuard(ctx, r, "any");
    const c = (note ?? "").trim(); if (!c) throw invalid("Write a note to the staff member before returning.");
    r.returned = { by: ctx.viewer.name + ", Total Rewards", note: c };
    return [`Returned to staff for correction: ${c}`];
  });
}
/** Document Preparation → Completed. No signee approval: the template's authorised signature
 * (and stamp, if configured) are applied and recorded. Blocked if a required image is missing. */
export async function trComplete(ctx: Ctx, id: string) {
  return mutate(ctx, id, (r, w) => {
    trGuard(ctx, r, "trdoc");
    const L = renderLetter(w, r);
    if (L.miss.length) throw invalid(`Still missing: ${L.miss.join(", ")}.`);
    const block = assetBlock(L.marks); if (block) throw block;
    r.signedBy = L.marks.signature?.signer ?? null; r.issuedAt = w.today; r.step = route(r).length - 1;
    r.assets = { signature: L.marks.signature, stamp: L.marks.stamp };
    return [`Prepared and completed the letter${r.signedBy ? ` (signatory: ${SIGNERS[r.signedBy].name})` : ""}`, ...assetLines(L.marks)];
  });
}

/* ------------------------------------------- rejoiner verification (v0.2) */
const D = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal(""));
const VerifyInput = z.object({ earlier: z.array(z.object({ from: D, to: D })).max(10), rejoined: D, lastTo: D.optional(), statement: z.string().max(1000), notes: z.string().max(2000).default(""), ack: z.boolean() });
/** The ER Lead records the employment periods from HR records, checks the employment sentence,
 * and (with `ack`) confirms the verification. Required before the letter can be sent or issued. */
export async function verifyRejoiner(ctx: Ctx, id: string, raw: unknown) {
  const i = VerifyInput.parse(raw ?? {});
  return mutate(ctx, id, (r, w) => {
    if (!canEdit(ctx, r)) throw forbidden("Only the Employee Relations Lead can verify this at their step.");
    if (!needsVerification(r)) throw invalid("This request was not flagged as a rejoiner.");
    const former = w.emp[r.emp].status === "released";
    const v: Verification = { earlier: i.earlier, rejoined: i.rejoined, lastTo: former ? i.lastTo ?? "" : undefined, statement: i.statement.trim(), notes: i.notes.trim(), ack: false };
    if (i.ack) {
      const errs = checkVerification(v, former, w.today);
      if (errs.length) throw invalid(errs.join(" "));
      v.ack = true; v.by = ctx.viewer.name; v.d = w.today;
    }
    const was = r.verification;
    r.verification = v;
    if (v.ack) return [`Verified the rejoiner employment history against HR records (${v.earlier.length} earlier period${v.earlier.length === 1 ? "" : "s"}, rejoined ${sd(v.rejoined)})`, `Employment wording for the letter: "${v.statement}"`, ...(v.notes ? [`Verification note: ${v.notes}`] : [])];
    return was?.ack ? ["Reopened the rejoiner verification"] : [];
  });
}

/* ---------------------------------------------------------------- staff */
export async function cancelRequest(ctx: Ctx, id: string) {
  return mutate(ctx, id, (r) => {
    if (r.emp !== ctx.viewer.emp) throw forbidden("You can only cancel your own request.");
    if (!isOpen(r)) throw invalid("This request is already closed.");
    r.closed = "cancelled"; return ["Cancelled the request"];
  });
}

/** Values to prefill "Update and resubmit" (prototype `edit` action, unchanged). */
export function editValues(r: Req) {
  // Manager-approved values and list fields are not form values: they are
  // dropped so the line manager approves again (spec §3.5 "Fields replaced").
  const { dates: _d, attendees: _a, approvedDates: _ad, leaveFrom: _lf, leaveTo: _lt, ...rest } = r.fields;
  void _d; void _a; void _ad; void _lf; void _lt;
  const vals: Record<string, string | boolean> = { ...(rest as Record<string, string | boolean>), delivery: r.delivery };
  if (typeof vals.institution === "string" && !INSTITUTIONS.includes(vals.institution)) { vals.institutionOther = vals.institution; vals.institution = "Other"; }
  if (typeof vals.embassy === "string" && !EMBASSIES[vals.embassy]) { vals.embassyOther = vals.embassy; vals.embassy = "Other"; }
  return { values: vals, dates: [...(r.fields.dates || [])], attendees: (r.fields.attendees || []).slice(1) };
}
export const roleName = (role: keyof typeof ROLES) => ROLES[role].name;
