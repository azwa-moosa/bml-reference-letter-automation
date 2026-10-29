import { PositionsTable } from "@/components/tables";
import { gate } from "@/server/page";

export const metadata = { title: "Position Master" };
export default async function Positions() {
  const { w } = await gate("positions");
  const rows = Object.values(w.positions).map((p) => ({ ...p, staff: Object.values(w.emp).filter((e) => e.pos === p.code && e.status === "active").length }));
  return <>
    <div className="pg"><h2>Position Master</h2><p>One approved role summary per position, written from the job description. Every letter for staff in that position uses the same wording, and the Employee Relations Lead can still adjust it on a single letter.</p></div>
    <PositionsTable rows={rows} />
  </>;
}
