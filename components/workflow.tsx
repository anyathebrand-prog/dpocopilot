import { Pencil } from "lucide-react";
import { submitForReview, approve, returnToDraft, newVersion, aiDraft, acceptAi, discardAi, sendForSignoff } from "@/lib/content";
import { canApprove, type User } from "@/lib/auth";
import { aiLive } from "@/lib/ai";
import type { Version } from "@/lib/data";
import { fmtWAT } from "@/lib/rules";
import { Chip, Doc, Hidden } from "./ui";
import { Submit } from "./client";

/** C03 review and approval bar. */
export function ReviewBar({ v, user, back, signoff, exportable = true }: { v: Version; user: User; back: string; signoff?: boolean; exportable?: boolean }) {
  const h = <Hidden values={{ id: v.id, back }} />;
  const approver = canApprove(user);
  return (
    <section className="panel" aria-labelledby="rb">
      <h3 id="rb">Review</h3>
      <p><Chip status={v.status} ai={v.ai_generated} /> <span className="meta">Version {v.version_no}</span></p>
      {v.submitted_at && v.status === "in_review" && <p className="meta">Sent for review by {v.submitted_by_name}, {fmtWAT(v.submitted_at)}</p>}

      {v.status === "draft" && (
        <form action={submitForReview}>{h}
          <Submit disabled={!!v.ai_proposal}>Send for review</Submit>
          {v.ai_proposal && <p className="why">Accept or discard the AI draft first.</p>}
        </form>
      )}

      {v.status === "in_review" && (approver ? (
        <div className="row">
          <form action={approve}>{h}<Submit>Approve</Submit></form>
          <form action={returnToDraft}>{h}<Submit className="btn secondary">Send back to draft</Submit></form>
        </div>
      ) : <p className="why">Awaiting approval by a Lead Consultant or Firm Admin.</p>)}

      {["approved", "awaiting_client_signoff", "client_signed_off"].includes(v.status) && (
        <div className="stack">
          {exportable && (
            <div className="row">
              <a className="btn secondary" href={`/export?kind=version&id=${v.id}&format=pdf`} target="_blank">Export PDF</a>
              <a className="btn secondary" href={`/export?kind=version&id=${v.id}&format=doc`}>Export Word</a>
            </div>
          )}
          {signoff && v.status === "approved" && (approver
            ? <form action={sendForSignoff}>{h}<Submit className="btn secondary">Send for client sign-off</Submit></form>
            : <p className="why">A Lead Consultant or Firm Admin can send this for client sign-off.</p>)}
          {v.status === "awaiting_client_signoff" && <p className="meta">Waiting for the client to sign in the portal.</p>}
          <form action={newVersion}>{h}<Submit className="btn quiet">Edit (creates a new version)</Submit></form>
        </div>
      )}
    </section>
  );
}

/** C02 AI draft panel. Output is a proposal until accepted, and stays marked "AI draft" until approved. */
export function AiPanel({ v, back, step, label = "Draft with AI" }: { v: Version; back: string; step?: string; label?: string }) {
  if (v.status !== "draft") return null;
  const proposal = v.ai_proposal ? (v.parent_type === "dpia" ? JSON.parse(v.ai_proposal) : { step: null, text: v.ai_proposal }) : null;
  const h = <Hidden values={{ id: v.id, back, step }} />;
  return (
    <section className="panel" aria-labelledby="aip">
      <h3 id="aip" className="row" style={{ gap: 8 }}><Pencil aria-hidden size={18} color="var(--graphite-600)" />Copilot</h3>
      {proposal && (!step || proposal.step === step) ? (
        <div className="ai-block">
          <header><span className="chip ai"><Pencil aria-hidden />AI draft</span></header>
          <Doc body={proposal.text} />
          <div className="row" style={{ marginTop: 12 }}>
            <form action={acceptAi}>{h}<Submit>Accept</Submit></form>
            <form action={discardAi}>{h}<Submit className="btn secondary">Discard</Submit></form>
          </div>
          <p className="caption">Accept puts the text into the draft so you can edit it.</p>
        </div>
      ) : (
        <form action={aiDraft}>{h}
          <p className="meta">Drafts from this client&apos;s data map and records. A qualified person reviews everything before it is used.</p>
          <Submit className="btn secondary">{label}</Submit>
        </form>
      )}
      {!aiLive && <p className="caption">No AI model is connected, so drafts come from the standard template. Set AI_BASE_URL to connect one.</p>}
    </section>
  );
}

/** C04 version history. */
export function Versions({ versions, current, base }: { versions: Version[]; current: string; base: string }) {
  if (versions.length < 2) return null;
  return (
    <section className="panel" aria-labelledby="vh">
      <h3 id="vh">Versions</h3>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {versions.map((x) => (
          <li key={x.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
            <a href={`${base}?v=${x.id}`} aria-current={x.id === current ? "page" : undefined}>Version {x.version_no}</a> <Chip status={x.status} />
            {x.approved_at && <div className="caption">Approved by {x.approved_by_name}, {fmtWAT(x.approved_at)}</div>}
          </li>
        ))}
      </ul>
    </section>
  );
}
