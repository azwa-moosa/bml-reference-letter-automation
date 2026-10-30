/* Rules ported from the prototype: routes, statuses, formatting, letters. */
import { beforeAll, describe, expect, it } from "vitest";
import { dateList, fmtDate, money, rangeText, service } from "../../src/domain/format";
import { letterText, renderLetter } from "../../src/domain/letter";
import { REJOINER_FLAG } from "../../src/domain/config";
import { coreOf, navFor, route, status, staffTimeline, todoCount, viewerOf } from "../../src/domain/model";
import type { Req, World } from "../../src/domain/types";
import { testDb } from "../support/db";

let w: World;
beforeAll(async () => { w = await (await testDb()).world(); });
const R = (id: string) => w.reqs.find((r) => r.id === id)!;
const keys = (r: Pick<Req, "type" | "fields">) => route(r).map((s) => s.k).join(">");

describe("routes (spec §3.2, v0.2 Total Rewards change)", () => {
  it("keeps the Employee Relations route for ER letters", () => {
    expect(keys({ type: "academic_excuse", fields: {} })).toBe("submit>lm>er>appr>done");
    expect(keys({ type: "academic_reference", fields: {} })).toBe("submit>er>appr>done");
    expect(keys({ type: "job_opportunity", fields: {} })).toBe("submit>er>appr>done");
    expect(keys({ type: "job_opportunity", fields: { includeSalary: true } })).toBe("submit>tr>er>appr>done");
    expect(keys({ type: "release_reference", fields: {} })).toBe("submit>er>appr>done");
  });
  it("sends Financial Reference and Visa letters to Total Rewards only, with no signee step", () => {
    expect(keys({ type: "financial_reference", fields: {} })).toBe("submit>trrev>trdoc>done");
    expect(keys({ type: "visa", fields: { trip: "annual", includeSalary: true } })).toBe("submit>lm>trrev>trdoc>done");
    expect(keys({ type: "visa", fields: { trip: "official" } })).toBe("submit>lm>trrev>trdoc>done");
    for (const t of ["financial_reference", "visa"] as const) expect(keys({ type: t, fields: {} })).not.toMatch(/er|appr/);
  });
});

describe("statuses (spec §3.4)", () => {
  it("matches the seeded requests", () => {
    expect(status(R("RL-2026-0141"))).toEqual(["With line manager", "amber"]);
    expect(status(R("RL-2026-0142"))).toEqual(["TR review", "amber"]);
    expect(status(R("RL-2026-0142"), true)).toEqual(["In progress", "blue"]);
    expect(status(R("RL-2026-0133"))).toEqual(["Awaiting approval", "amber"]);
    expect(status(R("RL-2026-0136"))).toEqual(["Document preparation", "blue"]);
    expect(status(R("RL-2026-0138"))).toEqual(["Issued", "green"]);
    expect(status(R("RL-2026-0146"))).toEqual([REJOINER_FLAG, "violet"]);
    expect(status(R("RL-2026-0146"), true)).toEqual(["In progress", "blue"]);
  });
  it("staff timeline collapses the route", () => {
    expect(staffTimeline(w, R("RL-2026-0141")).map((x) => [x.label, x.cls])).toEqual([["Staff request", "done"], ["Line manager confirms the dates", "cur"], ["Letter being prepared", ""], ["Letter issued", ""]]);
    expect(staffTimeline(w, R("RL-2026-0141"))[1].sub).toBe("With Hassan Rasheed");
  });
});

describe("counts and menus (spec §4)", () => {
  it("to-do counts per role", () => {
    expect(todoCount(w, "staff")).toBe(0);
    expect(todoCount(w, "manager")).toBe(3); // 0141, 0145, 0143 at line manager
    expect(todoCount(w, "tr")).toBe(3); // 0139, 0142 at TR review; 0136 at document preparation
    expect(todoCount(w, "erl")).toBe(4); // 0140, 0144, 0137, 0146 (0136 moved to Total Rewards)
    expect(todoCount(w, "ere")).toBe(1);
    expect(todoCount(w, "head")).toBe(1);
  });
  it("Team Approvals appears for anyone with reports", () => {
    const secs = (r: Parameters<typeof viewerOf>[0]) => navFor(w, viewerOf(r)).map((s) => s.sec);
    expect(secs("staff")).toEqual(["Employee Relations"]);
    expect(secs("manager")).toContain("Manager");
    expect(secs("ere")).toContain("Manager"); // E12 manages E10
    expect(secs("tr")).not.toContain("Manager");
  });
  it("Total Rewards has its workspace; only the administrator has Settings", () => {
    const views = (r: Parameters<typeof viewerOf>[0]) => navFor(w, viewerOf(r)).flatMap((s) => s.items.map((i) => i.v));
    expect(views("tr")).toEqual(expect.arrayContaining(["tr", "salary", "letters"]));
    expect(views("head")).toContain("settings");
    for (const r of ["staff", "manager", "tr", "erl", "ere"] as const) expect(views(r)).not.toContain("settings");
  });
});

describe("formatting", () => {
  it("dates, ranges, money, service", () => {
    expect(fmtDate("2026-10-27")).toBe("27th October 2026");
    expect(dateList(["2026-10-22", "2026-10-19", "2026-10-21"])).toBe("19th, 21st and 22nd October 2026");
    expect(rangeText("2026-12-02", "2026-12-04")).toBe("2nd December to 4th December 2026");
    expect(money(24850)).toBe("MVR 24,850.00");
    expect(service("2016-03-13", "2026-10-27")).toBe("10 years 7 months");
  });
  it("extracts the reusable part of an earlier letter", () => {
    expect(coreOf("As a Customer Service Officer, you are responsible for engaging closely with customers.")).toBe("responsible for engaging closely with customers");
  });
});

describe("letters (spec §7)", () => {
  it("a letter issued before v0.2 keeps its reference number; new letters have none", () => {
    const L = renderLetter(w, R("RL-2026-0138"));
    expect(L.miss).toEqual([]);
    const t = letterText(L);
    expect(t).toContain("Reference No: BML/HR-2462/2026");
    for (const id of ["RL-2026-0140", "RL-2026-0136", "RL-2026-0145", "RL-2026-0137"]) { const n = renderLetter(w, R(id)); expect(n.ref).toBeNull(); expect(letterText(n)).not.toMatch(/Reference No|BML\/HR-/); }
  });
  it("issued Academic Reference renders without missing fields", () => {
    const t = letterText(renderLetter(w, R("RL-2026-0138")));
    expect(t).toContain("This is to confirm that Ms. Aminath Shifa (NID: A098765) has been employed with Bank of Maldives PLC since 13th March 2016.");
    expect(t).toContain("ER & Engagement Manager (Sample)");
  });
  it("financial reference is missing the salary until Total Rewards enters it, and a signatory until one is configured", () => {
    expect(renderLetter(w, R("RL-2026-0139")).miss).toEqual(["signatory (template signature in Settings)", "gross salary from Total Rewards"]);
    expect(renderLetter(w, R("RL-2026-0136")).miss).toEqual(["signatory (template signature in Settings)"]);
  });
  it("Director / Chief requests start without a signing authority", () => {
    expect(R("RL-2026-0144").draft.signer).toBe("");
    expect(renderLetter(w, R("RL-2026-0144")).miss).toEqual(["signing authority"]);
  });
  it("official trip letter lists every attendee", () => {
    const t = letterText(renderLetter(w, R("RL-2026-0145")));
    expect(t).toContain("TO WHOM IT MAY CONCERN");
    expect(t).toContain("The Bank will sponsor the meeting expenses for both attendees.");
    expect(t).toContain("Surname: SHIFA");
    expect(t).toContain("Surname: NASEEM");
    expect(t).toContain("Kindly please arrange to issue Schengen VISA for the above purpose.");
  });
  it("job opportunity with earlier roles uses the first earlier position", () => {
    const t = letterText(renderLetter(w, R("RL-2026-0140")));
    expect(t).toContain("Initially you joined as a Customer Service Assistant at our BML Loan Centre and presently you are working as a Customer Service Officer at our BML Loan Centre.");
    expect(t).toContain("Dear Lamya,");
  });
});
