"use client";
/* Confirmation dialog (native <dialog>: focus is trapped and Esc closes it).
 * Used before actions that can't be undone from the screen: issuing, completing,
 * cancelling, deactivating an image. */
import * as React from "react";
import { Icon } from "./icon";

export function Confirm({ title, body, confirm, tone = "primary", icon = "alert", onConfirm, children, disabled, testId }: {
  title: string; body: React.ReactNode; confirm: string; tone?: "primary" | "danger"; icon?: string;
  onConfirm: () => void; children: (open: () => void) => React.ReactNode; disabled?: boolean; testId?: string;
}) {
  const ref = React.useRef<HTMLDialogElement>(null);
  const [isOpen, setOpen] = React.useState(false);
  React.useEffect(() => { const d = ref.current; if (!d) return; if (isOpen && !d.open) d.showModal(); else if (!isOpen && d.open) d.close(); }, [isOpen]);
  const close = () => setOpen(false);
  return <>
    {children(() => { if (!disabled) setOpen(true); })}
    <dialog ref={ref} className="modal" aria-labelledby={testId ? `${testId}-t` : undefined} onClose={close} onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="mh"><div className={`tile ${tone === "danger" ? "t-red" : "t-blue"}`}><Icon name={icon} /></div><div><h3 id={testId ? `${testId}-t` : undefined}>{title}</h3></div></div>
      <div className="mb">{body}</div>
      <div className="mf"><button type="button" className="btn btn-g" onClick={close}>Go back</button>
        <button type="button" className={`btn ${tone === "danger" ? "btn-q" : "btn-p"}`} data-testid={testId ? `${testId}-ok` : undefined} onClick={() => { close(); onConfirm(); }}>{confirm}</button></div>
    </dialog>
  </>;
}
