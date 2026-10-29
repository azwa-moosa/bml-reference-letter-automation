/* A fresh migrated + seeded SQLite file per test file. */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { migrate } from "../../scripts/db-migrate";
import { seed } from "../../prisma/seed";
import { createPrisma } from "../../src/server/db";
import { viewerOf } from "../../src/domain/model";
import type { RoleKey } from "../../src/domain/config";
import { loadWorld } from "../../src/server/world";
import { saveTemplate, uploadAsset } from "../../src/server/assets";
import { testPng } from "./png";

export async function testDb() {
  const file = path.join(mkdtempSync(path.join(tmpdir(), "rl-test-")), "test.db");
  migrate(file, () => {});
  const log = console.log; console.log = () => {}; await seed("file:" + file); console.log = log;
  const db = createPrisma("file:" + file);
  const as = (role: RoleKey) => ({ db, viewer: viewerOf(role) });
  return {
    db, as, world: () => loadWorld(db), req: async (id: string) => (await loadWorld(db)).reqs.find((r) => r.id === id)!,
    /** Uploads a synthetic grey test image as the administrator; returns the asset id. */
    upload: async (kind: "signature" | "stamp", signer?: "ere" | "head") => (await uploadAsset(as("head"), { kind, label: `Test ${kind}${signer ? " · " + signer : ""}`, signer, note: "Test fixture (synthetic image)" }, testPng(kind === "stamp" ? 120 : 240, kind === "stamp" ? 120 : 80))).id,
    template: (type: string, cfg: Partial<{ signatureAssetId: string | null; stampAssetId: string | null; requireSignature: boolean; requireStamp: boolean }>) =>
      saveTemplate(as("head"), type, { signatureAssetId: null, stampAssetId: null, requireSignature: true, requireStamp: false, ...cfg }),
  };
}
