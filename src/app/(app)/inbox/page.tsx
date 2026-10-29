import { TYPES } from "@/domain/config";
import { ageOf, sd } from "@/domain/format";
import { isOpen, isVerified, needsVerification, route, summary } from "@/domain/model";
import { ClickRow } from "@/components/click-row";
import { Empty, Filters, Pill, RejoinerFlag, SeniorFlag } from "@/components/ui";
import { gate } from "@/server/page";

export const metadata = { title: "Letter Inbox" };
export default async function Inbox({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { w, q } = await gate("inbox");
  const F: [string, string, typeof w.reqs][] = [["action", "To review", q.er()], ["waiting", "With others", q.waiting()], ["returned", "Returned to staff", q.returned()], ["done", "Issued and closed", q.done()], ["all", "All", q.erAll()]];
  const f = (await searchParams).f; const cur = F.find((x) => x[0] === f) ?? F[0];
  const rows = [...cur[2]].sort((a, b) => a.submitted.localeCompare(b.submitted));
  return <>
    <div className="pg"><h2>Letter Inbox</h2><p>Employee Relations letters from OneUI, requests made on behalf of staff, and former-staff requests, with the step each is at. Financial Reference and Visa letters are handled by Total Rewards.</p></div>
    <Filters base="/inbox" param="f" cur={cur[0]} opts={F.map(([k, l, a]) => [k, l, a.length])} />
    <div className="tablewrap"><table><thead><tr><th>Request</th><th>Staff</th><th>Letter</th><th>Step</th><th>Status</th><th className="num">Age</th></tr></thead><tbody>
      {rows.length ? rows.map((r) => { const e = w.emp[r.emp]; return (
        <ClickRow key={r.id} href={`/inbox/${r.id}`} testId={`row-${r.id}`}><td><b>{r.id}</b><span className="s">{sd(r.submitted)}</span></td><td>{e.name}<SeniorFlag e={e} /><span className="s">{e.status === "released" ? "Former staff" : e.position}</span></td>
          <td>{TYPES[r.type].name}{needsVerification(r) && !isVerified(r) && isOpen(r) ? <> <RejoinerFlag /></> : null}<span className="s">{summary(r)}</span></td><td>{route(r)[r.step].label}</td><td><Pill r={r} /></td><td className="num">{isOpen(r) ? ageOf(r.submitted, w.today) : "–"}</td></ClickRow>); })
        : <tr><td colSpan={6}><Empty b="Nothing here" s="No requests in this list." /></td></tr>}
    </tbody></table></div>
  </>;
}
