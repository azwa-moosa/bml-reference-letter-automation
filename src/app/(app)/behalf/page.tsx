import { BehalfPicker } from "@/components/er-forms";
import { activeEmps } from "@/domain/model";
import { gate } from "@/server/page";

export const metadata = { title: "Request on Behalf of Staff" };
export default async function Behalf() {
  const { w } = await gate("behalf");
  return <>
    <div className="pg"><h2>Request on Behalf of Staff</h2><p>For staff who ask Employee Relations directly. The request follows the same approvals as one made in OneUI, and the staff member can follow it there.</p></div>
    <BehalfPicker emps={activeEmps(w).map((e) => ({ key: e.key, label: `${e.name} · ${e.position} · ${e.nid}` }))} />
  </>;
}
