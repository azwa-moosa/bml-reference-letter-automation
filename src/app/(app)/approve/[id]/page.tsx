import { isTrType, TYPES } from "@/domain/config";
import { money, sd } from "@/domain/format";
import { renderLetter } from "@/domain/letter";
import { fieldRows, isOpen, key, tplName } from "@/domain/model";
import { ApproverDecision } from "@/components/approve-actions";
import { MarkState } from "@/components/mark-state";
import { LetterToggle } from "@/components/staff-bits";
import { Back, Kv, Pill, SeniorFlag, TrailList } from "@/components/ui";
import { reqOr404 } from "@/server/page";

export const metadata = { title: "Letters to Approve" };
export default async function ApproveDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Approvers open letters sent to them, or issued under their role.
  const { w, v, r } = await reqOr404(id, (r, v) => !isTrType(r.type) && (r.draft.signer === v.role || r.signedBy === v.role), "approve");
  const e = w.emp[r.emp], L = renderLetter(w, r), done = key(r) === "done";
  const can = isOpen(r) && key(r) === "appr" && r.draft.signer === v.role;
  return <>
    <Back href="/approve">Letters to Approve</Back>
    <div className="pghead"><div className="pg"><h2>{e.name} · {TYPES[r.type].name}</h2><p>{r.id} · submitted {sd(r.submitted)}</p></div><Pill r={r} /></div>
    <div className="case">
      <div className="stack"><div className="card"><h3>Request</h3><Kv rows={fieldRows(w, r, false)} /></div>
        <div className="card"><h3>Staff</h3><Kv rows={[["Staff ID", <span key="s" className="num">{e.sid}</span>], ["Name", <span key="n">{e.name}<SeniorFlag e={e} /></span>], ["Position", e.position], ["Unit", e.unit], ...(r.salary ? [["Gross salary", `${money(r.salary.amount)} (entered by ${r.salary.by})`] as [string, string]] : [])]} /></div>
        <div className="card"><h3>History</h3><TrailList trail={r.trail} /></div></div>
      <div className="stack"><LetterToggle id={r.id} title={done ? "Issued letter" : "Letter for approval"} tpl={tplName(r)} L={L} highlight={!done} canDownload={done && r.emp === v.emp} open={!done} />
        {!done ? <MarkState L={L} who="approver" /> : null}
        {can ? <ApproverDecision id={r.id} blocked={L.miss.length > 0 || L.marks.missing.length > 0} name={e.name} /> : null}</div>
    </div>
  </>;
}
