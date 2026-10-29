/* Small shared pieces matching the prototype markup. */
import Link from "next/link";
import { TYPES, type LetterType } from "@/domain/config";
import { status, type TimelineItem } from "@/domain/model";
import { sd } from "@/domain/format";
import type { Emp, Req, Trail } from "@/domain/types";
import { Icon } from "./icon";

export const Pill = ({ r, staff }: { r: Req; staff?: boolean }) => { const [l, t] = status(r, staff); return <span className={`pill p-${t}`}>{l}</span>; };
/** Colour per letter: BML red for ER letters, blue for Total Rewards letters, violet/rose for academic. */
export const TYPE_TONE: Record<LetterType, string> = { financial_reference: "blue", visa: "blue", job_opportunity: "red", academic_reference: "violet", academic_excuse: "rose", release_reference: "grey", release_general: "grey" };
export const Tile = ({ r, type }: { r?: Req; type?: LetterType }) => { const t = (type ?? r!.type); return <div className={`tile t-${TYPE_TONE[t]}`}><Icon name={TYPES[t].icon} /></div>; };
export const Empty = ({ b, s, icon = "inbox" }: { b: string; s: string; icon?: string }) => <div className="empty"><div className="ei"><Icon name={icon} size={22} /></div><b>{b}</b>{s}</div>;
export const SeniorFlag = ({ e }: { e: Emp }) => (/\b(director|chief)\b/i.test(e.position) ? <> <span className="flag"><Icon name="info" size={12} /> Director / Chief</span></> : null);
export const Back = ({ href, children }: { href: string; children: React.ReactNode }) => <div><Link className="back" href={href}><Icon name="chevL" size={16} /> {children}</Link></div>;
export const Kv = ({ rows }: { rows: [string, React.ReactNode][] }) => <dl className="kv">{rows.map(([k, v]) => <Frag key={k}><dt>{k}</dt><dd>{v}</dd></Frag>)}</dl>;
const Frag = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const TrailList = ({ trail }: { trail: Trail[] }) => <ul className="trail">{trail.map((t, i) => <li key={i}><span className="d">{sd(t.d)}</span><span className={t.who === "System" ? "sys" : ""}><b>{t.who}</b> · {t.what}</span></li>)}</ul>;
export const RejoinerFlag = () => <span className="flag violet" title="Rejoiner — Manual Verification Required"><Icon name="alert" size={12} /> Rejoiner</span>;
export const TrFlag = () => <span className="flag blue"><Icon name="wallet" size={12} /> Total Rewards</span>;
export const Timeline = ({ items }: { items: TimelineItem[] }) => (
  <ol className="timeline">{items.map((s, i) => <li key={i} className={s.cls}><span className="mk">{s.cls === "done" ? <Icon name="check" size={12} /> : null}</span><div><b className={!s.cls ? "todo-line" : ""}>{s.label}</b>{s.sub ? <span className="sub">{s.sub}</span> : null}</div></li>)}</ol>
);
export function Filters({ opts, cur, base, param = "tab" }: { opts: [string, string, number][]; cur: string; base: string; param?: string }) {
  return <div className="filters">{opts.map(([k, l, n]) => <Link key={k} className={`fbtn ${k === cur ? "on" : ""}`} href={`${base}?${param}=${k}`} scroll={false}>{l} <span className="n">{n}</span></Link>)}</div>;
}
export const ErrBox = ({ e, style }: { e?: string | null; style?: React.CSSProperties }) => (e ? <div className="err" role="alert" style={style}>{e}</div> : null);
