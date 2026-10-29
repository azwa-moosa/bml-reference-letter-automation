import { notFound } from "next/navigation";
import { RequestForm } from "@/components/request-form";
import { activeEmps } from "@/domain/model";
import { gate } from "@/server/page";

export const metadata = { title: "Request on Behalf of Staff" };
export default async function BehalfForm({ params }: { params: Promise<{ emp: string }> }) {
  const { emp } = await params;
  const { w } = await gate("behalf");
  const e = w.emp[emp]; if (!e || e.status !== "active") notFound();
  return <RequestForm today={w.today} forEmp={{ key: e.key, name: e.name, position: e.position, unit: e.unit }} colleagues={activeEmps(w).filter((x) => x.key !== e.key).map((x) => ({ key: x.key, name: x.name, position: x.position }))} />;
}
