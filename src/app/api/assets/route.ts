/* POST /api/assets — upload a signature or stamp image (multipart form). Administrators only.
 * A route handler (not a server action) so the 2 MB limit is ours, not the action body limit.
 * Same-origin only; the role cookie is SameSite=Lax. */
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { AppError } from "@/server/errors";
import { MAX_BYTES, uploadAsset } from "@/server/assets";
import { prisma } from "@/server/db";
import { getViewer } from "@/server/session";

export async function POST(req: Request) {
  const origin = req.headers.get("origin"), host = req.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) return NextResponse.json({ error: "Cross-site upload refused." }, { status: 403 });
  if (Number(req.headers.get("content-length") || 0) > MAX_BYTES + 64 * 1024) return NextResponse.json({ error: "The image is larger than 2 MB." }, { status: 413 });
  try {
    const viewer = await getViewer();
    const form = await req.formData();
    const file = form.get("file");
    const bytes = file instanceof File ? new Uint8Array(await file.arrayBuffer()) : new Uint8Array();
    const r = await uploadAsset({ db: prisma, viewer }, { kind: form.get("kind"), label: form.get("label"), signer: form.get("signer") || undefined, note: form.get("note") }, bytes);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.code === "forbidden" ? 403 : 400 });
    console.error("[upload]", e);
    return NextResponse.json({ error: "The upload failed. Try again." }, { status: 500 });
  }
}
