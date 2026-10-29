"use client";
/* Case view in the Letter Inbox (prototype vCase). The ER Lead edits the
 * draft at their step; the preview updates as they type and edits are
 * saved automatically. Approvers see it read-only. */
import { useRouter } from "next/navigation";
import * as React from "react";
import { erReturnAction, erSendAction, jdResetAction, updateDraftAction, applyWordingAction } from "@/app/actions";
import { SIGNERS, type LetterType } from "@/domain/config";
import { renderLetter } from "@/domain/letter";
import { coreOf } from "@/domain/model";
import { emptyVerification } from "@/domain/rejoiner";
import type { Draft, Req, Verification, World } from "@/domain/types";
import { Icon } from "./icon";
import { LetterPaper } from "./letter";
import { MarkState } from "./mark-state";
import { RejoinerPanel } from "./rejoiner-panel";
import { useRun } from "./use-run";

export interface CaseProps {
  r: Req; lw: World; canEdit: boolean; canReturn: boolean; senior: boolean; tpl: string; stageKey: string;
  pos: { summary: string; jd: string }; lib: { ref: string; unit: string; typeName: string; text: string }[];
  position: string; left: React.ReactNode; history: React.ReactNode;
  /** v0.2: set when the staff member answered Yes to the rejoiner question. */
  rejoiner?: { former: boolean; doj: string; dor?: string | null; today: string } | null;
  draftPdf?: boolean;
}
const missWhy = (k: string) => (k === "lm" ? "The line manager has not approved yet." : k === "tr" ? "Total Rewards has not entered the salary yet." : "Fill these before sending for approval.");

export function CaseView(p: CaseProps) {
  const router = useRouter();
  const [show, setShow] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft>(p.r.draft);
  const [note, setNote] = React.useState("");
  const [ver, setVer] = React.useState<Verification>(p.r.verification ?? emptyVerification(p.rejoiner?.dor));
  const { run, pending, error } = useRun();
  const saveT = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = React.useRef<Partial<Draft> | null>(null);
  const flush = async () => { if (saveT.current) clearTimeout(saveT.current); const d = pendingSave.current; pendingSave.current = null; if (d) await updateDraftAction(p.r.id, d); };
  const edit = (k: keyof Draft, v: string) => {
    setDraft((d) => ({ ...d, [k]: v, ...(k === "jd" ? { jdSource: "Edited by Employee Relations Lead" } : {}) }));
    pendingSave.current = { ...(pendingSave.current ?? {}), [k]: v };
    if (saveT.current) clearTimeout(saveT.current);
    saveT.current = setTimeout(flush, 500);
  };
  const L = renderLetter(p.lw, { ...p.r, draft, verification: p.rejoiner ? ver : p.r.verification });
  const k = p.stageKey, done = k === "done";

  const editors: React.ReactNode[] = [];
  if (p.canEdit) {
    if ("addressee" in draft) editors.push(<div key="a" className="f"><label htmlFor="d_addressee">Embassy address</label><span className="mono">From the embassy directory. Edit if needed.</span><textarea className="in ta" id="d_addressee" value={draft.addressee} onChange={(e) => edit("addressee", e.target.value)} /></div>);
    if ("recipient" in draft) editors.push(<div key="r" className="f"><label htmlFor="d_recipient">Recipient and address</label><textarea className="in ta" id="d_recipient" value={draft.recipient} onChange={(e) => edit("recipient", e.target.value)} /></div>);
    if ("jd" in draft) editors.push(<div key="j" className="f"><label htmlFor="d_jd">Role summary</label><span className="mono">Source: {draft.jdSource} · {p.pos.jd}</span><textarea className="in ta" id="d_jd" value={draft.jd} onChange={(e) => edit("jd", e.target.value)} />
      {draft.jd !== p.pos.summary ? <div><button className="btn btn-g btn-s" onClick={async () => { await flush(); run(() => jdResetAction(p.r.id)); }}>Use position master wording</button></div> : null}</div>);
    if ("extra" in draft) editors.push(<div key="x" className="f"><label htmlFor="d_extra">Additional paragraph</label><span className="mono">From the staff request. Edit the wording or clear it.</span><textarea className="in ta" id="d_extra" value={draft.extra} onChange={(e) => edit("extra", e.target.value)} /></div>);
  }
  const missNote = !done && L.miss.length ? <div className="note warn"><Icon name="info" size={16} /><span>Still missing: {L.miss.join(", ")}. {missWhy(k)}</span></div> : null;

  return (
    <div className="case">
      <div className="stack">
        {p.rejoiner && !done ? <RejoinerPanel id={p.r.id} type={p.r.type as LetterType} v={ver} setV={setVer} canEdit={p.canEdit} former={p.rejoiner.former} doj={p.rejoiner.doj} today={p.rejoiner.today} /> : null}
        {p.left}
        {p.canEdit && show && "jd" in draft ? <div className="card"><h3>Earlier letters for {p.position}</h3>
          {p.lib.length ? <div className="lib">{p.lib.map((l) => <div key={l.ref} className="libitem"><q>{l.text}</q><div className="meta"><span className="mono">{l.ref} · {l.unit} · {l.typeName}</span>
            {coreOf(l.text) ? <button className="btn btn-g btn-s" onClick={async () => { await flush(); run(() => applyWordingAction(p.r.id, l.ref)); }}>Use this wording</button> : null}</div></div>)}</div>
            : <p style={{ margin: 0, color: "var(--muted)" }}>No earlier letters for this position yet. The position master wording is used.</p>}</div> : null}
        {p.history}
      </div>
      <div className="stack">
        {show ? <div className="card">
          <div className="draftbar"><div><h3 style={{ margin: 0 }}>{done ? "Issued letter" : "Draft letter"}</h3><span className="mono">{p.tpl}</span></div>
            <div className="actions">{!done ? <span className="legend"><i /> Filled from records</span> : null}
              {p.draftPdf ? <a className="btn btn-g btn-s" href={`/api/letters/${encodeURIComponent(p.r.id)}/pdf?draft=1`} download data-testid="draft-pdf"><Icon name="download" size={14} /> Draft PDF</a> : null}
              <button className="btn btn-g btn-s" onClick={() => setShow(false)}>Hide letter</button></div></div>
          {editors.length ? <div className="editors">{editors}</div> : null}
          <LetterPaper L={L} highlight={!done} id="paper" reqId={p.r.id} />
          <div style={{ marginTop: 12 }}>{missNote}</div>
        </div>
          : <div className="card"><div className="draftbar" style={{ margin: 0 }}><div><h3 style={{ margin: 0 }}>{done ? "Issued letter" : "Draft letter"}</h3><span className="mono">{p.tpl}{p.r.ref ? " · legacy reference " + p.r.ref : ""}</span></div>
            <button className="btn btn-g" onClick={() => setShow(true)} data-testid="open-draft">{p.canEdit ? "Open draft to review and edit" : "View letter"}</button></div></div>}
        {!done ? <MarkState L={L} who="approver" /> : null}
        {p.canEdit ? <div className="card"><h3>Send for approval</h3>
          <div className="editors"><div className="f"><label htmlFor="d_signer">Signing authority</label><span className="mono">The letter goes to this person for approval and is issued under their name, with their authorised signature.</span>
            {p.senior ? <div className="note warn"><Icon name="info" size={16} /><span>Requested by a Director / Chief. Choose the signing authority.</span></div> : null}
            <select id="d_signer" value={draft.signer} data-testid="signer" onChange={(e) => { const s = e.target.value as Draft["signer"]; setDraft((d) => ({ ...d, signer: s })); pendingSave.current = { ...(pendingSave.current ?? {}), signer: s }; flush(); }}>
              {draft.signer === "" ? <option value="">Choose the signing authority</option> : null}
              <option value="ere">{SIGNERS.ere.title} · {SIGNERS.ere.name}</option><option value="head">{SIGNERS.head.title} · {SIGNERS.head.name}</option>
            </select></div></div>
          {p.canReturn ? <div className="f"><label htmlFor="ern">Note to staff</label><textarea className="in ta" id="ern" placeholder="Needed only if you return the request" value={note} onChange={(e) => setNote(e.target.value)} /></div> : null}
          {error ? <div className="err" role="alert" style={{ marginTop: 10 }}>{error}</div> : null}
          <div className="actions" style={{ marginTop: 12 }}>
            <button className="btn btn-p" disabled={pending || L.miss.length > 0} data-testid="er-send" onClick={async () => { await flush(); run(() => erSendAction(p.r.id), { then: () => router.refresh() }); }}>Send for approval</button>
            {p.canReturn ? <button className="btn btn-g" disabled={pending} data-testid="er-return" onClick={async () => { await flush(); run(() => erReturnAction(p.r.id, note)); }}>Return to staff</button> : null}
          </div>
          {L.miss.length && !show ? <div className="note warn" style={{ marginTop: 12 }}><Icon name="info" size={16} /><span>Still missing: {L.miss.join(", ")}.</span></div> : null}
        </div> : null}
      </div>
    </div>
  );
}
