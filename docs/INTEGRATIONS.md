# Integrations, authorised assets and configuration still required

The app runs end to end with sample data. These items need real systems, real assets or a business decision before live use. Nothing below is simulated as working: the app either shows that the item is missing or blocks the step.

## Real integrations (not connected)
| Item | Today | Needed |
|---|---|---|
| Sign-in | "Viewing as" demo switcher (signed cookie, localhost only via `start-mac.command`) | OneUI single sign-on supplying the employee ID and roles (Total Rewards, ER Lead, signing authorities, administrator). Replace `getViewer()` in `src/server/session.ts` |
| Employee master | Sample employees in the database | Feed from the HR system (MiHCM): names, NIDs, positions, joining/leaving dates |
| Employment history for rejoiners | Entered by hand by the ER Lead | Optional: separation/rehire records from the HR system to check against (the manual check stays) |
| Salary | Entered by Total Rewards | Optional payroll lookup |
| Notifications | None sent | OneUI notifications for staff, managers, TR and ER |
| Line manager / leave | From the sample data | Org chart and leave system |
| Database | SQLite file | PostgreSQL with backups (see `docs/HANDOVER.md`) |

## Authorised assets (must be supplied)
| Item | Notes |
|---|---|
| Signature images of each signing authority | Upload in Settings › Signatures & Stamps, recording who authorised each one. Without one, letters that require a signature can't be issued |
| Signatory and signature for Total Rewards letters | **[TO CONFIRM]** Which signatory's signature goes on Financial Reference and Visa letters (no signee step) |
| Official stamp image(s) | If letters are to carry a stamp |
| Bank letterhead artwork | Not supplied; the letter uses the prototype's text masthead |
| Official Word templates | Referenced by file name only; wording checked against `src/domain/letter.ts` |

## Administrator configuration and decisions
| Item | Default in v0.2 | Status |
|---|---|---|
| Who manages signatures and stamps | Head of TR & ER persona | **[ASSUMED]** |
| Signature required to issue | Yes, for every template | **[ASSUMED]**; change per template in Settings |
| Stamp required to issue | No | **[ASSUMED]** |
| Footer "…does not require a signature" | Kept unchanged | **[TO CONFIRM]** with signatures now applied (spec Q12) |
| Visa: line manager step | Kept before TR review | **[TO CONFIRM]** |
| Fields TR may correct | Passport number (Visa), purpose (Financial) | **[ASSUMED]** |
| Rejoiner question on both Staff Release letters | Asked on both release letter types | **[TO CONFIRM]** |
| Letters issued before v0.2 | Keep showing their reference number | **[TO CONFIRM]** |
| `APP_TODAY`, `REF_YEAR` | Fixed for the sample data | Leave empty for live use |
