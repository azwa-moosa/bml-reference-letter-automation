/* v0.2 · Signature and stamp images (administration).
 * Images are uploaded by an authorised administrator, checked to be real PNG or JPEG
 * files, stored in the database (never in a public folder) and served only through
 * permission-checked routes. They are never deleted or edited: an administrator can
 * deactivate one and upload a replacement. Every change is written to AdminEvent. */
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { isTrType, SIGNERS, TYPES, type LetterType, type SignerKey } from "@/domain/config";
import { isAssetAdmin } from "@/domain/model";
import type { Ctx } from "./letters";
import { forbidden, invalid, notFound } from "./errors";

export const MAX_BYTES = 2 * 1024 * 1024;
const MIN_PX = 40, MAX_PX = 6000;

/** Reads the type and pixel size from the file's own bytes (the browser's file type is not trusted). */
export function inspectImage(b: Uint8Array): { mime: "image/png" | "image/jpeg"; width: number; height: number } {
  const u32 = (o: number) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a && String.fromCharCode(b[12], b[13], b[14], b[15]) === "IHDR") {
    return { mime: "image/png", width: u32(16), height: u32(20) };
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    let o = 2;
    while (o + 9 < b.length) {
      if (b[o] !== 0xff) { o++; continue; }
      const m = b[o + 1], len = (b[o + 2] << 8) | b[o + 3];
      // SOF0–SOF15 except DHT (C4), JPG (C8) and DAC (CC) carry the frame size
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { mime: "image/jpeg", height: (b[o + 5] << 8) | b[o + 6], width: (b[o + 7] << 8) | b[o + 8] };
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { o += 2; continue; }
      o += 2 + len;
    }
    throw invalid("The JPEG file could not be read. Export it again as PNG or JPEG.");
  }
  throw invalid("Upload a PNG or JPEG image. Other formats (including SVG and PDF) are not accepted.");
}

const UploadInput = z.object({
  kind: z.enum(["signature", "stamp"]),
  label: z.string().trim().min(3, "Give the image a name, e.g. \"Signature · ER & Engagement Manager\".").max(120),
  signer: z.string().optional(),
  note: z.string().trim().min(3, "Record who authorised this image (e.g. the approval memo or email).").max(400),
});
function admin(ctx: Ctx) { if (!isAssetAdmin(ctx.viewer.role)) throw forbidden("Only an authorised administrator can manage signatures and stamps."); }
const log = (ctx: Ctx, what: string) => ctx.db.adminEvent.create({ data: { who: ctx.viewer.name, role: ctx.viewer.role, what, at: new Date() } });
const signerName = (k?: string | null) => (k && k in SIGNERS ? SIGNERS[k as SignerKey].name : "");

export async function uploadAsset(ctx: Ctx, meta: unknown, bytes: Uint8Array) {
  admin(ctx);
  const p = UploadInput.safeParse(meta);
  if (!p.success) throw invalid(p.error.issues[0]?.message ?? "Check the form.");
  const m = p.data;
  const signer = m.kind === "signature" ? m.signer : undefined;
  if (m.kind === "signature" && !(signer && signer in SIGNERS)) throw invalid("Choose whose signature this is.");
  if (!bytes.length) throw invalid("Choose the image file.");
  if (bytes.length > MAX_BYTES) throw invalid("The image is larger than 2 MB. Export a smaller PNG or JPEG.");
  const img = inspectImage(bytes);
  if (img.width < MIN_PX || img.height < MIN_PX) throw invalid(`The image is too small (${img.width}×${img.height} px). Use a clear scan of at least ${MIN_PX} px each side; 600 px wide or more prints best.`);
  if (img.width > MAX_PX || img.height > MAX_PX) throw invalid("The image is too large in pixels. Resize it to under 6000 px each side.");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const id = "AST-" + randomBytes(4).toString("hex").toUpperCase();
  await ctx.db.$transaction(async (tx) => {
    await tx.signatureAsset.create({ data: { id, kind: m.kind, label: m.label, signer: signer ?? null, note: m.note, mime: img.mime, data: new Uint8Array(bytes), sha256, width: img.width, height: img.height, active: true, uploadedBy: ctx.viewer.name, uploadedRole: ctx.viewer.role, uploadedAt: new Date() } });
    await tx.adminEvent.create({ data: { who: ctx.viewer.name, role: ctx.viewer.role, what: `Uploaded ${m.kind} "${m.label}"${signer ? ` for ${signerName(signer)}` : ""} (asset ${id}, ${img.width}×${img.height} ${img.mime}, SHA-256 ${sha256.slice(0, 12)}). Authorised by: ${m.note}`, at: new Date() } });
  });
  return { id, sha256 };
}

export async function setAssetActive(ctx: Ctx, id: string, active: boolean) {
  admin(ctx);
  const a = await ctx.db.signatureAsset.findUnique({ where: { id }, select: { id: true, label: true, kind: true, active: true } });
  if (!a) throw notFound("Image not found.");
  if (a.active === active) return a;
  await ctx.db.signatureAsset.update({ where: { id }, data: { active } });
  await log(ctx, `${active ? "Reactivated" : "Deactivated"} ${a.kind} "${a.label}" (asset ${id})`);
  return a;
}

const TemplateInput = z.object({ signatureAssetId: z.string().nullable(), stampAssetId: z.string().nullable(), requireSignature: z.boolean(), requireStamp: z.boolean() });
export async function saveTemplate(ctx: Ctx, type: string, raw: unknown) {
  admin(ctx);
  if (!(type in TYPES)) throw invalid("Unknown letter template.");
  const t = type as LetterType;
  const i = TemplateInput.parse(raw);
  // ER letters always use the approving signatory's own signature; only TR letters have a fixed one.
  const sigId = isTrType(t) ? i.signatureAssetId || null : null;
  const check = async (id: string | null, kind: string) => {
    if (!id) return null;
    const a = await ctx.db.signatureAsset.findUnique({ where: { id }, select: { id: true, kind: true, active: true, label: true } });
    if (!a || !a.active || a.kind !== kind) throw invalid(`Choose an active ${kind} image.`);
    return a;
  };
  const sig = await check(sigId, "signature"), st = await check(i.stampAssetId || null, "stamp");
  await ctx.db.templateAsset.upsert({
    where: { type: t },
    create: { type: t, signatureAssetId: sig?.id ?? null, stampAssetId: st?.id ?? null, requireSignature: i.requireSignature, requireStamp: i.requireStamp, updatedBy: ctx.viewer.name, updatedAt: new Date() },
    update: { signatureAssetId: sig?.id ?? null, stampAssetId: st?.id ?? null, requireSignature: i.requireSignature, requireStamp: i.requireStamp, updatedBy: ctx.viewer.name, updatedAt: new Date() },
  });
  await log(ctx, `Template "${TYPES[t].name}": signature ${isTrType(t) ? (sig ? `"${sig.label}" (${sig.id})` : "none") : "approving signatory's own"}, stamp ${st ? `"${st.label}" (${st.id})` : "none"}; signature ${i.requireSignature ? "required" : "optional"}, stamp ${i.requireStamp ? "required" : "optional"}`);
}

export async function assetBytes(db: Ctx["db"], id: string) {
  return db.signatureAsset.findUnique({ where: { id }, select: { data: true, mime: true, active: true, sha256: true } });
}
export const adminEvents = (db: Ctx["db"]) => db.adminEvent.findMany({ orderBy: { id: "desc" }, take: 50 });
