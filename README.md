# Reference Letter Automation

A working web app for Bank of Maldives People & Culture. Staff request a reference letter and follow its status.

- **Financial Reference and Visa letters** go to **Total Rewards**: TR review → document preparation → completed, with no separate signee approval. For Visa, the line manager first confirms the dates.
- **Job Opportunity, Academic Reference, Academic Excuse and Staff Release letters** go to **Employee Relations**: the ER Lead drafts and reviews, and the chosen signing authority approves.
- Letters carry the authorised signature (and stamp, if configured) and can be downloaded as a PDF. They no longer have a document reference number; internal request IDs (`RL-YYYY-####`, for example `RL-2026-0147`) remain.
- Staff who left the Bank and rejoined are flagged, and Employee Relations verifies their employment periods before the letter is issued.

What changed in v0.2 is in [CHANGELOG.md](CHANGELOG.md). What still needs real systems, authorised images or a decision is in [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md).

The baseline is Rayya's prototype and its developer handover spec, both kept unchanged in `docs/source/`. This app reproduces the prototype's screens, roles, routes, wording and letters. It also stores the data in a database and checks every action on the server. What changed, what didn't, and what still needs a decision are listed in [docs/BASELINE.md](docs/BASELINE.md).

> **Sample data only.** The people, NIDs, passports and salaries are the prototype's invented sample values. Do not put real staff data in this repository.

## Run it on your Mac

You need **Node.js 20.19 or later** (check with `node -v`; install the LTS from nodejs.org if missing) and about **2 GB of free disk space**.

> **Don't run it from Documents, Desktop or any iCloud-synced folder.** iCloud syncing makes Next.js hang at "Compiling /". Keep the project in `~/Projects`.

### Easiest: double-click
for development

```bash
mkdir -p ~/Projects && cd ~/Projects     # unzip the project here
cd bml-reference-letters
npm install        # downloads the libraries (a few minutes the first time)
npm run setup      # creates .env and the local database with the sample data
npm run dev        # starts the app with live reload at http://localhost:3000
```

Use **Viewing as (prototype sign-in)** to switch between Staff, Line manager, Total Rewards, Employee Relations Lead, ER & Engagement Manager and Head of TR & ER. This is the same switcher as in the prototype. To start again from the original sample data, run `npm run db:reset`.

### Upgrading from v0.1

Your sample data can simply be reset (`npm run db:reset`). To keep an existing database, run `npm run db:migrate` instead: it adds the new tables and columns, and moves open Financial/Visa requests to the matching Total Rewards step. Nothing is deleted, and historical reference numbers are kept.

### If it still won't start

| Symptom | Fix |
|---|---|
| Stuck at "Compiling /" | The folder is in iCloud. Move it to `~/Projects`, delete `node_modules` and `.next`, run `npm install` again |
| `ENOSPC` / "no space left" | Free up disk space (at least 2 GB) |
| `better-sqlite3` build errors during install | Use Node.js LTS (20, 22 or 24), not a newer "Current" release |
| Port 3000 already in use | Close the other Terminal running the app, or run `npx next dev -p 3001` |

## Try the full journey

0. **Head of TR & ER → Settings › Signatures & Stamps:** upload a signature for each signing authority (and a stamp if you want one), then pick the signature for the Financial Reference and Visa templates. Until then, letters that need a signature show a labelled placeholder and can't be issued. Use test images only: no real signatures in a sample system.
1. **Staff:** Reference Letters → Request a letter → Academic Reference Letter → answer the rejoiner question → Send request.
2. **Employee Relations Lead:** Letter Inbox → open the request → *Open draft to review and edit* → Send for approval. For **RL-2026-0146** (a rejoiner), first enter the employment periods and confirm the verification.
3. **ER & Engagement Manager:** Letters to Approve → open it → Approve and issue.
4. **Total Rewards team:** Total Rewards Letters → RL-2026-0139 → enter the salary → Move to document preparation → Complete and issue.
5. **Staff:** open the request → View letter / Download PDF.

Use the theme switch in the top bar for Light, Dark or System.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the app at http://localhost:3000 |
| `npm run setup` | Generate the database client and load the sample data (first time) |
| `npm run db:reset` | Delete the local database and reload the sample data |
| `npm test` | Run the 57 tests (rules, every workflow action, TR workflow, rejoiners, signatures and stamps, letters, PDF, database upgrade) |
| `npm run db:migrate` | Apply new migrations to an existing database (keeps your data; moves open Financial/Visa requests to the Total Rewards workflow) |
| `npm run typecheck` / `npm run lint` | Static checks |
| `npm run build` then `npm start` | Production build |
| `npm run check` | lint + typecheck + tests + build |

## How it's built

Next.js 16 (App Router, server actions) · React 19 · TypeScript · Prisma 7 with SQLite (PostgreSQL-ready) · pdf-lib for PDFs · Zod · Vitest. Styles: `src/app/globals.css` (shared design system with the Employee Relations and Exit Interview apps; Inter, Plus Jakarta Sans and JetBrains Mono are bundled, no internet needed).

```
src/domain/         the rules: routes, statuses, queues, menus, letter wording, rejoiner.ts, assets.ts
src/server/         database, sign-in persona, workflow actions with server checks, assets.ts (images), PDF
src/app/(app)/      one route per screen (letters, team, salary, tr, inbox, behalf, log, positions, library, approve, settings)
src/app/api/        PDF download, protected signature/stamp images, image upload
src/components/     UI pieces (shell, request form, case view, letter paper)
prisma/             schema, migration, sample data copied from the prototype
tests/unit/         Vitest tests
scripts/            migrations runner, route-remap.ts (v0.1 → v0.2 data step), reset, env setup
docs/               BASELINE.md (alignment register), HANDOVER.md (for IT), INTEGRATIONS.md, source/ (the original prototype and spec)
```

Create the empty repository on GitHub first. `.gitignore` already leaves out `node_modules`, the database, `.env` and build files.