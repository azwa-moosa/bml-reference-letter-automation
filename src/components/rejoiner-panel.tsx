"use client";
/* v0.2 · Rejoiner verification for the Employee Relations Lead. Kept compact: periods
 * from HR records, the employment sentence for the letter, a note, and an explicit
 * acknowledgement. Nothing is filled in from the employee master's single joining date. */
import * as React from "react";
import { verifyRejoinerAction } from "@/app/actions";
import { REJOINER_FLAG, type LetterType } from "@/domain/config";
import { sd } from "@/domain/format";
import { checkVerification, suggestStatement, totalService } from "@/domain/rejoiner";
import type { Verification } from "@/domain/types";
import { Icon } from "./icon";
import { useRun } from "./use-run";

export function RejoinerPanel({ id, type, v, setV, canEdit, former, doj, today }: { id: string; type: LetterType; v: Verification; setV: (v: Verification) => void; canEdit: boolean; former: boolean; doj: string; today: string }) {
  const { run, pending, error, setError } = useRun();
  const [ack, setAck] = React.useState(false);
  const upd = (p: Partial<Verification>) => { setV({ ...v, ...p, ack: false }); setAck(false); };
  const setP = (i: number, k: "from" | "to", val: string) => upd({ earlier: v.earlier.map((p, j) => (j === i ? { ...p, [k]: val } : p)) });
  const errs = checkVerification(v, former, today);
  const payload = (a: boolean) => ({ earlier: v.earlier, rejoined: v.rejoined, lastTo: former ? v.lastTo ?? "" : undefined, statement: v.statement, notes: v.notes, ack: a });

  if (v.ack) return <div className="alert ok" data-testid="rejoiner-verified"><Icon name="shield" /><div style={{ flex: 1 }}><b>Rejoiner history verified</b>
    {v.by ? `${v.by}, ${sd(v.d!)}. ` : ""}{v.earlier.length} earlier period{v.earlier.length === 1 ? "" : "s"} · rejoined {sd(v.rejoined)}{v.lastTo ? ` · left ${sd(v.lastTo)}` : ""} · total service {totalService(v, today)}.
    {canEdit ? <div className="actions" style={{ marginTop: 8 }}><button className="btn btn-g btn-s" disabled={pending} onClick={() => run(() => verifyRejoinerAction(id, { ...payload(false) }), { then: () => setV({ ...v, ack: false }) })}>Reopen to correct</button></div> : null}</div></div>;

  return <div className="card verify" data-testid="rejoiner-panel">
    <div className="alert violet" style={{ margin: 0 }}><Icon name="alert" /><div><b>{REJOINER_FLAG}</b>
      The staff member said they left the Bank and later rejoined. Enter each employment period from HR records and check the wording before this letter can be sent for approval. Don&apos;t assume continuous service: the employee master joining date ({sd(doj)}) may be the latest joining date only.</div></div>
    {canEdit ? <>
      <div className="f"><span className="lbl">Earlier employment periods</span>
        {v.earlier.map((p, i) => <div key={i} className="period">
          <div className="f"><label htmlFor={`rp_f${i}`}>Joined</label><input type="date" id={`rp_f${i}`} max={today} value={p.from} onChange={(e) => setP(i, "from", e.target.value)} /></div>
          <div className="f"><label htmlFor={`rp_t${i}`}>Left</label><input type="date" id={`rp_t${i}`} max={today} value={p.to} onChange={(e) => setP(i, "to", e.target.value)} /></div>
          <button type="button" className="btn btn-ghost x" aria-label={`Remove period ${i + 1}`} disabled={v.earlier.length < 2} onClick={() => upd({ earlier: v.earlier.filter((_, j) => j !== i) })}><Icon name="x" size={16} /></button>
        </div>)}
        <div><button type="button" className="btn btn-g btn-s" onClick={() => upd({ earlier: [...v.earlier, { from: "", to: "" }] })}><Icon name="plus" size={14} /> Add a period</button></div></div>
      <div className="two">
        <div className="f"><label htmlFor="rp_rj">Rejoined the Bank on</label><input type="date" id="rp_rj" max={today} value={v.rejoined} onChange={(e) => upd({ rejoined: e.target.value })} /></div>
        {former ? <div className="f"><label htmlFor="rp_lt">Last left the Bank on</label><input type="date" id="rp_lt" max={today} value={v.lastTo ?? ""} onChange={(e) => upd({ lastTo: e.target.value })} /></div> : null}
      </div>
      <div className="f"><label htmlFor="rp_st">Employment wording in the letter</label>
        <span className="hint">Replaces the &ldquo;employed since …&rdquo; sentence. Starts after the staff member&apos;s name{type === "job_opportunity" ? " (after “You”)" : ""}.</span>
        <textarea id="rp_st" className="statement" value={v.statement} onChange={(e) => upd({ statement: e.target.value })} placeholder="e.g. was employed with Bank of Maldives PLC from … to …, and rejoined the Bank on …" />
        <div className="actions"><button type="button" className="btn btn-g btn-s" onClick={() => upd({ statement: suggestStatement(type, v) })} disabled={!suggestStatement(type, v)}>Suggest from the periods</button>
          {v.rejoined ? <span className="mono">Total service (sum of periods): {totalService(v, today)}</span> : null}</div></div>
      <div className="f"><label htmlFor="rp_n">Verification note (optional)</label><textarea id="rp_n" style={{ minHeight: 60 }} value={v.notes} onChange={(e) => upd({ notes: e.target.value })} placeholder="e.g. Checked against personnel file and MiHCM separation record" /></div>
      <label className="check"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} data-testid="rejoiner-ack" /> I have checked these employment periods against HR records, and the letter wording is correct.</label>
      {error ? <div className="err" role="alert">{error}</div> : null}
      <div className="actions">
        <button className="btn btn-p" disabled={pending || !ack || errs.length > 0} data-testid="rejoiner-confirm" onClick={() => run(() => verifyRejoinerAction(id, payload(true)), { then: () => setV({ ...v, ack: true }) })}><Icon name="shield" size={16} /> Confirm verification</button>
        <button className="btn btn-g" disabled={pending} onClick={() => { setError(null); run(() => verifyRejoinerAction(id, payload(false)), { refresh: false }); }}>Save without confirming</button>
      </div>
      {errs.length && ack ? <div className="note warn"><Icon name="info" size={16} /><span>{errs[0]}</span></div> : null}
    </> : <p style={{ margin: 0, color: "var(--muted)" }}>Waiting for the Employee Relations Lead to verify the employment history.</p>}
  </div>;
}
