import { isTrType, TYPES } from "@/domain/config";
import { sd } from "@/domain/format";
import { ClickRow } from "@/components/click-row";
import { Icon } from "@/components/icon";
import { Empty, Filters, Pill, SeniorFlag } from "@/components/ui";
import { gate } from "@/server/page";

export const metadata = { title: "Letters to Approve" };
export default async function Approve({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { w, v, q } = await gate("approve");
  const tf = (await searchParams).tab === "done" ? "done" : "pending";
  const pending = q.appr(), done = w.reqs.filter((r) => r.signedBy === v.role && r.issuedAt && !isTrType(r.type));
  const list = tf === "done" ? done : pending;
  return <>
    <div className="pg"><h2>Letters to Approve</h2><p>Letters reviewed by the Employee Relations Lead and sent to you as the signing authority.</p></div>
    <Filters base="/approve" cur={tf} opts={[["pending", "To approve", pending.length], ["done", "Approved by you", done.length]]} />
    <div className="tablewrap"><table className="slim"><thead><tr><th>Request</th><th>Staff</th><th>Letter</th><th>Submitted</th><th>Status</th><th></th></tr></thead><tbody>
      {list.length ? list.map((r) => <ClickRow key={r.id} href={`/approve/${r.id}`} testId={`row-${r.id}`}><td className="num"><b>{r.id}</b></td><td>{w.emp[r.emp].name}<SeniorFlag e={w.emp[r.emp]} /></td><td>{TYPES[r.type].name}</td><td>{sd(r.submitted)}</td><td><Pill r={r} /></td><td className="chevcell"><Icon name="chevR" /></td></ClickRow>)
        : <tr><td colSpan={6}><Empty b={tf === "done" ? "Nothing approved yet" : "Nothing to approve"} s="Letters appear here once the Employee Relations Lead sends them to you." /></td></tr>}
    </tbody></table></div>
  </>;
}
