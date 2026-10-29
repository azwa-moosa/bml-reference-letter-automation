/* Loads the prototype's sample data into the database. */
import Database from "better-sqlite3";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { remapRoutes } from "../scripts/route-remap";
import { PrismaClient } from "../src/generated/prisma/client";
import { makeDraft } from "../src/domain/model";
import type { Emp, Position } from "../src/domain/types";
import { COUNTERS, EMP, LIBRARY, MANUAL_REG, POSITIONS, REQS, SIDS } from "./seed-data";

const J = (v: unknown) => (v === undefined || v === null ? null : JSON.stringify(v));

export async function seed(url = process.env.DATABASE_URL || "file:./prisma/dev.db") {
  const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
  const now = new Date();
  try {
    for (const [code, p] of Object.entries(POSITIONS)) await db.position.create({ data: { code, ...p } });
    for (const [key, e] of Object.entries(EMP)) await db.employee.create({ data: { key, sid: SIDS[key], name: e.name, first: e.first, sal: e.sal, g: e.g, nid: e.nid, posCode: e.pos, dept: e.dept, div: e.div, doj: e.doj, dor: e.dor ?? null, etype: e.etype, status: e.status, mgrKey: e.mgr ?? null, mgrName: e.mgrName ?? null, history: JSON.stringify(e.history ?? []) } });
    for (const l of LIBRARY) await db.libraryLetter.create({ data: l });
    for (const m of MANUAL_REG) await db.manualRegisterEntry.create({ data: m });
    await db.counter.create({ data: { key: "request", next: COUNTERS.request } });
    await db.counter.create({ data: { key: "reference", next: COUNTERS.reference } });
    const positions = POSITIONS as Record<string, Position>;
    for (const r of REQS) {
      const e = { ...EMP[r.emp], key: r.emp, position: positions[EMP[r.emp].pos].title } as Emp;
      // prototype mk(): draft = makeDraft(...) overlaid with any seeded draft values
      const draft = Object.assign(makeDraft(r.type, e, r.fields || {}, positions), r.draft || {});
      await db.letterRequest.create({ data: {
        id: r.id, type: r.type, empKey: r.emp, step: r.step, submitted: r.submitted, delivery: r.delivery, via: r.via ?? null,
        fields: JSON.stringify(r.fields || {}), draft: JSON.stringify(draft), salary: J(r.salary), lastSalary: J(r.lastSalary),
        returned: J(r.returned), closed: r.closed ?? null, apprReturn: J(r.apprReturn), ref: r.ref ?? null, issuedAt: r.issuedAt ?? null, signedBy: r.signedBy ?? null,
        createdAt: now, updatedAt: now,
        trail: { create: r.trail.map((t: { d: string; who: string; what: string }) => ({ ...t, role: null, at: now })) },
      } });
    }
    // Sample requests are written in the prototype's (v0.1) step numbers; move Financial/Visa to the v0.2 route.
    const file = url.replace(/^file:/, ""); const raw = new Database(file);
    try { remapRoutes(raw, { trail: false, today: "2026-10-27" }); } finally { raw.close(); }
    console.log(`[seed] ${Object.keys(EMP).length} employees, ${Object.keys(POSITIONS).length} positions, ${REQS.length} requests`);
  } finally { await db.$disconnect(); }
}
if (process.argv[1] && /seed\.ts$/.test(process.argv[1])) seed().catch((e) => { console.error(e); process.exit(1); });
