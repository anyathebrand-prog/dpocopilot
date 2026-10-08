import Link from "next/link";
import { notFound } from "next/navigation";
import { requireFirm } from "@/lib/auth";
import { one } from "@/lib/db";
import { naira } from "@/lib/invoice";
import { money, units } from "@/lib/proposal";
import { Flash, Hidden } from "@/components/ui";
import { Submit } from "@/components/client";
import { ProposalForm } from "../form";
import { setProposalStatus } from "../actions";

export default async function ProposalPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const u = await requireFirm();
  const { id } = await params;
  const sp = await searchParams;
  const p = await one("select * from proposals where id = $1 and firm_id = $2", [/^[0-9a-f-]{36}$/.test(id) ? id : null, u.firm_id]);
  if (!p) notFound();
  const exp = (doc: string, f: string) => `/export?kind=proposal&id=${p.id}&doc=${doc}&format=${f}`;
  return (
    <>
      <nav className="meta" aria-label="Breadcrumb"><Link href="/app/proposals">Proposals</Link> / {p.number}</nav>
      <h1 style={{ marginTop: 8 }}>{p.client_name} <span className="meta" style={{ fontSize: "0.5em" }}>{p.number} · {p.status}</span></h1>
      <Flash sp={sp} />
      <div className="row" style={{ gap: 24, alignItems: "stretch", margin: "16px 0" }}>
        <div className="panel" style={{ borderTop: `6px solid ${p.primary_color}` }}>
          <b>Proposal and service agreement</b>
          <div className="meta">Option B {naira(money(p as any).B)} excl. VAT · {units(p.departments).length} champions · {p.duration_months ?? 12} months</div>
          <div className="row" style={{ marginTop: 8 }}><a className="btn" href={exp("proposal", "pdf")} target="_blank">PDF</a><a className="btn secondary" href={exp("proposal", "doc")}>Word</a></div>
        </div>
        <div className="panel" style={{ borderTop: `6px solid ${p.secondary_color}` }}>
          <b>Cover letter</b>
          <div className="meta">Addressed to {p.contact_name ?? p.client_name}</div>
          <div className="row" style={{ marginTop: 8 }}><a className="btn" href={exp("letter", "pdf")} target="_blank">PDF</a><a className="btn secondary" href={exp("letter", "doc")}>Word</a></div>
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
