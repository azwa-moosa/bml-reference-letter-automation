/* v0.2 · Shows which authorised signature and stamp will be applied, or what is missing. */
import type { Letter } from "@/domain/letter";
import { Icon } from "./icon";

export function MarkState({ L, who }: { L: Letter; who: "approver" | "tr" }) {
  const m = L.marks;
  const row = (kind: "signature" | "stamp", req: boolean) => {
    const a = m[kind];
    return <div className="ms" key={kind}><div className={`tile ${a ? "t-green" : req ? "t-amber" : "t-grey"}`}><Icon name={kind === "signature" ? "pen" : "stamp"} size={15} /></div>
      <div>{a ? <><b>{a.label}</b><span className="mono" style={{ display: "block" }}>{a.id} · SHA-256 {a.sha256.slice(0, 12)}</span></>
        : <><b>{kind === "signature" ? "No authorised signature" : "No stamp"}</b><span className="hint" style={{ display: "block", color: "var(--muted)", fontSize: 12.5 }}>{req ? "Required for this template. An administrator uploads it in Settings › Signatures & Stamps." : "Optional for this template."}</span></>}</div></div>;
  };
  return <div className="card" data-testid="mark-state"><h3>Signature and stamp</h3><div className="markstate">{row("signature", m.requireSignature)}{row("stamp", m.requireStamp)}</div>
    {m.missing.length ? <div className="note warn" style={{ marginTop: 12 }}><Icon name="info" size={16} /><span>{who === "tr" ? "Completing" : "Approval"} is blocked until the {m.missing.join(" and ")} is set up.</span></div> : null}</div>;
}
