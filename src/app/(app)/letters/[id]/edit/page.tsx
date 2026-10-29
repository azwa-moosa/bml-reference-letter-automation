import { notFound } from "next/navigation";
import { RequestForm } from "@/components/request-form";
import { activeEmps, isOpen } from "@/domain/model";
import { editValues } from "@/server/letters";
import { reqOr404 } from "@/server/page";

export const metadata = { title: "Update and resubmit" };
export default async function Edit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { w, v, r } = await reqOr404(id, (r, v) => r.emp === v.emp, "letters");
  if (r.emp !== v.emp || !r.returned || !isOpen(r) || r.type.startsWith("release")) notFound();
  const e = editValues(r);
  return <RequestForm today={w.today} colleagues={activeEmps(w).filter((x) => x.key !== v.emp).map((x) => ({ key: x.key, name: x.name, position: x.position }))}
    editing={{ id: r.id, type: r.type as never, values: e.values, dates: e.dates, attendees: e.attendees }} />;
}
