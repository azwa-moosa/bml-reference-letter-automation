import { defineConfig } from "prisma/config";

// DATABASE_URL defaults to the local SQLite file used for development.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: { url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" },
});
