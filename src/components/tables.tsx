"use client";
/* Position Master and Letter Library tables with live search (prototype psearch / lsearch). */
import * as React from "react";
import { cap } from "@/domain/format";
import { ClickRow } from "./click-row";
import { SearchBox } from "./er-forms";
import { Empty } from "./ui";

export function PositionsTable({ rows }: { rows: { code: string; title: string; unit: string; summary: string; jd: string; staff: number }[] }) {
  const [s, setS] = React.useState(""); const t = s.toLowerCase();
  const list = rows.filter((p) => !t || (p.title + " " + p.unit + " " + p.summary).toLowerCase().includes(t));
  return <>
    <SearchBox id="psearch" label="Search positions" placeholder="e.g. Customer Service Assistant" value={s} onChange={setS} />
    <div className="tablewrap"><table><thead><tr><th>Position</th><th>Role summary used in letters</th><th>JD source</th><th className="num">Staff</th></tr></thead><tbody>
      {list.length ? list.map((p) => <tr key={p.code}><td><b>{p.title}</b><span className="s">{p.unit} · <span className="mono">{p.code}</span></span></td><td>{cap(p.summary)}.</td><td className="mono">{p.jd}</td><td className="num">{p.staff}</td></tr>)
        : <tr><td colSpan={4}><Empty b="No matching positions" s="Try another title or unit." /></td></tr>}
    </tbody></table></div>
  </>;
}
export interface LibRow { key: string; ref: string; d: string; dLabel: string; letter: string; staff: string; position: string; text: string; by: string; id?: string }
export function LibraryTable({ rows }: { rows: LibRow[] }) {
  const [s, setS] = React.useState(""); const t = s.toLowerCase();
  const list = rows.filter((x) => !t || Object.values(x).join(" ").toLowerCase().includes(t));
  return <>
    <div className="toolbar"><SearchBox id="lsearch" label="Search letters" placeholder="Name, position, request ID, legacy reference or wording" value={s} onChange={setS} /><span className="mono">{list.length} of {rows.length}</span></div>
    <div className="tablewrap"><table><thead><tr><th>Request / legacy ref.</th><th>Date</th><th>Letter</th><th>Staff and position</th><th>Wording or source</th></tr></thead><tbody>
      {list.length ? list.map((x) => { const cells = <><td className="num"><b>{x.id ?? x.ref}</b>{x.id && x.ref ? <span className="s">Legacy ref. {x.ref}</span> : !x.id ? <span className="s">Legacy reference</span> : null}</td><td>{x.dLabel}</td><td>{x.letter}</td><td>{x.staff}{x.staff && x.position ? <span className="s">{x.position}</span> : x.position}</td><td>{x.id ? `Issued under ${x.by}` : x.text}</td></>;
        return x.id ? <ClickRow key={x.key} href={`/inbox/${x.id}`}>{cells}</ClickRow> : <tr key={x.key}>{cells}</tr>; })
        : <tr><td colSpan={5}><Empty b="No matching letters" s="Try another search." icon="search" /></td></tr>}
    </tbody></table></div>
  </>;
}
