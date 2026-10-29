import { redirect } from "next/navigation";
import { ROLES } from "@/domain/config";
import { getPage } from "@/server/page";
export default async function Home() { const { v } = await getPage(); redirect(ROLES[v.role].home); }
