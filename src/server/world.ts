/* Loads everything the rules need into the prototype's shapes. */
import type { AssetMeta, Emp, LibraryLetter, ManualEntry, Position, Req, TemplateCfg, World } from "@/domain/types";
import type { LetterType, SignerKey } from "@/domain/config";
import type { Db } from "./db";
import { refYear, today } from "./clock";

const J = <T,>(s: string | null | undefined, d: T): T => (s ? (JSON.parse(s) as T) : d);
type RowReq = Awaited<ReturnType<Db["letterRequest"]["findMany"]>>[number] & { trail: { d: string; who: string; what: string }[] };

export function toReq(r: RowReq): Req {
  return {
    id: r.id, type: r.type as LetterType, emp: r.empKey, step: r.step, submitted: r.submitted, delivery: r.delivery as Req["delivery"], via: r.via,
    fields: J(r.fields, {}), draft: J(r.draft, { signer: "" }), salary: J(r.salary, null), lastSalary: J(r.lastSalary, null),
    returned: J(r.returned, null), closed: (r.closed as Req["closed"]) ?? null, closeBy: r.closeBy, closeNote: r.closeNote,
    apprReturn: J(r.apprReturn, null), ref: r.ref, issuedAt: r.issuedAt, signedBy: r.signedBy as SignerKey | null,
    verification: J(r.verification, null), assets: J(r.assets, null),
    trail: r.trail.map((t) => ({ d: t.d, who: t.who, what: t.what })), version: r.version,
  };
}

export async function loadWorld(db: Db): Promise<World> {
  const [positions, emps, reqs, library, manual, assets, templates] = await Promise.all([
    db.position.findMany(), db.employee.findMany(),
    db.letterRequest.findMany({ include: { trail: { orderBy: { id: "asc" } } }, orderBy: { id: "asc" } }),
    db.libraryLetter.findMany(), db.manualRegisterEntry.findMany(),
    // Image bytes are never loaded here: only the protected image routes read them.
    db.signatureAsset.findMany({ select: { id: true, kind: true, label: true, signer: true, note: true, sha256: true, width: true, height: true, active: true, uploadedBy: true, uploadedAt: true }, orderBy: { uploadedAt: "asc" } }),
    db.templateAsset.findMany(),
  ]);
  const P: Record<string, Position> = Object.fromEntries(positions.map((p) => [p.code, p]));
  const E: Record<string, Emp> = Object.fromEntries(emps.map((e) => [e.key, {
    key: e.key, sid: e.sid, name: e.name, first: e.first, sal: e.sal, g: e.g as Emp["g"], nid: e.nid, pos: e.posCode,
    position: P[e.posCode]?.title ?? "", unit: P[e.posCode]?.unit ?? "", dept: e.dept, div: e.div, doj: e.doj, dor: e.dor,
    etype: e.etype, status: e.status as Emp["status"], mgr: e.mgrKey, mgrName: e.mgrName, history: J<string[]>(e.history, []),
  }]));
  return {
    today: today(), refYear: refYear(), emp: E, positions: P, reqs: reqs.map(toReq),
    library: library.map((l) => ({ ...l, type: l.type as LetterType }) as LibraryLetter), manual: manual as ManualEntry[],
    assets: assets.map((a): AssetMeta => ({ id: a.id, kind: a.kind as AssetMeta["kind"], label: a.label, signer: (a.signer as SignerKey | null) ?? null, note: a.note, sha256: a.sha256, w: a.width, h: a.height, active: a.active, uploadedBy: a.uploadedBy, uploadedAt: a.uploadedAt.toISOString() })),
    templates: Object.fromEntries(templates.map((t): [string, TemplateCfg] => [t.type, { type: t.type as LetterType, signatureAssetId: t.signatureAssetId, stampAssetId: t.stampAssetId, requireSignature: t.requireSignature, requireStamp: t.requireStamp, updatedBy: t.updatedBy }])),
  };
}
