"use client";
/* Line manager decision (prototype vTeamDetail controls). */
import { useRouter } from "next/navigation";
import * as React from "react";
import { lmApproveAction, lmDeclineAction, lmReturnAction } from "@/app/actions";
import { fmtDate } from "@/domain/format";
import { Icon } from "./icon";
import { useRun } from "./use-run";

export function TeamDecision({ id, kind, start, end, dates, he }: { id: string; kind: "annual" | "official" | "excuse"; start?: string; end?: string; dates?: string[]; he: string }) {
  const router = useRouter();
  const [lf, setLf] = React.useState(start ?? ""); const [lt, setLt] = React.useState(end ?? "");
  const [ticked, setTicked] = React.useState<string[]>(dates ?? []);
  const [c, setC] = React.useState("");
  const { run, pending, error } = useRun();
  const done = () => { router.push("/team"); };
  const label = kind === "official" ? "Approve official trip" : kind === "annual" ? "Approve leave duration" : "Approve dates";
  return <>
    {kind === "annual" ? <><div className="two"><div className="f"><label htmlFor={`lf_${id}`}>Leave approved from</label><input type="date" id={`lf_${id}`} value={lf} onChange={(e) => setLf(e.target.value)} /></div><div className="f"><label htmlFor={`lt_${id}`}>Leave approved to</label><input type="date" id={`lt_${id}`} value={lt} onChange={(e) => setLt(e.target.value)} /></div></div><span className="mono">These dates are printed on the visa letter.</span></> : null}
    {kind === "excuse" ? <div className="f"><label>Approve the dates {he} was needed at work</label><div className="datecheck">{(dates ?? []).map((d) => <label key={d} className="check"><input type="checkbox" checked={ticked.includes(d)} onChange={(e) => setTicked(e.target.checked ? [...ticked, d] : ticked.filter((x) => x !== d))} /> {fmtDate(d)}</label>)}</div><span className="hint">Untick any date you cannot confirm. Only ticked dates appear on the letter.</span></div> : null}
    <div className="f"><label htmlFor={`lc_${id}`}>Comment</label><textarea className="in ta" id={`lc_${id}`} placeholder="Needed if you return or decline" value={c} onChange={(e) => setC(e.target.value)} /></div>
    {error ? <div className="err" role="alert">{error}</div> : null}
    <div className="actions">
      <button className="btn btn-p" disabled={pending} data-testid="lm-approve" onClick={() => run(() => lmApproveAction(id, { comment: c, leaveFrom: lf, leaveTo: lt, dates: [...ticked].sort() }), { then: done })}><Icon name="check" size={16} /> {label}</button>
      <button className="btn btn-g" disabled={pending} data-testid="lm-return" onClick={() => run(() => lmReturnAction(id, c), { then: done })}>Return to staff</button>
      <button className="btn btn-q" disabled={pending} data-testid="lm-decline" onClick={() => run(() => lmDeclineAction(id, c), { then: done })}>Decline</button>
    </div>
  </>;
}
