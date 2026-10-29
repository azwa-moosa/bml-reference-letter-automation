/* Prisma client (Prisma 7, SQLite driver adapter). See docs/ARCHITECTURE.md
 * for switching to PostgreSQL. */
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

export function databaseUrl() {
  const raw = process.env.DATABASE_URL || "file:./prisma/dev.db";
  if (!raw.startsWith("file:")) return raw;
  const p = raw.slice(5);
  return "file:" + (path.isAbsolute(p) ? p : path.join(/* turbopackIgnore: true */ process.cwd(), p));
}
export const createPrisma = (url = databaseUrl()) => new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
const g = globalThis as unknown as { __rlPrisma?: PrismaClient };
export const prisma: PrismaClient = g.__rlPrisma ?? createPrisma();
if (process.env.NODE_ENV !== "production") g.__rlPrisma = prisma;
export type Db = PrismaClient;
export type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
