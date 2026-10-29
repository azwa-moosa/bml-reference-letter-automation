/* v0.2 · Which authorised signature and stamp images go on a letter.
 *
 * - Employee Relations letters: the signature is the approving signing authority's own
 *   active signature image (the signer chosen by the ER Lead and approved by them).
 * - Total Rewards letters (Financial Reference, Visa): no signee step, so the template's
 *   configured signature image is applied during document preparation, and its
 *   signatory's name and title are printed under it.
 * - Stamp: the template's configured stamp image, if any.
 * - Each template says whether a signature and a stamp are required to issue. Defaults:
 *   signature required, stamp optional [ASSUMED]; administrators change this in Settings.
 * - Once a letter is issued, the images recorded on it are used, not the current settings.
 * No image is ever generated: if none has been uploaded, issuing is blocked when required. */
import { isTrType, type LetterType } from "./config";
import type { AssetMeta, AssetRef, Req, TemplateCfg, World } from "./types";

export const defaultTemplate = (type: LetterType): TemplateCfg => ({ type, signatureAssetId: null, stampAssetId: null, requireSignature: true, requireStamp: false });
export const templateOf = (w: Pick<World, "templates">, type: LetterType) => w.templates[type] ?? defaultTemplate(type);
const ref = (a: AssetMeta): AssetRef => ({ id: a.id, kind: a.kind, label: a.label, signer: a.signer ?? null, sha256: a.sha256, w: a.w, h: a.h });

export interface Marks { signature: AssetRef | null; stamp: AssetRef | null; requireSignature: boolean; requireStamp: boolean; missing: string[]; frozen: boolean }

export function marksFor(w: Pick<World, "templates" | "assets">, r: Req): Marks {
  const cfg = templateOf(w, r.type);
  if (r.issuedAt) {
    // Issued: exactly what was applied at issue (letters issued before v0.2 have none).
    return { signature: r.assets?.signature ?? null, stamp: r.assets?.stamp ?? null, requireSignature: false, requireStamp: false, missing: [], frozen: true };
  }
  const active = (id: string | null, kind: AssetRef["kind"]) => { const a = id ? w.assets.find((x) => x.id === id && x.active && x.kind === kind) : undefined; return a ? ref(a) : null; };
  let signature: AssetRef | null = null;
  if (isTrType(r.type)) signature = active(cfg.signatureAssetId, "signature");
  else if (r.draft.signer) {
    const own = w.assets.filter((a) => a.kind === "signature" && a.active && a.signer === r.draft.signer).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0];
    signature = own ? ref(own) : null;
  }
  const stamp = active(cfg.stampAssetId, "stamp");
  const missing: string[] = [];
  if (cfg.requireSignature && !signature) missing.push(isTrType(r.type) ? "authorised signature for this template" : "authorised signature of the signing authority");
  if (cfg.requireStamp && !stamp) missing.push("official stamp for this template");
  return { signature, stamp, requireSignature: cfg.requireSignature, requireStamp: cfg.requireStamp, missing, frozen: false };
}
