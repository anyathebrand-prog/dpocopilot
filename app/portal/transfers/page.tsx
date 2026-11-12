import Link from "next/link";
import { requireContact } from "@/lib/auth";
import { q } from "@/lib/db";
import { fmtDate } from "@/lib/rules";
import { assess } from "@/lib/tia-model";
import { Chip, Empty, Flash } from "@/components/ui";
import { RatingBadge } from "@/components/tpra-form";

/** Client portal: the client's transfers of personal data outside Nigeria, documents to upload and residual-risk approvals. */
export default async function PortalTransfers({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const u = await requireContact();
  const rows = await q(`select id, title, status, answers, to_char(next_review, 'YYYY-MM-DD') as next_review, evidence_requested_at, client_signed_at
    from assessments where client_id = $1 and kind = 'tia' and (status = 'approved' or evidence_requested_at is not null)
    order by (status = 'approved' and client_signed_at is null) desc, (evidence_requested_at is not null and status <> 'approved') desc, answers->>'destination'`, [u.client_id]);
  return (
    <>
      <p><Link href="/portal">Back to home</Link></p>
      <h1 style={{ fontSize: 24 }}>Transfers outside Nigeria</h1>
      <p className="meta">Each transfer of personal data outside Nigeria is assessed under Part VIII of the NDPA 2023 (sections 41–43). Upload the documents your DPCO requests, and approve the residual risk once the assessment is approved.</p>
      <Flash sp={sp} />
      {rows.length === 0 ? <Empty><p>No transfer assessments to show yet.</p></Empty> : rows.map((r) => {
        const todo = r.status === "approved" ? (r.client_signed_at ? null : "Approval needed") : "Documents requested";
        const x = assess(r.answers);
        return (
          <div key={r.id} className={`rule-row ${todo ? "soon" : "info"}`} style={{ display: "block" }}>
            <div className="spread"><Link href={`/portal/transfers/${r.id}`}><b>{r.answers.recipient || r.title}</b>{r.answers.destination ? ` · ${r.answers.destination}` : ""}</Link>
              <span className="row" style={{ gap: 6 }}>{r.status === "approved" && <RatingBadge rating={x.residualRating} />}<Chip status={r.client_signed_at ? "client_signed_off" : r.status === "approved" ? "awaiting_client_signoff" : "open"} /></span></div>
            <span className="meta">{r.answers.purpose || ""}{todo ? ` · ${todo}` : ""}{r.next_review ? ` · Next review ${fmtDate(r.next_review)}` : ""}</span>
          </div>
        );
      })}
    </>
  );
}
