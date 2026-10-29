"use client";
import { useRouter } from "next/navigation";
import * as React from "react";
import { logFormerAction } from "@/app/actions";
import { useRun } from "./use-run";

export function BehalfPicker({ emps }: { emps: { key: string; label: string }[] }) {
  const router = useRouter(); const [emp, setEmp] = React.useState(""); const [err, setErr] = React.useState("");
  return <div className="card"><div className="form">{err ? <div className="err" role="alert">{err}</div> : null}
    <div className="f"><label htmlFor="bh_emp">Staff member</label><select id="bh_emp" value={emp} onChange={(e) => setEmp(e.target.value)}><option value="">Search the employee master</option>{emps.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}</select></div>
    <div className="actions"><button className="btn btn-p" data-testid="behalf-go" onClick={() => (emp ? router.push(`/behalf/${emp}`) : setErr("Choose the staff member."))}>Continue</button></div></div></div>;
}

export function LogFormerForm({ emps, types, vias }: { emps: { key: string; label: string }[]; types: { key: string; label: string }[]; vias: string[] }) {
  const router = useRouter();
  const [emp, setEmp] = React.useState(""); const [type, setType] = React.useState(types[0].key); const [via, setVia] = React.useState(vias[0]); const [note, setNote] = React.useState("");
  const [rj, setRj] = React.useState("");
  const { run, pending, error } = useRun();
  return <div className="card"><div className="form">{error ? <div className="err" role="alert">{error}</div> : null}
    <div className="f"><label htmlFor="rl_emp">Former employee</label><select id="rl_emp" value={emp} onChange={(e) => setEmp(e.target.value)}><option value="">Search the employee master</option>{emps.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}</select></div>
    <div className="f"><label htmlFor="rl_type">Letter</label><select id="rl_type" value={type} onChange={(e) => setType(e.target.value)}>{types.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select></div>
    <div className="f"><label htmlFor="rl_via">Received via</label><select id="rl_via" value={via} onChange={(e) => setVia(e.target.value)}>{vias.map((x) => <option key={x}>{x}</option>)}</select></div>
    <div className="qbox" data-testid="rejoiner-q"><span className="lbl" id="rjl">Has the former employee previously worked at BML, left the Bank, and subsequently rejoined? <span aria-hidden="true" style={{ color: "var(--red)" }}>*</span></span>
      <div className="yn" role="radiogroup" aria-labelledby="rjl" aria-required="true">{(["yes", "no"] as const).map((x) => <label key={x}><input type="radio" name="rl_rj" checked={rj === x} onChange={() => setRj(x)} data-testid={`rejoiner-${x}`} /><span>{x === "yes" ? "Yes" : "No"}</span></label>)}</div>
      <span className="hint">Ask the former employee, or check their personnel file. If Yes, you verify every employment period before the letter is sent for approval.</span></div>
    <div className="f"><label htmlFor="rl_note">Note</label><textarea id="rl_note" placeholder="e.g. Needed for a job application" value={note} onChange={(e) => setNote(e.target.value)} /></div>
    <div className="actions"><button className="btn btn-p" disabled={pending} data-testid="log-request" onClick={() => run(() => logFormerAction({ emp, type, via, note, rejoiner: rj }), { then: (r) => router.push(`/inbox/${(r.data as { id: string }).id}`) })}>Log request</button></div></div></div>;
}

export function SearchBox({ id, label, placeholder, value, onChange }: { id: string; label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return <div className="f search"><label htmlFor={id}>{label}</label><input type="text" id={id} className="in" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></div>;
}
