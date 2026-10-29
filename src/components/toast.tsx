"use client";
/* Bottom-centre toast for 3.8 s, as in the prototype. */
import * as React from "react";
const EV = "rl-toast";
export function toast(message: string) { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EV, { detail: message })); }
export function ToastHost() {
  const [msg, setMsg] = React.useState<string | null>(null);
  React.useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const on = (e: Event) => { setMsg((e as CustomEvent<string>).detail); clearTimeout(t); t = setTimeout(() => setMsg(null), 3800); };
    window.addEventListener(EV, on); return () => { window.removeEventListener(EV, on); clearTimeout(t); };
  }, []);
  return <div aria-live="polite">{msg ? <div className="toast" role="status">{msg}</div> : null}</div>;
}
