"use client";
/* v0.2 · Settings › Signatures & Stamps (administrators). */
/* eslint-disable @next/next/no-img-element -- protected images from permission-checked routes; next/image would cache them */
import { useRouter } from "next/navigation";
import * as React from "react";
import { saveTemplateAction, setAssetActiveAction } from "@/app/actions";
import { Confirm } from "./confirm";
import { Icon } from "./icon";
import { toast } from "./toast";
import { useRun } from "./use-run";

export interface AssetCard { id: string; kind: "signature" | "stamp"; label: string; signer: string; note: string; sha: string; size: string; active: boolean; uploaded: string; usedBy: string[] }
export function UploadForm({ signers }: { signers: { key: string; label: string }[] }) {
  const router = useRouter();
  const [kind, setKind] = React.useState<"signature" | "stamp">("signature");
  const [signer, setSigner] = React.useState(""); const [label, setLabel] = React.useState(""); const [note, setNote] = React.useState("");
  const [file, setFileState] = React.useState<File | null>(null); const [preview, setPreview] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false); const [err, setErr] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const setFile = (f: File | null) => { setFileState(f); setPreview((old) => { if (old) URL.revokeObjectURL(old); return f ? URL.createObjectURL(f) : null; }); };
  const submit = async () => {
    setErr(null); setBusy(true);
    try {
      const fd = new FormData(); fd.set("kind", kind); fd.set("label", label); fd.set("note", note); if (kind === "signature") fd.set("signer", signer); if (file) fd.set("file", file);
      const res = await fetch("/api/assets", { method: "POST", body: fd }); const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error || "The upload failed."); return; }
      toast(`${label} uploaded (${j.id}).`); setLabel(""); setNote(""); setFile(null); if (fileRef.current) fileRef.current.value = ""; router.refresh();
    } catch { setErr("Could not reach the server. Try again."); } finally { setBusy(false); }
  };
  return <div className="card"><h3>Upload an authorised image</h3>
    <div className="form" style={{ maxWidth: "none" }}>
      <div className="yn" role="radiogroup" aria-label="Image type">{(["signature", "stamp"] as const).map((k) => <label key={k}><input type="radio" name="kind" checked={kind === k} onChange={() => setKind(k)} /><span><Icon name={k === "signature" ? "pen" : "stamp"} size={15} />{k === "signature" ? "Signature" : "Official stamp"}</span></label>)}</div>
      <div className="two">
        {kind === "signature" ? <div className="f"><label htmlFor="up_signer">Whose signature</label><select id="up_signer" value={signer} onChange={(e) => setSigner(e.target.value)}><option value="">Choose the signing authority</option>{signers.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select></div> : null}
        <div className="f"><label htmlFor="up_label">Name</label><input type="text" id="up_label" value={label} placeholder={kind === "signature" ? "e.g. Signature · ER & Engagement Manager" : "e.g. People & Culture stamp"} onChange={(e) => setLabel(e.target.value)} /></div>
      </div>
      <div className="f"><label htmlFor="up_note">Authorised by</label><input type="text" id="up_note" value={note} placeholder="e.g. Approved by Director, People & Culture (memo P&C/2026/014)" onChange={(e) => setNote(e.target.value)} /><span className="hint">Recorded in the admin log with the image&apos;s SHA-256 fingerprint.</span></div>
      <div className="two" style={{ alignItems: "end" }}>
        <div className="f"><label htmlFor="up_file">Image file</label><input ref={fileRef} type="file" id="up_file" accept="image/png,image/jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /><span className="hint">PNG (transparent background preferred) or JPEG, up to 2 MB. At least 600 px wide prints best.</span></div>
        {preview ? <div className="asset" style={{ maxWidth: 260 }}><div className="thumb"><img src={preview} alt="Preview of the selected file" /></div></div> : null}
      </div>
      {err ? <div className="err" role="alert">{err}</div> : null}
      <div className="actions"><button className="btn btn-p" disabled={busy} aria-busy={busy} onClick={submit} data-testid="upload"><Icon name="upload" size={16} /> Upload image</button></div>
    </div></div>;
}

export function AssetGrid({ items }: { items: AssetCard[] }) {
  const { run, pending } = useRun();
  if (!items.length) return <div className="card"><div className="empty"><div className="ei"><Icon name="image" size={22} /></div><b>No images uploaded</b>Until an authorised signature is uploaded and assigned, letters that require one can&apos;t be issued. Previews show a labelled placeholder.</div></div>;
  return <div className="assets">{items.map((a) => <div key={a.id} className={`asset ${a.active ? "" : "off"}`} data-testid={`asset-${a.id}`}>
    <div className="thumb"><img src={`/api/assets/${a.id}`} alt={a.label} /></div>
    <div className="ab"><b>{a.label}</b>
      <span>{a.kind === "signature" ? `Signature · ${a.signer}` : "Official stamp"} · <span className={`pill ${a.active ? "p-green" : "p-grey"}`}>{a.active ? "Active" : "Inactive"}</span></span>
      <span className="mono">{a.id} · {a.size} · SHA-256 {a.sha}</span>
      <span style={{ color: "var(--muted)" }}>Authorised by: {a.note}</span>
      <span style={{ color: "var(--muted)" }}>Uploaded {a.uploaded}</span>
      {a.usedBy.length ? <span>Used by: {a.usedBy.join(", ")}</span> : null}
      <div className="actions">{a.active
        ? <Confirm title={`Deactivate ${a.label}?`} tone="danger" icon="x" confirm="Deactivate" onConfirm={() => run(() => setAssetActiveAction(a.id, false))}
            body={<p style={{ margin: 0 }}>New letters stop using it straight away; letters already issued keep the image they were issued with.{a.usedBy.length ? ` Templates using it (${a.usedBy.join(", ")}) will be blocked from issuing until another image is assigned.` : ""}</p>}>
            {(open) => <button className="btn btn-q btn-s" disabled={pending} onClick={open}>Deactivate</button>}</Confirm>
        : <button className="btn btn-g btn-s" disabled={pending} onClick={() => run(() => setAssetActiveAction(a.id, true))}>Reactivate</button>}</div>
    </div></div>)}</div>;
}

export interface TplRow { type: string; name: string; tr: boolean; signatureAssetId: string | null; stampAssetId: string | null; requireSignature: boolean; requireStamp: boolean; erSigners: string; updatedBy: string | null }
export function TemplateTable({ rows, signatures, stamps }: { rows: TplRow[]; signatures: { id: string; label: string }[]; stamps: { id: string; label: string }[] }) {
  return <div className="tablewrap"><table><thead><tr><th>Letter template</th><th>Signature applied</th><th>Stamp</th><th>Required to issue</th><th></th></tr></thead><tbody>
    {rows.map((r) => <TemplateRow key={r.type} r={r} signatures={signatures} stamps={stamps} />)}</tbody></table></div>;
}
function TemplateRow({ r, signatures, stamps }: { r: TplRow; signatures: { id: string; label: string }[]; stamps: { id: string; label: string }[] }) {
  const [sig, setSig] = React.useState(r.signatureAssetId ?? ""); const [st, setSt] = React.useState(r.stampAssetId ?? "");
  const [rs, setRs] = React.useState(r.requireSignature); const [rst, setRst] = React.useState(r.requireStamp);
  const { run, pending, error } = useRun();
  const dirty = sig !== (r.signatureAssetId ?? "") || st !== (r.stampAssetId ?? "") || rs !== r.requireSignature || rst !== r.requireStamp;
  return <tr data-testid={`tpl-${r.type}`}>
    <td><b>{r.name}</b><span className="s">{r.tr ? "Total Rewards · no signee step" : "Employee Relations · signed by the approver"}</span>{r.updatedBy ? <span className="s">Last changed by {r.updatedBy}</span> : null}</td>
    <td style={{ minWidth: 220 }}>{r.tr
      ? <select aria-label={`Signature for ${r.name}`} value={sig} onChange={(e) => setSig(e.target.value)}><option value="">No signature image</option>{signatures.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
      : <span>Approving signatory&apos;s own<span className="s">{r.erSigners}</span></span>}</td>
    <td style={{ minWidth: 200 }}><select aria-label={`Stamp for ${r.name}`} value={st} onChange={(e) => setSt(e.target.value)}><option value="">No stamp</option>{stamps.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></td>
    <td><div style={{ display: "grid", gap: 6 }}><label className="check"><input type="checkbox" checked={rs} onChange={(e) => setRs(e.target.checked)} /> Signature</label><label className="check"><input type="checkbox" checked={rst} onChange={(e) => setRst(e.target.checked)} /> Stamp</label></div></td>
    <td><button className="btn btn-g btn-s" disabled={pending || !dirty} onClick={() => run(() => saveTemplateAction(r.type, { signatureAssetId: sig || null, stampAssetId: st || null, requireSignature: rs, requireStamp: rst }))} data-testid={`tpl-save-${r.type}`}>Save</button>{error ? <div className="err" role="alert" style={{ marginTop: 6 }}>{error}</div> : null}</td>
  </tr>;
}
