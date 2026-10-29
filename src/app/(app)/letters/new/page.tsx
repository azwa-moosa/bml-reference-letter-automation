import { RequestForm } from "@/components/request-form";
import { activeEmps } from "@/domain/model";
import { gate } from "@/server/page";

export const metadata = { title: "New request" };
export default async function NewLetter() {
  const { w, v } = await gate("letters");
  return <RequestForm today={w.today} colleagues={activeEmps(w).filter((e) => e.key !== v.emp).map((e) => ({ key: e.key, name: e.name, position: e.position }))} />;
}
