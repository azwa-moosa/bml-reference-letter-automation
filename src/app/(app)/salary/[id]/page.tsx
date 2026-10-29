import { TYPES } from "@/domain/config";
import { money, sd } from "@/domain/format";
import { isOpen, key, route } from "@/domain/model";
import { SalaryForm } from "@/components/salary-form";
import { Back, Kv } from "@/components/ui";
import { reqOr404 } from "@/server/page";

export const metadata = { title: "Salary" };
export default async function SalaryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Total Rewards sees only requests that have (or had) a salary stage.
  const { w, r } = await reqOr404(id, (r) => route(r).some((s) => s.k === "tr"), "salary");
  const e = w.emp[r.emp], can = isOpen(r) && key(r) === "tr";
  return <>
    <Back href="/salary">Salary Information</Back>
    <div className="pg"><h2>{e.name}</h2><p>{r.id}</p></div>
    <div className="card qcard" style={{ maxWidth: 640 }}><Kv rows={[["Staff ID", <span key="s" className="num">{e.sid}</span>], ["Name", e.name], ["Letter", TYPES[r.type].name]]} />
      {can ? <SalaryForm id={r.id} /> : r.salary ? <Kv rows={[["Gross monthly salary", <span key="a" className="num">{money(r.salary.amount)}</span>], ["Entered", sd(r.salary.d)]]} /> : null}
    </div>
  </>;
}
