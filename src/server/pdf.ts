/* Letter PDF (replaces the prototype's "Download PDF" toast).
 * Draws the same letter model as the screen preview: masthead, date, body,
 * signature block and footer, in Times on A4. App themes never affect it.
 * v0.2: no document reference number (letters issued before v0.2 keep theirs);
 * the authorised signature and stamp images are placed in a reserved band
 * between "Yours sincerely," and the signatory's name, scaled to fit with
 * their aspect ratio kept, so they never overlap the text.
 * The Bank letterhead artwork is not included: the prototype used a text
 * masthead and no official letterhead file was supplied [TO CONFIRM]. */
import "server-only";
import { degrees, PDFDocument, rgb, StandardFonts, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import type { Inline, Letter } from "@/domain/letter";

type Run = { t: string; b: boolean };
const A4 = { w: 595.28, h: 841.89 }, M = { x: 64, top: 64, bottom: 64 };
const RED = rgb(0xb3 / 255, 0x14 / 255, 0x1f / 255), INK = rgb(0.1, 0.1, 0.1), GREY = rgb(0.33, 0.33, 0.33);

function runs(c: Inline[], bold = false): Run[] {
  const out: Run[] = [];
  for (const x of c) {
    if (typeof x === "string") out.push({ t: x, b: bold });
    else if ("f" in x) out.push({ t: x.f, b: bold });
    else if ("m" in x) out.push({ t: `[${x.m}]`, b: bold });
    else out.push(...runs(x.b, true));
  }
  return out;
}
/** WinAnsi-safe text for the standard fonts. */
const safe = (font: PDFFont, s: string) => { try { font.encodeText(s); return s; } catch { return s.replace(/[^\x20-\x7E -ÿ–—‘’“”…]/g, "?"); } };

export interface PdfImage { bytes: Uint8Array; mime: string; w: number; h: number }
export interface PdfOpts { signature?: PdfImage | null; stamp?: PdfImage | null; draft?: boolean }
/** Signature box 150 × 54 pt; stamp box 88 × 88 pt (≈ 31 mm), beside the signature. */
const SIG = { w: 150, h: 54 }, STAMP = { w: 88, h: 88 }, STAMP_X = 200;
const fit = (iw: number, ih: number, bw: number, bh: number) => { const k = Math.min(bw / iw, bh / ih, 1e9); return { w: iw * k, h: ih * k }; };

export async function renderPdf(L: Letter, title: string, opts: PdfOpts = {}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(title); doc.setCreator("Reference Letter Automation"); doc.setProducer("Reference Letter Automation");
  const R = await doc.embedFont(StandardFonts.TimesRoman), B = await doc.embedFont(StandardFonts.TimesRomanBold), I = await doc.embedFont(StandardFonts.TimesRomanItalic), H = await doc.embedFont(StandardFonts.HelveticaBold);
  const size = 11.5, lh = 17;
  let page: PDFPage = doc.addPage([A4.w, A4.h]); let y = A4.h - M.top;
  const W = A4.w - 2 * M.x;
  const need = (h: number) => { if (y - h < M.bottom) { page = doc.addPage([A4.w, A4.h]); y = A4.h - M.top; } };

  /** Lays out runs within [x, x+width], wrapping words; returns the number of lines drawn. */
  const flow = (rs: Run[], x: number, width: number, opts: { center?: boolean; underline?: boolean } = {}) => {
    const lines: Run[][] = [[]]; let lineW = 0;
    const push = (t: string, b: boolean) => { const cur = lines[lines.length - 1]; const last = cur[cur.length - 1]; if (last && last.b === b) last.t += t; else cur.push({ t, b }); };
    for (const r of rs) {
      const font = r.b ? B : R;
      const parts = r.t.split("\n").map((x) => safe(font, x));
      parts.forEach((part, pi) => {
        if (pi > 0) { lines.push([]); lineW = 0; }
        for (const word of part.split(/(\s+)/)) {
          if (!word) continue;
          const ww = font.widthOfTextAtSize(word, size);
          if (/^\s+$/.test(word)) { if (lineW > 0) { push(" ", r.b); lineW += font.widthOfTextAtSize(" ", size); } continue; }
          if (lineW + ww > width && lineW > 0) { const cur = lines[lines.length - 1]; const last = cur[cur.length - 1]; if (last) last.t = last.t.replace(/\s+$/, ""); lines.push([]); lineW = 0; }
          push(word, r.b); lineW += ww;
        }
      });
    }
    for (const ln of lines) {
      need(lh);
      const total = ln.reduce((s, r) => s + (r.b ? B : R).widthOfTextAtSize(r.t, size), 0);
      let cx = opts.center ? x + (width - total) / 2 : x;
      for (const r of ln) { const f = r.b ? B : R; page.drawText(r.t, { x: cx, y: y - size, size, font: f, color: INK }); cx += f.widthOfTextAtSize(r.t, size); }
      if (opts.underline && total) page.drawLine({ start: { x: opts.center ? x + (width - total) / 2 : x, y: y - size - 1.5 }, end: { x: (opts.center ? x + (width - total) / 2 : x) + total, y: y - size - 1.5 }, thickness: 0.6, color: INK });
      y -= lh;
    }
    return lines.length;
  };

  // Masthead (text only, as in the prototype)
  const mast = "B A N K   O F   M A L D I V E S";
  page.drawText(mast, { x: A4.w - M.x - H.widthOfTextAtSize(mast, 8.5), y: y - 8.5, size: 8.5, font: H, color: RED });
  y -= 34;
  const date = `Date: ${L.date}`;
  if (L.ref) page.drawText(safe(R, `Reference No: ${L.ref}`), { x: M.x, y: y - 11, size: 11, font: R, color: INK }); // legacy letters only
  page.drawText(safe(R, date), { x: A4.w - M.x - R.widthOfTextAtSize(date, 11), y: y - 11, size: 11, font: R, color: INK });
  y -= 34;

  for (const b of L.blocks) {
    if (b.k === "title") { flow([{ t: b.text, b: true }], M.x, W, { center: true, underline: true }); y -= 8; continue; }
    if (b.k === "p") { flow(runs(b.c), M.x, W); y -= 8; continue; }
    const col = 128;
    for (const row of b.rows) {
      if ("h" in row) { y -= 4; flow([{ t: row.h, b: true }], M.x, W, { underline: true }); continue; }
      const startY = y; const startPage = page;
      flow([{ t: row.l + ":", b: false }], M.x, col - 8);
      const afterLabel = y; if (page === startPage) y = startY;
      flow(runs(row.c), M.x + col, W - col);
      if (page === startPage) y = Math.min(y, afterLabel);
    }
    y -= 10;
  }
  y -= 6;
  flow([{ t: "Yours sincerely,", b: false }], M.x, W);
  const embed = async (im?: PdfImage | null): Promise<PDFImage | null> => (im ? (im.mime === "image/png" ? doc.embedPng(im.bytes) : doc.embedJpg(im.bytes)) : null);
  const sig = await embed(opts.signature), stamp = await embed(opts.stamp);
  if (sig || stamp) {
    const sd = sig ? fit(sig.width, sig.height, SIG.w, SIG.h) : null, st = stamp ? fit(stamp.width, stamp.height, STAMP.w, STAMP.h) : null;
    const band = Math.max(sd ? SIG.h : 0, st ? st.h : 0) + 6;
    need(band + 2 * lh);
    const base = y - band; // bottom of the reserved band; the name starts below it
    if (sig && sd) page.drawImage(sig, { x: M.x, y: base + 3, width: sd.w, height: sd.h });
    if (stamp && st) page.drawImage(stamp, { x: M.x + STAMP_X, y: base + 3, width: st.w, height: st.h, opacity: 0.95 });
    y = base;
  } else y -= lh;
  flow(runs(L.sign), M.x, W);
  // Footer
  y -= 30; need(40);
  page.drawLine({ start: { x: M.x, y }, end: { x: A4.w - M.x, y }, thickness: 0.5, color: rgb(0.85, 0.84, 0.82) });
  y -= 6;
  const words = safe(I, L.footer).split(" "); let line = ""; const fs = 9.5, out: string[] = [];
  for (const w of words) { const t = line ? line + " " + w : w; if (I.widthOfTextAtSize(t, fs) > W) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line);
  for (const l of out) { y -= 13; page.drawText(l, { x: M.x + (W - I.widthOfTextAtSize(l, fs)) / 2, y, size: fs, font: I, color: GREY }); }
  if (opts.draft) for (const p of doc.getPages()) {
    const t = "DRAFT · NOT ISSUED", size = 46, tw = H.widthOfTextAtSize(t, size);
    p.drawText(t, { x: A4.w / 2 - (tw / 2) * Math.cos(Math.PI / 5), y: A4.h / 2 - (tw / 2) * Math.sin(Math.PI / 5), size, font: H, color: rgb(0.8, 0.8, 0.8), opacity: 0.45, rotate: degrees(36) });
  }
  return doc.save();
}
