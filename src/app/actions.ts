"use server";
/* Server actions: one per user action. Each resolves the signed-in persona
 * on the server and calls the workflow service, which re-checks the role and
 * the request's stage. */
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isRole } from "@/domain/config";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import * as A from "@/server/assets";
import * as L from "@/server/letters";
import { demoAllowed, getViewer, ROLE_COOKIE, signRole } from "@/server/session";

export type Result<T = unknown> = { ok: true; toast?: string; data?: T } | { ok: false; error: string };
async function run<T>(fn: (ctx: L.Ctx) => Promise<{ toast?: string; data?: T } | void>, revalidate = true): Promise<Result<T>> {
  try {
    const ctx = { db: prisma, viewer: await getViewer() };
    const r = (await fn(ctx)) || {};
    if (revalidate) revalidatePath("/", "layout");
    return { ok: true, ...r };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    console.error("[action]", e);
    return { ok: false, error: "Something went wrong. Reload and try again." };
  }
}

export async function switchRole(role: string) {
  if (!demoAllowed() || !isRole(role)) return { ok: false as const, error: "Unknown role." };
  (await cookies()).set(ROLE_COOKIE, signRole(role), { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" && process.env.LOCAL_HTTP !== "1" });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export const submitRequestAction = async (input: unknown) => run<{ id: string; errors?: string[]; tr?: boolean }>(async (ctx) => {
  const r = await L.submitRequest(ctx, input);
  if (r.errors) return { data: { id: "", errors: r.errors } };
  const editing = !!(input as { editing?: string }).editing;
  return { data: { id: r.id, tr: r.tr }, toast: r.behalf ? `${r.id} created for ${r.name}${r.tr ? " and sent to Total Rewards" : ""}.` : editing ? `${r.id} resubmitted.` : `${r.id} sent. Letters will be issued within 3 working days.` };
});
export const logFormerAction = async (input: unknown) => run<{ id: string }>(async (ctx) => { const id = await L.logFormer(ctx, input); return { data: { id }, toast: `${id} logged.` }; });
export const lmApproveAction = async (id: string, input: unknown) => run(async (ctx) => {
  const { r } = await L.lmApprove(ctx, id, input);
  const { route } = await import("@/domain/model");
  return { toast: `${r.id} approved and sent on to ${route(r)[r.step].owner}.` };
});
export const lmReturnAction = async (id: string, comment: string) => run(async (ctx) => { const { r, w } = await L.lmReturnOrDecline(ctx, id, "return", comment); return { toast: `${r.id} returned to ${w.emp[r.emp].name}.` }; });
export const lmDeclineAction = async (id: string, comment: string) => run(async (ctx) => { const { r, w } = await L.lmReturnOrDecline(ctx, id, "decline", comment); return { toast: `${r.id} declined for ${w.emp[r.emp].name}.` }; });
export const saveSalaryAction = async (id: string, amount: string) => run(async (ctx) => { const { r, w } = await L.saveSalary(ctx, id, amount); return { toast: `Salary saved for ${w.emp[r.emp].name}.` }; });
/** Autosave of draft edits: no revalidation, so the editor keeps focus while typing. */
export const updateDraftAction = async (id: string, input: unknown) => run(async (ctx) => { await L.updateDraft(ctx, id, input); }, false);
export const applyWordingAction = async (id: string, ref: string) => run(async (ctx) => { await L.applyWording(ctx, id, { ref }); return { toast: `Wording from ${ref} added to the draft.` }; });
export const jdResetAction = async (id: string) => run(async (ctx) => { await L.applyWording(ctx, id, { positionMaster: true }); });
export const erSendAction = async (id: string) => run(async (ctx) => { await L.erSend(ctx, id); return { toast: `${id} sent for approval.` }; });
export const erReturnAction = async (id: string, note: string) => run(async (ctx) => { const { r, w } = await L.erReturn(ctx, id, note); return { toast: `${r.id} returned to ${w.emp[r.emp].name}.` }; });
export const approveAction = async (id: string, comment: string) => run(async (ctx) => { const { r, w } = await L.approveAndIssue(ctx, id, comment); return { toast: `${r.id} issued. ${w.emp[r.emp].name} can now view the letter.` }; });
export const apprReturnAction = async (id: string, comment: string) => run(async (ctx) => { await L.apprReturnToEr(ctx, id, comment); return { toast: `${id} returned to the Employee Relations Lead.` }; });
export const cancelAction = async (id: string) => run(async (ctx) => { await L.cancelRequest(ctx, id); return { toast: `${id} cancelled.` }; });

/* v0.2 · Total Rewards workflow */
export const trReviewAction = async (id: string, input: unknown) => run(async (ctx) => { await L.trReview(ctx, id, input); return { toast: `${id} moved to document preparation.` }; });
export const trBackAction = async (id: string) => run(async (ctx) => { await L.trBackToReview(ctx, id); return { toast: `${id} moved back to TR review.` }; });
export const trReturnAction = async (id: string, note: string) => run(async (ctx) => { const { r, w } = await L.trReturn(ctx, id, note); return { toast: `${r.id} returned to ${w.emp[r.emp].name} for correction.` }; });
export const trCompleteAction = async (id: string) => run(async (ctx) => { const { r, w } = await L.trComplete(ctx, id); return { toast: `${r.id} completed. ${w.emp[r.emp].name} can now view the letter.` }; });
/* v0.2 · rejoiner verification (no revalidation while editing; revalidate on confirm) */
export const verifyRejoinerAction = async (id: string, input: unknown) => run(async (ctx) => { await L.verifyRejoiner(ctx, id, input); return (input as { ack?: boolean }).ack ? { toast: "Rejoiner employment history verified." } : {}; }, !!(input as { ack?: boolean })?.ack);
/* v0.2 · signatures and stamps (administrators) */
export const setAssetActiveAction = async (id: string, active: boolean) => run(async (ctx) => { const a = await A.setAssetActive(ctx, id, active); return { toast: `${a.label} ${active ? "reactivated" : "deactivated"}.` }; });
export const saveTemplateAction = async (type: string, input: unknown) => run(async (ctx) => { await A.saveTemplate(ctx, type, input); return { toast: "Template settings saved." }; });
