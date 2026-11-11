import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClient, canApprove } from "@/lib/auth";
import { q } from "@/lib/db";
import { ACCEPT } from "@/lib/files";
import { todayWAT } from "@/lib/rules";
import { asModel } from "@/lib/tpra-model";
import { firmModel, loadTpra, evidenceState } from "@/lib/tpra";
import { saveTpra, approveTpra, requestTpraEvidence, tpraCopilot, tpraNarrative, tpraReassess } from "@/lib/tpra-actions";
import { Flash, Chip, Banner } from "@/components/ui";
import TpraForm, { RatingBadge } from "@/components/tpra-form";

const iso = (d: unknown) => (d ? new Date(d as string).toISOString() : null);

/** Third-party risk assessment: the eight-stage wizard with the live risk summary. */
export default async function TpraPage({ clientId, id, sp }: { clientId: string; id: string; sp: Record<string, string> }) {
  const { user, client } = await requireClient(clientId);
  const d = /^[0-9a-f-]{36}$/.test(id) ? await loadTpra(id) : null;
  if (!d || d.a.client_id !== clientId) notFound();
  const { a } = d;
  const model = a.model ? asModel(a.model) : await firmModel(a.firm_id);
  const today = todayWAT();
  const ev = evidenceState({ answers: a.answers, model }, d.rows, d.files, today);
  const ropa = await q<{ id: string; purpose: string; department: string | null }>("select id, purpose, department from ropa_entries where client_id = $1 and state = 'active' order by purpose", [clientId]);
  const due = a.next_review && a.next_review <= today;
  const exp = (k: string, f = "pdf") => `/export?kind=${k}&id=${a.id}&format=${f}`;
  return (
    <>
      <nav className="meta" aria-label="Breadcrumb"><Link href={`/app/clients/${clientId}/assessments/tpra`}>Processor register</Link> / {a.answers.vendor || a.title}</nav>
      <div className="spread" style={{ alignItems: "flex-start" }}>
        <h2 style={{ marginTop: 8 }}>{a.answers.vendor || a.title} <RatingBadge rating={a.rating} /> <Chip status={a.client_signed_at ? "client_signed_off" : a.status === "approved" ? "approved" : "draft"} /></h2>
        <div className="row" style={{ marginTop: 8 }}>
          <a className="btn" href={exp("assessment")} target="_blank" rel="noreferrer">Report (PDF)</a><a className="btn secondary" href={exp("assessment", "doc")}>Word</a>
          <a className="btn secondary" href={exp("tpra-request")} target="_blank" rel="noreferrer">Evidence request</a>
          <a className="btn secondary" href={exp("assessment") + "&cover=only"} target="_blank" rel="noreferrer">Cover letter</a>
        </div>
      </div>
      <p className="meta">{a.answers.service || "Service not recorded"} · {a.assessment_year} · scored under {model.version ? `the firm's risk model v${model.version}` : "the default risk model"}</p>
      <Flash sp={sp} />
      {due && <Banner kind="warn">The scheduled review was due on {a.next_review}. Start a reassessment under Monitoring.</Banner>}
      {ev.some((e) => e.expired) && <Banner kind="warn">Evidence has expired: {ev.filter((e) => e.expired).map((e) => e.name).join("; ")}. This triggers a reassessment.</Banner>}
      <TpraForm
        id={a.id} status={a.status} answers={a.answers} model={model} ropaIds={a.ropa_ids ?? []} history={a.history ?? []}
        nextReview={a.next_review} approver={a.approver} approvedAt={iso(a.approved_at)} signedName={a.client_signed_name} signedAt={iso(a.client_signed_at)} requestedAt={iso(a.evidence_requested_at)}
        ev={ev.map((e) => ({ i: e.i, name: e.name, domain: e.domain, from: e.from, when: e.when, status: e.status, expires_on: e.expires_on, verdict: e.verdict, expired: e.expired, files: e.files.map((f) => ({ id: f.id, name: f.original_name, kb: Math.ceil(Number(f.size_bytes) / 1024) })) }))}
        tasks={d.tasks} ropa={ropa} readOnly={!!client.archived_at} canApprove={canApprove(user)} accept={ACCEPT}
        dpiaHref={`/app/clients/${clientId}/dpias/new`} reportHref={exp("assessment")} requestHref={exp("tpra-request")}
        actions={{ save: saveTpra, approve: approveTpra, requestEvidence: requestTpraEvidence, copilot: tpraCopilot, narrative: tpraNarrative, reassess: tpraReassess }}
      />
    </>
  );
}
