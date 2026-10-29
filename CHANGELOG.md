# Changelog

## v0.2 · 29 Oct 2026

### Look and feel
- Restyled to match the restyled Employee Relations and Exit Interview apps: Inter for text, Plus Jakarta Sans for headings and figures, JetBrains Mono for technical details. BML red (`#b8141f`) is the main colour, with rose, violet and blue as secondary accents. Radii are 6/10/14/18/22 px.
- New app frame: a sticky top bar (brand, "Viewing as" selector, theme switch), a full-height sidebar, breadcrumbs, and a red hero band for page titles. The sidebar becomes a row of pill buttons on phones.
- Light, Dark and System themes. The choice is remembered in the browser, and the dark colours are the Employee Relations dark palette.
- New confirmation dialogs (approve, complete, cancel, deactivate an image), loading skeletons, empty states with icons, and status tiles.
- The letter itself is unaffected by the theme: the paper colour, letter serif, margins, signature area and PDF are fixed.

### Letter picker
- The five letters now appear in this order, two per row: Financial Reference, Job Opportunity Reference / Academic Reference, Academic Excuse / Visa. On phones they stack in the same order.
- Display names are now "Job Opportunity Reference Letter" and "Academic Reference Letter". The template files are unchanged.

### Total Rewards workflow (Financial Reference, Visa)
- These letters go to Total Rewards only. The route is Submitted → (line manager, Visa only, unchanged) → TR review → Document preparation → Completed. There is no signee approval step.
- In TR review, the team checks the request, corrects permitted fields (passport number for Visa, purpose for Financial Reference) and enters the salary where the letter quotes it. Corrections are recorded in the history without the passport number itself.
- In document preparation, the team checks a live preview, edits the embassy address, downloads a watermarked draft PDF, then completes the letter. It can also go back to review or be returned to staff for correction.
- New **Total Rewards Letters** workspace with status tiles (TR review, Document preparation, With line manager, Returned, Completed), a type filter and search.
- Employee Relations keeps the other letters and no longer sees Financial Reference or Visa letters in the Letter Inbox, Approvals or Library. Salary Information stays for Job Opportunity letters that quote a salary.
- Every action is checked on the server (role, letter type and stage). Staff still see the status of their own requests.

### Document reference numbers removed
- No new `BML/HR-####/YYYY` numbers are given. New letters, previews and PDFs have no reference line, and the Letter Library no longer shows a "next reference number".
- Internal request IDs (`RL-YYYY-####`) are unchanged.
- Historical numbers are kept: letters issued before v0.2 still show theirs, and the reference counter, manual register and library entries are kept.

### Rejoiner validation (Job Opportunity, Academic Reference, Staff Release letters)
- Mandatory Yes/No question: "Have you previously worked at BML, left the Bank, and subsequently rejoined?" It is on the staff form, the on-behalf form and the Log Former Staff form.
- A "Yes" flags the request **Rejoiner — Manual Verification Required**. It shows in the inbox and on the case with an alert.
- The ER Lead enters each earlier employment period and the rejoining date (and the last leaving date for former staff) from HR records. They then check the employment sentence used in the letter (a suggestion can be built from the periods) and confirm with an acknowledgement.
- The letter can't be sent for approval or approved until this is done. The verification, the wording and any note are written to the history.
- The service period on the Staff Release General letter is the sum of the separate periods. Continuous service is never assumed, and the master joining date is never used as the first joining date.

### Signatures and stamps
- New **Settings › Signatures & Stamps** screen for the administrator (Head of TR & ER). It covers uploading authorised signature and stamp images, deactivating and reactivating them, assigning them to each letter template, and choosing whether a signature or stamp is required to issue. Every change goes to an append-only admin log.
- ER letters use the approving signatory's own signature image. TR letters use the template's configured signature, and its signatory's name is printed.
- Images are placed in a reserved area between "Yours sincerely," and the name, scaled with their proportions kept, in both the preview and the PDF.
- The images applied are recorded on the request (asset ID and SHA-256) and in the history. Issued letters keep the images they were issued with.
- If a required image is missing, the preview shows a labelled development placeholder and issuing is blocked.
- Images are checked to be real PNG or JPEG files (up to 2 MB) and stored in the database. They are served only through permission-checked routes, never cached, and can't be edited or deleted (database triggers).

### Database
- Migration `0002_v02_tr_rejoiner_assets` is additive only. It adds `verification`, `assets` and `routeVersion` to LetterRequest, plus the tables SignatureAsset, TemplateAsset and AdminEvent, and append-only triggers.
- One-off, idempotent data step (`scripts/route-remap.ts`, run by `npm run db:migrate`): open Financial and Visa requests created under the old route are moved to the matching Total Rewards step, with a "System" history line. Issued letters keep their reference numbers.
- New sample request RL-2026-0146 (a rejoiner, Academic Reference).

### Tests
- 52 tests in total (20 new). They cover the new routes, the letter order, the TR workflow, rejoiner rules, no new references, image validation and permissions, stamp/signature blocking, PDFs with images, and upgrading a v0.1 database.
