/* Applies prisma/migrations/<name>/migration.sql in order and records each
 * one in _prisma_migrations, the same table `prisma migrate deploy` uses, so
 * IT can switch to the Prisma CLI later without re-applying anything.
 * Works offline; needs no Prisma engine binary. SQLite only — for
 * PostgreSQL use `npx prisma migrate deploy` (docs/DEPLOYMENT.md). */
import Database from "better-sqlite3";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { remapRoutes } from "./route-remap";

export function migrate(file: string, log = console.log, opts: { seeding?: boolean } = {}) {
  mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" TEXT PRIMARY KEY NOT NULL, "checksum" TEXT NOT NULL, "finished_at" DATETIME, "migration_name" TEXT NOT NULL,
    "logs" TEXT, "rolled_back_at" DATETIME, "started_at" DATETIME NOT NULL DEFAULT current_timestamp, "applied_steps_count" INTEGER UNSIGNED NOT NULL DEFAULT 0)`);
  const dir = path.join(process.cwd(), "prisma", "migrations");
  const names = readdirSync(dir).filter((n) => existsSync(path.join(dir, n, "migration.sql"))).sort();
  const applied = new Set((db.prepare(`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`).all() as { migration_name: string }[]).map((r) => r.migration_name));
  let count = 0;
  for (const name of names) {
    if (applied.has(name)) continue;
    const sql = readFileSync(path.join(dir, name, "migration.sql"), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const id = randomUUID();
    const started = new Date().toISOString();
    db.transaction(() => {
      db.exec(sql);
      db.prepare(`INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, started_at, applied_steps_count) VALUES (?, ?, ?, ?, ?, 1)`).run(id, checksum, new Date().toISOString(), name, started);
    })();
    log(`[db-migrate] applied ${name}`);
    count++;
  }
  if (!count) log("[db-migrate] database is up to date");
  // v0.2 data step (idempotent): Financial/Visa requests from the v0.1 route → Total Rewards route.
  const moved = remapRoutes(db, { trail: !opts.seeding, today: process.env.APP_TODAY || new Date().toISOString().slice(0, 10) });
  if (moved) log(`[db-migrate] moved ${moved} Financial/Visa request(s) to the Total Rewards workflow`);
  db.close();
  return count;
}

if (process.argv[1] && /db-migrate/.test(process.argv[1])) {
  const raw = process.env.DATABASE_URL || "file:./prisma/dev.db";
  if (!raw.startsWith("file:")) { console.error("db-migrate handles SQLite only. Use `npx prisma migrate deploy` for PostgreSQL."); process.exit(1); }
  const p = raw.slice(5);
  migrate(path.isAbsolute(p) ? p : path.join(process.cwd(), p));
}
