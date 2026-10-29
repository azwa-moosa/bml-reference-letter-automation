/* Deletes the local SQLite database, re-applies migrations and loads the
 * synthetic sample data. Development only. */
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { migrate } from "./db-migrate";
import { seed } from "../prisma/seed";

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DB_RESET !== "1") throw new Error("Refusing to reset a production database.");
  const raw = process.env.DATABASE_URL || "file:./prisma/dev.db";
  if (!raw.startsWith("file:")) throw new Error("db:reset handles SQLite only.");
  const p = raw.slice(5); const file = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  for (const f of [file, file + "-wal", file + "-shm", file + "-journal"]) if (existsSync(f)) rmSync(f);
  migrate(file);
  await seed("file:" + file);
}
main().catch((e) => { console.error(e); process.exit(1); });
