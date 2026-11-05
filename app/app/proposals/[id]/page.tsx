import Link from "next/link";
import { notFound } from "next/navigation";
import { requireFirm } from "@/lib/auth";
import { one } from "@/lib/db";
import { naira } from "@/lib/invoice";
import { money, units } from "@/lib/proposal";
import { Flash, Hidden, Banner } from "@/components/ui";
import { Submit } from "@/components/client";
import { ProposalForm } from "../form";
import { setProposalStatus, submitForReview, emailProposal } from "../actions";

export default async function ProposalPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const u = await requireFirm();
  const { id } = await params;
  const sp = await searchParams;
  const p = await one("select * from proposals where id = $1 and firm_id = $2", [/^[0-9a-f-]{36}$/.test(id) ? id : null, u.firm_id]);
  if (!p) notFound();
  const exp = (doc: string, f: string) => `/export?kind=proposal&id=${p.id}&doc=${doc}&format=${f}`;
  // A Solo DPO's proposal reaches the client only after their DPCO approves it.
  const solo = u.plan === "solo", locked = solo && p.review_status !== "approved";
  const dl = (doc: string) => locked ? <span className="meta">Available once {u.dpco_name} approves it</span>
    : <div className="row" style={{ marginTop: 8 }}><a className="btn" href={exp(doc, "pdf")} target="_blank">PDF</a>{!solo && <a className="btn secondary" href={exp(doc, "doc")}>Word</a>}</div>; // Solo DPO: PDF only
  return (
    <>
      <nav className="meta" aria-label="Breadcrumb"><Link href="/app/proposals">Proposals</Link> / {p.number}</nav>
      <h1 style={{ marginTop: 8 }}>{p.client_name} <span className="meta" style={{ fontSize: "0.5em" }}>{p.number} · {p.status}</span></h1>
      <Flash sp={sp} />
      {solo && (p.review_status === "submitted" ? <Banner kind="info">Waiting for <b>{u.dpco_name}</b> to approve this proposal.</Banner>
        : p.review_status === "approved" ? <Banner kind="ok">Approved by <b>{u.dpco_name}</b>. Download the PDF and send it to the client.</Banner>
        : <Banner kind={p.review_status === "returned" ? "warn" : "info"}>{p.review_status === "returned" ? <>Returned by {u.dpco_name}: <b>{p.review_note}</b>. Make the changes, then submit again.</> : <>Submit this proposal to <b>{u.dpco_name}</b> for approval before sending it to the client.</>}
            <form action={submitForReview} style={{ marginTop: 8 }}><Hidden values={{ id: p.id }} /><Submit>Submit for approval</Submit></form></Banner>)}
      {!solo && <form action={emailProposal} className="row" style={{ margin: "8px 0" }}><Hidden values={{ id: p.id }} /><Submit className="btn secondary">Email proposal and cover letter to {p.email}</Submit></form>}
      <div className="row" style={{ gap: 24, alignItems: "stretch", margin: "16px 0" }}>
        <div className="panel" style={{ borderTop: `6px solid ${p.primary_color}` }}>
          <b>Proposal and service agreement</b>
          <div className="meta">{naira(money(p as any).total)} · {p.lines.length} service{p.lines.length === 1 ? "" : "s"} · {units(p.departments).length} champions · {p.duration_months ?? 12} months</div>
          {dl("proposal")}
        </div>
        <div className="panel" style={{ borderTop: `6px solid ${p.secondary_color}` }}>
          <b>Cover letter</b>
          <div className="meta">Addressed to {p.contact_name ?? p.client_name}</div>
          {dl("letter")}
        </div>
        <form action={setProposalStatus} className="panel">
          <Hidden values={{ id: p.id }} />
          <b>Status</b>
          <div className="row" style={{ marginTop: 8 }}>
            <select name="status" defaultValue={p.status} aria-label="Status" style={{ width: "auto" }}><option value="draft">Draft</option><option value="sent">Sent</option><option value="accepted">Accepted</option><option value="declined">Declined</option></select>
            <Submit className="btn secondary">Update</Submit>
          </div>
        </form>
      </div>
      <ProposalForm p={p} />
    </>
  );
}
