-- v0.2: Total Rewards workflow, rejoiner verification, signature/stamp images.
-- Additive only: no table or row is dropped, and historical reference numbers stay.
ALTER TABLE "LetterRequest" ADD COLUMN "verification" TEXT;
ALTER TABLE "LetterRequest" ADD COLUMN "assets" TEXT;
-- Existing rows were created under the v0.1 route (1); new rows default to 2.
-- scripts/db-migrate.ts remaps open Financial/Visa requests from 1 to 2 after this runs.
ALTER TABLE "LetterRequest" ADD COLUMN "routeVersion" INTEGER NOT NULL DEFAULT 1;
CREATE TABLE "SignatureAsset" (
  "id" TEXT NOT NULL PRIMARY KEY, "kind" TEXT NOT NULL, "label" TEXT NOT NULL, "signer" TEXT, "note" TEXT NOT NULL,
  "mime" TEXT NOT NULL, "data" BLOB NOT NULL, "sha256" TEXT NOT NULL, "width" INTEGER NOT NULL, "height" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true, "uploadedBy" TEXT NOT NULL, "uploadedRole" TEXT NOT NULL, "uploadedAt" DATETIME NOT NULL);
-- Images are never deleted or replaced; only "active" may change.
CREATE TRIGGER "SignatureAsset_no_delete" BEFORE DELETE ON "SignatureAsset" BEGIN SELECT RAISE(ABORT, 'Signature and stamp images are kept for audit'); END;
CREATE TRIGGER "SignatureAsset_image_fixed" BEFORE UPDATE OF "data", "sha256", "mime", "width", "height", "kind", "signer" ON "SignatureAsset" BEGIN SELECT RAISE(ABORT, 'Signature and stamp images cannot be changed'); END;
CREATE TABLE "TemplateAsset" (
  "type" TEXT NOT NULL PRIMARY KEY, "signatureAssetId" TEXT, "stampAssetId" TEXT,
  "requireSignature" BOOLEAN NOT NULL DEFAULT true, "requireStamp" BOOLEAN NOT NULL DEFAULT false, "updatedBy" TEXT, "updatedAt" DATETIME);
CREATE TABLE "AdminEvent" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "who" TEXT NOT NULL, "role" TEXT NOT NULL, "what" TEXT NOT NULL, "at" DATETIME NOT NULL);
CREATE TRIGGER "AdminEvent_no_update" BEFORE UPDATE ON "AdminEvent" BEGIN SELECT RAISE(ABORT, 'Admin log is append-only'); END;
CREATE TRIGGER "AdminEvent_no_delete" BEFORE DELETE ON "AdminEvent" BEGIN SELECT RAISE(ABORT, 'Admin log is append-only'); END;
CREATE TRIGGER "TrailEntry_no_delete" BEFORE DELETE ON "TrailEntry" BEGIN SELECT RAISE(ABORT, 'History is append-only'); END;
