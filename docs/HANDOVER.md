# Handover notes (for IT)

## Architecture

```
Browser ── Next.js App Router (server components + server actions)
              │
              ├─ src/app/(app)/**      one route per screen; each checks the persona can open it
              ├─ src/app/actions.ts    one server action per user action
              └─ src/app/api/letters/[id]/pdf   PDF download
                       │
              src/server/letters.ts    workflow actions: role + stage checks, validation, version check, history
              src/server/world.ts      loads data into the prototype's shapes
              src/server/session.ts    demo persona (signed cookie)
              src/server/pdf.ts        letter PDF (pdf-lib)
                       │
              src/domain/**            pure rules and letter wording (no framework, unit-tested)
                       │
              Prisma 7 → SQLite (prisma/dev.db) / PostgreSQL
```

## Sign-in

The "Viewing as" switcher is the prototype's demo sign-in. The chosen persona is kept
in an HMAC-signed, HttpOnly cookie and resolved on the server for every page, action
and download. It is **not** authentication. In production (`NODE_ENV=production`) it is
refused unless `ALLOW_DEMO_SIGNIN=1`.

**[ASSUMED] Production:** OneUI single sign-on supplies the employee ID. Replace
`getViewer()` in `src/server/session.ts`:

- map the signed-in employee to their role or roles (Total Rewards, ER Lead, signing authorities);
- keep `emp` as their employee key.

Everything else already checks `viewer.role` and `viewer.emp` on the server.

## Data

- `Employee`, `Position`, `LibraryLetter` and `ManualRegisterEntry` hold the prototype's
  sample data. Replace them with feeds from the HR system (MiHCM) and the JD library.
- `LetterRequest` keeps the prototype's request shape. Form fields, draft, salary and
  returned notes are stored as JSON text.
- `TrailEntry` is the history. A database trigger blocks updates.
- `Counter` holds the next request number and reference number. Both are incremented
  inside the same transaction as the change, so numbers are never reused or skipped.
- Migrations are hand-written SQL (`prisma/migrations/0001_init`) applied by
  `scripts/db-migrate.ts`. `tests/unit/schema-pdf.test.ts` checks they match
  `schema.prisma`. You can switch to `prisma migrate` at any time.

### PostgreSQL

1. Set `provider = "postgresql"` in `schema.prisma`.
2. `npm i @prisma/adapter-pg pg`.
3. Use `PrismaPg` in `src/server/db.ts`.
4. Generate a baseline with `prisma migrate dev --create-only`.
5. Add the history trigger as a PL/pgSQL function.

## Security checklist before real data

- [ ] OneUI SSO in place; `ALLOW_DEMO_SIGNIN` unset; strong `APP_SECRET`
- [ ] `APP_TODAY` and `REF_YEAR` unset
- [ ] Sample data removed (`npm run db:seed` must not run in production)
- [ ] Decisions in `docs/BASELINE.md` §4 and §5 made, especially D6 (freeze issued letters), D8 (former staff) and D9 (separation of duties)
- [ ] Passport retention agreed (spec Q9)
- [ ] PostgreSQL with backups; HTTPS; nonce-based CSP (currently `'unsafe-inline'`)
- [ ] Official templates and letterhead supplied and checked against `src/domain/letter.ts`
- [ ] Authorised signature/stamp images uploaded by the administrator, with the authorisation recorded; templates assigned (docs/INTEGRATIONS.md)
- [ ] Administrator role mapped from OneUI (today: the Head of TR & ER persona) [ASSUMED]
- [ ] Image storage: images are in the `SignatureAsset` table (BLOB). In PostgreSQL use `bytea`, restrict DB access and include the table in backups

## v0.2 additions

- **Total Rewards workflow:** `trReview`, `trBackToReview`, `trReturn` and `trComplete` in `src/server/letters.ts`; screens are under `/tr`.
- **Rejoiner:** `verifyRejoiner` in `src/server/letters.ts`, rules in `src/domain/rejoiner.ts`, panel in `src/components/rejoiner-panel.tsx`.
- **Signatures and stamps:** image rules in `src/domain/assets.ts`; upload/config in `src/server/assets.ts`; routes are `POST /api/assets`, `GET /api/assets/{id}` (admin) and `GET /api/letters/{id}/mark/{signature|stamp}`, the last for viewers allowed to see the letter.
- **PDF:** `GET /api/letters/{id}/pdf`. The employee, or TR for its own completed letters, gets the final PDF; `?draft=1` gives a watermarked draft without images to the team preparing the letter.
- **Database:** `prisma/migrations/0002_v02_tr_rejoiner_assets` (additive), then `scripts/route-remap.ts`, run automatically by `db:migrate`.
- **Access:** route handlers return 403/404. Pages that a role can't open show "Not available"; the HTTP status is 200 because the layout streams first.

## Tests

`npm test` runs 52 tests (the 32 from v0.1 updated, plus `tests/unit/v02.test.ts`):

- **Routes, statuses, counts and menus:** the rules carried over from the prototype.
- **Every workflow action:** each one run as the right role and as the wrong role, including reference allocation, blocking rules, return, resubmit, decline and cancel.
- **Letter wording:** the letters render with the prototype's wording.
- **PDF:** each seeded letter type produces a PDF.
- **Schema:** the hand-written migration matches the Prisma schema.
- **History:** the database refuses edits to history rows.
