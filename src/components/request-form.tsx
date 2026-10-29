"use client";
/* Letter picker and request form (prototype vForm). Used for own requests,
 * "Update and resubmit", and the ER Lead's "Request on Behalf of Staff". */
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { submitRequestAction } from "@/app/actions";
import { EMBASSIES, embLabel, INSTITUTIONS, isTrType, REJOINER_QUESTION, STAFF_TYPES, TYPES, type LetterType } from "@/domain/config";
import { asksRejoiner } from "@/domain/model";
import { sd } from "@/domain/format";
import { Icon } from "./icon";
import { toast } from "./toast";
import { TYPE_TONE } from "./ui";
import { useRun } from "./use-run";

type Vals = Record<string, string | boolean>;
export interface FormProps {
  today: string;
  forEmp?: { key: string; name: string; position: string; unit: string } | null;
  colleagues: { key: string; name: string; position: string }[];
  editing?: { id: string; type: LetterType; values: Vals; dates: string[]; attendees: { emp: string; passport: string }[] } | null;
}
const DEFAULTS: Vals = { delivery: "digital", earlier: false, includeSalary: false, trip: "annual", sponsored: true };

export function RequestForm({ today, forEmp, colleagues, editing }: FormProps) {
  const router = useRouter();
  const behalf = !!forEmp;
  const [type, setType] = React.useState<LetterType | null>(editing?.type ?? null);
  const [V, setV] = React.useState<Vals>(editing ? editing.values : DEFAULTS);
  const [dates, setDates] = React.useState<string[]>(editing?.dates ?? []);
  const [att, setAtt] = React.useState<{ emp: string; passport: string }[]>(editing?.attendees ?? []);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [newDate, setNewDate] = React.useState(""); const [attEmp, setAttEmp] = React.useState(""); const [attPass, setAttPass] = React.useState("");
  const { run, pending, error } = useRun();
  const set = (k: string, v: string | boolean) => setV((o) => ({ ...o, [k]: v }));
  const str = (k: string) => (typeof V[k] === "string" ? (V[k] as string) : "");
  const you = behalf ? "their" : "your";
  const firstWord = forEmp ? forEmp.name.split(" ")[0] : "";
  const backHref = behalf ? "/behalf" : "/letters";

  const forNote = behalf ? <div className="note"><Icon name="info" size={16} /><span>Requesting for <b>{forEmp!.name}</b>, {forEmp!.position}, {forEmp!.unit}. {firstWord} is notified and can follow the request in OneUI.</span></div> : null;

  if (!type) return (
    <>
      <div><Link className="back" href={backHref}><Icon name="chevL" size={16} /> {behalf ? "Choose a different staff member" : "All requests"}</Link></div>
      <div className="pg"><h2>Which letter {behalf ? "is needed" : "do you need"}?</h2></div>{forNote}
      {/* v0.2 order: Financial, Job Opportunity / Academic Reference, Academic Excuse / Visa; one column on phones. */}
      <div className="choices" data-testid="letter-choices">{STAFF_TYPES.map((t) => (
        <button key={t} className="choice" data-testid={`pick-${t}`} onClick={() => { setType(t); setV(DEFAULTS); setErrors([]); setAtt([]); setDates([]); }}>
          <div className={`tile t-${TYPE_TONE[t]}`}><Icon name={TYPES[t].icon} /></div>
          <div><b>{TYPES[t].name}</b><span>{TYPES[t].use}</span><small><Icon name={isTrType(t) ? "wallet" : "users"} size={13} />{isTrType(t) ? "Total Rewards" : "Employee Relations"}{TYPES[t].route && !isTrType(t) ? ` · ${TYPES[t].route}` : t === "visa" ? " · line manager confirms the dates" : ""}</small></div>
        </button>))}</div>
    </>
  );

  const sel = (id: string, opts: string[], ph: string, lab?: (o: string) => string) => (
    <select id={id} value={str(id)} onChange={(e) => set(id, e.target.value)}>{ph ? <option value="">{ph}</option> : null}{opts.map((o) => <option key={o} value={o}>{lab ? lab(o) : o}</option>)}</select>
  );
  const otherBox = (k: string, ph: string) => (V[k] === "Other" ? <input type="text" id={k + "Other"} value={str(k + "Other")} placeholder={ph} autoFocus onChange={(e) => set(k + "Other", e.target.value)} /> : null);
  const check = (k: string, label: string) => <label className="check"><input type="checkbox" id={k} checked={!!V[k]} onChange={(e) => set(k, e.target.checked)} /> {label}</label>;
  const text = (k: string, ph = "") => <input type="text" id={k} value={str(k)} placeholder={ph} onChange={(e) => set(k, e.target.value)} />;
  const official = V.trip === "official";
  const others = colleagues.filter((c) => c.key !== (forEmp?.key) && !att.some((a) => a.emp === c.key));

  let fields: React.ReactNode = null;
  switch (type) {
    case "academic_excuse": fields = <>
      <div className="f"><label htmlFor="institution">Institution</label>{sel("institution", [...INSTITUTIONS, "Other"], "Choose the institution")}{otherBox("institution", "Type the institution name")}</div>
      <div className="f"><label htmlFor="newDate">Class dates missed</label>
        <div className="adder"><input type="date" id="newDate" max={today} value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <button className="btn btn-g" type="button" onClick={() => { const d = newDate; if (!d) return toast("Pick a date first."); if (d > today) return toast("Class dates must be today or earlier."); if (!dates.includes(d)) setDates([...dates, d].sort()); setNewDate(""); }}><Icon name="plus" size={16} /> Add date</button></div>
        <div className="chips">{dates.length ? dates.map((d) => <button key={d} type="button" className="chip" aria-label={`Remove ${sd(d)}`} onClick={() => setDates(dates.filter((x) => x !== d))}>{sd(d)}<span className="x"><Icon name="x" size={12} /></span></button>) : <span className="hint">No dates added yet.</span>}</div></div>
      <div className="f"><label htmlFor="reason">Work reason</label><textarea id="reason" value={str("reason")} placeholder={`What work kept ${behalf ? "them" : "you"} from class on these dates?`} onChange={(e) => set("reason", e.target.value)} /></div>
    </>; break;
    case "academic_reference": fields = <div className="f"><label htmlFor="institution">Institution</label>{sel("institution", [...INSTITUTIONS, "Other"], "Choose the institution")}{otherBox("institution", "Type the institution name")}</div>; break;
    case "financial_reference": fields = <div className="f"><label htmlFor="purpose">What is the letter for?</label>{text("purpose", "e.g. Housing loan application")}</div>; break;
    case "job_opportunity": fields = <>
      {check("earlier", `Mention ${you} earlier roles at the Bank`)}
      {check("includeSalary", `Include ${you} gross salary in the letter`)}
      <div className="f"><label htmlFor="extra">Additional information to include in the letter (optional)</label><textarea id="extra" value={str("extra")} placeholder={`e.g. a project, award or responsibility ${behalf ? "they" : "you"} would like mentioned`} onChange={(e) => set("extra", e.target.value)} /></div>
    </>; break;
    case "visa": fields = <>
      <div className="f"><label htmlFor="trip">Purpose</label><select id="trip" value={official ? "official" : "annual"} onChange={(e) => set("trip", e.target.value)}><option value="annual">Annual Leave</option><option value="official">Official Trip</option></select></div>
      <div className="f"><label htmlFor="embassy">Embassy the letter is for</label>{sel("embassy", [...Object.keys(EMBASSIES), "Other"], "Choose the country", (o) => (o === "Other" ? "Other" : embLabel(o)))}{otherBox("embassy", "Type the embassy name")}</div>
      {official ? <>
        <div className="f"><label htmlFor="event">Event or meeting</label>{text("event", "e.g. Temenos Customer Forum")}</div>
        <div className="f"><label htmlFor="location">Held in</label>{text("location", "City, country")}</div>
        <div className="two"><div className="f"><label htmlFor="start">Event from</label><input type="date" id="start" min={today} value={str("start")} onChange={(e) => set("start", e.target.value)} /></div><div className="f"><label htmlFor="end">Event to</label><input type="date" id="end" min={today} value={str("end")} onChange={(e) => set("end", e.target.value)} /></div></div>
        <div className="f"><label htmlFor="visaType">Visa type (optional)</label>{text("visaType", "e.g. Schengen")}</div>
        {check("sponsored", "The Bank is sponsoring the trip expenses")}
        <div className="f"><label htmlFor="passport">{behalf ? firstWord + "'s" : "Your"} passport number</label>{text("passport")}</div>
        <div className="f"><label htmlFor="attEmp">Other staff attending (optional)</label>
          <div className="adder"><select id="attEmp" className="in" style={{ flex: 1, minWidth: 180 }} value={attEmp} onChange={(e) => setAttEmp(e.target.value)}><option value="">Choose a colleague</option>{others.map((c) => <option key={c.key} value={c.key}>{c.name} · {c.position}</option>)}</select>
            <input type="text" id="attPass" className="in" placeholder="Their passport number" style={{ flex: 1, minWidth: 150 }} value={attPass} onChange={(e) => setAttPass(e.target.value)} />
            <button className="btn btn-g" type="button" onClick={() => { if (!attEmp || !attPass.trim()) return toast("Choose a colleague and enter their passport number."); setAtt([...att, { emp: attEmp, passport: attPass.trim() }]); setAttEmp(""); setAttPass(""); }}><Icon name="plus" size={16} /> Add</button></div>
          <div className="chips">{att.map((a) => { const c = colleagues.find((x) => x.key === a.emp); return <button key={a.emp} type="button" className="chip" aria-label={`Remove ${c?.name}`} onClick={() => setAtt(att.filter((x) => x.emp !== a.emp))}>{c?.name} · {a.passport}<span className="x"><Icon name="x" size={12} /></span></button>; })}</div></div>
      </> : <>
        <div className="two"><div className="f"><label htmlFor="start">Travel from</label><input type="date" id="start" min={today} value={str("start")} onChange={(e) => set("start", e.target.value)} /></div><div className="f"><label htmlFor="end">Travel to</label><input type="date" id="end" min={today} value={str("end")} onChange={(e) => set("end", e.target.value)} /></div></div>
        <div className="f"><label htmlFor="passport">Passport number</label>{text("passport")}</div>
        {check("includeSalary", `Include ${you} gross salary in the letter`)}
      </>}
    </>; break;
  }

  const submit = () => run(() => submitRequestAction({ forEmp: forEmp?.key ?? null, type, values: V, dates, attendees: att, editing: editing?.id ?? null }), {
    refresh: false,
    then: (r) => {
      const d = r.data as { id: string; errors?: string[]; tr?: boolean };
      if (d.errors?.length) { setErrors(d.errors); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
      // Total Rewards letters are handled outside the ER inbox, so the ER Lead returns to the staff picker.
      router.push(behalf ? (d.tr ? "/behalf" : `/inbox/${d.id}`) : `/letters/${d.id}`); router.refresh();
    },
  });
  return (
    <>
      <div>{editing ? <Link className="back" href={`/letters/${editing.id}`}><Icon name="chevL" size={16} /> Back</Link> : <button className="back" onClick={() => { setType(null); setErrors([]); }}><Icon name="chevL" size={16} /> Choose a different letter</button>}</div>
      <div className="pg"><h2>{TYPES[type].name}</h2>{TYPES[type].route ? <p>{TYPES[type].route}</p> : <p>Prepared by Employee Relations.</p>}</div>
      <div className="card"><form className="form" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
        {forNote}
        {errors.length ? <div className="err" role="alert"><b>Check these before sending:</b><ul>{errors.map((x) => <li key={x}>{x}</li>)}</ul></div> : null}
        {error ? <div className="err" role="alert">{error}</div> : null}
        {asksRejoiner(type) ? <div className="qbox" data-testid="rejoiner-q">
          <span className="lbl" id="rj-l">{behalf ? "Has the staff member previously worked at BML, left the Bank, and subsequently rejoined?" : REJOINER_QUESTION} <span className="req" aria-hidden="true" style={{ color: "var(--red)" }}>*</span></span>
          <div className="yn" role="radiogroup" aria-labelledby="rj-l" aria-required="true">
            {(["yes", "no"] as const).map((x) => <label key={x}><input type="radio" name="rejoiner" value={x} checked={V.rejoiner === x} onChange={() => set("rejoiner", x)} data-testid={`rejoiner-${x}`} /><span>{x === "yes" ? "Yes" : "No"}</span></label>)}
          </div>
          <span className="hint">{V.rejoiner === "yes" ? "Employee Relations will check each employment period against HR records before the letter is issued, so it may take a little longer." : "Required. Answer Yes if there was a break in your employment with the Bank."}</span>
        </div> : null}
        {fields}
        {type === "visa" ? <div className="f"><label htmlFor="delivery">Copy</label><select id="delivery" value={V.delivery === "printed" ? "printed" : "digital"} onChange={(e) => set("delivery", e.target.value)}><option value="digital">Digital only</option><option value="printed">Digital and printed (collect from Employee Relations)</option></select></div> : null}
        <div className="actions"><button className="btn btn-p" type="submit" disabled={pending} aria-busy={pending} data-testid="submit-request">{editing ? "Resubmit request" : "Send request"}</button>
          {editing ? <Link className="btn btn-g" href={`/letters/${editing.id}`}>Cancel</Link> : <Link className="btn btn-g" href={backHref}>Cancel</Link>}</div>
      </form></div>
    </>
  );
}
