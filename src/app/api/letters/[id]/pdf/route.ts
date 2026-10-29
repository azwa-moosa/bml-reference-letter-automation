/* GET /api/letters/{id}/pdf — the issued letter as PDF (with its recorded signature/stamp).
 * GET /api/letters/{id}/pdf?draft=1 — watermarked draft without signature or stamp, for the
 * team at the drafting step (Total Rewards at document preparation, ER Lead at review). */
import { NextResponse } from "next/server";
import { TYPES } from "@/domain/config";
import { renderLetter } from "@/domain/letter";
import { canDownloadDraft, canDownloadFinal } from "@/domain/model";
import { assetBytes } from "@/server/assets";
import { prisma } from "@/server/db";
import { renderPdf } from "@/server/pdf";
import { getViewer } from "@/server/session";
import { loadWorld } from "@/server/world";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const draft = new URL(req.url).searchParams.get("draft") === "1";
  const v = await getViewer();
  const w = await loadWorld(prisma);
  const r = w.reqs.find((x) => x.id === decodeURIComponent(id));
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (draft ? !canDownloadDraft(v, r) : !canDownloadFinal(v, r)) {
    return NextResponse.json({ error: draft ? "A draft is available only to the team preparing the letter." : "The letter is not issued, or is not yours to download." }, { status: 403 });
  }
  const L = renderLetter(w, r);
  const img = async (a: typeof L.marks.signature) => { if (!a || draft) return null; const b = await assetBytes(prisma, a.id); return b ? { bytes: new Uint8Array(b.data), mime: b.mime, w: a.w, h: a.h } : null; };
  const bytes = await renderPdf(L, `${TYPES[r.type].name} · ${r.id}`, { signature: await img(L.marks.signature), stamp: await img(L.marks.stamp), draft });
  const name = `${TYPES[r.type].name} - ${r.id}${draft ? " - DRAFT" : ""}.pdf`.replace(/[/\\"]/g, "-");
  return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store" } });
}
