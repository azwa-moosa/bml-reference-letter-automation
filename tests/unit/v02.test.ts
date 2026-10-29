/* v0.2 changes: letter order, Total Rewards workflow, rejoiner validation, no document
 * reference numbers, signature/stamp images, and the one-off step remap. */
import Database from "better-sqlite3";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { STAFF_TYPES, TYPES } from "../../src/domain/config";
import { letterText, renderLetter } from "../../src/domain/letter";
import { canDownloadDraft, canDownloadFinal, canSeeLetter, key, viewerOf } from "../../src/domain/model";
import { suggestStatement, totalService } from "../../src/domain/rejoiner";
import { inspectImage } from "../../src/server/assets";
import * as L from "../../src/server/letters";
import { renderPdf } from "../../src/server/pdf";
import { remapRoutes } from "../../scripts/route-remap";
import { testDb } from "../support/db";
import { testPng } from "../support/png";

let t: Awaited<ReturnType<typeof testDb>>;
beforeAll(async () => { t = await testDb(); });

describe("letter picker", () => {
  it("shows the five letters in the required order", () => {
    expect(STAFF_TYPES.map((x) => TYPES[x].name)).toEqual(["Financial Reference Letter", "Job Opportunity Reference Letter", "Academic Reference Letter", "Academic Excuse Letter", "Visa Letter"]);
  });
});

describe("rejoiner question", () => {
  const base = { dates: [], attendees: [] };
  it("is mandatory only for Job Opportunity and Academic Reference on the staff form", () => {
    const msg = "Answer whether you previously worked at BML, left the Bank and rejoined.";
    expect(L.validateForm({ ...base, type: "job_opportunity", values: {} }, "2026-10-27")).toContain(msg);
    expect(L.validateForm({ ...base, type: "academic_reference", values: { institution: "Villa College" } }, "2026-10-27")).toEqual([msg]);
    expect(L.validateForm({ ...base, type: "academic_reference", values: { institution: "Villa College", rejoiner: "no" } }, "2026-10-27")).toEqual([]);
    expect(L.validateForm({ ...base, type: "financial_reference", values: { purpose: "Loan" } }, "2026-10-27")).toEqual([]);
    expect(L.validateForm({ ...base, type: "academic_excuse", values: { institution: "Villa College", reason: "x" }, dates: ["2026-10-20"] }, "2026-10-27")).toEqual([]);
  });
  it("a 'Yes' is flagged and logged; an answer on another letter type is dropped", async () => {
    const r = await L.submitRequest(t.as("staff"), { type: "job_opportunity", values: { rejoiner: "yes" } });
    const q = await t.req(r.id);
    expect(q.fields.rejoiner).toBe("yes");
    expect(q.trail.map((x) => x.what)).toEqual(["Submitted the request in OneUI", "Answered Yes to the rejoiner question: flagged for manual verification by Employee Relations"]);
    const f = await L.submitRequest(t.as("staff"), { type: "financial_reference", values: { purpose: "Loan", rejoiner: "yes" } });
    expect((await t.req(f.id)).fields.rejoiner).toBeUndefined();
  });
});

describe("rejoiner verification (RL-2026-0146, Ahmed Rifau, master joining date 18 Nov 2012)", () => {
  const id = "RL-2026-0146";
  const good = { earlier: [{ from: "2005-01-01", to: "2008-12-31" }], rejoined: "2012-11-18", statement: "", notes: "Personnel file checked", ack: true };
  it("cannot be sent for approval before verification", async () => {
    await L.updateDraft(t.as("erl"), id, { signer: "ere" });
    await expect(L.erSend(t.as("erl"), id)).rejects.toThrow(/Rejoiner/);
    const Lt = renderLetter(await t.world(), await t.req(id));
    expect(Lt.miss).toContain("verified employment history (rejoiner)");
    expect(letterText(Lt)).not.toContain("has been employed with Bank of Maldives PLC since"); // never the single master date
  });
  it("only the ER Lead verifies, and the history must make sense", async () => {
    await expect(L.verifyRejoiner(t.as("ere"), id, good)).rejects.toThrow(/Employee Relations Lead/);
    await expect(L.verifyRejoiner(t.as("erl"), id, { ...good, statement: "x", earlier: [{ from: "2009-01-01", to: "2008-01-01" }] })).rejects.toThrow(/leaving date is before the joining date/);
    await expect(L.verifyRejoiner(t.as("erl"), id, { ...good, statement: "x", rejoined: "2007-01-01" })).rejects.toThrow(/after the last leaving date/);
    await expect(L.verifyRejoiner(t.as("erl"), id, good)).rejects.toThrow(/employment sentence/);
  });
  it("records the verification and the wording in the history; the letter uses the verified wording", async () => {
    const r0 = await t.req(id);
    const statement = suggestStatement(r0.type, { ...good, lastTo: "" });
    expect(statement).toBe("was employed with Bank of Maldives PLC from 1st January 2005 to 31st December 2008, and rejoined the Bank on 18th November 2012");
    await L.verifyRejoiner(t.as("erl"), id, { ...good, statement });
    const q = await t.req(id);
    expect(q.verification).toMatchObject({ ack: true, by: "Shaheem Ali", d: "2026-10-27" });
    expect(q.trail.slice(-3).map((x) => x.what)).toEqual([
      "Verified the rejoiner employment history against HR records (1 earlier period, rejoined 18 Nov 2012)",
      `Employment wording for the letter: "${statement}"`, "Verification note: Personnel file checked"]);
    const text = letterText(renderLetter(await t.world(), q));
    expect(text).toContain(`This is to confirm that Mr. Ahmed Rifau (NID: A089034) ${statement}. Currently, he is working as a Card & ATM Settlement Officer`);
    await L.erSend(t.as("erl"), id);
    expect(key(await t.req(id))).toBe("appr");
  });
  it("adds up separate periods instead of counting from the earliest joining date", () => {
    expect(totalService({ ...good, lastTo: "" }, "2026-10-27")).toBe("17 years 10 months"); // 3y11m + 13y11m
  });
  it("a former-staff rejoiner gets verified periods in the employment record", async () => {
    const lid = await L.logFormer(t.as("erl"), { emp: "E8", type: "release_general", via: "Letter by post", rejoiner: "yes" });
    let q = await t.req(lid);
    expect(renderLetter(await t.world(), q).miss).toEqual(expect.arrayContaining(["verified employment periods (rejoiner)", "rejoiner verification by Employee Relations"]));
    await L.verifyRejoiner(t.as("erl"), lid, { earlier: [{ from: "2010-02-01", to: "2014-01-31" }], rejoined: "2019-07-07", lastTo: "2026-03-31", statement: "was employed with Bank of Maldives PLC from 1st February 2010 to 31st January 2014, and again from 7th July 2019 to 31st March 2026", notes: "", ack: true });
    q = await t.req(lid);
    const text = letterText(renderLetter(await t.world(), q));
    expect(text).toContain("Duration: 1st February 2010 – 31st January 2014; 7th July 2019 – 31st March 2026");
    expect(text).toContain("Service period: 10 years 7 months"); // 3y11m + 6y8m, not 16 years from 2010
  });
});

describe("Total Rewards workflow", () => {
  it("financial: review with salary → preparation → return for correction → resubmit restarts at TR review", async () => {
    const r = await L.submitRequest(t.as("staff"), { type: "financial_reference", values: { purpose: "Housing loan" } });
    expect(key(await t.req(r.id))).toBe("trrev");
    await expect(L.trReview(t.as("tr"), r.id, { purpose: "Housing loan" })).rejects.toThrow("Enter the gross monthly salary.");
    await L.trReview(t.as("tr"), r.id, { salary: 18000, purpose: "Housing loan application" });
    let q = await t.req(r.id);
    expect(key(q)).toBe("trdoc"); expect(q.fields.purpose).toBe("Housing loan application");
    await L.trBackToReview(t.as("tr"), r.id); expect(key(await t.req(r.id))).toBe("trrev");
    await expect(L.trReturn(t.as("tr"), r.id, " ")).rejects.toThrow(/note/);
    await L.trReturn(t.as("tr"), r.id, "Please confirm the bank name.");
    q = await t.req(r.id); expect(q.returned).toMatchObject({ by: "Aishath Reema, Total Rewards" });
    await L.submitRequest(t.as("staff"), { type: "financial_reference", values: { purpose: "Housing loan, BML" }, editing: r.id });
    q = await t.req(r.id); expect(key(q)).toBe("trrev"); expect(q.returned).toBeNull(); expect(q.salary ?? null).toBeNull();
  });
  it("a required stamp blocks completion until one is assigned", async () => {
    const w0 = await t.world(); const r = w0.reqs.find((x) => x.id === "RL-2026-0136")!; // financial at document preparation
    expect(key(r)).toBe("trdoc");
    const sig = await t.upload("signature", "head");
    await t.template("financial_reference", { signatureAssetId: sig, requireStamp: true });
    await expect(L.trComplete(t.as("tr"), r.id)).rejects.toThrow(/official stamp/);
    const stamp = await t.upload("stamp");
    await t.template("financial_reference", { signatureAssetId: sig, stampAssetId: stamp, requireStamp: true });
    await L.trComplete(t.as("tr"), r.id);
    const q = await t.req(r.id);
    expect(q.assets).toMatchObject({ signature: { id: sig, kind: "signature" }, stamp: { id: stamp, kind: "stamp" } });
    expect(q.trail.at(-1)!.what).toMatch(/^Applied stamp "Test stamp" \(asset AST-[0-9A-F]{8}, SHA-256 [0-9a-f]{12}\)$/);
  });
  it("issued letters keep the images recorded at issue, even after the image is deactivated", async () => {
    const { setAssetActive } = await import("../../src/server/assets");
    const q = await t.req("RL-2026-0136");
    await setAssetActive(t.as("head"), q.assets!.stamp!.id, false);
    const Lt = renderLetter(await t.world(), await t.req("RL-2026-0136"));
    expect(Lt.marks.stamp?.id).toBe(q.assets!.stamp!.id); expect(Lt.marks.frozen).toBe(true);
  });
});

describe("letter access", () => {
  it("previews, images and PDFs follow the letter's owner team", async () => {
    const w = await t.world(); const R = (id: string) => w.reqs.find((x) => x.id === id)!;
    const fin = R("RL-2026-0136"), er = R("RL-2026-0140"), issued = R("RL-2026-0138");
    expect(canSeeLetter(viewerOf("tr"), fin)).toBe(true); expect(canSeeLetter(viewerOf("erl"), fin)).toBe(false);
    expect(canSeeLetter(viewerOf("erl"), er)).toBe(true); expect(canSeeLetter(viewerOf("tr"), er)).toBe(false);
    expect(canSeeLetter(viewerOf("staff"), issued)).toBe(true); expect(canSeeLetter(viewerOf("manager"), issued)).toBe(false);
    expect(canDownloadFinal(viewerOf("tr"), fin)).toBe(true); expect(canDownloadFinal(viewerOf("staff"), R("RL-2026-0139"))).toBe(false);
    expect(canDownloadDraft(viewerOf("erl"), er)).toBe(true); expect(canDownloadDraft(viewerOf("tr"), er)).toBe(false);
  });
});

describe("signature and stamp images", () => {
  it("accepts real PNG/JPEG only and reads the size from the file itself", () => {
    expect(inspectImage(testPng(300, 90))).toEqual({ mime: "image/png", width: 300, height: 90 });
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0, 0, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x64, 0x01, 0x2c, 0x03, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(inspectImage(jpeg)).toEqual({ mime: "image/jpeg", width: 300, height: 100 });
    expect(() => inspectImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toThrow(/PNG or JPEG/);
  });
  it("only the administrator can upload or assign; images cannot be changed or deleted", async () => {
    const { uploadAsset, saveTemplate } = await import("../../src/server/assets");
    await expect(uploadAsset(t.as("erl"), { kind: "stamp", label: "Stamp", note: "x x x" }, testPng())).rejects.toThrow(/administrator/);
    await expect(saveTemplate(t.as("tr"), "visa", { signatureAssetId: null, stampAssetId: null, requireSignature: false, requireStamp: false })).rejects.toThrow(/administrator/);
    await expect(uploadAsset(t.as("head"), { kind: "signature", label: "No signer", note: "memo 1" }, testPng())).rejects.toThrow(/Choose whose signature/);
    await expect(uploadAsset(t.as("head"), { kind: "stamp", label: "Tiny", note: "memo 1" }, testPng(10, 10))).rejects.toThrow(/too small/);
    const id = await t.upload("stamp");
    await expect(t.db.$executeRawUnsafe(`DELETE FROM "SignatureAsset" WHERE id = '${id}'`)).rejects.toThrow(/kept for audit/);
    await expect(t.db.$executeRawUnsafe(`UPDATE "SignatureAsset" SET "sha256" = 'x' WHERE id = '${id}'`)).rejects.toThrow(/cannot be changed/);
    await expect(t.db.$executeRawUnsafe(`DELETE FROM "AdminEvent"`)).rejects.toThrow(/append-only/);
    const ev = await t.db.adminEvent.findMany({ orderBy: { id: "asc" } });
    expect(ev.some((e) => e.what.startsWith(`Uploaded stamp "Test stamp" (asset ${id}`))).toBe(true);
  });
  it("PDFs render with signature and stamp images, and as a watermarked draft", async () => {
    const w = await t.world(); const r = w.reqs.find((x) => x.id === "RL-2026-0136")!;
    const img = { bytes: testPng(240, 80), mime: "image/png", w: 240, h: 80 };
    for (const opts of [{ signature: img, stamp: { ...img, bytes: testPng(120, 120), w: 120, h: 120 } }, { draft: true }]) {
      const pdf = await renderPdf(renderLetter(w, r), r.id, opts);
      expect(Buffer.from(pdf).subarray(0, 5).toString()).toBe("%PDF-");
    }
  });
});

describe("upgrade of an existing v0.1 database", () => {
  it("moves open Financial/Visa requests to the Total Rewards route, keeps everything else", () => {
    const file = path.join(mkdtempSync(path.join(tmpdir(), "rl-up-")), "old.db");
    const db = new Database(file);
    const mig = (n: string) => readFileSync(path.resolve(__dirname, `../../prisma/migrations/${n}/migration.sql`), "utf8");
    db.exec(mig("0001_init"));
    const ins = db.prepare(`INSERT INTO "LetterRequest" (id,type,empKey,step,submitted,delivery,fields,draft,salary,ref,issuedAt,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    const now = new Date().toISOString();
    ins.run("A", "financial_reference", "E4", 3, "2026-10-01", "digital", "{}", "{}", '{"amount":1}', null, null, now, now);           // v0.1: at approver
    ins.run("B", "visa", "E1", 2, "2026-10-01", "digital", '{"trip":"annual","includeSalary":false}', "{}", null, null, null, now, now); // v0.1: at ER Lead, no salary
    ins.run("C", "financial_reference", "E5", 4, "2026-09-01", "digital", "{}", "{}", '{"amount":1}', "BML/HR-2400/2026", "2026-09-05", now, now); // issued
    ins.run("D", "academic_reference", "E1", 1, "2026-10-01", "digital", "{}", "{}", null, null, null, now, now);
    db.exec(mig("0002_v02_tr_rejoiner_assets"));
    expect(remapRoutes(db, { trail: true, today: "2026-10-29" })).toBe(3);
    const rows = Object.fromEntries((db.prepare(`SELECT id, step, ref, routeVersion FROM "LetterRequest"`).all() as { id: string; step: number; ref: string | null; routeVersion: number }[]).map((r) => [r.id, r]));
    expect(rows.A.step).toBe(2); // trdoc (no approver any more)
    expect(rows.B.step).toBe(2); // trrev (salary-free visa: TR still reviews)
    expect(rows.C).toMatchObject({ step: 3, ref: "BML/HR-2400/2026" }); // done; legacy reference kept
    expect(rows.D.step).toBe(1);
    expect(Object.values(rows).every((r) => r.routeVersion === 2)).toBe(true);
    const trail = db.prepare(`SELECT requestId, who, what FROM "TrailEntry" ORDER BY id`).all();
    expect(trail).toEqual([
      { requestId: "A", who: "System", what: "Moved to the Total Rewards workflow (v0.2). Now at: Total Rewards prepares the document" },
      { requestId: "B", who: "System", what: "Moved to the Total Rewards workflow (v0.2). Now at: Total Rewards reviews the request" }]);
    expect(remapRoutes(db, { trail: true, today: "2026-10-29" })).toBe(0); // idempotent
    db.close();
  });
});
