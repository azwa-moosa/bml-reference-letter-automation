import { ClickRow } from "@/components/click-row";
import { TYPES } from "@/domain/config";
import { sd } from "@/domain/format";
import { Icon } from "@/components/icon";
import { NewRequestButton } from "@/components/staff-bits";
import { Empty, Pill, Tile } from "@/components/ui";
import { gate } from "@/server/page";

export const metadata = { title: "Reference Letters" };
export default async function Letters() {
  const { q } = await gate("letters");
  const mine = q.mine().sort((a, b) => b.id.localeCompare(a.id));
  return <>
    <div className="pg"><h2>Reference Letters</h2></div>
    <div className="card banner"><div className="tile t-red"><Icon name="file" /></div><div className="txt"><b>Looking for a reference letter? We’re happy to help!</b><span>Letters will be issued within 3 working days.</span></div><NewRequestButton /></div>
    <div className="seclabel">Your requests</div>
    <div className="tablewrap"><table className="slim"><thead><tr><th>Letter</th><th>Request</th><th>Submitted</th><th>Status</th><th></th></tr></thead><tbody>
      {mine.length ? mine.map((r) => <ClickRow key={r.id} href={`/letters/${r.id}`} testId={`row-${r.id}`}><td><div className="cell"><Tile r={r} /><b>{TYPES[r.type].name}</b></div></td><td className="num">{r.id}</td><td>{sd(r.submitted)}</td><td><Pill r={r} staff /></td><td className="chevcell"><Icon name="chevR" /></td></ClickRow>)
        : <tr><td colSpan={5}><Empty b="No letter requests yet" s="Use Request a letter to start one." /></td></tr>}
    </tbody></table></div>
  </>;
}
