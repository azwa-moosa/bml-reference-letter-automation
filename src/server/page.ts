/* Per-request page context: signed-in persona + data, loaded once. */
import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { canView, queues } from "@/domain/model";
import type { Req, Viewer, World } from "@/domain/types";
import { prisma } from "./db";
import { getViewer } from "./session";
import { loadWorld } from "./world";

export const getPage = cache(async () => {
  const v = await getViewer();
  const w = await loadWorld(prisma);
  return { v, w, q: queues(w, v) };
});
/** Refuses a view the role has no menu entry for (the prototype only hid it). */
export async function gate(view: string) {
  const p = await getPage();
  if (!canView(p.w, p.v, view)) notFound();
  return p;
}
export async function reqOr404(id: string, allow: (r: Req, v: Viewer, w: World) => boolean, view: string) {
  const p = await gate(view);
  const r = p.w.reqs.find((x) => x.id === decodeURIComponent(id));
  if (!r || !allow(r, p.v, p.w)) notFound();
  return { ...p, r: r! };
}
/** Smallest data the letter preview needs on the client. */
export function letterWorld(w: Awaited<ReturnType<typeof getPage>>["w"], r: Req) {
  const keys = new Set([r.emp, ...(r.fields.attendees ?? []).map((a) => a.emp)]);
  return { ...w, reqs: [], library: [], manual: [], emp: Object.fromEntries([...keys].map((k) => [k, w.emp[k]])) };
}
