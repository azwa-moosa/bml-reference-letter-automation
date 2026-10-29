import { isTrType, TYPES } from "@/domain/config";
import { money, sd } from "@/domain/format";
import { renderLetter } from "@/domain/letter";
import { canDownloadFinal, fieldRows, isOpen, key, mgrName, route, tplName } from "@/domain/model";
import { trNeedsSalary } from "@/server/letters";
import { Icon } from "@/components/icon";
import { LetterToggle } from "@/components/staff-bits";
import { TrBack, TrPrepare, TrReturn, TrReview } from "@/components/tr-bits";
import { Kv, Pill, TrailList } from "@/components/ui";
import { letterWorld, reqOr404 } from "@/server/page";

export const metadata = { title: "Total Rewards Letters" };
export default async function TrCase({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { w, v, r } = await reqOr404(id, (r) => isTrType(r.type), "tr");
  const e = w.emp[r.emp], k = key(r), open = isOpen(r) && !r.returned;
  const left = <>
    <div className="card"><h3>Request</h3><Kv rows={fieldRows(w, r, false)} /></div>
    <div className="card"><h3>Staff information</h3><span className="mono" style={{ display: "block", margin: "-6px 0 10px" }}>Linked from the employee master</span>
      <Kv rows={[["Staff ID", <span key="s" className="num">{e.sid}</span>], ["Name", `${e.sal} ${e.name}`], ["NID", e.nid], ["Position", e.position], ["Unit", e.unit], ["Department", e.dept], ["Joined", sd(e.doj)], ["Line manager", mgrName(w, e)], ["Employment", e.etype]]} /></div>
    {r.salary ? <div className="card"><h3>Salary</h3><Kv rows={[["Gross monthly", <span key="a" className="num">{money(r.salary.amount)}</span>], ["Entered by", `${r.salary.by}, ${sd(r.salary.d)}`]]} /></div> : null}
    <div className="card"><h3>History</h3><TrailList trail={r.trail} /></div>
  </>;
  let right: React.ReactNode;
  if (open && k === "trrev") right = <><TrReview id={r.id} type={r.type} needsSalary={trNeedsSalary(r)} passport={r.fields.passport} purpose={r.fields.purpose} lastSalary={r.lastSalary ? `${money(r.lastSalary.amount)} from ${sd(r.lastSalary.eff)}` : null} current={r.salary?.amount ?? null} /><TrReturn id={r.id} /></>;
  else if (open && k === "trdoc") right = <><TrPrepare r={r} lw={letterWorld(w, r)} tpl={tplName(r)} name={e.name} /><TrReturn id={r.id} /></>;
  else right = <>
    {isOpen(r) ? <div className="note"><Icon name="info" size={16} /><span>{r.returned ? `Returned to ${e.name} for correction.` : `Now at: ${route(r)[r.step].label}.`}</span></div> : null}
    <LetterToggle id={r.id} title={k === "done" && !r.closed ? "Completed letter" : "Letter"} tpl={tplName(r)} L={renderLetter(w, r)} highlight={k !== "done"} canDownload={canDownloadFinal(v, r)} />
  </>;
  return <>
    <TrBack />
    <div className="pghead"><div className="pg"><h2>{e.name} · {TYPES[r.type].name}</h2><p>{r.id} · submitted {sd(r.submitted)} · {route(r)[r.step].label}</p></div><Pill r={r} /></div>
    {r.returned ? <div className="card returned"><h3>Returned by {r.returned.by}</h3><p style={{ margin: 0 }}>{r.returned.note}</p></div> : null}
    <div className="case"><div className="stack">{left}</div><div className="stack">{right}</div></div>
  </>;
}
