import { isTrType, SIGNERS, TYPES } from "@/domain/config";
import { sd } from "@/domain/format";
import { LibraryTable, type LibRow } from "@/components/tables";
import { gate } from "@/server/page";

export const metadata = { title: "Letter Library" };
export default async function Library() {
  const { w } = await gate("library");
  // v0.2: issued letters are listed by request ID; only letters issued before v0.2 have a document reference.
  const issued: LibRow[] = w.reqs.filter((r) => r.issuedAt && !r.closed && !isTrType(r.type)).map((r) => { const e = w.emp[r.emp]; return { key: r.id, ref: r.ref ?? "", d: r.issuedAt!, dLabel: sd(r.issuedAt!), staff: e.name, position: e.position, letter: TYPES[r.type].name, by: r.signedBy ? SIGNERS[r.signedBy].name : "", id: r.id, text: "" }; });
  const past: LibRow[] = w.library.map((l) => ({ key: l.ref, ref: l.ref, d: l.d, dLabel: sd(l.d), staff: "", position: l.position + ", " + l.unit, letter: TYPES[l.type].name, by: "", text: l.text }));
  const manual: LibRow[] = w.manual.map((m) => ({ key: m.ref, ref: m.ref, d: m.d, dLabel: sd(m.d), staff: m.staff, position: "", letter: m.letter, by: "", text: m.src }));
  const rows = [...issued, ...manual, ...past].sort((a, b) => b.d.localeCompare(a.d));
  return <>
    <div className="pg"><h2>Letter Library</h2><p>Issued Employee Relations letters and earlier letters, used as a reference for wording and role descriptions. Letters no longer carry a document reference number; references shown are from letters issued before this change.</p></div>
    <LibraryTable rows={rows} />
  </>;
}
