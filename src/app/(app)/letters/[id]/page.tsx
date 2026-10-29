import Link from "next/link";
import { TYPES } from "@/domain/config";
import { sd } from "@/domain/format";
import { renderLetter } from "@/domain/letter";
import { fieldRows, isOpen, key, needsVerification, staffTimeline, tplName } from "@/domain/model";
import { Icon } from "@/components/icon";
import { CancelButton, LetterToggle } from "@/components/staff-bits";
import { Back, Kv, Pill, Timeline } from "@/components/ui";
import { reqOr404 } from "@/server/page";

export const metadata = { title: "Your request" };
export default async function StaffDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { w, r } = await reqOr404(id, (r, v) => r.emp === v.emp, "letters");
  const done = key(r) === "done" && !r.closed;
  return <>
    <Back href="/letters">All requests</Back>
    <div className="pghead"><div className="pg"><h2>{TYPES[r.type].name}</h2><p>{r.id} · submitted {sd(r.submitted)}</p></div><Pill r={r} staff /></div>
    {r.returned ? <div className="card returned"><h3>Returned by {r.returned.by}</h3><p style={{ margin: "0 0 12px" }}>{r.returned.note}</p>
      {r.type.startsWith("release") ? null : <Link className="btn btn-p" href={`/letters/${r.id}/edit`} data-testid="resubmit">Update and resubmit</Link>}</div> : null}
    {r.closed === "declined" ? <div className="card returned"><h3>Declined by {r.closeBy}</h3><p style={{ margin: 0 }}>{r.closeNote}</p></div> : null}
    {done && r.delivery === "printed" ? <div className="note"><Icon name="info" size={16} /><span>Your printed copy is ready at Employee Relations, Head Office. Bring your staff ID.</span></div> : null}
    {done ? <LetterToggle id={r.id} title="Your letter" tpl={tplName(r)} L={renderLetter(w, r)} highlight={false} canDownload /> : null}
    <div className="case">
      <div className="stack"><div className="card"><h3>Progress</h3><Timeline items={staffTimeline(w, r)} /></div>
        {!done && isOpen(r) ? <div className="card"><h3>What happens next</h3><p style={{ margin: 0, color: "var(--muted)" }}>{TYPES[r.type].route ? TYPES[r.type].route + " " : "Employee Relations prepares the letter. "}{needsVerification(r) ? "Because you rejoined the Bank, Employee Relations checks your employment periods first. " : ""}Letters will be issued within 3 working days. You&apos;ll get a OneUI notification when yours is ready.</p></div> : null}</div>
      <div className="stack"><div className="card"><h3>Your request</h3><Kv rows={fieldRows(w, r, true)} /></div>
        {isOpen(r) ? <CancelButton id={r.id} /> : null}</div>
    </div>
  </>;
}
