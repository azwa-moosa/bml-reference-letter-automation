"use client";
import Link from "next/link";
import * as React from "react";
import { cancelAction } from "@/app/actions";
import type { Letter } from "@/domain/letter";
import { Confirm } from "./confirm";
import { Icon } from "./icon";
import { LetterPaper } from "./letter";
import { useRun } from "./use-run";

/** "Cancel this request", confirmed in a dialog. */
export function CancelButton({ id }: { id: string }) {
  const { run, pending, error } = useRun();
  return <div>
    <Confirm title="Cancel this request?" body={<p style={{ margin: 0 }}>{id} will be closed and no letter will be prepared. You can start a new request at any time.</p>} confirm="Cancel the request" tone="danger" icon="x" testId="cancel" onConfirm={() => run(() => cancelAction(id))}>
      {(open) => <button className="btn btn-q" disabled={pending} data-testid="cancel-request" onClick={open}>Cancel this request</button>}
    </Confirm>
    {error ? <div className="err" role="alert" style={{ marginTop: 8 }}>{error}</div> : null}
  </div>;
}

/** Letter card with View/Hide letter and Download PDF (final, or a watermarked draft for the preparing team). */
export function LetterToggle({ id, title, tpl, L, highlight, canDownload, draftPdf, open: startOpen = false }: { id: string; title: string; tpl: string; L: Letter; highlight: boolean; canDownload: boolean; draftPdf?: boolean; open?: boolean }) {
  const [show, setShow] = React.useState(startOpen);
  const href = `/api/letters/${encodeURIComponent(id)}/pdf`;
  return (
    <div className="card">
      <div className="draftbar"><div><h3 style={{ margin: 0 }}>{title}</h3><span className="mono">{tpl}</span></div>
        <div className="actions">
          {canDownload ? <a className="btn btn-g btn-s" href={href} download data-testid="download-pdf"><Icon name="download" size={16} /> Download PDF</a> : null}
          {draftPdf ? <a className="btn btn-g btn-s" href={href + "?draft=1"} download data-testid="draft-pdf"><Icon name="download" size={16} /> Draft PDF</a> : null}
          <button className="btn btn-g btn-s" onClick={() => setShow(!show)} data-testid="toggle-letter">{show ? "Hide letter" : "View letter"}</button></div></div>
      {show ? <LetterPaper L={L} highlight={highlight} reqId={id} /> : null}
    </div>
  );
}
export const NewRequestButton = () => <Link className="btn btn-p" href="/letters/new" data-testid="new-request"><Icon name="plus" size={16} /> Request a letter</Link>;
