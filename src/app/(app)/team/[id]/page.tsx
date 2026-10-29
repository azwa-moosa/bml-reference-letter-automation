import { TYPES, embLabel } from "@/domain/config";
import { dayCount, sd } from "@/domain/format";
import { isOpen, key, pr } from "@/domain/model";
import { TeamDecision } from "@/components/team-actions";
import { Back, Kv, Pill } from "@/components/ui";
import { reqOr404 } from "@/server/page";

export const metadata = { title: "Team approval" };
export default async function TeamDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { w, v, r } = await reqOr404(id, (r, v, w) => w.emp[r.emp].mgr === v.emp, "team");
  const e = w.emp[r.emp], f = r.fields;
  const can = isOpen(r) && !r.returned && key(r) === "lm" && e.mgr === v.emp;
  const official = r.type === "visa" && f.trip === "official";
  const body = official
    ? <Kv rows={[["Event", f.event], ["Held in", f.location], ["Event dates", `${sd(f.start!)} to ${sd(f.end!)}`], ["Expenses", f.sponsored ? "Sponsored by the Bank" : "Not sponsored"], ["Attendees", (f.attendees || []).map((a) => w.emp[a.emp].name).join(", ")]]} />
    : r.type === "visa" ? <Kv rows={[["Embassy", embLabel(f.embassy ?? "")], ["Travel requested", `${sd(f.start!)} to ${sd(f.end!)} · ${dayCount(f.start!, f.end!)} days`]]} />
    : <Kv rows={[["Institution", f.institution], ["Work reason", f.reason]]} />;
  return <>
    <Back href="/team">Team Approvals</Back>
    <div className="pghead"><div className="pg"><h2>{e.name} · {TYPES[r.type].name}</h2><p>{e.position} · {r.id} · submitted {sd(r.submitted)}</p></div><Pill r={r} /></div>
    <div className="card qcard">{body}
      {can ? <TeamDecision id={r.id} kind={official ? "official" : r.type === "visa" ? "annual" : "excuse"} start={f.start} end={f.end} dates={f.dates} he={pr(e).he} /> : null}
    </div>
  </>;
}
