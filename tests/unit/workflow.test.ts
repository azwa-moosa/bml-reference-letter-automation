/* Every transition in spec §3.5, run as the right and the wrong role. */
import { beforeAll, describe, expect, it } from "vitest";
import { key } from "../../src/domain/model";
import * as L from "../../src/server/letters";
import { testDb } from "../support/db";

let t: Awaited<ReturnType<typeof testDb>>;
beforeAll(async () => { t = await testDb(); });
const visa = { trip: "annual", embassy: "Japan", start: "2026-12-14", end: "2026-12-24", passport: "LA0458213", includeSalary: true, delivery: "digital" };

describe("full visa journey (v0.2): staff → line manager → TR review → document preparation → completed", () => {
  let id = "";
  it("staff submits; the request number continues the sequence", async () => {
    const r = await L.submitRequest(t.as("staff"), { type: "visa", values: visa });
    expect(r.errors).toBeUndefined();
    id = r.id; expect(id).toBe("RL-2026-0147");
    const q = await t.req(id);
    expect(key(q)).toBe("lm");
    expect(q.trail[0]).toMatchObject({ who: "Aminath Shifa", what: "Submitted the request" });
    expect(q.draft.addressee).toContain("Embassy of Japan");
  });
  it("only the requester's line manager can approve", async () => {
    await expect(L.lmApprove(t.as("head"), id, { leaveFrom: "2026-12-14", leaveTo: "2026-12-24" })).rejects.toThrow(/line manager/);
    await expect(L.lmApprove(t.as("manager"), id, { leaveFrom: "2026-12-20", leaveTo: "2026-12-14" })).rejects.toThrow("Enter a valid leave period.");
    await L.lmApprove(t.as("manager"), id, { leaveFrom: "2026-12-14", leaveTo: "2026-12-22", comment: "Enjoy" });
    const q = await t.req(id);
    expect(key(q)).toBe("trrev");
    expect(q.fields.leaveTo).toBe("2026-12-22");
    expect(q.trail.slice(-2).map((x) => x.what)).toEqual(["Approved leave duration 14 Dec 2026 to 22 Dec 2026", "Comment: Enjoy"]);
  });
  it("Total Rewards reviews it: corrects the passport number and enters the salary (> 0)", async () => {
    await expect(L.trReview(t.as("erl"), id, { salary: "100" })).rejects.toThrow(/Total Rewards/);
    await expect(L.saveSalary(t.as("tr"), id, "100")).rejects.toThrow(/not waiting for a salary/);
    await expect(L.trReview(t.as("tr"), id, { salary: "0", passport: "LA0458213" })).rejects.toThrow("Enter the gross monthly salary.");
    await L.trReview(t.as("tr"), id, { salary: "21500", passport: "LA0458299" });
    const q = await t.req(id);
    expect(q.salary).toMatchObject({ amount: 21500, by: "Aishath Reema" });
    expect(q.fields.passport).toBe("LA0458299");
    expect(key(q)).toBe("trdoc");
    const lines = q.trail.slice(-3).map((x) => x.what);
    expect(lines).toEqual(["Corrected the passport number", "Entered gross salary MVR 21,500.00", "Reviewed the request and moved it to document preparation"]);
    expect(lines.join(" ")).not.toContain("LA0458299"); // the number itself is not written to the history
  });
  it("Employee Relations and the approvers cannot act on a Total Rewards letter", async () => {
    await expect(L.erSend(t.as("erl"), id)).rejects.toThrow();
    await expect(L.updateDraft(t.as("erl"), id, { signer: "head" })).rejects.toThrow();
    await expect(L.approveAndIssue(t.as("head"), id, "")).rejects.toThrow();
    await expect(L.trComplete(t.as("head"), id)).rejects.toThrow(/Total Rewards/);
  });
  it("completion is blocked until an authorised signature is configured for the template", async () => {
    await expect(L.trComplete(t.as("tr"), id)).rejects.toThrow(/signatory|signature/);
  });
  it("TR completes it with the configured signature; no reference number is given", async () => {
    const before = await t.db.counter.findUnique({ where: { key: "reference" } });
    const sig = await t.upload("signature", "head");
    await t.template("visa", { signatureAssetId: sig });
    await L.updateDraft(t.as("tr"), id, { addressee: "Consular Section\nEmbassy of Japan in Maldives\nMalé" });
    await L.trComplete(t.as("tr"), id);
    const q = await t.req(id);
    expect(key(q)).toBe("done"); expect(q.ref ?? null).toBeNull(); expect(q.issuedAt).toBe("2026-10-27"); expect(q.signedBy).toBe("head");
    expect(q.assets?.signature?.id).toBe(sig);
    expect(q.trail.at(-2)!.what).toBe("Prepared and completed the letter (signatory: Head of TR & ER (Sample))");
    expect(q.trail.at(-1)!.what).toMatch(new RegExp(`^Applied signature "Test signature · head" \\(asset ${sig}, SHA-256 [0-9a-f]{12}\\)$`));
    expect(await t.db.counter.findUnique({ where: { key: "reference" } })).toEqual(before);
    expect(q.trail.some((x) => /approv/i.test(x.what) && x.who !== "Hassan Rasheed")).toBe(false); // no signee approval step
  });
  it("nothing can act on a completed letter", async () => {
    await expect(L.cancelRequest(t.as("staff"), id)).rejects.toThrow(/already closed/);
    await expect(L.trComplete(t.as("tr"), id)).rejects.toThrow();
    await expect(L.trReturn(t.as("tr"), id, "x")).rejects.toThrow();
  });
});

describe("Employee Relations letters keep the approver step", () => {
  it("approval is blocked until the approver's own signature is uploaded; then issued without a reference", async () => {
    await expect(L.erSend(t.as("erl"), "RL-2026-0144")).rejects.toThrow("Still missing: signing authority.");
    await L.updateDraft(t.as("erl"), "RL-2026-0144", { signer: "ere" });
    await L.erSend(t.as("erl"), "RL-2026-0144");
    expect(key(await t.req("RL-2026-0144"))).toBe("appr");
    await expect(L.approveAndIssue(t.as("head"), "RL-2026-0144", "")).rejects.toThrow(/other signing authority/);
    await expect(L.approveAndIssue(t.as("ere"), "RL-2026-0144", "")).rejects.toThrow(/authorised signature of the signing authority/);
    const sig = await t.upload("signature", "ere");
    await L.approveAndIssue(t.as("ere"), "RL-2026-0144", "");
    const q = await t.req("RL-2026-0144");
    expect(key(q)).toBe("done"); expect(q.ref ?? null).toBeNull(); expect(q.signedBy).toBe("ere"); expect(q.assets?.signature?.id).toBe(sig);
    expect(q.trail.slice(-2).map((x) => x.what)[0]).toBe("Approved and issued the letter");
  });
});

describe("blocking rules", () => {
  it("approver return needs a comment and goes back one step", async () => {
    await expect(L.apprReturnToEr(t.as("ere"), "RL-2026-0133", "")).rejects.toThrow("Add a comment for the Employee Relations Lead.");
    await L.apprReturnToEr(t.as("ere"), "RL-2026-0133", "Please check the role summary.");
    const q = await t.req("RL-2026-0133");
    expect(key(q)).toBe("er"); expect(q.apprReturn).toMatchObject({ by: "ER & Engagement Manager (Sample)" });
  });
  it("former-staff requests cannot be returned to staff", async () => {
    await expect(L.erReturn(t.as("erl"), "RL-2026-0137", "note")).rejects.toThrow(/can't be returned/);
  });
});

describe("return, resubmit, decline, cancel", () => {
  it("academic excuse: manager returns, staff resubmits and it restarts at the manager", async () => {
    await expect(L.lmReturnOrDecline(t.as("manager"), "RL-2026-0143", "return", "")).rejects.toThrow(/Add a comment/);
    await L.lmReturnOrDecline(t.as("manager"), "RL-2026-0143", "return", "Please add 23 October as well.");
    let q = await t.req("RL-2026-0143");
    expect(q.returned).toMatchObject({ by: "Hassan Rasheed" });
    // E3 is not a demo persona: resubmitting as someone else is refused
    await expect(L.submitRequest(t.as("staff"), { type: "academic_excuse", values: { institution: "Villa College", reason: "x" }, dates: ["2026-10-19"], editing: "RL-2026-0143" })).rejects.toThrow(/own request/);
    q = await t.req("RL-2026-0143"); expect(q.returned).not.toBeNull();
  });
  it("staff resubmission clears the manager's earlier approval and the salary", async () => {
    // Staff (E1) visa RL-2026-0141 at line manager: return it, then resubmit
    await L.lmReturnOrDecline(t.as("manager"), "RL-2026-0141", "return", "Dates overlap the audit.");
    const e = L.editValues(await t.req("RL-2026-0141"));
    expect(e.values.leaveFrom).toBeUndefined();
    await L.submitRequest(t.as("staff"), { type: "visa", values: { ...e.values, start: "2027-01-10", end: "2027-01-15" }, editing: "RL-2026-0141" });
    const q = await t.req("RL-2026-0141");
    expect(q.returned).toBeNull(); expect(key(q)).toBe("lm"); expect(q.fields.start).toBe("2027-01-10"); expect(q.salary ?? null).toBeNull();
    expect(q.trail.at(-1)!.what).toBe("Updated and resubmitted the request");
  });
  it("manager declines (comment required) and the request closes", async () => {
    await L.lmReturnOrDecline(t.as("manager"), "RL-2026-0141", "decline", "Not approved this period.");
    const q = await t.req("RL-2026-0141");
    expect(q.closed).toBe("declined"); expect(q.closeBy).toBe("Hassan Rasheed");
  });
  it("only the requester can cancel", async () => {
    await expect(L.cancelRequest(t.as("manager"), "RL-2026-0145")).rejects.toThrow(/own request/);
    await L.cancelRequest(t.as("staff"), "RL-2026-0145");
    expect((await t.req("RL-2026-0145")).closed).toBe("cancelled");
  });
});

describe("intake", () => {
  it("validates the form with the prototype's messages", async () => {
    const r = await L.submitRequest(t.as("staff"), { type: "visa", values: { trip: "annual", start: "2026-10-27", end: "2026-10-28" } });
    expect(r.errors).toEqual(["Choose the embassy the letter is for.", "Travel must start after today.", "Enter the passport number."]);
  });
  it("only the ER Lead can request on behalf of staff", async () => {
    await expect(L.submitRequest(t.as("manager"), { forEmp: "E3", type: "academic_reference", values: { institution: "Villa College" } })).rejects.toThrow(/Employee Relations Lead/);
    const r = await L.submitRequest(t.as("erl"), { forEmp: "E3", type: "academic_reference", values: { institution: "Other", institutionOther: "Island University", rejoiner: "no" } });
    const q = await t.req(r.id);
    expect(q.emp).toBe("E3"); expect(q.fields.institution).toBe("Island University");
    expect(q.trail[0].what).toBe("Submitted on behalf of Ibrahim Naseem");
  });
  it("ER Lead logs a former-staff request", async () => {
    await expect(L.logFormer(t.as("erl"), { emp: "E1", type: "release_general", via: "Letter by post" })).rejects.toThrow();
    await expect(L.logFormer(t.as("erl"), { emp: "E7", type: "release_general", via: "Letter by post", note: "" })).rejects.toThrow(/rejoined/);
    const id = await L.logFormer(t.as("erl"), { emp: "E7", type: "release_general", via: "Letter by post", note: "", rejoiner: "no" });
    const q = await t.req(id);
    expect(key(q)).toBe("er"); expect(q.trail[0].what).toBe("Logged a request received by letter by post");
  });
  it("official trip puts the requester first among attendees and drops salary", async () => {
    const r = await L.submitRequest(t.as("staff"), { type: "visa", values: { trip: "official", embassy: "Germany", event: "Forum", location: "Berlin, Germany", start: "2026-11-10", end: "2026-11-12", passport: "LA1", sponsored: true, includeSalary: true }, attendees: [{ emp: "E3", passport: "LA2" }] });
    const q = await t.req(r.id);
    expect(q.fields.attendees).toEqual([{ emp: "E1", passport: "LA1" }, { emp: "E3", passport: "LA2" }]);
    expect(q.fields.includeSalary).toBe(false);
  });
});

describe("history", () => {
  it("is append-only in the database", async () => {
    await expect(t.db.$executeRawUnsafe(`UPDATE "TrailEntry" SET "what" = 'x'`)).rejects.toThrow(/append-only/);
  });
});
