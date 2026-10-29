"use client";
/* v0.2 · Total Rewards workspace: queue table with search and filters, TR review form,
 * document preparation (draft, signature/stamp, complete), return for correction. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { trBackAction, trCompleteAction, trReturnAction, trReviewAction, updateDraftAction } from "@/app/actions";
import { renderLetter } from "@/domain/letter";
import type { Draft, Req, World } from "@/domain/types";
import { ClickRow } from "./click-row";
import { Confirm } from "./confirm";
import { SearchBox } from "./er-forms";
import { Icon } from "./icon";
import { LetterPaper } from "./letter";
import { MarkState } from "./mark-state";
import { Empty } from "./ui";
import { useRun } from "./use-run";

export interface TrRow { id: string; sid: string; name: string; letter: string; type: string; summary: string; step: string; status: [string, string]; age: string; todo: string }
export function TrTable({ rows }: { rows: TrRow[] }) {
  const [s, setS] = React.useState(""); const [t, setT] = React.useState("all"); const q = s.toLowerCase();
  const list = rows.filter((r) => (t === "all" || r.type === t) && (!q || Object.values(r).join(" ").toLowerCase().includes(q)));
  return <>
    <div className="toolbar">
      <SearchBox id="trsearch" label="Search" placeholder="Name, staff ID, request ID or purpose" value={s} onChange={setS} />
      <div className="filters" role="group" aria-label="Letter type">{[["all", "All letters"], ["financial_reference", "Financial Reference"], ["visa", "Visa"]].map(([k, l]) => <button key={k} type="button" className={`fbtn ${t === k ? "on" : ""}`} aria-pressed={t === k} onClick={() => setT(k)}>{l}</button>)}</div>
    </div>
    <div className="tablewrap"><table><thead><tr><th>Request</th><th>Staff</th><th>Letter</th><th>Step</th><th>Status</th><th className="num">Age</th><th></th></tr></thead><tbody>
      {list.length ? list.map((r) => <ClickRow key={r.id} href={`/tr/${r.id}`} testId={`row-${r.id}`}>
        <td><b className="num">{r.id}</b><span className="s">{r.todo || " "}</span></td><td>{r.name}<span className="s num">{r.sid}</span></td><td>{r.letter}<span className="s">{r.summary}</span></td><td>{r.step}</td>
        <td><span className={`pill p-${r.status[1]}`}>{r.status[0]}</span></td><td className="num">{r.age}</td><td className="chevcell"><Icon name="chevR" /></td></ClickRow>)
        : <tr><td colSpan={7}><Empty b="Nothing here" s="Financial Reference and Visa requests appear here." icon="wallet" /></td></tr>}
    </tbody></table></div>
  </>;
}

/** TR review: check the request, correct the permitted fields, enter the salary. */
export function TrReview({ id, type, needsSalary, passport, purpose, lastSalary, current }: { id: string; type: string; needsSalary: boolean; passport?: string; purpose?: string; lastSalary?: string | null; current?: number | null }) {
  const router = useRouter();
  const [amt, setAmt] = React.useState(current ? String(current) : ""); const [pp, setPp] = React.useState(passport ?? ""); const [pu, setPu] = React.useState(purpose ?? "");
  const { run, pending, error } = useRun();
  const input = { ...(needsSalary ? { salary: amt } : {}), ...(type === "visa" ? { passport: pp } : {}), ...(type === "financial_reference" ? { purpose: pu } : {}) };
  return <div className="card task" data-testid="tr-review"><h3>TR review</h3>
    <form className="form" style={{ maxWidth: "none" }} onSubmit={(e) => { e.preventDefault(); run(() => trReviewAction(id, input), { then: () => router.refresh() }); }} noValidate>
      {type === "visa" ? <div className="f"><label htmlFor="tr_pp">Passport number</label><input type="text" id="tr_pp" value={pp} onChange={(e) => setPp(e.target.value)} /><span className="hint">Correct it if it doesn&apos;t match the passport copy. The correction is recorded in the history (without the number).</span></div> : null}
      {type === "financial_reference" ? <div className="f"><label htmlFor="tr_pu">What the letter is for</label><input type="text" id="tr_pu" value={pu} onChange={(e) => setPu(e.target.value)} /></div> : null}
      {needsSalary ? <div className="f"><label htmlFor="tr_amt">Gross monthly salary (MVR)</label><input type="number" min="0" step="0.01" id="tr_amt" placeholder="e.g. 21500.00" value={amt} onChange={(e) => setAmt(e.target.value)} />{lastSalary ? <span className="hint">Last recorded: {lastSalary}. Check payroll for the current amount.</span> : null}</div>
        : <div className="note"><Icon name="info" size={16} /><span>This letter does not quote a salary.</span></div>}
      {error ? <div className="err" role="alert">{error}</div> : null}
      <div className="actions"><button className="btn btn-p" type="submit" disabled={pending} data-testid="tr-review-ok"><Icon name="check" size={16} /> Move to document preparation</button></div>
    </form>
  </div>;
}

export function TrReturn({ id }: { id: string }) {
  const router = useRouter(); const [note, setNote] = React.useState("");
  const { run, pending, error } = useRun();
  return <div className="card"><h3>Return for correction</h3>
    <div className="f"><label htmlFor="tr_note">Note to staff</label><textarea id="tr_note" className="in ta" placeholder="What needs correcting, e.g. the passport number doesn't match the copy provided" value={note} onChange={(e) => setNote(e.target.value)} /></div>
    {error ? <div className="err" role="alert" style={{ marginTop: 10 }}>{error}</div> : null}
    <div className="actions" style={{ marginTop: 12 }}><button className="btn btn-g" disabled={pending} data-testid="tr-return" onClick={() => run(() => trReturnAction(id, note), { then: () => router.push("/tr") })}><Icon name="undo" size={16} /> Return to staff</button></div>
  </div>;
}

/** Document preparation: live draft (embassy address editable), signature/stamp state, complete. */
export function TrPrepare({ r, lw, tpl, name }: { r: Req; lw: World; tpl: string; name: string }) {
  const router = useRouter();
  const [draft, setDraft] = React.useState<Draft>(r.draft);
  const { run, pending, error } = useRun();
  const t = React.useRef<ReturnType<typeof setTimeout> | null>(null), pend = React.useRef<Partial<Draft> | null>(null);
  const flush = async () => { if (t.current) clearTimeout(t.current); const d = pend.current; pend.current = null; if (d) await updateDraftAction(r.id, d); };
  const edit = (k: keyof Draft, v: string) => { setDraft((d) => ({ ...d, [k]: v })); pend.current = { ...(pend.current ?? {}), [k]: v }; if (t.current) clearTimeout(t.current); t.current = setTimeout(flush, 500); };
  const L = renderLetter(lw, { ...r, draft });
  const blocked = L.miss.length > 0 || L.marks.missing.length > 0;
  return <>
    <div className="card">
      <div className="draftbar"><div><h3 style={{ margin: 0 }}>Document preparation</h3><span className="mono">{tpl}</span></div>
        <div className="actions"><span className="legend"><i /> Filled from records</span><a className="btn btn-g btn-s" href={`/api/letters/${encodeURIComponent(r.id)}/pdf?draft=1`} download data-testid="draft-pdf"><Icon name="download" size={14} /> Draft PDF</a></div></div>
      {"addressee" in draft ? <div className="editors"><div className="f"><label htmlFor="tr_addr">Embassy address</label><span className="mono">From the embassy directory. Edit if needed.</span><textarea className="in ta" id="tr_addr" value={draft.addressee} onChange={(e) => edit("addressee", e.target.value)} /></div></div> : null}
      <LetterPaper L={L} highlight id="paper" reqId={r.id} />
      {L.miss.length ? <div className="note warn" style={{ marginTop: 12 }}><Icon name="info" size={16} /><span>Still missing: {L.miss.join(", ")}.</span></div> : null}
    </div>
    <MarkState L={L} who="tr" />
    <div className="card task"><h3>Complete the letter</h3>
      <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: 13.5 }}>No separate signee approval: completing applies the template&apos;s authorised signature{L.marks.stamp ? " and stamp" : ""} and makes the letter available to {name}.</p>
      {error ? <div className="err" role="alert" style={{ marginBottom: 10 }}>{error}</div> : null}
      <div className="actions">
        <Confirm title="Complete and issue this letter?" icon="check" testId="complete" confirm="Complete and issue" onConfirm={async () => { await flush(); run(() => trCompleteAction(r.id), { then: () => router.push("/tr") }); }}
          body={<p style={{ margin: 0 }}>{name} will be able to view and download the letter. The signature and stamp applied are recorded in the history. This can&apos;t be undone from the screen.</p>}>
          {(open) => <button className="btn btn-p" disabled={pending || blocked} data-testid="tr-complete" onClick={open}><Icon name="check" size={16} /> Complete and issue</button>}
        </Confirm>
        <button className="btn btn-g" disabled={pending} data-testid="tr-back" onClick={async () => { await flush(); run(() => trBackAction(r.id)); }}><Icon name="undo" size={16} /> Back to TR review</button>
      </div>
    </div>
  </>;
}
export const TrBack = () => <div><Link className="back" href="/tr"><Icon name="chevL" size={16} /> Total Rewards Letters</Link></div>;
