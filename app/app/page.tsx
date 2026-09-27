import Link from "next/link";
import { requireFirm, canApprove, clientScope, scopeArgs, isAdmin } from "@/lib/auth";
import { q } from "@/lib/db";
import { reviewQueue } from "@/lib/data";
import { todayWAT, fmtWAT } from "@/lib/rules";
import { Flash, Chip, Deadline, Empty, Bar, PageHead, Banner } from "@/components/ui";
import { Countdown } from "@/components/client";

const TYPE: Record<string, string> = { dpia: "DPIA", document: "Document", breach_notification: "Breach notification", dsar: "DSAR response" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireFirm();
  const sp = await searchParams;
  const archived = sp.archived === "1";
  const scope = clientScope(u), args = scopeArgs(u);
  const today = todayWAT();

  const breaches = await q(`select b.id, b.client_id, b.deadline_at, b.reported_via, c.name as client_name from breaches b join clients c on c.id = b.client_id
    where ${scope} and b.status = 'open' and b.notification_required <> 'no' and c.archived_at is null
      and not exists (select 1 from breach_notifications n where n.breach_id = b.id and n.audience = 'regulator' and n.sent_at is not null)
    order by b.deadline_at`, args);

  const review = canApprove(u) ? await reviewQueue(scope, args) : [];

  const clients = await q(`select c.id, c.name, c.status, c.sector, c.archived_at,
      (select count(*)::int from gap_findings g where g.client_id = c.id and g.state = 'open') as gaps,
      (select count(*)::int from tasks t where t.client_id = c.id and t.status = 'open' and t.due_on < $3)
        + (select count(*)::int from evidence_requests e where e.client_id = c.id and e.status in ('open','rejected') and e.due_on < $3) as overdue,
      (select count(*)::int from breaches b where b.client_id = c.id and b.status = 'open') as breaches,
      (select count(*)::int from dsars d where d.client_id = c.id and d.status = 'open') as dsars,
      (select coalesce(round(100.0 * count(*) filter (where status = 'complete') / nullif(count(*) filter (where status <> 'not_applicable'), 0)), 0)::int
        from client_car_items i where i.client_id = c.id) as readiness
    from clients c where ${scope} and (c.archived_at is not null) = $4 order by c.name`, [...args, today, archived]);

  return (
    <>
      <Flash sp={sp} />
      {breaches.map((b) => (
        <div key={b.id} className="banner breach" role="note">
          <div style={{ flex: 1 }} className="spread">
            <div>
              <b>Active breach · {b.client_name}</b>{b.reported_via === "portal" && " (reported by client)"}
              <div>Notify NDPC by {fmtWAT(b.deadline_at)}</div>
            </div>
            <div className="row"><Countdown due={b.deadline_at.toISOString()} /><Link className="btn danger" href={`/app/clients/${b.client_id}/breaches/${b.id}`}>Open breach</Link></div>
          </div>
        </div>
      ))}

      {canApprove(u) && (
        <section aria-labelledby="rq" style={{ marginBottom: 40 }}>
          <h2 id="rq" style={{ marginTop: 0 }}>Waiting for my review <span className="chip neutral num">{review.length}</span></h2>
          {review.length === 0 ? <p className="meta">Nothing waiting for your review.</p> : review.map((r) => (
            <div key={r.id} className={`rule-row ${r.prio === 0 ? "urgent" : r.due_at ? "soon" : "info"}`}>
              <div>
                <Link href={`/app/clients/${r.client_id}/${r.path}`} style={{ fontWeight: 700 }}>{r.title}</Link>
                <div className="meta">{TYPE[r.parent_type]} · {r.client_name} · sent by {r.submitted_by}, {fmtWAT(r.submitted_at)}</div>
              </div>
              {r.due_at && <Deadline due={r.due_at} soonHours={r.prio === 0 ? 24 : 120} />}
            </div>
          ))}
        </section>
      )}

      <PageHead title={archived ? "Archived clients" : "Clients"}>
        <Link className="btn quiet" href={archived ? "/app" : "/app?archived=1"}>{archived ? "Show active clients" : "Show archived"}</Link>
        {u.role !== "associate" && !archived && <Link className="btn" href="/app/clients/new">Add client</Link>}
      </PageHead>

      {clients.length === 0 ? (
        u.role === "associate" ? <Empty><p>You haven&apos;t been assigned any clients yet. Ask your firm administrator.</p></Empty> :
        archived ? <Empty><p>No archived clients.</p></Empty> :
        <Empty>
          <p>Add your first client to start their compliance file.</p>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link className="btn" href="/app/clients/new">Add client</Link>
            {isAdmin(u) && <Link className="btn secondary" href="/app/import">Import existing clients</Link>}
          </div>
        </Empty>
      ) : (
        <div className="scroll">
          <table className="register">
            <thead><tr><th>Client</th><th>Status</th><th className="num">Open gaps</th><th className="num">Overdue</th><th className="num">Breaches</th><th className="num">DSARs</th><th style={{ minWidth: 160 }}>CAR readiness</th></tr></thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/app/clients/${c.id}`}>{c.name}</Link><div className="meta" style={{ fontWeight: 400 }}>{c.sector}</div></td>
                  <td data-label="Status"><Chip status={c.archived_at ? "archived" : c.status} /></td>
                  <td data-label="Open gaps" className="num">{c.gaps}</td>
                  <td data-label="Overdue" className="num">{c.overdue > 0 ? <span className="chip overdue">{c.overdue} overdue</span> : 0}</td>
                  <td data-label="Breaches" className="num">{c.breaches > 0 ? <b style={{ color: "var(--red-700)" }}>{c.breaches} active</b> : 0}</td>
                  <td data-label="DSARs" className="num">{c.dsars}</td>
                  <td data-label="CAR readiness"><Bar pct={c.readiness} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {u.role === "associate" && <Banner>Only Lead Consultants and Firm Admins can approve work. Send items for review from each record.</Banner>}
    </>
  );
}
