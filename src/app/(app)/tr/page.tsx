import Link from "next/link";
import { TYPES } from "@/domain/config";
import { ageOf, sd } from "@/domain/format";
import { isOpen, key, route, status, summary } from "@/domain/model";
import { Icon } from "@/components/icon";
import { TrTable, type TrRow } from "@/components/tr-bits";
import { gate } from "@/server/page";

export const metadata = { title: "Total Rewards Letters" };
export default async function TrQueue({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { w, q } = await gate("tr");
  const F = [
    { k: "review", l: "TR review", tone: "k-amber", icon: "wallet", list: q.trrev() },
    { k: "prep", l: "Document preparation", tone: "k-blue", icon: "file", list: q.trdoc() },
    { k: "lm", l: "With line manager", tone: "k-violet", icon: "clock", list: q.trLm() },
    { k: "returned", l: "Returned to staff", tone: "k-rose", icon: "undo", list: q.trReturned() },
    { k: "done", l: "Completed and closed", tone: "k-green", icon: "check", list: q.trDone() },
  ];
  const f = (await searchParams).f;
  const cur = F.find((x) => x.k === f) ?? (f === "all" ? null : F[0]);
  const list = (cur ? cur.list : q.trAll()).sort((a, b) => a.submitted.localeCompare(b.submitted));
  const rows: TrRow[] = list.map((r) => { const e = w.emp[r.emp], k = key(r); return {
    id: r.id, sid: e.sid, name: e.name, letter: TYPES[r.type].name, type: r.type, summary: summary(r) || "", step: route(r)[r.step].label, status: status(r),
    age: isOpen(r) ? ageOf(r.submitted, w.today) : r.issuedAt ? sd(r.issuedAt) : "–",
    todo: !isOpen(r) || r.returned ? "" : k === "trrev" ? "Action: review and enter details" : k === "trdoc" ? "Action: prepare and complete" : "",
  }; });
  return <>
    <div className="pg"><h2>Total Rewards Letters</h2><p>Financial Reference and Visa letters. Total Rewards reviews the request, prepares the document and completes it. There is no separate signee approval.</p></div>
    <div className="kpis">{F.map((x) => <Link key={x.k} href={`/tr?f=${x.k}`} className={`kpi ${x.tone} ${cur?.k === x.k ? "on" : ""}`} scroll={false} data-testid={`kpi-${x.k}`}><span className="ki"><Icon name={x.icon} size={18} /></span><div><b className="num">{x.list.length}</b><span>{x.l}</span></div></Link>)}</div>
    <div className="split"><div className="seclabel" style={{ margin: 0 }}>{cur ? cur.l : "All Total Rewards letters"}</div><Link className="btn btn-g btn-s" href={cur ? "/tr?f=all" : "/tr"} scroll={false}>{cur ? "Show all" : "Show what needs action"}</Link></div>
    <TrTable rows={rows} />
  </>;
}
