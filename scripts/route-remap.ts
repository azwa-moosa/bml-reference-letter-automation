/* v0.2 one-off data step: Financial Reference and Visa requests created under the
 * v0.1 route (… → Total Rewards salary → ER Lead → approver → done) are moved to the
 * v0.2 Total Rewards route (… → TR review → document preparation → completed).
 * Runs after the SQL migrations; idempotent (only rows with routeVersion = 1).
 * Open requests get a history line saying where they now are. Nothing is deleted. */
import type Database from "better-sqlite3";
import { isTrType, type LetterType } from "../src/domain/config";
import { route, routeV1 } from "../src/domain/model";
import type { Fields } from "../src/domain/types";

export function newStep(type: LetterType, fields: Fields, oldStep: number, hasSalary: boolean): number {
  const r = { type, fields };
  const old = routeV1(r)[oldStep]?.k ?? "submit", next = route(r).map((s) => s.k);
  const at = (k: string) => Math.max(0, next.indexOf(k as never));
  switch (old) {
    case "submit": return 0;
    case "lm": return at("lm");
    case "tr": return at("trrev");
    case "er": return at(hasSalary ? "trdoc" : "trrev");   // salary already entered by TR → document preparation
    case "appr": return at("trdoc");                       // no signee step any more: back to TR document preparation
    default: return next.length - 1;                        // done
  }
}

export function remapRoutes(db: Database.Database, opts: { trail: boolean; today: string } = { trail: true, today: new Date().toISOString().slice(0, 10) }) {
  const rows = db.prepare(`SELECT id, type, step, fields, salary, closed FROM "LetterRequest" WHERE "routeVersion" = 1`).all() as { id: string; type: LetterType; step: number; fields: string; salary: string | null; closed: string | null }[];
  const upd = db.prepare(`UPDATE "LetterRequest" SET "step" = ?, "routeVersion" = 2, "version" = "version" + 1, "updatedAt" = ? WHERE "id" = ?`);
  const mark = db.prepare(`UPDATE "LetterRequest" SET "routeVersion" = 2 WHERE "id" = ?`);
  const log = db.prepare(`INSERT INTO "TrailEntry" ("requestId", "d", "who", "what", "role", "at") VALUES (?, ?, 'System', ?, 'system', ?)`);
  let moved = 0;
  db.transaction(() => {
    for (const r of rows) {
      if (!isTrType(r.type)) { mark.run(r.id); continue; }
      const fields = JSON.parse(r.fields || "{}") as Fields;
      const step = newStep(r.type, fields, r.step, !!r.salary);
      const now = new Date().toISOString();
      upd.run(step, now, r.id);
      const open = !r.closed && route({ type: r.type, fields })[step].k !== "done";
      if (opts.trail && open) log.run(r.id, opts.today, `Moved to the Total Rewards workflow (v0.2). Now at: ${route({ type: r.type, fields })[step].label}`, now);
      moved++;
    }
  })();
  return moved;
}
