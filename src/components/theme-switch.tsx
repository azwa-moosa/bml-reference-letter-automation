"use client";
/* Light / Dark / System switch (same control as the restyled Employee Relations app).
 * "System" removes data-theme so the device setting applies. Remembered in this browser. */
import * as React from "react";
import { Icon } from "./icon";

type Mode = "light" | "dark" | "auto";
const KEY = "rl_theme";
const read = (): Mode => { try { const v = localStorage.getItem(KEY); return v === "light" || v === "dark" ? v : "auto"; } catch { return "auto"; } };
function apply(m: Mode) {
  const el = document.documentElement;
  if (m === "auto") delete el.dataset.theme; else el.dataset.theme = m;
  const dark = m === "dark" || (m === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#121110" : "#f7f5f4");
}
let mem: Mode | null = null; const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
function remember(m: Mode) { mem = m; try { localStorage.setItem(KEY, m); } catch { /* storage blocked: still applies for this page */ } apply(m); listeners.forEach((l) => l()); }
const OPTS: { m: Mode; icon: string; label: string; title: string }[] = [{ m: "light", icon: "sun", label: "Light", title: "Light mode" }, { m: "dark", icon: "moon", label: "Dark", title: "Dark mode" }, { m: "auto", icon: "monitor", label: "System", title: "Follow device setting" }];
export function ThemeSwitch() {
  // The saved choice lives in localStorage; the server renders "System" and the client takes over after hydration.
  const mode = React.useSyncExternalStore(subscribe, () => mem ?? read(), () => "auto" as Mode);
  React.useEffect(() => {
    apply(read());
    const mq = matchMedia("(prefers-color-scheme: dark)"); const on = () => apply(mem ?? read());
    mq.addEventListener("change", on); return () => mq.removeEventListener("change", on);
  }, []);
  const set = remember;
  return <div className="theme-switch" role="group" aria-label="Colour theme">{OPTS.map((o) =>
    <button key={o.m} type="button" aria-pressed={mode === o.m} title={o.title} onClick={() => set(o.m)} data-testid={`theme-${o.m}`}><Icon name={o.icon} size={15} /><span>{o.label}</span></button>)}</div>;
}
