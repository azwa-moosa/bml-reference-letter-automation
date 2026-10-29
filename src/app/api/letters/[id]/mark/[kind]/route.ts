/* GET /api/letters/{id}/mark/{signature|stamp} — the image placed on this letter, for the
 * on-screen preview. Only for viewers who may see the letter; never cached or indexed. */
import { NextResponse } from "next/server";
import { marksFor } from "@/domain/assets";
import { canSeeLetter } from "@/domain/model";
import { assetBytes } from "@/server/assets";
import { prisma } from "@/server/db";
import { imageResponse } from "@/server/http";
import { getViewer } from "@/server/session";
import { loadWorld } from "@/server/world";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; kind: string }> }) {
  const { id, kind } = await params;
  if (kind !== "signature" && kind !== "stamp") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const v = await getViewer();
  const w = await loadWorld(prisma);
  const r = w.reqs.find((x) => x.id === decodeURIComponent(id));
  if (!r || !canSeeLetter(v, r)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const a = marksFor(w, r)[kind];
  const b = a && (await assetBytes(prisma, a.id));
  if (!b) return NextResponse.json({ error: "No image" }, { status: 404 });
  return imageResponse(b.data, b.mime);
}
