import Link from "next/link";
import { requireContact } from "@/lib/auth";
import { q } from "@/lib/db";
import { fmtDate } from "@/lib/rules";
import { Chip, Empty, Flash } from "@/components/ui";
import { RatingBadge } from "@/components/tpra-form";

/** Client portal: the client's data processors, their risk rating and decision, evidence to upload and sign-offs. */
export default async function PortalProcessors({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const u = await requireContact();
  const rows = await q(`select id, title, status, rating, answers, to_char(next_review, 'YYYY-MM-DD') as next_review, evidence_requested_at, client_signed_at
    from assessments where client_id = $1 and kind = 'tpra' and (status = 'approved' or evidence_requested_at is not null)
    order by (status = 'approved' and client_signed_at is null) desc, (evidence_requested_at is not null and status <> 'approved') desc, answers->>'vendor'`, [u.client_id]);
  return (
    <>
      <p><Link href="/portal">Back to home</Link></p>
      <h1 style={{ fontSize: 24 }}>Data processors</h1>
      <p className="meta">The companies that process personal data on your behalf. Your DPCO assesses each one under section 29 of the NDPA 2023. Upload the documents they request, and sign off each decision.</p>
      <Flash sp={sp} />
      {rows.length === 0 ? <Empty><p>No processor assessments to show yet.</p></Empty> : rows.map((r) => {
        const todo = r.status === "approved" ? (r.client_signed_at ? null : "Sign-off needed") : "Documents requested";
        return (
          <div key={r.id} className={`rule-row ${todo ? "soon" : "info"}`} style={{ display: "block" }}>
            <div className="spread"><Link href={`/portal/processors/${r.id}`}><b>{r.answers.vendor || r.title}</b></Link>
              <span className="row" style={{ gap: 6 }}>{r.status === "approved" && <RatingBadge rating={r.rating} />}<Chip status={r.client_signed_at ? "client_signed_off" : r.status === "approved" ? "awaiting_client_signoff" : "open"} /></span></div>
            <span className="meta">{r.answers.service || ""}{todo ? ` · ${todo}` : ""}{r.next_review ? ` · Next review ${fmtDate(r.next_review)}` : ""}</span>
          </div>
        );
      })}
    </>
  );
}
