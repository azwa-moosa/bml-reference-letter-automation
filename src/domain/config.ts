/* Directories and fixed settings, copied from the prototype.
 * These were hard-coded constants in the prototype and remain so in this
 * baseline (spec §10). Embassy addresses, institutions and signing
 * authorities are [TO CONFIRM] before go-live. */

export const EMBASSIES: Record<string, string> = {
  Australia: "Australian High Commission\n21, Srimath R. G. Senanayake Mawatha\nColombo 07\nSri Lanka",
  Canada: "High Commission of Canada\nNo. 6, Srimath R. G. Senanayake Mawatha\nColombo 07\nSri Lanka",
  France: "Embassy of France\n89, Rosmead Place\nColombo 07\nSri Lanka",
  Germany: "Consular and Visa Section\nEmbassy of the Federal Republic of Germany\n43, Temple Lane\nColombo 03\nSri Lanka",
  India: "High Commission of India\nLot No. 11499 N1 56 (E), Hithigas Magu\nGoalhi 4, Hulhumalé Phase I\nRepublic of Maldives",
  Italy: "Embassy of Italy\n55, Jawatta Road\nColombo 05\nSri Lanka",
  Japan: "Consular Section\nEmbassy of Japan in Maldives\n5th Floor, Aage Building\nBoduthakurufaanu Magu\nMalé, Republic of Maldives",
  "Saudi Arabia": "Royal Embassy of Saudi Arabia\nMTCC Sawmill Relocation Building\nBoduthakurufaanu Magu\nMalé, Republic of Maldives",
  Spain: "Embassy of Spain\n12, Prithviraj Road\nNew Delhi 110011\nIndia",
  Switzerland: "Embassy of Switzerland\n63, Srimath R. G. Senanayake Mawatha\nGregory’s Road\nColombo 07\nSri Lanka",
  "United Kingdom": "British High Commission\n389, Bauddhaloka Mawatha\nColombo 07\nSri Lanka",
  "United States": "Consular Section\nEmbassy of the United States of America\n210, Galle Road\nColombo 03\nSri Lanka",
};
export const embLabel = (c: string) => (EMBASSIES[c] ? `${c} · ${EMBASSIES[c].split("\n").find((l) => /embassy|commission/i.test(l))}` : c);

export const INSTITUTIONS = ["Avid College", "Clique College", "College of Defence and Security Studies", "Cyryx College", "Maldives Business School", "Maldives Institute of Technology", "Mandhu College", "MAPS College", "MIANZ College", "National College of Policing and Law Enforcement", "Villa College", "Zikura International College"];

export type SignerKey = "ere" | "head";
export const SIGNERS: Record<SignerKey, { name: string; title: string }> = {
  ere: { name: "Fathimath Rayya Hilmy", title: "Employee Relations & Engagement Manager" },
  head: { name: "Mariyam Shazna", title: "Head of Total Rewards & Employee Relations" },
};
export const FOOTER = "This letter is electronically generated and issued by People & Culture, Bank of Maldives PLC, and does not require a signature.";

export type LetterType = "academic_excuse" | "academic_reference" | "financial_reference" | "job_opportunity" | "visa" | "release_reference" | "release_general";
export const TYPES: Record<LetterType, { name: string; icon: string; tpl: string; use: string; route?: string }> = {
  academic_excuse: { name: "Academic Excuse Letter", icon: "calx", tpl: "Template - Academic Excuse Letter.docx", use: "Asks your college to excuse classes you missed because of work.", route: "Your line manager confirms the dates." },
  academic_reference: { name: "Academic Reference Letter", icon: "grad", tpl: "Template - Academic Reference.docx", use: "Confirms your employment for a study application.", route: "" },
  financial_reference: { name: "Financial Reference Letter", icon: "bank", tpl: "Template - Financial Reference Letter.docx", use: "Employment record with your gross salary, for loans and banks.", route: "Prepared by Total Rewards." },
  job_opportunity: { name: "Job Opportunity Reference Letter", icon: "brief", tpl: "Template - Job Opportunity Letter.docx", use: "Describes your current role, for job applications.", route: "" },
  visa: { name: "Visa Letter", icon: "plane", tpl: "Template  - Visa Letter.docx", use: "Letter to an embassy for travel on annual leave or an official trip.", route: "Your line manager confirms the dates, then Total Rewards prepares the letter." },
  release_reference: { name: "Released Staff Reference Letter", icon: "door", tpl: "Template - Release Staff Reference Letter.docx", use: "Reference with role summary for a former employee." },
  release_general: { name: "Staff Release General Reference", icon: "door", tpl: "Template - Staff Release General Reference letter.docx", use: "Employment record for a former employee." },
};
/** Letter picker order (v0.2): Financial, Job Opportunity, Academic Reference, Academic Excuse, Visa. */
export const STAFF_TYPES: LetterType[] = ["financial_reference", "job_opportunity", "academic_reference", "academic_excuse", "visa"];
export const RELEASE_TYPES: LetterType[] = ["release_reference", "release_general"];
/** v0.2: these letters are handled end to end by Total Rewards, with no separate signee approval. */
export const TR_TYPES: LetterType[] = ["financial_reference", "visa"];
export const isTrType = (t: LetterType) => TR_TYPES.includes(t);
/** v0.2: letters that ask "Have you previously worked at BML, left the Bank, and subsequently rejoined?".
 * The two release letters are both "Staff Release Reference" letters [TO CONFIRM]. */
export const REJOINER_TYPES: LetterType[] = ["job_opportunity", "academic_reference", "release_reference", "release_general"];
export const REJOINER_QUESTION = "Have you previously worked at BML, left the Bank, and subsequently rejoined?";
export const REJOINER_FLAG = "Rejoiner — Manual Verification Required";
/** Who may upload signature/stamp images and assign them to templates [ASSUMED]. */
export const ASSET_ADMIN_ROLES: RoleKey[] = ["head"];
export const RECEIVED_VIA = ["Email to Employee Relations", "Walk-in at Head Office", "Letter by post"];

/* Prototype sign-in personas ("Viewing as"). Production identity comes from
 * OneUI single sign-on [ASSUMED]; see docs/HANDOVER.md. */
export type RoleKey = "staff" | "manager" | "tr" | "erl" | "ere" | "head";
export const ROLES: Record<RoleKey, { label: string; short: string; name: string; emp: string; meta: string; portal: string; home: string }> = {
  staff: { label: "Staff", short: "Staff", name: "Aminath Shifa", emp: "E1", meta: "Card Operations Officer, Card Operations Unit · Operations", portal: "ESS Portal", home: "/letters" },
  manager: { label: "Line manager", short: "Line manager", name: "Hassan Rasheed", emp: "E2", meta: "Manager, Card Operations · line manager of Aminath Shifa and Ibrahim Naseem", portal: "ESS Portal", home: "/team" },
  tr: { label: "Total Rewards team", short: "Total Rewards", name: "Aishath Reema", emp: "E11", meta: "Total Rewards Officer · People & Culture", portal: "HR Workspace", home: "/tr" },
  erl: { label: "Employee Relations Lead", short: "Employee Relations Lead", name: "Shaheem Ali", emp: "E10", meta: "Employee Relations Lead · People & Culture", portal: "HR Workspace", home: "/inbox" },
  ere: { label: "ER & Engagement Manager", short: "ER & Engagement Manager", name: "Fathimath Rayya Hilmy", emp: "E12", meta: "Employee Relations & Engagement Manager · People & Culture", portal: "HR Workspace", home: "/approve" },
  head: { label: "Head of Total Rewards & ER", short: "Head of TR & ER", name: "Mariyam Shazna", emp: "E13", meta: "Head of Total Rewards & Employee Relations · People & Culture", portal: "HR Workspace", home: "/approve" },
};
export const ROLE_KEYS = Object.keys(ROLES) as RoleKey[];
export const isRole = (k: unknown): k is RoleKey => typeof k === "string" && k in ROLES;
