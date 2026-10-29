-- Reference Letter Automation: initial schema (hand-written; matches prisma/schema.prisma)
CREATE TABLE "Position" ("code" TEXT NOT NULL PRIMARY KEY, "title" TEXT NOT NULL, "unit" TEXT NOT NULL, "jd" TEXT NOT NULL, "summary" TEXT NOT NULL);
CREATE TABLE "Employee" (
  "key" TEXT NOT NULL PRIMARY KEY, "sid" TEXT NOT NULL, "name" TEXT NOT NULL, "first" TEXT NOT NULL, "sal" TEXT NOT NULL, "g" TEXT NOT NULL,
  "nid" TEXT NOT NULL, "posCode" TEXT NOT NULL, "dept" TEXT NOT NULL, "div" TEXT NOT NULL, "doj" TEXT NOT NULL, "dor" TEXT, "etype" TEXT NOT NULL,
  "status" TEXT NOT NULL, "mgrKey" TEXT, "mgrName" TEXT, "history" TEXT NOT NULL DEFAULT '[]');
CREATE UNIQUE INDEX "Employee_sid_key" ON "Employee"("sid");
CREATE TABLE "LibraryLetter" ("ref" TEXT NOT NULL PRIMARY KEY, "d" TEXT NOT NULL, "type" TEXT NOT NULL, "position" TEXT NOT NULL, "unit" TEXT NOT NULL, "text" TEXT NOT NULL);
CREATE TABLE "ManualRegisterEntry" ("ref" TEXT NOT NULL PRIMARY KEY, "d" TEXT NOT NULL, "staff" TEXT NOT NULL, "letter" TEXT NOT NULL, "src" TEXT NOT NULL);
CREATE TABLE "Counter" ("key" TEXT NOT NULL PRIMARY KEY, "next" INTEGER NOT NULL);
CREATE TABLE "LetterRequest" (
  "id" TEXT NOT NULL PRIMARY KEY, "type" TEXT NOT NULL, "empKey" TEXT NOT NULL, "step" INTEGER NOT NULL, "submitted" TEXT NOT NULL,
  "delivery" TEXT NOT NULL, "via" TEXT, "fields" TEXT NOT NULL, "draft" TEXT NOT NULL, "salary" TEXT, "lastSalary" TEXT, "returned" TEXT,
  "closed" TEXT, "closeBy" TEXT, "closeNote" TEXT, "apprReturn" TEXT, "ref" TEXT, "issuedAt" TEXT, "signedBy" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1, "createdAt" DATETIME NOT NULL, "updatedAt" DATETIME NOT NULL);
CREATE UNIQUE INDEX "LetterRequest_ref_key" ON "LetterRequest"("ref");
CREATE TABLE "TrailEntry" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "requestId" TEXT NOT NULL, "d" TEXT NOT NULL, "who" TEXT NOT NULL, "what" TEXT NOT NULL,
  "role" TEXT, "at" DATETIME NOT NULL,
  CONSTRAINT "TrailEntry_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "LetterRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE INDEX "TrailEntry_requestId_idx" ON "TrailEntry"("requestId");
-- History is append-only.
CREATE TRIGGER "TrailEntry_no_update" BEFORE UPDATE ON "TrailEntry" BEGIN SELECT RAISE(ABORT, 'History is append-only'); END;
