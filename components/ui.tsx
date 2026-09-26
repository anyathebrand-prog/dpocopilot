import { Pencil, Clock, Stamp, Signature, CircleCheck, CircleDashed, CircleAlert, CircleSlash, TriangleAlert, Info } from "lucide-react";
import type { ReactNode } from "react";
import { fmtWAT, fmtDate, deadlineState, relTime, endOfDayWAT } from "@/lib/rules";
import { TODO } from "@/lib/templates";

type SP = Record<string, string | string[] | undefined>;

/** Result message carried in ?ok= / ?error= (announced to screen readers). */
export function Flash({ sp }: { sp: SP }) {
  const ok = typeof sp.ok === "string" ? sp.ok : null;
  const err = typeof sp.error === "string" ? sp.error : null;
  if (err) return <div className="banner error" role="alert"><CircleAlert aria-hidden />{err}</div>;
  if (ok) return <div className="banner ok" role="status"><CircleCheck aria-hidden />{ok}</div>;
  return null;
}

export function Banner({ kind = "info", children }: { kind?: "info" | "warn" | "error" | "ok" | "breach"; children: ReactNode }) {
  const Icon = kind === "info" ? Info : kind === "ok" ? CircleCheck : TriangleAlert;
  return <div className={`banner ${kind}`}><Icon aria-hidden /><div>{children}</div></div>;
}

const VERSION_CHIPS: Record<string, [string, string, typeof Pencil]> = {
  draft: ["draft", "Draft", Pencil],
  in_review: ["review", "In review", Clock],
  approved: ["approved", "Approved", Stamp],
  awaiting_client_signoff: ["review", "Awaiting client sign-off", Clock],
  client_signed_off: ["signed", "Client signed off", Signature],
};
const ITEM_CHIPS: Record<string, [string, string, typeof Pencil]> = {
  complete: ["complete", "Complete", CircleCheck], in_progress: ["progress", "In progress", CircleDashed],
  missing: ["missing", "Missing", CircleAlert], not_applicable: ["na", "Not applicable", CircleSlash],
  open: ["neutral", "Open", CircleDashed], submitted: ["review", "Submitted", Clock], accepted: ["complete", "Accepted", CircleCheck],
  rejected: ["missing", "Rejected", CircleAlert], overdue: ["overdue", "Overdue", TriangleAlert],
  proposed: ["draft", "Proposed", Pencil], active: ["approved", "Active", Stamp], archived: ["na", "Archived", CircleSlash],
  onboarding: ["progress", "Onboarding", CircleDashed], closed: ["na", "Closed", CircleSlash], done: ["complete", "Done", CircleCheck],
  high: ["overdue", "High", TriangleAlert], medium: ["progress", "Medium", CircleAlert], low: ["neutral", "Low", Info],
  resolved: ["complete", "Resolved", CircleCheck],
};

export function Chip({ status, ai }: { status: string; ai?: boolean }) {
  const [cls, label, Icon] = VERSION_CHIPS[status] ?? ITEM_CHIPS[status] ?? ["neutral", status, Info];
  return (
    <span className="row" style={{ gap: 6, display: "inline-flex" }}>
      <span className={`chip ${cls}`}><Icon aria-hidden />{label}</span>
      {ai && (status === "draft" || status === "in_review") && <span className="chip ai"><Pencil aria-hidden />AI draft</span>}
    </span>
  );
}

/** Deadline strip: date + time + WAT + relative time; amber when due soon, red when overdue — always with text. */
export function Deadline({ due, soonHours = 120, prefix = "Due", dateOnly }: { due: Date | string; soonHours?: number; prefix?: string; dateOnly?: boolean }) {
  const d = typeof due === "string" ? endOfDayWAT(due) : due;
  const now = new Date();
  const state = deadlineState(d, now, soonHours * 3600_000);
  const when = dateOnly && typeof due === "string" ? fmtDate(due) : fmtWAT(d);
  return (
    <div className={`deadline ${state === "normal" ? "" : state}`}>
      {state === "soon" && <b>Due soon · </b>}
      {state === "overdue" && <b>Overdue · </b>}
      {prefix} {when} <span className="num">({relTime(d, now)})</span>
    </div>
  );
}

export function Seal({ v, sig }: { v: { version_no: number; approved_by_name: string | null; approved_at: Date | null }; sig?: Record<string, any> | null }) {
  if (!v.approved_at) return null;
  return (
    <div className="seal" role="note" aria-label={sig ? "Signed by client" : "Approved"}>
      <strong>{sig ? <Signature aria-hidden size={18} /> : <Stamp aria-hidden size={18} />}{sig ? "Signed by client" : "Approved"}</strong>
      <div>Version {v.version_no}, approved by {v.approved_by_name}</div>
      <div>{fmtWAT(v.approved_at)}</div>
      {sig && <div>Signed by {sig.typed_name} ({sig.contact_name}) on {fmtWAT(sig.signed_at)}, code sent by {sig.otp_channel}. Fingerprint <span className="num">{String(sig.content_sha256).slice(0, 16)}</span></div>}
    </div>
  );
}

/** Renders the plain-text document format: "# ", "## " headings and "- " bullets; highlights [To be completed]. */
export function Doc({ body, className = "" }: { body: string; className?: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const mark = (s: string, k: number) => s.split(TODO).flatMap((part, i) => (i ? [<span key={`${k}-${i}`} className="todo">{TODO}</span>, part] : [part]));
  const flush = (k: number) => { if (list.length) { blocks.push(<ul key={`ul${k}`}>{list.map((l, i) => <li key={i}>{mark(l, i)}</li>)}</ul>); list = []; } };
  body.split("\n").forEach((line, i) => {
    if (line.startsWith("- ")) { list.push(line.slice(2)); return; }
    flush(i);
    if (line.startsWith("# ")) blocks.push(<h1 key={i}>{mark(line.slice(2), i)}</h1>);
    else if (line.startsWith("## ")) blocks.push(<h2 key={i}>{mark(line.slice(3), i)}</h2>);
    else if (line.trim()) blocks.push(<p key={i}>{mark(line, i)}</p>);
  });
  flush(-1);
  return <article className={`sheet ${className}`}>{blocks}</article>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function Bar({ pct, label }: { pct: number; label?: string }) {
  return (
    <div className="row" style={{ gap: 8 }}>
      <span className="num" style={{ minWidth: 40 }}>{pct}%</span>
      <div className="bar" style={{ flex: 1 }} role="img" aria-label={label ?? `${pct}% ready`}><i style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export function PageHead({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="spread" style={{ marginBottom: 24, alignItems: "flex-start" }}>
      <div><h1>{title}</h1>{sub && <div className="meta">{sub}</div>}</div>
      {children && <div className="row">{children}</div>}
    </div>
  );
}

export function Field({ label, help, required, children }: { label: string; help?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}{required && " (required)"}</span>
      {help && <span className="help">{help}</span>}
      {children}
    </label>
  );
}

export const Hidden = ({ values }: { values: Record<string, string | undefined> }) => (
  <>{Object.entries(values).map(([k, v]) => <input key={k} type="hidden" name={k} value={v ?? ""} />)}</>
);
