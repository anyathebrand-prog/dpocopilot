import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClient, audit } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { LAWFUL_BASIS } from "@/lib/templates";
import { fmtWAT } from "@/lib/rules";
import { str, opt, flash } from "@/lib/form";
import { Flash, Field, Hidden, Chip, Banner } from "@/components/ui";
import { Submit, Confirm } from "@/components/client";

const TEXT: [string, string, string?][] = [
  ["data_subjects", "Data subject categories", "Whose data. Separate with commas."],
  ["data_categories", "Personal data categories", "Separate with commas."],
  ["recipients", "Recipients", "Who receives the data."],
  ["retention_period", "Retention period"],
  ["security_measures", "Security measures"],
  ["system_owner", "System and owner"],
];

async function save(fd: FormData) {
  "use server";
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const id = str(fd, "id");
  const purpose = str(fd, "purpose");
  const b = `/app/clients/${client.id}/ropa`;
  if (!purpose) redirect(flash(`${b}/${id || "new"}`, "Enter the purpose.", "error"));
  const lb = str(fd, "lawful_basis");
  const vals = [purpose, LAWFUL_BASIS[lb] ? lb : null, ...TEXT.map(([k]) => opt(fd, k)), fd.get("has_transfer") === "on", opt(fd, "transfer_safeguard"), fd.get("involves_sensitive") === "on", fd.get("is_high_risk") === "on"];
  let entryId = id;
  if (id) {
    const r = await one(`update ropa_entries set purpose=$3, lawful_basis=$4, data_subjects=$5, data_categories=$6, recipients=$7, retention_period=$8, security_measures=$9, system_owner=$10,
      has_transfer=$11, transfer_safeguard=$12, involves_sensitive=$13, is_high_risk=$14, state = case when state = 'proposed' then 'active' else state end, updated_at = now()
      where id = $1 and client_id = $2 returning id`, [id, client.id, ...vals]);
    if (!r) redirect("/forbidden");
    await audit(user, "update", "ropa_entry", id, { client_id: client.id });
  } else {
    const r = await one(`insert into ropa_entries (firm_id, client_id, state, purpose, lawful_basis, data_subjects, data_categories, recipients, retention_period, security_measures, system_owner, has_transfer, transfer_safeguard, involves_sensitive, is_high_risk, source)
      values ($1,$2,'active',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'manual') returning id`, [client.firm_id, client.id, ...vals]);
    entryId = r!.id;
    await audit(user, "create", "ropa_entry", entryId, { client_id: client.id });
  }
  redirect(flash(`${b}?tab=active`, "Entry saved"));
}

async function archive(fd: FormData) {
  "use server";
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  await q("update ropa_entries set state = 'archived', updated_at = now() where id = $1 and client_id = $2", [str(fd, "id"), client.id]);
  await audit(user, "archive", "ropa_entry", str(fd, "id"), { client_id: client.id });
  redirect(flash(`/app/clients/${client.id}/ropa?tab=archived`, "Entry archived"));
}

export default async function Entry({ params, searchParams }: { params: Promise<{ clientId: string; entryId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId, entryId } = await params;
  const sp = await searchParams;
  const { client } = await requireClient(clientId);
  const isNew = entryId === "new";
  const e = isNew ? null : await one("select * from ropa_entries where id = $1 and client_id = $2", [/^[0-9a-f-]{36}$/.test(entryId) ? entryId : null, clientId]);
  if (!isNew && !e) redirect("/forbidden");
  const dpias = e ? await q(`select d.id, d.title, (select status from content_versions v where v.parent_type = 'dpia' and v.parent_id = d.id order by version_no desc limit 1) as status
    from dpias d join dpia_ropa dr on dr.dpia_id = d.id where dr.ropa_entry_id = $1`, [e.id]) : [];
  const history = e ? await q("select a.occurred_at, a.action, u.name from audit_events a left join users u on u.id = a.actor_user_id where a.entity_type = 'ropa_entry' and a.entity_id = $1 order by a.occurred_at desc limit 20", [e.id]) : [];
  const ro = !!client.archived_at || e?.state === "archived";
  const h = <Hidden values={{ client_id: clientId, id: e?.id }} />;
  return (
    <>
      <nav className="meta" aria-label="Breadcrumb"><Link href={`/app/clients/${clientId}/ropa`}>RoPA</Link> / {isNew ? "New entry" : e!.purpose}</nav>
      <h2 style={{ marginTop: 8 }}>{isNew ? "New processing activity" : e!.purpose} {e && <Chip status={e.state} />}</h2>
      <Flash sp={sp} />
      <div className="with-rail">
        <form action={save}>{h}
          {e?.state === "proposed" && <Banner>Proposed from the onboarding questionnaire. Check each field; saving makes it active.</Banner>}
          {dpias.some((d) => d.status !== "draft") && <Banner kind="warn">This entry is used by an approved or in-review DPIA. Changes here won&apos;t alter that DPIA.</Banner>}
          <fieldset disabled={ro}>
            <Field label="Purpose" required><input name="purpose" defaultValue={e?.purpose ?? ""} required /></Field>
            <Field label="Lawful basis" help="NDPA 2023 s.25. Empty entries are flagged as gaps.">
              <select name="lawful_basis" defaultValue={e?.lawful_basis ?? ""}><option value="">Not yet chosen</option>{Object.entries(LAWFUL_BASIS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            </Field>
            {TEXT.map(([k, l, help]) => <Field key={k} label={l} help={help}>{k === "security_measures" ? <textarea name={k} defaultValue={e?.[k] ?? ""} /> : <input name={k} defaultValue={e?.[k] ?? ""} />}</Field>)}
            <label className="check"><input type="checkbox" name="involves_sensitive" defaultChecked={e?.involves_sensitive} />Involves sensitive personal data</label>
            <label className="check"><input type="checkbox" name="is_high_risk" defaultChecked={e?.is_high_risk} />High-risk processing (needs a DPIA)</label>
            <label className="check"><input type="checkbox" name="has_transfer" defaultChecked={e?.has_transfer} />Data is transferred outside Nigeria</label>
            <Field label="Transfer safeguard" help="Legal basis or safeguard for the transfer (NDPA s.41–43)."><textarea name="transfer_safeguard" defaultValue={e?.transfer_safeguard ?? ""} /></Field>
            <div className="row">
              <Submit>{e?.state === "proposed" ? "Accept and save" : "Save entry"}</Submit>
              <Link className="btn secondary" href={`/app/clients/${clientId}/ropa`}>Cancel</Link>
            </div>
          </fieldset>
        </form>
        {e && (
          <aside>
            <section className="panel">
              <h3>Linked DPIAs</h3>
              {dpias.length ? dpias.map((d) => <p key={d.id}><Link href={`/app/clients/${clientId}/dpias/${d.id}`}>{d.title}</Link> <Chip status={d.status} /></p>) : <p className="meta">None.</p>}
              {!ro && <Link className="btn secondary" href={`/app/clients/${clientId}/dpias/new?ropa=${e.id}`}>Start DPIA for this entry</Link>}
            </section>
            <section className="panel">
              <h3>Change history</h3>
              {history.map((x, i) => <p key={i} className="small">{fmtWAT(x.occurred_at)}: {x.action} by {x.name ?? "system"}</p>)}
              {!history.length && <p className="meta">Created from the questionnaire.</p>}
            </section>
            {!ro && <section className="panel"><Confirm action={archive} title="Archive this entry?" body="It moves to the Archived list and stops feeding new documents. Nothing is deleted." label="Archive entry">{h}</Confirm></section>}
          </aside>
        )}
      </div>
    </>
  );
}
