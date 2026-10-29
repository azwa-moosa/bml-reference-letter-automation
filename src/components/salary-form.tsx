"use client";
import { useRouter } from "next/navigation";
import * as React from "react";
import { saveSalaryAction } from "@/app/actions";
import { useRun } from "./use-run";

export function SalaryForm({ id }: { id: string }) {
  const router = useRouter(); const [amt, setAmt] = React.useState("");
  const { run, pending, error } = useRun();
  return <form onSubmit={(e) => { e.preventDefault(); run(() => saveSalaryAction(id, amt), { then: () => router.push("/salary") }); }} className="qcard" noValidate>
    <div className="two"><div className="f"><label htmlFor={`ta_${id}`}>Gross monthly salary (MVR)</label><input type="number" min="0" step="0.01" id={`ta_${id}`} className="in" placeholder="e.g. 21500.00" value={amt} onChange={(e) => setAmt(e.target.value)} /></div></div>
    {error ? <div className="err" role="alert">{error}</div> : null}
    <div className="actions"><button className="btn btn-p" type="submit" disabled={pending} data-testid="save-salary">Save salary</button></div>
  </form>;
}
