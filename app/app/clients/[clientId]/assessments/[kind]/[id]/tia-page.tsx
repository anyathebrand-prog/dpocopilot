import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClient, canApprove } from "@/lib/auth";
import { q } from "@/lib/db";
import { ACCEPT } from "@/lib/files";
import { todayWAT } from "@/lib/rules";
import { assess } from "@/lib/tia-model";
import { loadTia } from "@/lib/tia";
import { saveTia, approveTia, requestTiaDocs, tiaCopilot, tiaAddMeasures, tiaNarrativeAction, tiaReassess } from "@/lib/tia-actions";
import { Flash, Chip, Banner } from "@/components/ui";
import { RatingBadge } from "@/components/tpra-form";
import TiaForm from "@/components/tia-form";

const iso = (d: unknown) => (d ? new Date(d as string).toISOString() : null);
/** Questions from the earlier Transfer risk form, shown read-only on older assessments. */
const LEGACY: [string, string][] = [["volume", "Frequency and volume"], ["adequacy", "Adequacy of protection"], ["evidence", "Evidence of adequacy"], ["derogation", "Basis where protection is not adequate"],
  ["gov_access", "Public authority access and remedies"], ["enforcement", "Enforcement in the destination"], ["onward", "Onward transfers"], ["sensitivity", "Sensitivity and harm"],
  ["technical", "Technical measures"], ["contractual", "Contractual and organisational measures"]];

/** Cross-border transfer risk assessment: the seven-stage form with the live summary. */
export default async function TiaPage({ clientId, id, sp }: { clientId: string; id: string; sp: Record<string, string> }) {
  const { user, client } = await requireClient(clientId);
  const d = /^[0-9a-f-]{36}$/.test(id) ? await loadTia(id) : null;
  if (!d || d.a.client_id !== clientId) notFound();
  const { a } = d, A = a.answers as Record<string, string>;
  const r = assess(A);
  const ropa = await q<{ id: string; purpose: string; department: string | null }>("select id, purpose, department from ropa_entries where client_id = $1 and state = 'active' order by purpose", [clientId]);
  const due = a.next_review && a.next_review <= todayWAT();
  const exp = (k: string, f = "pdf") => `/export?kind=${k}&id=${a.id}&format=${f}`;
  const ids = a.ropa_ids?.length ? a.ropa_ids : a.ropa_entry_id ? [a.ropa_entry_id] : [];
  return (
    <>
      <nav className="meta" aria-label="Breadcrumb"><Link href={`/app/clients/${clientId}/assessments/tia`}>Transfer register</Link> / {A.recipient || a.title}</nav>
      <div className="spread" style={{ alignItems: "flex-start" }}>
        <h2 style={{ marginTop: 8 }}>{A.recipient || a.title}{A.destination ? <span className="meta" style={{ fontSize: "0.7em" }}> · {A.destination}</span> : null} <RatingBadge rating={r.rating} /> <Chip status={a.client_signed_at ? "client_signed_off" : a.status === "approved" ? "approved" : "draft"} /></h2>
        <div className="row" style={{ marginTop: 8 }}>
          <a className="btn" href={exp("assessment")} target="_blank" rel="noreferrer">Report (PDF)</a><a className="btn secondary" href={exp("assessment", "doc")}>Word</a>
          <a className="btn secondary" href={exp("tia-request")} target="_blank" rel="noreferrer">Document request</a>
          <a className="btn secondary" href={exp("assessment") + "&cover=only"} target="_blank" rel="noreferrer">Cover letter</a>
        </div>
      </div>
      <p className="meta">Cross-Border Data Transfer Risk Assessment · NDPA ss.41–43 · GAID Art. 45 and Schedule 5 · {a.assessment_year}</p>
      <Flash sp={sp} />
      {due && <Banner kind="warn">The scheduled review was due on {a.next_review}. Start a reassessment under Sign-off and review.</Banner>}
      <TiaForm
        id={a.id} status={a.status} answers={A} ropaIds={ids} history={a.history ?? []}
        nextReview={a.next_review} approver={a.approver} approvedAt={iso(a.approved_at)} signedName={a.client_signed_name} signedAt={iso(a.client_signed_at)} requestedAt={iso(a.evidence_requested_at)}
        docs={d.docs.map((x) => ({ i: x.i, status: x.status, files: x.files.map((f) => ({ id: f.id, name: f.original_name, kb: Math.ceil(Number(f.size_bytes) / 1024) })) }))}
        tasks={d.tasks} ropa={ropa} readOnly={!!client.archived_at} canApprove={canApprove(user)} accept={ACCEPT}
        legacy={LEGACY.filter(([k]) => A[k]?.trim()).map(([k, l]) => [l, A[k]])}
        dpiaHref={`/app/clients/${clientId}/dpias/new`} reportHref={exp("assessment")} requestHref={exp("tia-request")}
        actions={{ save: saveTia, approve: approveTia, requestDocs: requestTiaDocs, copilot: tiaCopilot, addMeasures: tiaAddMeasures, narrative: tiaNarrativeAction, reassess: tiaReassess }}
      />
    </>
  );
}
