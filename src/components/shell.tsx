"use client";
/* App chrome in the restyled Employee Relations layout: sticky top bar (brand,
 * "Viewing as" prototype sign-in, Light/Dark/System), full-height sidebar with
 * the OneUI portal menu, breadcrumb bar, then the page. */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { switchRole } from "@/app/actions";
import { Icon } from "./icon";
import { ThemeSwitch } from "./theme-switch";
import { toast, ToastHost } from "./toast";

export interface ShellNavItem { v: string; label: string; icon: string; stub?: boolean; badge: number }
export interface ShellProps {
  role: string; roles: { key: string; label: string; todo: number; home: string }[];
  name: string; meta: string; todo: number; portal: string; short: string; home: string;
  nav: { sec: string; items: ShellNavItem[] }[]; children: React.ReactNode;
}
const VIEWNAME: Record<string, string> = { letters: "Reference Letters", team: "Team Approvals", inbox: "Letter Inbox", behalf: "Request on Behalf of Staff", log: "Log Former Staff Request", positions: "Position Master", library: "Letter Library", salary: "Salary Information", approve: "Letters to Approve", tr: "Total Rewards Letters", settings: "Signatures & Stamps" };

export function Shell(p: ShellProps) {
  const path = usePathname(); const router = useRouter();
  const seg = path.split("/").filter(Boolean);
  const view = seg[0] ?? "";
  const secOf = p.nav.find((s) => s.items.some((i) => i.v === view));
  const crumbs = [secOf?.sec ?? "", VIEWNAME[view] ?? ""];
  if (seg[1] === "new" || (view === "behalf" && seg[1])) crumbs.push("New request");
  else if (seg[1]) crumbs.push(decodeURIComponent(seg[1]));
  const [busy, start] = React.useTransition();
  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true"><Icon name="file" size={18} /></span>
          <div><h1>Reference Letter Automation</h1><small>Bank of Maldives · People &amp; Culture</small></div>
        </div>
        <section className="rolebar" aria-label="Switch role">
          <label className="eyebrow" htmlFor="roleSel">Viewing as</label>
          <div className="roles">
            <select id="roleSel" value={p.role} disabled={busy} data-testid="role-select" aria-label="Viewing as (prototype sign-in)" onChange={(e) => { const r = e.target.value; const home = p.roles.find((x) => x.key === r)?.home ?? "/"; start(async () => { await switchRole(r); router.push(home); router.refresh(); }); }}>
              {p.roles.map((r) => <option key={r.key} value={r.key}>{r.label}{r.todo ? ` (${r.todo} to do)` : ""}</option>)}
            </select>
          </div>
          <div className="who-line"><span>{p.name} · {p.meta}</span>{p.todo ? <span className="todo">{p.todo} to do</span> : null}</div>
        </section>
        <div className="topright"><ThemeSwitch /><span className="tag" title="Prototype sign-in and sample data. Not for real staff data.">PROTOTYPE · sample data only</span></div>
      </header>
      <div className="frame">
        <aside className="side" aria-label="Portal menu">
          <div className="portal"><div className="logo"><Icon name="grid" size={16} /></div><div><b>OneUI <em>{p.portal}</em></b><small>Bank of Maldives</small></div></div>
          <div className="navwrap">{p.nav.map((s) => (
            <nav className="navsec" aria-label={s.sec} key={s.sec}><span>{s.sec}</span>
              {s.items.map((i) => i.stub
                ? <button key={i.label} className="nav stub" onClick={() => toast(`${i.label} is part of your existing Employee Relations app and is not in this module.`)}><Icon name={i.icon} /><span className="lab">{i.label}</span></button>
                : <Link key={i.v} href={"/" + i.v} className={`nav ${view === i.v ? "on" : ""}`} aria-current={view === i.v ? "page" : undefined}><Icon name={i.icon} /><span className="lab">{i.label}</span>
                    {i.v === "letters" && p.role === "staff" && !i.badge ? <span className="newtag">New</span> : null}{i.badge ? <span className="badge">{i.badge}</span> : null}</Link>)}
            </nav>))}</div>
          <div className="side-foot">Prototype sign-in. In production, OneUI single sign-on decides who you are.</div>
        </aside>
        <main className="main">
          <div className="top">
            <div className="crumb">{crumbs.filter(Boolean).map((c, i, a) => i === a.length - 1 ? <b key={i}>{c}</b> : <React.Fragment key={i}><span>{c}</span><Icon name="chevR" size={13} /></React.Fragment>)}</div>
            <span className="role">{p.short}</span>
            <button className="iconbtn" aria-label="Notifications" onClick={() => { if (p.todo) router.push(p.home); toast(p.todo ? `${p.todo} item${p.todo > 1 ? "s" : ""} waiting for you.` : "No new notifications."); }}><Icon name="bell" />{p.todo ? <span className="dot" /> : null}</button>
          </div>
          <div className="content">{p.children}</div>
        </main>
      </div>
      <ToastHost />
    </>
  );
}
