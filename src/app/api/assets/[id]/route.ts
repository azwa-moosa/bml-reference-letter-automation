/* GET /api/assets/{id} — image preview for the Signatures & Stamps settings page (administrators only). */
import { NextResponse } from "next/server";
import { isAssetAdmin } from "@/domain/model";
import { assetBytes } from "@/server/assets";
import { prisma } from "@/server/db";
import { getViewer } from "@/server/session";
import { imageResponse } from "@/server/http";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await getViewer();
  if (!isAssetAdmin(v.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await assetBytes(prisma, id);
  if (!b) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return imageResponse(b.data, b.mime);
}
