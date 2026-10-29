import type { LetterType, RoleKey, SignerKey } from "./config";

export interface Position { code: string; title: string; unit: string; jd: string; summary: string }
export interface Emp {
  key: string; sid: string; name: string; first: string; sal: string; g: "f" | "m"; nid: string;
  pos: string; position: string; unit: string; dept: string; div: string; doj: string; dor?: string | null;
  etype: string; status: "active" | "released"; mgr?: string | null; mgrName?: string | null; history?: string[];
}
export interface Attendee { emp: string; passport: string }
/** Request form answers plus manager-approved values (prototype r.fields). */
export interface Fields {
  institution?: string; dates?: string[]; reason?: string; purpose?: string;
  earlier?: boolean; includeSalary?: boolean; extra?: string;
  trip?: "annual" | "official"; embassy?: string; start?: string; end?: string; passport?: string;
  event?: string; location?: string; visaType?: string; sponsored?: boolean; attendees?: Attendee[];
  leaveFrom?: string; leaveTo?: string; approvedDates?: string[]; note?: string;
  /** v0.2: answer to the rejoiner question (Job Opportunity, Academic Reference, Staff Release letters). */
  rejoiner?: "yes" | "no";
}
/** v0.2: employment history checked by Employee Relations for a rejoiner. Entered by hand from HR
 * records; never derived from the employee master's single joining date. */
export interface Period { from: string; to: string }
export interface Verification {
  earlier: Period[];           // earlier employment periods, each ended by a separation
  rejoined: string;            // start of the current (or, for former staff, the last) period
  lastTo?: string;             // end of the last period (former staff only)
  statement: string;           // employment sentence used in the letter, checked by ER
  notes: string;
  ack: boolean;                // "verified against HR records"
  by?: string; d?: string;
}
/** A signature or stamp image applied to an issued letter (recorded at issue). */
export interface AssetRef { id: string; kind: "signature" | "stamp"; label: string; signer?: SignerKey | null; sha256: string; w: number; h: number }
export interface AssetMeta extends AssetRef { active: boolean; note: string; uploadedBy: string; uploadedAt: string }
export interface TemplateCfg { type: LetterType; signatureAssetId: string | null; stampAssetId: string | null; requireSignature: boolean; requireStamp: boolean; updatedBy?: string | null }
export interface Draft { signer: SignerKey | ""; addressee?: string; recipient?: string; jd?: string; jdSource?: string; extra?: string }
export interface Trail { d: string; who: string; what: string }
export interface Req {
  id: string; type: LetterType; emp: string; step: number; submitted: string; delivery: "digital" | "printed"; via?: string | null;
  fields: Fields; draft: Draft;
  salary?: { amount: number; by: string; d: string; eff?: string } | null;
  lastSalary?: { amount: number; eff: string } | null;
  returned: { by: string; note: string } | null;
  closed: "declined" | "cancelled" | null; closeBy?: string | null; closeNote?: string | null;
  apprReturn?: { by: string; note: string } | null;
  /** Legacy document reference (letters issued before v0.2 only; no new numbers are given). */
  ref?: string | null; issuedAt?: string | null; signedBy?: SignerKey | null;
  verification?: Verification | null;
  assets?: { signature?: AssetRef | null; stamp?: AssetRef | null } | null;
  trail: Trail[]; version: number;
}
export interface LibraryLetter { ref: string; d: string; type: LetterType; position: string; unit: string; text: string }
export interface ManualEntry { ref: string; d: string; staff: string; letter: string; src: string }
/** Everything the rules need, loaded once per request. */
export interface World {
  today: string; emp: Record<string, Emp>; positions: Record<string, Position>; reqs: Req[];
  library: LibraryLetter[]; manual: ManualEntry[]; refYear: string;
  assets: AssetMeta[]; templates: Partial<Record<LetterType, TemplateCfg>>;
}
export interface Viewer { role: RoleKey; emp: string; name: string }
