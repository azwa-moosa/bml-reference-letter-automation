import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { renderLetter } from "../../src/domain/letter";
import { renderPdf } from "../../src/server/pdf";
import { testDb } from "../support/db";

let t: Awaited<ReturnType<typeof testDb>>;
beforeAll(async () => { t = await testDb(); });

describe("database", () => {
  it("the hand-written migration has every model and column in schema.prisma", async () => {
    const src = readFileSync(path.resolve(__dirname, "../../prisma/schema.prisma"), "utf8");
    const SCALAR = /^(String|Int|Boolean|DateTime|Float|Bytes)\??$/;
    for (const m of src.matchAll(/model (\w+) \{([\s\S]*?)\n\}/g)) {
      const cols = (await t.db.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info("${m[1]}")`)).map((c) => c.name);
      for (const line of m[2].split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("//") && !l.startsWith("@@"))) {
        const [name, type] = line.split(/\s+/); if (type && SCALAR.test(type)) expect(cols, `${m[1]}.${name}`).toContain(name);
      }
    }
  });
});

describe("PDF", () => {
  it("renders every seeded letter type to a PDF", async () => {
    const w = await t.world();
    for (const r of w.reqs) {
      const bytes = await renderPdf(renderLetter(w, r), r.id);
      expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe("%PDF-");
    }
  });
});
