import { TYPES } from "@/domain/config";
import { money } from "@/domain/format";
import { ClickRow } from "@/components/click-row";
import { Icon } from "@/components/icon";
import { Empty, Filters } from "@/components/ui";
import { gate } from "@/server/page";

export const metadata = { title: "Salary Information" };
export default async function Salary({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { w, v, q } = await gate("salary");
  const tf = (await searchParams).tab === "done" ? "done" : "pending";
  const pending = q.tr(), done = w.reqs.filter((r) => r.salary && r.salary.by === v.name);
  const list = tf === "done" ? done : pending;
  return <>
    <div className="pg"><h2>Salary Information</h2><p>Employee Relations letters that quote the staff member’s gross salary (Job Opportunity). Financial Reference and Visa letters are in Total Rewards Letters.</p></div>
    <Filters base="/salary" cur={tf} opts={[["pending", "To enter", pending.length], ["done", "Entered by you", done.length]]} />
    <div className="tablewrap"><table className="slim"><thead><tr><th>Staff ID</th><th>Staff</th><th>Letter</th><th>Request</th><th>Status</th><th></th></tr></thead><tbody>
      {list.length ? list.map((r) => <ClickRow key={r.id} href={`/salary/${r.id}`} testId={`row-${r.id}`}><td className="num"><b>{w.emp[r.emp].sid}</b></td><td>{w.emp[r.emp].name}</td><td>{TYPES[r.type].name}</td><td className="num">{r.id}</td><td>{tf === "done" ? <span className="pill p-green">{money(r.salary!.amount)}</span> : <span className="pill p-amber">To enter</span>}</td><td className="chevcell"><Icon name="chevR" /></td></ClickRow>)
        : <tr><td colSpan={6}><Empty b="Nothing here" s="New salary requests appear here." icon="bank" /></td></tr>}
    </tbody></table></div>
  </>;
}
