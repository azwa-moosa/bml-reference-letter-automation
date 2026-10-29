import { isTrType, SIGNERS, TYPES } from "@/domain/config";
import { money, sd } from "@/domain/format";
import { canDownloadDraft, fieldRows, isOpen, isSenior, key, mgrName, needsVerification, route, signerOf, tplName } from "@/domain/model";
import { CaseView } from "@/components/case-view";
import { Icon } from "@/components/icon";
import { Back, Kv, Pill, SeniorFlag, TrailList } from "@/components/ui";
import { letterWorld, reqOr404 } from "@/server/page";

export const metadata = { title: "Letter Inbox" };
export default async function Case({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // v0.2: Financial Reference and Visa letters belong to Total Rewards and are not shown here.
  const { w, v, r } = await reqOr404(id, (r) => !isTrType(r.type), "inbox");
  const e = w.emp[r.emp], k = key(r), pos = w.positions[e.pos];
  const canEdit = v.role === "erl" && isOpen(r) && !r.returned && k === "er";
  const sg = signerOf(r);
  const waitMsg = !canEdit && isOpen(r) ? (r.returned ? `Returned to ${e.name} for changes.` : `Now at: ${route(r)[r.step].label}${k === "appr" && sg ? ` (${SIGNERS[sg].title})` : ""}.`) : "";
  const lib = "jd" in r.draft ? w.library.filter((l) => l.position === e.position).map((l) => ({ ref: l.ref, unit: l.unit, typeName: TYPES[l.type].name, text: l.text })) : [];
  const left = <>
    <div className="card"><h3>Request</h3><Kv rows={fieldRows(w, r, false)} /></div>
    <div className="card"><h3>Staff information</h3><span className="mono" style={{ display: "block", margin: "-6px 0 10px" }}>Linked from the employee master</span>
      <Kv rows={[["Staff ID", <span key="s" className="num">{e.sid}</span>], ["Name", <span key="n">{e.sal} {e.name}<SeniorFlag e={e} /></span>], ["NID", e.nid], ["Position", e.position], ["Unit", e.unit], ["Department", e.dept], [needsVerification(r) ? "Joined (master record)" : "Joined", sd(e.doj)],
        e.dor ? ["Released", sd(e.dor)] : ["Line manager", mgrName(w, e)], ["Employment", e.etype]]} /></div>
    {r.salary ? <div className="card"><h3>Salary from Total Rewards</h3><Kv rows={[["Gross monthly", <span key="a" className="num">{money(r.salary.amount)}</span>], ["Entered by", `${r.salary.by}, ${sd(r.salary.d)}`]]} /></div> : null}
  </>;
  return <>
    <Back href="/inbox">Letter Inbox</Back>
    <div className="pghead"><div className="pg"><h2>{e.name} · {TYPES[r.type].name}</h2><p>{r.id} · submitted {sd(r.submitted)} · {route(r)[r.step].label}</p></div><Pill r={r} /></div>
    {r.apprReturn && k === "er" ? <div className="card returned"><h3>Returned by {r.apprReturn.by}</h3><p style={{ margin: 0 }}>{r.apprReturn.note}</p></div> : null}
    {waitMsg ? <div className="note"><Icon name="info" size={16} /><span>{waitMsg}</span></div> : null}
    <CaseView key={`${r.id}-${r.version}`} r={r} lw={letterWorld(w, r)} canEdit={canEdit} canReturn={!r.type.startsWith("release")} senior={isSenior(e)} tpl={tplName(r)} stageKey={k}
      pos={{ summary: pos.summary, jd: pos.jd }} lib={lib} position={e.position} left={left} history={<div className="card"><h3>History</h3><TrailList trail={r.trail} /></div>}
      rejoiner={needsVerification(r) ? { former: e.status === "released", doj: e.doj, dor: e.dor, today: w.today } : null} draftPdf={canDownloadDraft(v, r)} />
  </>;
}
