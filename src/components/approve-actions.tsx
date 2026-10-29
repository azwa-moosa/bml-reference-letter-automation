"use client";
import { useRouter } from "next/navigation";
import * as React from "react";
import { approveAction, apprReturnAction } from "@/app/actions";
import { Confirm } from "./confirm";
import { Icon } from "./icon";
import { useRun } from "./use-run";

export function ApproverDecision({ id, blocked, name }: { id: string; blocked: boolean; name: string }) {
  const router = useRouter(); const [c, setC] = React.useState("");
  const { run, pending, error } = useRun();
  return <div className="card task"><h3>Your decision</h3>
    <div className="f"><label htmlFor={`en_${id}`}>Comment</label><textarea className="in ta" id={`en_${id}`} placeholder="Needed if you return it to the Employee Relations Lead" value={c} onChange={(e) => setC(e.target.value)} /></div>
    {error ? <div className="err" role="alert" style={{ marginTop: 10 }}>{error}</div> : null}
    <div className="actions" style={{ marginTop: 12 }}>
      <Confirm title="Approve and issue this letter?" icon="pen" testId="approve" confirm="Approve and issue" onConfirm={() => run(() => approveAction(id, c), { then: () => router.push("/approve") })}
        body={<p style={{ margin: 0 }}>The letter is issued under your name with your authorised signature, and {name} can view and download it straight away.</p>}>
        {(open) => <button className="btn btn-p" disabled={pending || blocked} data-testid="appr-ok" onClick={open}><Icon name="check" size={16} /> Approve and issue</button>}
      </Confirm>
      <button className="btn btn-g" disabled={pending} data-testid="appr-return" onClick={() => run(() => apprReturnAction(id, c), { then: () => router.push("/approve") })}>Return to Employee Relations Lead</button>
    </div></div>;
}
