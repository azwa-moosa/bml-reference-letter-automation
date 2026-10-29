/* Renders the letter document model on "paper". The paper has fixed colours and
 * the letter serif, so app themes never change the document. v0.2: no reference
 * line (letters issued before v0.2 keep theirs), and a reserved band for the
 * authorised signature and stamp between "Yours sincerely," and the signatory. */
/* eslint-disable @next/next/no-img-element -- protected images from permission-checked routes; next/image would cache them */
import type { Inline, Letter } from "@/domain/letter";

function lines(s: string) { const p = s.split("\n"); return p.map((x, i) => <span key={i}>{x}{i < p.length - 1 ? <br /> : null}</span>); }
export function Inl({ c }: { c: Inline[] }) {
  return <>{c.map((x, i) => typeof x === "string" ? <span key={i}>{lines(x)}</span>
    : "f" in x ? <span key={i} className="fld">{lines(x.f)}</span>
    : "m" in x ? <mark key={i} className="miss">[{x.m}]</mark>
    : <b key={i}><Inl c={x.b} /></b>)}</>;
}
/** `reqId` lets the paper load the signature/stamp images through the permission-checked route. */
export function LetterPaper({ L, highlight, id, reqId }: { L: Letter; highlight: boolean; id?: string; reqId?: string }) {
  const m = L.marks, src = (k: "signature" | "stamp") => `/api/letters/${encodeURIComponent(reqId ?? "")}/mark/${k}`;
  const showSig = !!m.signature && !!reqId, showStamp = !!m.stamp && !!reqId;
  const phSig = !m.signature && m.requireSignature && !m.frozen, phStamp = !m.stamp && m.requireStamp && !m.frozen;
  const band = showSig || showStamp || phSig || phStamp;
  return (
    <div className="paperwrap"><div className={`paper ${highlight ? "show-fields" : ""}`} id={id}>
      <div className="lt-mast">BANK OF MALDIVES</div>
      <div className={`lt-head ${L.ref ? "" : "date-only"}`}>{L.ref ? <span>Reference No: {L.ref}</span> : null}<span>Date: {L.date}</span></div>
      {L.blocks.map((b, i) => b.k === "title" ? <div key={i} className="lt-title">{b.text}</div>
        : b.k === "p" ? <p key={i}><Inl c={b.c} /></p>
        : <div key={i} className="lt-rec">{b.rows.map((r, j) => "h" in r ? <div key={j} className="h">{r.h}</div> : <Pair key={j} l={r.l} c={r.c} />)}</div>)}
      <div className="lt-sig">Yours sincerely,
        {band ? <div className={`lt-marks ${showStamp || phStamp ? "" : "short"}`} data-testid="marks">
          {showSig ? <img className="sig" src={src("signature")} alt={`Signature: ${m.signature!.label}`} /> : phSig ? <div className="lt-ph sig" role="note">SIGNATURE NOT CONFIGURED<br />Development placeholder · issuing is blocked</div> : <span />}
          {showStamp ? <img className="stamp" src={src("stamp")} alt={`Stamp: ${m.stamp!.label}`} /> : phStamp ? <div className="lt-ph stamp" role="note">STAMP NOT<br />CONFIGURED</div> : null}
        </div> : <><br /><br /></>}
        <Inl c={L.sign} /></div>
      <div className="lt-foot">{L.footer}</div>
    </div></div>
  );
}
const Pair = ({ l, c }: { l: string; c: Inline[] }) => <><div>{l}:</div><div><Inl c={c} /></div></>;
