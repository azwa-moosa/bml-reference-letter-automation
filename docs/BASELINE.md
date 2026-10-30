# Baseline and alignment register

**Baseline:** `docs/source/er-automation-prototype.html` (SHA-256
`674e8391c3a71b9a7ac5ed94b6ea60630bf99fda123c31849775fd0f80514375`) and
`docs/source/er-automation-spec.md` (Rayya's developer handover spec for that file).

> **Restricted:** `docs/source/` is kept unchanged and still contains real names from the prototype. Do not edit or share it; see `docs/SOURCE-RESTRICTED.md`. The app itself uses placeholders (`config/signers.json`, `prisma/seed-data.ts`).

**Rule for this module:** keep the app, the prototype and the spec aligned. Change
behaviour only one small, recorded step at a time. Anything not in the source files is
marked **[ASSUMED]**. Anything that needs a business decision is marked **[TO CONFIRM]**.
This module is separate from the Employee Relations case-management app. The sidebar
items EmployeeVoice, Disciplinary History, PM Appeals, My PIP and My Records are only
placeholders, exactly as in the prototype.

Version: **v0.2 (29 Oct 2026)**: v0.1 (a faithful build of the prototype) plus the business changes requested on 29 Oct 2026, listed in §3a. Those changes depart from the prototype and spec on purpose; the prototype and spec in `docs/source/` are kept unchanged as the v0.1 baseline.

---

## 1. Carried over unchanged

| Area | Where in the code |
|---|---|
| 6 personas, "Viewing as" switcher, to-do counts, menus, badges, "New" tag, placeholder menu items | `src/domain/config.ts` (`ROLES`), `src/domain/model.ts` (`navFor`, `badgeFor`, `todoCount`), `src/components/shell.tsx` |
| Route per request (submit → [line manager] → [Total Rewards] → ER Lead → approver → done) | `route()` in `src/domain/model.ts` |
| Status labels and colours, staff vs internal | `status()` |
| Staff progress timeline | `staffTimeline()` |
| Queues (mine, team, ER "To review", With others, Returned, Issued and closed, salary, approvals) | `queues()` |
| All screens, tabs, tables, cards and empty states | `src/app/(app)/**` |
| Request form fields, defaults, validation messages, date adder, attendees | `src/components/request-form.tsx`, `validateForm()` in `src/server/letters.ts` |
| Line manager, Total Rewards, ER Lead, approver actions, with the same toasts and history wording | `src/server/letters.ts`, `src/app/actions.ts` |
| Director / Chief flag and blank signer | `isSenior()`, `makeDraft()` |
| Missing-field placeholders blocking Send and Approve | `renderLetter()` → `miss` |
| The 7 letters plus the official-trip format, wording unchanged | `src/domain/letter.ts` |
| Position Master, Letter Library, "Use this wording", "Use position master wording" | `src/app/(app)/positions`, `library`, `src/components/case-view.tsx` |
| Request numbers `RL-2026-####` from 147; references `BML/HR-####/2026` from 2480, allocated only on approval | `Counter` table; `submitRequest()`, `approveAndIssue()` |
| Directories: embassies, institutions, signing authorities, letter types | `src/domain/config.ts` |
| Sample employees, positions, library, manual register and the 12 requests | `prisma/seed-data.ts` (copied verbatim) |
| Styles and design tokens | `src/app/globals.css` (copied verbatim) |
| Fixed "today" of 27 Oct 2026 | `APP_TODAY` in `.env` |

## 2. Added because this is now a real app (no change to what users see)

| Change | Why |
|---|---|
| Data is stored in a database (SQLite locally) | The prototype lost everything on reload |
| Every action re-checks the role and the request's stage on the server, and screens refuse roles without a menu entry (404) | The prototype only hid buttons and menus |
| Send for approval and Approve and issue are refused on the server if anything is missing | The prototype only disabled the buttons |
| Saves use a version check, so two people can't change the same request at once | Concurrency |
| History rows also store a server timestamp and the role, and can't be edited (database trigger) | Audit **[ASSUMED]**: the spec says production needs this |
| **Download PDF** produces a real PDF of the letter | The prototype showed a toast. Who can download is unchanged: the employee the letter is about, once issued |
| Draft edits save automatically as the ER Lead types | The prototype kept them in memory. As in the prototype, they are not written to history |
| `APP_TODAY` and `REF_YEAR` are settings instead of fixed values | Spec §10 notes the hard-coded date and year |
| The light/dark choice is remembered on the device | Convenience |
| Each screen has its own address (for example `/inbox/RL-2026-0140`) | Normal web navigation |

## 3. Deliberate differences from the prototype code (follow the spec)

| # | Prototype code | This app | Basis |
|---|---|---|---|
| C1 | "Update and resubmit" prefilled the form with the manager's approved leave dates and class dates, and kept them after resubmitting | They are cleared, so the line manager approves again | Spec §3.5: "Fields replaced"; open question Q7 |
| C2 | Class dates were checked against today only in the date adder | Also checked on the server when the request is submitted | Spec §5.2 rule |

## 3a. v0.2 business changes (requested 29 Oct 2026; supersede the prototype where they differ)

| # | Change | Supersedes |
|---|---|---|
| C3 | UI restyled to the Employee Relations / Exit Interview design system; Light/Dark/System themes; letter paper unaffected | Prototype CSS (resolves D11) |
| C4 | Letter picker order: Financial, Job Opportunity, Academic Reference, Academic Excuse, Visa; renamed "Job Opportunity Reference Letter", "Academic Reference Letter" | Prototype order and names |
| C5 | Financial Reference and Visa letters: Total Rewards only (TR review → document preparation → completed), no signee approval | Spec §3.2 routes for these two letters |
| C6 | No document reference numbers on new letters; request IDs kept; letters issued before v0.2 keep theirs | Spec §6 reference numbering (spec Q10 partly moot) |
| C7 | Rejoiner question and manual verification for Job Opportunity, Academic Reference and Staff Release letters | Letters that state "employed since <joining date>" |
| C8 | Authorised signature and stamp images, per-template configuration, required-to-issue rule | Text-only signature block |

Open points created by these changes are in `docs/INTEGRATIONS.md` (marked [ASSUMED] / [TO CONFIRM]).

## 4. Prototype behaviour kept as-is but needing a decision

These are reproduced exactly so the build matches the baseline. Each one is a candidate
for a later, separate change.

| # | Behaviour | Status |
|---|---|---|
| D1 | The staff timeline's first step reads "Staff request" (spec §3.4 says "Request submitted") | **[TO CONFIRM]** which wording |
| D2 | Academic Excuse and Visa drafts fall back to the requested dates before the manager approves, so "dates approved by line manager", "leave start" and "leave end" never show as missing | **[TO CONFIRM]** |
| D3 | Two seeded former-staff history lines use wording the Log action never produces | Sample data only |
| D4 | After an approver returns a letter, then the ER Lead returns it to staff and staff resubmit, the old "Returned by <approver>" card shows again | **[TO CONFIRM]** whether to clear it on resubmit |
| D5 | Official-trip checkbox says "trip expenses" but the letter says "meeting expenses"; the date error says "Travel must start after today" for events | **[TO CONFIRM]** wording |
| D6 | Issued letters are re-drawn from current data each time: signer name, position, and the Financial Reference "Service period" (counted to today, not the issue date). v0.2 freezes the signature and stamp images at issue; the text is still re-drawn | **[TO CONFIRM]**; recommended next change is to freeze the whole letter at issue |
| D7 | On "Request on behalf", the passport label and note use the first word of the full name ("Aminath's"), not the `first` field the letters use ("Shifa") | **[TO CONFIRM]** |
| D8 | Former-staff letters show "Issued", but former staff can't sign in, and only the employee can download | **[TO CONFIRM]** how former staff receive the letter |
| D9 | No separation of duties: the ER & Engagement Manager can be the signer on her own letter; the ER Lead can draft their own; Total Rewards can enter their own salary and, in v0.2, complete their own Financial/Visa letter | **[TO CONFIRM]** |
| D10 | The manager can approve leave dates that don't cover the travel dates | **[ASSUMED]** it should cover them; **[TO CONFIRM]** |
| D11 | The prototype's colours differed from the Employee Relations app | **Resolved in v0.2 (C3)**: one shared palette. The letter masthead keeps `#b3141f` |
| D12 | Letter Library sorts across years by number, so 2024, 2025 and 2026 references mix | **[TO CONFIRM]** |
| D13 | Pronouns are only she/he (`g` = f/m) | **[TO CONFIRM]** |
| D14 | Embassy addresses, the 80% attendance sentence and the signer names are hard-coded; one signer is a real person's name | **[TO CONFIRM]** before real use |

## 5. Open questions from the spec (§10, unchanged)

1. Signing authority for Director / Chief letters
2. Former-staff route
3. Embassy on official trips (captured, not printed)
4. Official-trip attendees' own managers
5. Surname field from HR
6. Fallback when the line manager can't be resolved (E2, E4, E5, E6, E9 and E13 have none in the samples)
7. Resubmission restarts at step 1 and deletes the salary
8. ER Lead and approver decline or cancel
9. Passport storage and retention
10. Correcting, reissuing or voiding a letter or a reference number
11. Tracking the "3 working days" SLA
12. Signature block above the "does not require a signature" footer
13. Recording who submitted separately from the staff member, and notifying them
14. Visa salary optional although the original template always quoted it
15. Release types available on behalf

## 6. Not built (stubs in the prototype, still stubs)

OneUI single sign-on and OneUI notifications (no email or OneUI messages are sent), the
Bank letterhead artwork (the PDF uses the prototype's text masthead), the original Word
templates (referenced by file name only; not supplied), leave-system and payroll
lookups, the "collected" step for printed copies, and editing the Position Master.
