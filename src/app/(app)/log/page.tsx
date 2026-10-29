import { LogFormerForm } from "@/components/er-forms";
import { RECEIVED_VIA } from "@/domain/config";
import { sd } from "@/domain/format";
import { gate } from "@/server/page";

export const metadata = { title: "Log Former Staff Request" };
export default async function Log() {
  const { w } = await gate("log");
  const rel = Object.values(w.emp).filter((e) => e.status === "released");
  return <>
    <div className="pg"><h2>Log Former Staff Request</h2><p>Former employees cannot use OneUI. Log requests that arrive by email, letter or walk-in so they follow the same approval, register and history.</p></div>
    <LogFormerForm emps={rel.map((e) => ({ key: e.key, label: `${e.name} · ${e.nid} · released ${sd(e.dor!)}` }))}
      types={[{ key: "release_reference", label: "Released Staff Reference Letter (with role summary)" }, { key: "release_general", label: "Staff Release General Reference (employment record)" }]} vias={RECEIVED_VIA} />
  </>;
}
