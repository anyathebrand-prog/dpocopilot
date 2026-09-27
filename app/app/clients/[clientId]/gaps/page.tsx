import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClient, audit } from "@/lib/auth";
import { q, one, tx } from "@/lib/db";
import { findGaps, todayWAT, fmtWAT } from "@/lib/rules";
import { str, opt, flash } from "@/lib/form";
import { Flash, Hidden, Chip, Empty, Banner } from "@/components/ui";
import { Submit } from "@/components/client";

/** FR12: rules run on structured data; findings upsert by fingerprint so user decisions survive re-runs. */
async function run(fd: FormData) {
  "use server";
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const id = client.id;
  const gaps = findGaps({
    today: todayWAT(),
    ropa: await q(`select r.id, r.purpose, r.lawful_basis, r.retention_period, r.involves_sensitive, r.is_high_risk, r.has_transfer, r.transfer_safeguard,
      (select count(*)::int from dpia_ropa dr where dr.ropa_entry_id = r.id) as dpia_count from ropa_entries r where r.client_id = $1 and r.state = 'active'`, [id]) as any,
    approvedTemplates: (await q(`select distinct d.template_key from documents d where d.client_id = $1 and d.template_key is not null
      and exists (select 1 from content_versions v where v.parent_type = 'document' and v.parent_id = d.id and v.status in ('approved','awaiting_client_signoff','client_signed_off'))`, [id])).map((r) => r.template_key),
    evidence: await q("select id, title, due_on, status from evidence_requests where client_id = $1", [id]) as any,
    dsars: await q("select id, requester_name, deadline_on, status from dsars where client_id = $1", [id]) as any,
    car: await q("select id, item_text, status from client_car_items where client_id = $1", [id]) as any,
  });
  await tx(async (t) => {
    for (const g of gaps)
      await t.query(`insert into gap_findings (firm_id, client_id, rule_key, severity, fingerprint, message, next_action, link) values ($1,$2,$3,$4,$5,$6,$7,$8)
        on conflict (client_id, fingerprint) do update set severity = excluded.severity, message = excluded.message, next_action = excluded.next_action, link = excluded.link,
          state = case when gap_findings.state = 'resolved' then 'open' else gap_findings.state end`,
        [client.firm_id, id, g.rule_key, g.severity, g.fingerprint, g.message, g.next_action, g.link]);
    await t.query("update gap_findings set state = 'resolved', resolved_by = null where client_id = $1 and state = 'open' and not (fingerprint = any($2::text[]))", [id, gaps.map((g) => g.fingerprint)]);
    await t.query("update clients set gaps_checked_at = now() where id = $1", [id]);
    await audit(user, "create", "gap_check", id, { client_id: id, details: { found: gaps.length } }, t);
  });
  redirect(flash(`/app/clients/${id}/gaps`, gaps.length ? `Gap check found ${gaps.length} gap${gaps.length > 1 ? "s" : ""}` : "No gaps found"));
}

async function decide(fd: FormData) {
  "use server";
  const g = await one("select * from gap_findings where id = $1", [str(fd, "gap_id")]);
  if (!g) redirect("/forbidden");
  const { user } = await requireClient(g.client_id, { write: true });
  const back = `/app/clients/${g.client_id}/gaps`;
  const na = str(fd, "op") === "na", reason = opt(fd, "reason");
  if (na && !reason) redirect(flash(back, "Give a reason when marking a gap Not applicable.", "error"));
  await q("update gap_findings set state = $2, na_reason = $3, resolved_by = $4 where id = $1", [g.id, na ? "not_applicable" : "resolved", na ? reason : null, user.id]);
  await audit(user, "update", "gap_finding", g.id, { client_id: g.client_id, details: { state: na ? "not_applicable" : "resolved" } });
  redirect(flash(back, na ? "Marked not applicable" : "Marked resolved"));
}

export default async function Gaps({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId } = await params;
  const sp = await searchParams;
  const { client } = await requireClient(clientId);
  const open = await q("select * from gap_findings where client_id = $1 and state = 'open' order by case severity when 'high' then 0 when 'medium' then 1 else 2 end, message", [clientId]);
  const closed = await q("select g.*, u.name from gap_findings g left join users u on u.id = g.resolved_by where g.client_id = $1 and g.state <> 'open' order by g.state, g.message", [clientId]);
  const ro = !!client.archived_at;
  return (
    <>
      <div className="spread">
        <h2 style={{ marginTop: 0 }}>Gap analysis</h2>
        {!ro && <form action={run}><Hidden values={{ client_id: clientId }} /><Submit>Run gap check</Submit></form>}
      </div>
      <Flash sp={sp} />
      <p className="meta">{client.gaps_checked_at ? `Last run ${fmtWAT(client.gaps_checked_at)}.` : "Never run."} Rules check lawful basis, DPIAs for sensitive or high-risk processing, retention, required policies, transfer safeguards, overdue evidence, DSAR deadlines and missing CAR items.</p>
      {!client.gaps_checked_at ? <Empty><p>Run your first gap check.</p></Empty> : open.length === 0 ? <Banner kind="ok">No open gaps.</Banner> : (
        <table className="register">
          <thead><tr><th>Gap</th><th>Severity</th><th>Next action</th><th></th></tr></thead>
          <tbody>{open.map((g) => (
            <tr key={g.id}>
              <td><Link href={`/app/clients/${clientId}/${g.link}`}>{g.message}</Link></td>
              <td data-label="Severity"><Chip status={g.severity} /></td>
              <td data-label="Next action" className="small">{g.next_action}</td>
              <td>{!ro && (
                <form action={decide} style={{ minWidth: 200 }}>
                  <Hidden values={{ gap_id: g.id }} />
                  <Submit className="btn quiet" name="op" value="resolved">Mark resolved</Submit>
                  <details><summary className="small" style={{ cursor: "pointer", color: "var(--stamp-700)" }}>Not applicable…</summary>
                    <input name="reason" aria-label="Reason" placeholder="Reason (required)" /><Submit className="btn quiet" name="op" value="na">Mark not applicable</Submit>
                  </details>
                </form>
              )}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
      {closed.length > 0 && (
        <details style={{ marginTop: 24 }}>
          <summary>Resolved and not applicable ({closed.length})</summary>
          <ul>{closed.map((g) => <li key={g.id}>{g.message} <Chip status={g.state === "resolved" ? "resolved" : "not_applicable"} /> <span className="meta">{g.na_reason ?? (g.name ? `by ${g.name}` : "no longer detected")}</span></li>)}</ul>
        </details>
      )}
    </>
  );
}
