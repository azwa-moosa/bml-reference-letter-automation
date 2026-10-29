# Reference Letter Automation: developer handover spec

Source: `er-automation-prototype.html` (the published prototype, SHA-256 `674e8391c3a71b9a7ac5ed94b6ea60630bf99fda123c31849775fd0f80514375`).

This spec describes only what the prototype does. Anything not in the prototype is marked **[ASSUMED]**. Names in code (functions, keys, ids) are given in `code` so you can find them in the source.

The prototype is a single HTML page with all data in memory. A "Viewing as (prototype sign-in)" dropdown switches between six roles. Each role sees a mock OneUI frame: a sidebar (brand, menu sections), a top bar (breadcrumb, role label, notification bell, theme toggle) and a content area.

---

## 1. Roles and personas

There are six roles (`ROLES`). Each is tied to one employee record (`emp`) and has a home screen (`home`).

| Role key | Label in switcher | Sample person | Portal label | Home screen |
|---|---|---|---|---|
| `staff` | Staff | Aminath Shifa (E1), Card Operations Officer | OneUI ESS Portal | Reference Letters |
| `manager` | Line manager | Hassan Rasheed (E2), Manager, Card Operations | OneUI ESS Portal | Team Approvals |
| `tr` | Total Rewards team | Aishath Reema (E11), Total Rewards Officer | OneUI HR Workspace | Salary Information |
| `erl` | Employee Relations Lead | Shaheem Ali (E10), Employee Relations Lead | OneUI HR Workspace | Letter Inbox |
| `ere` | ER & Engagement Manager | Fathimath Rayya Hilmy (E12) | OneUI HR Workspace | Letters to Approve |
| `head` | Head of Total Rewards & ER | Mariyam Shazna (E13) | OneUI HR Workspace | Letters to Approve |

All names are sample data. Production identity comes from OneUI single sign-on **[ASSUMED]**.

### What each role can see and do

**Staff (every employee)**
- See their own requests (`q.mine()`: requests where `emp` is them).
- Request one of 5 letter types for themselves.
- Open a request to see a simplified progress timeline and what they asked for.
- Cancel an open request (two clicks: the button changes to "Select again to cancel the request").
- When returned: read the note, then "Update and resubmit" (reopens the form prefilled).
- When issued: "View letter" (toggle) and "Download PDF" (stub).
- Staff never see internal stages. Their statuses are only: With line manager, In progress, Returned to you, Issued or Ready for collection, Declined, Cancelled.

**Line manager**
- Everything Staff can do, through the "Reference Letters" menu.
- Team Approvals: requests at the line-manager stage where the requester's `mgr` is the signed-in employee.
  - Visa (Annual Leave): approve the leave duration. The dates are editable and default to the travel dates.
  - Visa (Official Trip): approve the trip as submitted. The dates are not editable.
  - Academic Excuse: tick the class dates they confirm. All are ticked by default, and at least one is required.
  - Any of these: Return to staff (comment required) or Decline (comment required, closes the request).
- An Approved tab lists requests where they have a history entry starting "Approved".
- The Team Approvals menu appears for any role whose employee has direct reports (`navFor()`). In the samples that is E2, and also E12 (manages E10) and E13 (manages E11 and E12).

**Total Rewards team**
- Salary Information: requests at the salary stage. The list shows only staff ID, name, letter and request number.
- Open one, enter the gross monthly salary (MVR, must be > 0) and save. This moves the request to the ER Lead.
- An "Entered by you" tab lists requests where `salary.by` is them.
- Plus "My letters".

**Employee Relations Lead**
- Letter Inbox: every request, with filter tabs.
- Open a case to see the request, staff information (from the employee master), salary (if any) and history.
- Open the draft, edit the letter-specific fields, choose the signing authority, then "Send for approval" or "Return to staff".
- Request on Behalf of Staff (any active employee, same 5 letter types).
- Log Former Staff Request (released employees only, 2 letter types).
- Position Master (read-only list in the prototype) and Letter Library (search). From a draft they can use wording from earlier letters.
- Plus "My letters" and Team Approvals if they have reports.

**ER & Engagement Manager and Head of Total Rewards & ER (approvers)**
- Letters to Approve: only requests at the approval stage where `draft.signer` equals their role key (`ere` or `head`).
- Open one to see request details, staff details, salary and history, plus a "View letter" toggle.
- Approve and issue: allocates the reference number, issues the letter and makes it visible to staff. A comment is optional.
- Return to Employee Relations Lead: comment required. The request goes back one stage.
- An "Approved by you" tab lists requests with `signedBy` equal to their role and a reference number.
- Letter Inbox: same view as the ER Lead, read-only (editing is only allowed for `erl`).
- Letter Library.
- Plus "My letters" and Team Approvals if they have reports.

---

## 2. Screens, tabs and panels

### Global chrome
- **Header**: eyebrow "Bank of Maldives · Employee Relations", title "Reference Letter Automation", tag "PROTOTYPE · example data only".
- **Viewing as dropdown** (`#roleSel`): each option shows the role label plus "(n to do)" when `todoCount(role)` > 0. Changing it resets view state and opens the role's home.
- **Who line**: name · role meta, plus a red "n to do" pill.
- **Sidebar**: brand ("OneUI ESS Portal" or "OneUI HR Workspace", "Bank of Maldives"), then menu sections from `NAV` and `navFor()`. Each item can show a red count badge (`badgeFor`). For staff, "Reference Letters" shows a "New" tag when it has no badge.
- **Staff sidebar stubs**: EmployeeVoice, Disciplinary History, PM Appeals, My PIP and My Records (manager: PM Appeals, My Records). These are links to the existing Employee Relations app. Clicking one shows a toast saying it is not in this prototype.
- **Top bar**: breadcrumb (section › view › request id or "New request"), role short label, bell, and sun (light/dark toggle).
- **Bell**: if the role has to-do items, jumps to the home screen. It shows a toast with the count, or "No new notifications".
- **Toast**: bottom-centre message for 3.8 s after actions.

### Menus per role (`NAV`)
| Role | Sections and items |
|---|---|
| staff | Employee Relations: EmployeeVoice*, Disciplinary History*, PM Appeals*, **Reference Letters**, My PIP*, My Records* (*stub) |
| manager | Employee Relations: **Reference Letters**, PM Appeals*, My Records* · Manager: **Team Approvals** |
| tr | Total Rewards: **Salary Information** · My letters: **Reference Letters** |
| erl | Reference Letters: **Letter Inbox**, **Request on Behalf of Staff**, **Log Former Staff Request** · Drafting: **Position Master**, **Letter Library** · My letters: **Reference Letters** · Manager: Team Approvals (only if they have reports) |
| ere / head | Approvals: **Letters to Approve** · Reference Letters: **Letter Inbox**, **Letter Library** · My letters: **Reference Letters** · Manager: Team Approvals (only if they have reports) |

### Screens

| Screen (view key) | Who | Purpose and contents |
|---|---|---|
| Reference Letters list (`letters`) | All | Banner "Looking for a reference letter? We're happy to help!" / "Letters will be issued within 3 working days." with a **Request a letter** button. "Your requests" table: Letter (icon and name), Request (id), Submitted, Status, chevron. Rows open the detail. Empty state: "No letter requests yet". |
| Letter picker (form step 1) | All, and ER Lead on behalf | "Which letter do you need?" (on behalf: "Which letter is needed?"). Five cards: name, one-line use, and a route note for Visa and Academic Excuse only ("Your line manager confirms the dates."). On behalf shows a note "Requesting for <name>, <position>, <unit>…". |
| Request form (form step 2) | All, and ER Lead on behalf | Fields per letter type (section 5). Shows an error list if validation fails. Buttons: Send request (or Resubmit request), Cancel. Back link: "Choose a different letter" (or "Back" when editing). |
| Request detail, staff view | All (own requests) | Title, id, submitted date, status pill. A red "Returned by …" card with the note and **Update and resubmit**. A red "Declined by …" card with the note. For printed issued letters: a note to collect from Employee Relations. **Your letter** card (issued only): View/Hide letter, Download PDF. **Progress** timeline (simplified). **What happens next** card (open requests). **Your request** field list. **Cancel this request** (open requests). |
| Team Approvals (`team`) | Line managers | Tabs: Pending (n), Approved (n). Table: Request, Staff, Letter, Submitted, Status (Pending or Approved), chevron. |
| Team approval detail | Line managers | Title "<staff> · <letter>", position, id, submitted, pill. The details card depends on the letter (section 3). Then Comment, error box, and buttons Approve leave duration / Approve official trip / Approve dates, Return to staff, Decline. The controls only appear while the request is at the manager stage and the viewer is the manager. |
| Salary Information (`salary`) | Total Rewards | Tabs: To enter (n), Entered by you (n). Table: Staff ID, Staff, Letter, Request, Status (To enter, or the amount), chevron. |
| Salary detail | Total Rewards | Staff ID, Name, Letter. Input "Gross monthly salary (MVR)" and **Save salary**. After saving, the entered amount and date are shown read-only. |
| Letter Inbox (`inbox`) | ER Lead (and approvers, read-only) | Tabs with counts: To review, With others, Returned to staff, Issued and closed, All. Table: Request (id and date), Staff (name, Director/Chief flag, position or "Former staff"), Letter (name and summary), Step (current route label), Status, Age (days since submitted; "–" when closed). Sorted oldest first. |
| Case view (inbox detail) | ER Lead (and approvers, read-only) | Title "<staff> · <letter>", id, submitted, current step, pill. Red "Returned by <approver>" card if an approver sent it back. Info note "Now at: <step>…" or "Returned to <staff> for changes." when the ER Lead can't edit. **Left column:** Request, Staff information ("Linked from the employee master": Staff ID, Name with flag, NID, Position, Unit, Department, Joined, Released or Line manager, Employment), Salary from Total Rewards (if any), Earlier letters for <position> (only with the draft open and only for letters with a role summary), History. **Right column:** Draft letter card, collapsed by default ("Open draft to review and edit" or "View letter"). When open it shows the editors, the paper preview with highlighted fields, a "Filled from records" legend and a missing-fields warning. A **Send for approval** card (ER Lead at their stage only) holds the signing authority select, Note to staff (not for former-staff letters), Send for approval (disabled while anything is missing) and Return to staff (not for former-staff letters). |
| Request on Behalf of Staff (`behalf`) | ER Lead | Staff member select (active employees: name · position · NID) and Continue. Then the same picker and form, for that employee. Submitting goes to the case in the Letter Inbox. |
| Log Former Staff Request (`log`) | ER Lead | Former employee select (released only: name · NID · released date), Letter (2 options), Received via, Note, **Log request**. Opens the new case. |
| Position Master (`positions`) | ER Lead | Search box. Table: Position (title, unit, code), Role summary used in letters, JD source (file name), Staff (count of active employees in that position). Read-only. |
| Letter Library (`library`) | ER Lead, approvers | "Next reference number" display and a search box. Table: Reference, Date, Letter, Staff and position, Wording or source. It combines letters issued in the app (clickable, open the case), the manual register entries and the earlier-letter library. |
| Letters to Approve (`approve`) | ER & Engagement Manager, Head of TR & ER | Tabs: To approve (n), Approved by you (n). Table: Request, Staff (with Director/Chief flag), Letter, Submitted, Status, chevron. |
| Approval detail | Approvers | Left: Request, Staff (Staff ID, Name, Position, Unit, Gross salary with who entered it), History. Right: letter card with View/Hide letter, then **Your decision**: Comment, Approve and issue (disabled while anything is missing), Return to Employee Relations Lead. |

---

## 3. End-to-end flows

### 3.1 Intake channels
1. **Staff self-service** in the OneUI ESS portal ("Reference Letters", then Request a letter). History: "Submitted the request in OneUI".
2. **ER Lead on behalf of a current employee** ("Request on Behalf of Staff"). History: "Submitted on behalf of <name>".
3. **ER Lead logging a former-staff request** received by email, walk-in or post ("Log Former Staff Request"). History: "Logged a request received by <channel>".

### 3.2 Route (stages) per request
The route is built per request by `route(r)` from the letter type and fields. `r.step` is the index of the current stage.

| Stage key | Label | Owner | Included when |
|---|---|---|---|
| `submit` | Staff request (or "Request logged by Employee Relations" for former-staff types) | Staff / ER Lead | Always (step 0) |
| `lm` | Line manager approves the class dates / the leave duration / the official trip | Line manager | Academic Excuse; Visa (both purposes) |
| `tr` | Total Rewards enters gross salary | Total Rewards | Financial Reference always; Job Opportunity if `includeSalary`; Visa Annual Leave if `includeSalary` (never for Official Trip) |
| `er` | Employee Relations Lead reviews (or "drafts and reviews" for Academic Reference and the former-staff types) | Employee Relations Lead | Always |
| `appr` | ER & Engagement Manager or Head of TR & ER approves | Selected signing authority | Always |
| `done` | Letter viewable to staff | none | Always (last) |

Resulting routes:

| Letter | Route |
|---|---|
| Academic Excuse | submit → lm → er → appr → done |
| Academic Reference | submit → er → appr → done |
| Financial Reference | submit → tr → er → appr → done |
| Job Opportunity | submit → (tr if salary) → er → appr → done |
| Visa, Annual Leave | submit → lm → (tr if salary) → er → appr → done |
| Visa, Official Trip | submit → lm → er → appr → done |
| Released Staff Reference | submit (logged) → er → appr → done |
| Staff Release General Reference | submit (logged) → er → appr → done |

New requests are created at `step: 1` (the first stage after submit).

### 3.3 Request state
Three things together give the state:
- `step`: the current stage index.
- `returned`: `{by, note}` or null. A returned request is still open but held with the staff member.
- `closed`: `'declined'`, `'cancelled'` or null.

`isOpen(r)` is true when the request is not closed and not at `done`.

### 3.4 Status labels (`status()`)

| Condition (checked in order) | Internal label | Staff label | Colour |
|---|---|---|---|
| closed = declined | Declined | Declined | red |
| closed = cancelled | Cancelled | Cancelled | grey |
| returned set | Returned to staff | Returned to you | red |
| stage `lm` | With line manager | With line manager | amber |
| stage `done`, delivery printed | Ready for collection | Ready for collection | green |
| stage `done`, delivery digital | Issued | Issued | green |
| any other open stage | n/a | In progress | blue |
| stage `tr` | With Total Rewards | n/a | amber |
| stage `appr` | Awaiting approval | n/a | amber |
| stage `er` (or `submit`) | With Employee Relations Lead | n/a | blue |

The staff progress timeline (`staffTimeline`) collapses the route to: Request submitted → (Line manager confirms the dates, only if there's an `lm` stage) → Letter being prepared → Letter issued. Sub-labels: submitted date; "With <manager name>"; "In progress"; "Returned to you for changes"; "<issued date> · <reference>"; "Declined" or "Cancelled".

### 3.5 Transitions (what moves a case)

| Action (button) | Who | Allowed when | Effect | History entry |
|---|---|---|---|---|
| Send request | Staff / ER Lead on behalf | Form valid | New request at step 1 | "Submitted the request in OneUI" or "Submitted on behalf of <name>" |
| Log request | ER Lead | Former employee chosen | New former-staff request at step 1, delivery digital | "Logged a request received by <channel lower-case>" |
| Approve leave duration | Line manager | Visa Annual Leave at `lm` | Saves `leaveFrom`/`leaveTo`, step + 1 | "Approved leave duration <from> to <to>" |
| Approve official trip | Line manager | Visa Official Trip at `lm` | step + 1 | "Approved the official trip, <start> to <end>" |
| Approve dates | Line manager | Academic Excuse at `lm`, ≥ 1 date ticked | Saves `approvedDates`, step + 1 | "Approved <n> of <m> class dates" |
| (optional comment on approve) | Line manager | n/a | n/a | "Comment: <text>" |
| Return to staff | Line manager | At `lm`, comment required | `returned = {by, note}` | "Returned to staff: <comment>" |
| Decline | Line manager | At `lm`, comment required | `closed = 'declined'`, `closeBy`, `closeNote` | "Declined: <comment>" |
| Save salary | Total Rewards | At `tr`, amount > 0 | `salary = {amount, by, d}`, step + 1 | "Entered gross salary MVR <amount>" |
| Send for approval | ER Lead | At `er`, nothing missing (including signing authority) | Clears `apprReturn`, step + 1 | "Reviewed the draft and sent it for approval" |
| Return to staff | ER Lead | At `er`, staff-requested types only, note required | `returned = {by: "<name>, Employee Relations", note}` | "Returned to staff: <note>" |
| Approve and issue | Selected signer | At `appr`, `draft.signer` = their role, nothing missing | `signedBy = signer`, reference allocated, `issuedAt = today`, step = done | "Comment: …" (if given), then "Approved and issued <ref>" |
| Return to Employee Relations Lead | Selected signer | At `appr`, comment required | step − 1 (back to `er`), `apprReturn = {by, note}` | "Returned to Employee Relations Lead: <comment>" |
| Update and resubmit | Requester | While returned | Fields replaced, step = 1, `returned` cleared, draft rebuilt, **salary deleted** | "Updated and resubmitted the request" |
| Cancel this request | Requester | While open (two-click confirm) | `closed = 'cancelled'` | "Cancelled the request" |

Not possible in the prototype: the ER Lead or approvers declining or cancelling; reopening a closed request; marking a printed letter as collected; reissuing or correcting an issued letter.

---

## 4. Routing rules and flags

**Who a case goes to**
- **Line manager stage**: the requester's `mgr` employee. It appears in Team Approvals for the signed-in employee whose key equals `EMP[requester].mgr`. If the requester has no `mgr` key (only a `mgrName` string), nobody in the system receives it. This affects E2, E4, E5, E6, E9 and E13 in the sample data. **[ASSUMED]** Production would resolve the manager from the HR system.
- **Official trip**: only the requester's manager approves, even when other attendees report to someone else.
- **Total Rewards stage**: the shared Total Rewards queue (no individual assignment).
- **ER Lead stage**: the shared Letter Inbox "To review" tab.
- **Approval stage**: only the person chosen as signing authority (`draft.signer`: `ere` = ER & Engagement Manager, `head` = Head of TR & ER). It defaults to `ere`, except for Director/Chief requesters.

**Flags and warnings**
- **Director / Chief flag**: `isSenior(e)` is a case-insensitive whole-word match of "director" or "chief" in the position title. Effects:
  - An amber "Director / Chief" chip on inbox rows, the case staff card and approver rows.
  - The signing authority starts blank, with a warning note: "Requested by a Director / Chief. Choose the signing authority."
  - The letter shows "[signing authority]" as missing, which blocks Send for approval until one is chosen.
- **Missing merge fields**: any required value that is empty renders as a red `[label]` placeholder. It is listed in a "Still missing: …" note, and it disables both **Send for approval** (ER Lead) and **Approve and issue** (approver). The note explains why: "The line manager has not approved yet.", "Total Rewards has not entered the salary yet." or "Fill these before sending for approval."
- **Fields from records** are highlighted yellow on drafts and in the approver's preview, with a "Filled from records" legend. There is no highlight on the staff view of an issued letter.

**Counts and badges**
- `todoCount(role)` = own returned open requests + own Team Approvals pending + the role queue (Total Rewards: salary queue; ER Lead: "To review"; approvers: their own approval queue).
- Sidebar badges: own returned requests, Team Approvals pending, Letter Inbox "To review" (ER Lead only), Salary queue, Letters to Approve.

---

## 5. Form fields

### 5.1 Request form: common rules
- Letter types available to current staff (`STAFF_TYPES`): Academic Excuse, Academic Reference, Financial Reference, Job Opportunity, Visa. Former-staff types are only available through "Log Former Staff Request".
- When a type is picked, the defaults are: `delivery: digital`, `earlier: false`, `includeSalary: false`, `trip: annual`, `sponsored: true`.
- **Copy** is a select shown **only for Visa**: `digital` = "Digital only"; `printed` = "Digital and printed (collect from Employee Relations)". Every other type is forced to `digital`.
- Labels change on behalf of someone else ("their" instead of "your", the requester's first name for the passport label).

### 5.2 Academic Excuse Letter
| Field | Key | Type | Required | Options / rules |
|---|---|---|---|---|
| Institution | `institution` | select | Yes | `INSTITUTIONS` (12) + "Other" |
| Institution name (if Other) | `institutionOther` | text | Yes if Other | Replaces `institution` on save |
| Class dates missed | `dates` | date adder → chips | ≥ 1 | Each date must be today or earlier, no duplicates, kept sorted, chips are removable |
| Work reason | `reason` | textarea | Yes | Seen by the line manager and ER only, not printed |

Institutions: Avid College, Clique College, College of Defence and Security Studies, Cyryx College, Maldives Business School, Maldives Institute of Technology, Mandhu College, MAPS College, MIANZ College, National College of Policing and Law Enforcement, Villa College, Zikura International College.

### 5.3 Academic Reference
| Field | Key | Type | Required | Options |
|---|---|---|---|---|
| Institution | `institution` | select | Yes | Same list + Other |
| Institution name (if Other) | `institutionOther` | text | Yes if Other | n/a |

### 5.4 Financial Reference Letter
| Field | Key | Type | Required | Notes |
|---|---|---|---|---|
| What is the letter for? | `purpose` | text | Yes | e.g. "Housing loan application". Internal only, not printed. |

### 5.5 Job Opportunity Letter
| Field | Key | Type | Required | Notes |
|---|---|---|---|---|
| Mention my earlier roles at the Bank | `earlier` | checkbox | No | Uses the first entry of `EMP.history` |
| Include my gross salary in the letter | `includeSalary` | checkbox | No | Adds the Total Rewards stage and a salary sentence |
| Additional information to include in the letter (optional) | `extra` | textarea | No | Becomes the editable "Additional paragraph" in the draft |

### 5.6 Visa Letter
| Field | Key | Type | Required | Shown for | Notes |
|---|---|---|---|---|---|
| Purpose | `trip` | select | Yes | Both | `annual` = Annual Leave, `official` = Official Trip. Changing it re-renders the form. |
| Embassy the letter is for | `embassy` | select | Yes | Both | 12 countries (`EMBASSIES`) shown as "Country · Embassy name", + Other |
| Embassy name (if Other) | `embassyOther` | text | Yes if Other | Both | Replaces `embassy` |
| Travel from / Travel to | `start`, `end` | date | Yes | Annual | `end` ≥ `start`; `start` must be after today |
| Passport number | `passport` | text | Yes | Annual | Typed by staff (not held in the employee master) |
| Include my gross salary in the letter | `includeSalary` | checkbox | No | Annual | Adds the Total Rewards stage |
| Event or meeting | `event` | text | Yes | Official | e.g. "Temenos Customer Forum" |
| Held in | `location` | text | Yes | Official | "City, country" |
| Event from / Event to | `start`, `end` | date | Yes | Official | Same date rules |
| Visa type (optional) | `visaType` | text | No | Official | e.g. "Schengen" |
| The Bank is sponsoring the trip expenses | `sponsored` | checkbox | No (default on) | Official | Adds the sponsorship sentence |
| <Your/Name's> passport number | `passport` | text | Yes | Official | The requester's passport |
| Other staff attending | `attendees[]` | employee select + passport text + Add | No | Official | Active employees other than the requester and those already added; both inputs needed to add; chips removable. Saved as `attendees = [{emp, passport}]`, requester first. `includeSalary` forced false. |
| Copy | `delivery` | select | Yes | Both | Digital only / Digital and printed |

Embassy countries: Australia, Canada, France, Germany, India, Italy, Japan, Saudi Arabia, Spain, Switzerland, United Kingdom, United States.

### 5.7 Line manager approval
| Field | Id | Type | Required | When |
|---|---|---|---|---|
| Leave approved from / to | `lf_<id>`, `lt_<id>` | date | Yes, to ≥ from | Visa Annual Leave (defaults to travel dates) |
| Class dates | `data-lmdate` | checkbox per date | ≥ 1 ticked | Academic Excuse (all ticked by default) |
| Comment | `lc_<id>` | textarea | Required for Return and Decline | All |

### 5.8 Total Rewards
| Field | Id | Type | Required | Rule |
|---|---|---|---|---|
| Gross monthly salary (MVR) | `ta_<id>` | number, step 0.01, min 0 | Yes | > 0 |

### 5.9 ER Lead draft and send
| Field | Draft key | Type | Applies to |
|---|---|---|---|
| Embassy address | `addressee` | textarea | Visa Annual Leave (prefilled from the embassy directory, or the typed name for Other) |
| Recipient and address | `recipient` | textarea | Academic Excuse, Academic Reference (prefilled "The Registrar\n<institution>\nMalé, Republic of Maldives") |
| Role summary | `jd` | textarea, plus "Use position master wording" and per-library "Use this wording" | Job Opportunity, Released Staff Reference |
| Additional paragraph | `extra` | textarea | Job Opportunity (prefilled from the staff's `extra`) |
| Signing authority | `signer` | select: `ere` / `head` (blank first option for Director/Chief) | All |
| Note to staff | `ern` | textarea, required to return | Staff-requested types |

`jdSource` tracks where the role summary came from: "Position master", "Earlier letter <ref>" or "Edited by Employee Relations Lead".

### 5.10 Request on behalf of staff
| Field | Id | Type | Required |
|---|---|---|---|
| Staff member | `bh_emp` | select (active employees) | Yes |

Then the same request form as above.

### 5.11 Log former staff request
| Field | Id | Type | Required | Options |
|---|---|---|---|---|
| Former employee | `rl_emp` | select (status released) | Yes | n/a |
| Letter | `rl_type` | select | Yes | Released Staff Reference Letter (with role summary); Staff Release General Reference (employment record) |
| Received via | `rl_via` | select | Yes | Email to Employee Relations; Walk-in at Head Office; Letter by post |
| Note | `rl_note` | textarea | No | n/a |

### 5.12 Approver decision
| Field | Id | Type | Required |
|---|---|---|---|
| Comment | `en_<id>` | textarea | Required to return; optional on approve |

### 5.13 Searches
Position Master (`psearch`) searches title, unit and summary. Letter Library (`lsearch`) searches every field of each row.

---

## 6. Data model (implied by the sample data)

### Employee (`EMP`, keyed E1…E13)
| Field | Type | Notes |
|---|---|---|
| key | string | E1… |
| `name` | string | Full name |
| `first` | string | Used in "Dear <first>," |
| `sal` | `Mr.` / `Ms.` | Salutation |
| `g` | `f` / `m` | Pronouns in letters |
| `sid` | string | Staff ID (set separately from `SIDS`) |
| `nid` | string | National ID |
| `pos` | FK → Position | Position title and unit come from the position master |
| `dept`, `div` | string | Department, division |
| `doj` | date | Date of joining |
| `dor` | date | Release date (former staff only) |
| `etype` | string | e.g. Permanent |
| `status` | `active` / `released` | n/a |
| `mgr` | FK → Employee | Line manager used for routing |
| `mgrName` | string | Display-only manager name when the manager is not in the data |
| `history` | Position code[] | Earlier positions; only the first is used |

Passports are not stored on the employee. They are captured per request.

### Position (`POSITIONS`, keyed by code, e.g. `CO-OFF`)
| Field | Notes |
|---|---|
| `title` | Position title printed on letters |
| `unit` | Unit/place printed on letters |
| `jd` | Source JD file name, or "Not linked yet" |
| `summary` | Approved role summary starting "responsible for …", reused in letters |

The same title can exist in several units with different summaries (e.g. Customer Service Assistant at BML Loan Centre and at BML Account Opening Centre).

### Library letter (`LIBRARY`)
`ref`, `d` (date), `type` (letter type), `position` (title), `unit`, `text` (the full "As a <title>, … responsible for …" sentence). It is matched to drafts by position title. `coreOf()` pulls out the part after "you/he/she are/is/was/were (currently)".

### Embassy (`EMBASSIES`)
Country → multi-line address. The first line containing "embassy" or "commission" is used as the dropdown label.

### Institution (`INSTITUTIONS`)
A list of names, plus a free-text "Other".

### Signing authority (`SIGNERS`)
`ere` and `head` → `{name, title}`.

### Role / user (`ROLES`)
`label`, `short`, `name`, `emp` (FK → Employee), `meta`, `portal`, `home`.

### Letter type (`TYPES`)
`name`, `icon`, `tpl` (original Word template file name), `use`, `route` (staff note).

### Request (`REQS`)
| Field | Type | Notes |
|---|---|---|
| `id` | string | `RL-2026-####` |
| `type` | letter type key | One of 7 |
| `emp` | FK → Employee | The person the letter is about |
| `step` | int | Index into `route(r)` |
| `submitted` | date | n/a |
| `delivery` | `digital` / `printed` | Printed only for visa |
| `via` | string | Former-staff intake channel |
| `fields` | object | Form answers (section 5), plus `leaveFrom`, `leaveTo` (manager-approved), `approvedDates` (manager-approved), `attendees[{emp, passport}]` |
| `draft` | object | `signer`, `addressee`, `recipient`, `jd`, `jdSource`, `extra` |
| `salary` | object | `{amount, by, d}`. Two seeds also carry an unused `eff`. |
| `lastSalary` | object | Present on one seed (RL-2026-0139), not displayed anywhere |
| `returned` | object or null | `{by, note}` |
| `closed` | `declined` / `cancelled` / null | n/a |
| `closeBy`, `closeNote` | string | On decline |
| `apprReturn` | object or null | `{by, note}`, set when an approver returns it |
| `ref` | string | `BML/HR-####/2026`, set on approval |
| `issuedAt` | date | n/a |
| `signedBy` | `ere` / `head` | n/a |
| `trail` | `[{d, who, what}]` | History / audit |

There is no "requested by" field. When the ER Lead submits on behalf of someone, it shows only in the first history entry. **[ASSUMED]** Production should store the requester separately from the subject employee.

### Manual register entry (`MANUAL_REG`)
`ref`, `d`, `staff` (name text), `letter` (name text), `src` (e.g. "Excel register (before go-live)").

### Relationships
- Employee → Position (many to one); Employee → Employee (`mgr`, many to one).
- Request → Employee (subject); Request → Employee (each attendee, official trip only).
- Request → Signing authority (`draft.signer`, `signedBy`).
- Library letter ↔ Position, matched by title.

### Counters
`nextReq = 147` (next request number) and `nextRef = 2480` (next reference number).

### Sample requests (12)
| Id | Type | Subject | State |
|---|---|---|---|
| RL-2026-0141 | Visa, Annual, salary | E1 | At line manager |
| RL-2026-0145 | Visa, Official, 2 attendees, printed | E1 (logged on behalf) | At line manager |
| RL-2026-0143 | Academic Excuse, 3 dates | E3 | At line manager |
| RL-2026-0142 | Visa, Annual, salary, printed | E3 | At Total Rewards |
| RL-2026-0139 | Financial Reference | E4 | At Total Rewards |
| RL-2026-0136 | Financial Reference | E5 | At ER Lead |
| RL-2026-0140 | Job Opportunity, earlier roles, extra text | E6 | At ER Lead |
| RL-2026-0144 | Academic Reference | E9 (Director) | At ER Lead, signer blank |
| RL-2026-0137 | Released Staff Reference | E7 (former) | At ER Lead |
| RL-2026-0133 | Job Opportunity, salary | E4 | At approval (ere) |
| RL-2026-0135 | Staff Release General | E8 (former) | At approval (head) |
| RL-2026-0138 | Academic Reference | E1 | Issued, BML/HR-2462/2026, signed by ere |

---

## 7. Generated letters

### 7.1 Common layout (all letters)
- Masthead text "BANK OF MALDIVES" (right-aligned, red). This is text only; there is no logo image.
- Header line: `Reference No: <ref>` on the left, `Date: <issued date, or today>` on the right. Before approval the reference shows a grey "BML/HR-____/2026 (given on approval)".
- Date format: ordinal day, full month, year (e.g. "27th October 2026").
- Closing: "Yours sincerely," then the signing authority's **name** (bold) and **title**. If no signer is set: a red "[signing authority]" placeholder.
- Footer (all letters): "This letter is electronically generated and issued by People & Culture, Bank of Maldives PLC, and does not require a signature."
- There is no handwritten signature, stamp or seal. The footer states none is needed.
- Pronouns come from `g` (she/her or he/him/his). The article (a/an) is chosen automatically before position titles.
- `<salutation> <full name>` = `nm`.

### 7.2 Templates and merge fields

**Academic Excuse Letter** (`Template - Academic Excuse Letter.docx`)
- Recipient block: `draft.recipient`.
- "Dear Sir/Madam,"
- "This is to inform that `<sal name>`, National Identity Card (`<nid>`), working as a/an `<position>` at our `<unit>` and currently a student at your esteemed `<College|University|School|institution>` was unable to attend classes on `<manager-approved dates>` as he/she was required to attend important work related responsibilities."
  - The institution word is picked by matching "college", "universit" or "school" in the institution name.
  - Dates in the same month print as "19th, 21st and 22nd October 2026".
- "We understand that 80% attendance is required to be eligible to sit in the exam. Therefore, we humbly request you to excuse him/her for the above mentioned classes without affecting his/her eligibility to sit for exam."

**Academic Reference** (`Template - Academic Reference.docx`)
- Recipient block: `draft.recipient`. "Dear Sir/Madam,"
- "This is to confirm that `<sal name>` (NID: `<nid>`) has been employed with Bank of Maldives PLC since `<doj>`. Currently, he/she is working as a/an `<position>` in our `<unit>`."
- "We understand that to develop professionally and improve his/her career prospects, he/she intends to pursue further education. In this regard, we believe he/she will make a valuable contribution to any endeavor he/she wishes to undertake."

**Financial Reference Letter** (`Template - Financial Reference Letter.docx`)
- Centred, underlined title "EMPLOYMENT RECORD".
- **The Employer** (fixed text): Name: Bank of Maldives PLC; Address: Head Office, No. 11, Boduthakurufaanu Magu, Male' 20094; Nature of business: Commercial Bank.
- **The Employee**: Name; Identity Card number (`nid`); Date of appointment (`doj`); Service period (years and months from `doj` to today); Present position; Place of employment (`<unit>, <dept>.`); Employment type (`etype`); Gross Salary (`MVR <amount> per month.`).

**Job Opportunity Letter** (`Template - Job Opportunity Letter.docx`)
- Address block: `<sal name>` / `<position>` / `<unit>` / `<dept>` / `<div>` / Bank of Maldives PLC. "Dear `<first>`,"
- Intro, standard: "You have been employed with Bank of Maldives PLC since `<doj>` as a/an `<position>` at our `<unit>`."
- Intro with earlier roles: "You have been employed with Bank of Maldives PLC since `<doj>`. Initially you joined as a/an `<first history title>` at our `<history unit>` and presently you are working as a/an `<position>` at our `<unit>`."
- "As a/an `<position>`, you are `<draft.jd>`."
- Optional paragraph: `<draft.extra>`.
- Optional: "Your current monthly gross salary is MVR `<amount>`." (if `includeSalary`).
- "We wish you success in your career pursuits."

**Visa Letter, Annual Leave** (`Template  - Visa Letter.docx`; note the double space in the file name)
- Addressee block: `draft.addressee` (embassy address). "Dear Sir/Madam,"
- "Please be advised that `<sal name>` holding Maldivian Passport Number `<passport>` has been employed with Bank of Maldives since `<doj>`. He/She is currently working as a/an `<position>` at our `<unit>` [and earns a monthly gross salary of MVR `<amount>` — only if `includeSalary`]."
- "We understand that he/she is applying for visa to travel during his/her Annual Leave period from `<leaveFrom, or start>` to `<leaveTo, or end>`, for which we have no objection."

**Visa Letter, Official Trip** (format labelled "Visa Letter (official trip format)", based on a sample letter, no .docx)
- Centred, underlined "TO WHOM IT MAY CONCERN". The embassy is captured but **not printed**.
- "Please be advised that the following personnel from Bank of Maldives PLC will be attending the `<event>` held in `<location>`. The event will be held from `<20th May to 22nd May 2025 style range>`. [The Bank will sponsor the meeting expenses for the attendee / both attendees / all attendees — if `sponsored`]."
- One block per attendee: Surname (last word of the name, UPPER CASE), Other Names (the rest, UPPER CASE), Job Title (position, UPPER CASE), Passport Number.
- "Kindly please arrange to issue `<visaType>` VISA for the above purpose." (the visa type is left out if blank).

**Released Staff Reference Letter** (`Template - Release Staff Reference Letter.docx`)
- Bold: "Reference letter of: `<sal name>` (NID: `<nid>`)". Centred, underlined "TO WHOM IT MAY CONCERN".
- "This is to confirm that `<sal name>` was employed with Bank of Maldives PLC from `<doj>` to `<dor>` as a/an `<position>` at our `<unit>`."
- "As a/an `<position>`, he/she was `<draft.jd>`."
- "We wish him/her success in his/her future endeavors."

**Staff Release General Reference** (`Template - Staff Release General Reference letter.docx`)
- "EMPLOYMENT RECORD", The Employer (same fixed block).
- The Employee: Name; Identity Card number; Duration (`<doj> – <dor>`); Service period (`doj` to `dor`); Job position; Place of employment (`<unit>, <dept>.`).

### 7.3 Missing-field labels that block sending
embassy address, college address, institution address, passport number, gross salary from Total Rewards, leave start, leave end, dates approved by line manager, role summary, event name, location, event dates, release date, signing authority.

---

## 8. Audit trail (history)

Each request keeps `trail[]` entries `{d: date (YYYY-MM-DD, no time), who: actor display name, what: text}`. They show as "History" on the case and approval screens and drive the line manager's "Approved" tab.

| Event | Text logged |
|---|---|
| Staff submits | Submitted the request in OneUI |
| ER Lead submits on behalf | Submitted on behalf of `<name>` |
| ER Lead logs a former-staff request | Logged a request received by `<email to employee relations / walk-in at head office / letter by post>` |
| Manager approves leave | Approved leave duration `<d Mon yyyy>` to `<d Mon yyyy>` |
| Manager approves official trip | Approved the official trip, `<start>` to `<end>` |
| Manager approves class dates | Approved `<n>` of `<m>` class dates |
| Manager, approver or anyone adding an optional comment | Comment: `<text>` |
| Manager or ER Lead returns to staff | Returned to staff: `<note>` |
| Manager declines | Declined: `<note>` |
| Total Rewards saves salary | Entered gross salary MVR `<amount>` |
| ER Lead sends for approval | Reviewed the draft and sent it for approval |
| Approver returns to ER Lead | Returned to Employee Relations Lead: `<comment>` |
| Approver approves | Approved and issued `<ref>` |
| Staff resubmits | Updated and resubmitted the request |
| Staff cancels | Cancelled the request |

**Not logged:** draft edits (addressee, recipient, role summary, additional paragraph), changes of signing authority, "Use this wording", letter views and downloads. Seed data also contains the wording "Drafted the letter and sent it for approval", which no action produces. **[ASSUMED]** Production needs timestamps, user IDs and field-level change logs.

---

## 9. Reference numbers, formats and timelines

| Item | Format | Source |
|---|---|---|
| Request number | `RL-2026-####` (4-digit, zero-padded, sequential from 147; the year is hard-coded) | `nextReq` |
| Letter reference | `BML/HR-####/2026` (sequential from 2480, allocated only on approval, never reused or skipped; the year is hard-coded) | `nextRef`, `issue()` |
| Pre-existing numbers | BML/HR-2478/2026 and BML/HR-2479/2026 from the "Excel register (before go-live)", shown in the Letter Library | `MANUAL_REG` |
| Earlier-letter library refs | e.g. BML/HR-2310/2024 (wording taken from the sample letters; most reference numbers are illustrative) | `LIBRARY` |
| Dates on letters | "27th October 2026" | `fmtDate` |
| Dates in UI | "27 Oct 2026" | `sd` |
| Currency | `MVR 24,850.00` | `money` |

**Timelines and SLAs**
- "Letters will be issued within 3 working days." is shown to staff (banner, detail page, submit toast). It is **not enforced or measured**.
- The Letter Inbox shows Age in calendar days since submission. Team Approvals shows submitted date only.
- No reminders, escalations or due dates. **[ASSUMED]** Escalation rules are needed.
- Date rules: class dates must be ≤ today; visa travel or event start must be > today; end ≥ start. There is no maximum notice period or duration.

---

## 10. Open questions and stubs

### Stubbed or fake in the prototype
- **Sign-in** is a dropdown of six fixed people. There is no authentication or authorisation; access is only enforced by which screens are shown.
- **Data** is in-memory and resets on page reload. There is no backend, persistence or concurrency control.
- **"Today"** is fixed to 2026-10-27 (`TODAY`). Request and reference years are hard-coded to 2026.
- **Download PDF** only shows a toast ("In the live app this downloads the PDF from OneUI."). No PDF/DOCX generation; the letter is an HTML preview.
- **Notifications**: the bell and toasts only. Messages such as "<name> can now view the letter" and "is notified" are not backed by any email or OneUI notification.
- **OneUI integration**: none. The sidebar mimics the ESS portal; the stub menu items link nowhere.
- **Employee master, position master, JD library, embassy directory, institution list, signing authorities** are hard-coded constants. The Position Master screen is read-only and has no approval workflow. Four People & Culture positions have JD "Not linked yet".
- **Leave records** are not checked: the manager approves dates freely, and there is no link to the leave system.
- **Salary** is typed by Total Rewards with no payroll lookup. `lastSalary` and `salary.eff` in the seed data are unused leftovers.
- **Staff IDs** come from a separate hard-coded map (`SIDS`).
- **Printed copies**: "Ready for collection" has no "collected" step.
- **Masthead** is text, not the Bank letterhead.
- **Seed data** uses invented but realistic staff names, NIDs, passport numbers and salaries. The ER & Engagement Manager's real name is used as a signing authority. Replace these before sharing.

### Behaviours to confirm
1. **Director / Chief signing authority**: the prototype only offers the ER & Engagement Manager or the Head of TR & ER. Should Director/Chief letters go to a different signing authority, and who approves in the system?
2. **Former-staff route**: Logged → ER Lead → approver was decided in the prototype, not specified. Confirm.
3. **Embassy on official trips**: it's captured but not printed (the letter is "To whom it may concern"). Is it needed?
4. **Official trip attendees**: only the requester's manager approves. Should each attendee's manager approve? Should attendees see the request in their own list?
5. **Surname**: the official trip letter takes the last word of the name. Production should use a surname field from HR.
6. **Managers not in the system**: requests from staff whose manager can't be resolved have no recipient at the line-manager stage. What is the fallback (HR resolution queue)?
7. **Resubmission**: it restarts at step 1 and deletes the salary, so the manager and Total Rewards must act again. Is that intended?
8. **ER Lead and approver powers**: they cannot decline or cancel. Is that needed? Former-staff requests cannot be returned or closed.
9. **Passport data**: staff type their own passport numbers. Should these be stored, and for how long?
10. **Corrections**: no way to correct, reissue or void an issued letter, or to void a reference number.
11. **SLA**: should "3 working days" be tracked, with reminders and escalation?
12. **Signature block**: should the approver's name and title stay above the "does not require a signature" footer?
13. **Request on behalf**: should the system record who submitted separately from the staff member, and notify the staff member?
14. **Visa salary**: Annual Leave visa salary is optional (staff choice) although the original template always quoted it. Confirm.
15. **Release types available on behalf**: the ER Lead can only raise the 5 current-staff types on behalf of someone; former-staff types go through Log Former Staff Request. Confirm.
