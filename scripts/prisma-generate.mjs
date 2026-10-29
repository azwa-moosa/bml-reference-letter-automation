/* Generates the Prisma client.
 * Prisma 7 generates the client with WebAssembly, but the CLI still tries to
 * download its native schema engine first. On networks where
 * binaries.prisma.sh is blocked, we retry with a stub engine path, which is
 * safe because `prisma generate` does not execute the schema engine.
 * Migrations are applied by scripts/db-migrate.ts (plain SQL), so the native
 * engine is never required to run the app locally. */
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, chmodSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

if (!existsSync("prisma/schema.prisma")) process.exit(0);
const run = (env) => spawnSync("npx", ["prisma", "generate"], { stdio: "pipe", env: { ...process.env, ...env }, shell: process.platform === "win32" });
let r = run({});
if (r.status !== 0) {
  const out = String(r.stderr) + String(r.stdout);
  if (/binaries\.prisma\.sh|engine file|checksum/i.test(out)) {
    const dir = mkdtempSync(join(tmpdir(), "rl-prisma-"));
    const stub = join(dir, process.platform === "win32" ? "schema-engine.cmd" : "schema-engine");
    writeFileSync(stub, process.platform === "win32" ? "@echo schema engine unavailable offline 1>&2\r\n@exit /b 1\r\n" : "#!/bin/sh\necho 'schema engine unavailable offline' >&2\nexit 1\n");
    chmodSync(stub, 0o755);
    console.log("[prisma-generate] Engine download blocked; generating the client offline.");
    r = run({ PRISMA_SCHEMA_ENGINE_BINARY: stub, PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING: "1" });
  }
}
process.stdout.write(String(r.stdout));
if (r.status !== 0) { process.stderr.write(String(r.stderr)); process.exit(r.status ?? 1); }
