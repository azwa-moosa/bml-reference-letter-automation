import { TYPES } from "@/domain/config";
import { sd } from "@/domain/format";
import { route } from "@/domain/model";
import { ClickRow } from "@/components/click-row";
import { Icon } from "@/components/icon";
import { Empty, Filters } from "@/components/ui";
import { gate } from "@/server/page";

export const metadata = { title: "Team Approvals" };
export default async function Team({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { w, v, q } = await gate("team");
  const tf = (await searchParams).tab === "approved" ? "approved" : "pending";
  const mineTeam = w.reqs.filter((r) => w.emp[r.emp].mgr === v.emp && route(r).some((s) => s.k === "lm"));
  const pending = q.team();
  const approved = mineTeam.filter((r) => r.trail.some((t) => t.who === v.name && /^Approved/.test(t.what)));
  const list = tf === "approved" ? approved : pending;
  return <>
    <div className="pg"><h2>Team Approvals</h2><p>Visa and academic excuse letters requested by your team that need your approval.</p></div>
    <Filters base="/team" cur={tf} opts={[["pending", "Pending", pending.length], ["approved", "Approved", approved.length]]} />
    <div className="tablewrap"><table className="slim"><thead><tr><th>Request</th><th>Staff</th><th>Letter</th><th>Submitted</th><th>Status</th><th></th></tr></thead><tbody>
      {list.length ? list.map((r) => <ClickRow key={r.id} href={`/team/${r.id}`} testId={`row-${r.id}`}><td className="num"><b>{r.id}</b></td><td>{w.emp[r.emp].name}</td><td>{TYPES[r.type].name}</td><td>{sd(r.submitted)}</td><td>{tf === "approved" ? <span className="pill p-green">Approved</span> : <span className="pill p-amber">Pending</span>}</td><td className="chevcell"><Icon name="chevR" /></td></ClickRow>)
        : <tr><td colSpan={6}><Empty b={tf === "approved" ? "Nothing approved yet" : "Nothing waiting for you"} s="Requests from your team appear here." /></td></tr>}
    </tbody></table></div>
  </>;
}
