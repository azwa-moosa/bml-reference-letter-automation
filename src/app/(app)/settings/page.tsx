import { isTrType, SIGNERS, TYPES, type LetterType, type SignerKey } from "@/domain/config";
import { templateOf } from "@/domain/assets";
import { sd } from "@/domain/format";
import { Icon } from "@/components/icon";
import { AssetGrid, TemplateTable, UploadForm, type AssetCard, type TplRow } from "@/components/settings-bits";
import { adminEvents } from "@/server/assets";
import { prisma } from "@/server/db";
import { gate } from "@/server/page";

export const metadata = { title: "Signatures & Stamps" };
const TEMPLATE_ORDER: LetterType[] = ["financial_reference", "visa", "job_opportunity", "academic_reference", "academic_excuse", "release_reference", "release_general"];
export default async function Settings() {
  const { w } = await gate("settings");
  const events = await adminEvents(prisma);
  const used = (id: string) => TEMPLATE_ORDER.filter((t) => { const c = templateOf(w, t); return c.signatureAssetId === id || c.stampAssetId === id; }).map((t) => TYPES[t].name);
  const cards: AssetCard[] = [...w.assets].reverse().map((a) => ({ id: a.id, kind: a.kind, label: a.label, signer: a.signer ? `${SIGNERS[a.signer].name}, ${SIGNERS[a.signer].title}` : "", note: a.note, sha: a.sha256.slice(0, 12), size: `${a.w}×${a.h} px`, active: a.active, uploaded: `${sd(a.uploadedAt.slice(0, 10))} by ${a.uploadedBy}`, usedBy: used(a.id) }));
  const hasOwn = (k: SignerKey) => w.assets.some((a) => a.kind === "signature" && a.active && a.signer === k);
  const erSigners = (Object.keys(SIGNERS) as SignerKey[]).map((k) => `${SIGNERS[k].name}: ${hasOwn(k) ? "uploaded" : "not uploaded"}`).join(" · ");
  const rows: TplRow[] = TEMPLATE_ORDER.map((t) => { const c = templateOf(w, t); return { type: t, name: TYPES[t].name, tr: isTrType(t), signatureAssetId: c.signatureAssetId, stampAssetId: c.stampAssetId, requireSignature: c.requireSignature, requireStamp: c.requireStamp, erSigners, updatedBy: c.updatedBy ?? null }; });
  const active = (k: "signature" | "stamp") => w.assets.filter((a) => a.active && a.kind === k).map((a) => ({ id: a.id, label: `${a.label} (${a.id})` }));
  return <>
    <div className="pg"><h2>Signatures &amp; Stamps</h2><p>Authorised signature and stamp images, and which ones each letter template uses. Images are applied automatically in the reserved signature area of the letter and the PDF.</p></div>
    <div className="alert warn"><Icon name="shield" /><div><b>Only upload images that are authorised for letters</b>Images are kept in the database and shown only to people who can see the letter. They can&apos;t be edited or deleted: deactivate one and upload a replacement. Letters keep the image they were issued with. No signature is ever generated: if none is set up, letters that require one can&apos;t be issued.</div></div>
    <UploadForm signers={(Object.keys(SIGNERS) as SignerKey[]).map((k) => ({ key: k, label: `${SIGNERS[k].name} · ${SIGNERS[k].title}` }))} />
    <div className="seclabel">Images</div>
    <AssetGrid items={cards} />
    <div className="seclabel">Letter templates</div>
    <TemplateTable rows={rows} signatures={active("signature")} stamps={active("stamp")} />
    <div className="card"><h3>Admin log</h3>{events.length ? <ul className="events">{events.map((e) => <li key={e.id}><span className="d">{e.at.toISOString().slice(0, 16).replace("T", " ")}</span><span><b>{e.who}</b> · {e.what}</span></li>)}</ul> : <p style={{ margin: 0, color: "var(--muted)" }}>No changes yet.</p>}</div>
  </>;
}
