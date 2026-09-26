import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClient, audit } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { readiness, CAR_CATEGORIES } from "@/lib/rules";
import { str, opt, flash } from "@/lib/form";
import { Flash, Hidden, Chip, Bar } from "@/components/ui";
import { Submit } from "@/components/client";

const STATUSES = [["complete", "Complete"], ["in_progress", "In progress"], ["missing", "Missing"], ["not_applicable", "Not applicable"]];

async function setStatus(fd: FormData) {
  "use server";
  const item = await one("select * from client_car_items where id = $1", [str(fd, "item_id")]);
  if (!item) redirect("/forbidden");
  const { user } = await requireClient(item.client_id, { write: true });
  const back = `/app/clients/${item.client_id}/car-readiness`;
  const status = str(fd, "status"), reason = opt(fd, "na_reason");
  if (!STATUSES.some(([s]) => s === status)) redirect(back);
  if (status === "not_applicable" && !reason) redirect(flash(`${back}#i-${item.id}`, "Give a reason when marking an item Not applicable.", "error"));
  await q("update client_car_items set status = $2, na_reason = $3, is_new = false, updated_by = $4 where id = $1", [item.id, status, status === "not_applicable" ? reason : null, user.id]);
  await audit(user, "update", "car_item", item.id, { client_id: item.client_id, details: { status } });
  redirect(flash(back, "Checklist updated"));
}

async function linkDecision(fd: FormData) {
  "use server";
  const item = await one("select * from client_car_items where id = $1", [str(fd, "item_id")]);
  if (!item) redirect("/forbidden");
  const { user } = await requireClient(item.client_id, { write: true });
  const confirm = str(fd, "op") === "confirm";
  await q(`update client_car_items set link_state = $2, status = case when $3 then 'complete' else status end, is_new = false, updated_by = $4 where id = $1`, [item.id, confirm ? "confirmed" : "dismissed", confirm, user.id]);
  await audit(user, "update", "car_item", item.id, { client_id: item.client_id, details: { suggested_evidence: confirm ? "confirmed" : "dismissed" } });
  redirect(flash(`/app/clients/${item.client_id}/car-readiness`, confirm ? "Suggested evidence confirmed" : "Suggestion dismissed"));
}

/** FR8.6: where platform records already satisfy an item, suggest them for the reviewer to confirm. */
async function suggestions(clientId: string) {
  const s = await one(`select
    (select string_agg(d.title, ', ') from documents d where d.client_id = $1 and exists (select 1 from content_versions v where v.parent_type = 'document' and v.parent_id = d.id and v.status in ('approved','awaiting_client_signoff','client_signed_off'))) as policies,
    (select count(*)::int from dpias d where d.client_id = $1 and exists (select 1 from content_versions v where v.parent_type = 'dpia' and v.parent_id = d.id and v.status in ('approved','awaiting_client_signoff','client_signed_off'))) as dpias,
    (select count(*)::int from ropa_entries where client_id = $1 and state = 'active') as ropa,
    (select count(*)::int from ropa_entries where client_id = $1 and state = 'active' and lawful_basis is null) as no_basis,
    (select count(*)::int from ropa_entries where client_id = $1 and state = 'active' and has_transfer) as transfers,
    (select count(*)::int from ropa_entries where client_id = $1 and state = 'active' and has_transfer and transfer_safeguard is null) as unsafe,
    (select count(*)::int from ropa_entries where client_id = $1 and state = 'active' and recipients is not null) as recipients`, [clientId]);
  const x = s!;
  return {
    approved_policies: x.policies ? `Approved: ${x.policies}` : null,
    dpias: x.dpias ? `${x.dpias} approved DPIA${x.dpias > 1 ? "s" : ""}` : null,
    ropa_current: x.ropa ? `${x.ropa} active RoPA entries` : null,
    ropa_lawful_basis: x.ropa && !x.no_basis ? `Lawful basis recorded on all ${x.ropa} RoPA entries` : null,
    ropa_transfers: x.transfers && !x.unsafe ? `${x.transfers} RoPA entries record transfers with safeguards` : null,
    ropa_recipients: x.recipients ? `${x.recipients} RoPA entries list recipients` : null,
  } as Record<string, string | null>;
}

export default async function Car({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId } = await params;
  const sp = await searchParams;
  const { client } = await requireClient(clientId);
  const items = await q(`select i.*, (select count(*)::int from evidence_requests e where e.car_item_id = i.id and e.status = 'accepted') as accepted,
      (select count(*)::int from evidence_requests e where e.car_item_id = i.id and e.status <> 'accepted') as pending
    from client_car_items i where i.client_id = $1 order by i.category_key, i.position`, [clientId]);
  const r = readiness(items as { category_key: string; status: string }[]);
  const sug = await suggestions(clientId);
  const ro = !!client.archived_at;
  const b = `/app/clients/${clientId}`;
  return (
    <>
      <div className="spread">
        <h2 style={{ marginTop: 0 }}>CAR readiness</h2>
        <div className="row">
          <a className="btn secondary" href={`/export?kind=car&client=${clientId}&format=pdf`} target="_blank">Export PDF</a>
          <a className="btn secondary" href={`/export?kind=car&client=${clientId}&format=doc`}>Export Word</a>
        </div>
      </div>
      <Flash sp={sp} />
      <section className="panel" style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 22, margin: "0 0 8px" }}><b className="num">{r.overall.pct}%</b> ready · <span className="num">{r.overall.complete} of {r.overall.applicable}</span> applicable items complete</p>
        <Bar pct={r.overall.pct} />
        <p className="caption" style={{ marginTop: 8 }}>Items marked Not applicable are left out of the score. DPO Copilot does not file the CAR with the NDPC.</p>
      </section>
      {Object.entries(CAR_CATEGORIES).map(([k, label]) => (
        <details key={k} className="group" open>
          <summary><span>{label}</span><span className="num meta">{r.byCategory[k].pct}% · {r.byCategory[k].complete}/{r.byCategory[k].applicable}</span></summary>
          <div>
            {items.filter((i) => i.category_key === k).map((i) => {
              const s = i.auto_link_rule && !i.link_state ? sug[i.auto_link_rule] : null;
              return (
                <div key={i.id} id={`i-${i.id}`} style={{ borderTop: "1px solid var(--line)", padding: "12px 0" }}>
                  <div className="spread">
                    <div>
                      <b>{i.item_text}</b> {i.is_new && <span className="chip review">New item</span>}
                      <div className="meta">
                        {i.accepted > 0 && `${i.accepted} accepted evidence · `}{i.pending > 0 && `${i.pending} evidence request${i.pending > 1 ? "s" : ""} open · `}
                        {i.link_state === "confirmed" && "Platform records confirmed · "}
                        {i.status === "not_applicable" && `Not applicable: ${i.na_reason}`}
                      </div>
                    </div>
                    <Chip status={i.status} />
                  </div>
                  {s && !ro && (
                    <form action={linkDecision} className="rule-row info" style={{ marginTop: 8 }}>
                      <Hidden values={{ item_id: i.id }} />
                      <span><b>Suggested evidence:</b> {s}</span>
                      <span className="row"><Submit name="op" value="confirm" className="btn secondary">Confirm</Submit><Submit name="op" value="dismiss" className="btn quiet">Dismiss</Submit></span>
                    </form>
                  )}
                  {!ro && (
                    <form action={setStatus} className="row" style={{ marginTop: 8, alignItems: "flex-end" }}>
                      <Hidden values={{ item_id: i.id }} />
                      <label className="small">Status <select name="status" defaultValue={i.status} style={{ width: "auto", display: "block" }}>{STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
                      <label className="small" style={{ flex: 1, minWidth: 200 }}>Reason if not applicable <input name="na_reason" defaultValue={i.na_reason ?? ""} /></label>
                      <Submit className="btn secondary">Save</Submit>
                      <Link className="btn quiet" href={`${b}/evidence?item=${i.id}`}>Request evidence</Link>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      ))}
    </>
  );
}
