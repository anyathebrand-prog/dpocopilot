import Link from "next/link";
import { redirect } from "next/navigation";
import { requireFirmRole, requireClient, audit } from "@/lib/auth";
import { q, one, tx } from "@/lib/db";
import { validateImport, IMPORT_TYPES, type ImportType, type Row } from "@/lib/importer";
import { insertClient } from "@/lib/clients";
import { str, flash } from "@/lib/form";
import { Flash, Field, Hidden, PageHead, Banner } from "@/components/ui";
import { Submit } from "@/components/client";

async function upload(fd: FormData) {
  "use server";
  const u = await requireFirmRole("firm_admin");
  const type = str(fd, "type") as ImportType;
  if (!IMPORT_TYPES[type]) redirect(flash("/app/import", "Choose what you are importing.", "error"));
  let clientId: string | null = null;
  if (type === "ropa_entries") clientId = (await requireClient(str(fd, "client_id"), { write: true })).client.id;
  const file = fd.get("file");
  if (!(file instanceof File) || !file.size) redirect(flash(`/app/import?type=${type}`, "Choose a CSV file.", "error"));
  if (!/\.csv$/i.test(file.name)) redirect(flash(`/app/import?type=${type}`, "Upload a .csv file. In Excel, use File > Save As > CSV.", "error"));
  if (file.size > 5 * 1024 * 1024) redirect(flash(`/app/import?type=${type}`, "The file is larger than 5 MB.", "error"));
  const names = (await q("select name from clients where firm_id = $1", [u.firm_id])).map((r) => r.name);
  const { error, rows } = validateImport(type, await file.text(), type === "clients_contacts" ? names : []);
  if (error) redirect(flash(`/app/import?type=${type}`, error, "error"));
  const job = await one("insert into import_jobs (firm_id, client_id, import_type, rows, created_by) values ($1,$2,$3,$4,$5) returning id", [u.firm_id, clientId, type, JSON.stringify(rows), u.id]);
  redirect(`/app/import?job=${job!.id}`);
}

/** Nothing is saved until confirm; then every valid row is created in one transaction and logged as imported (FR17.2–17.3). */
async function confirm(fd: FormData) {
  "use server";
  const u = await requireFirmRole("firm_admin");
  const job = await one("select * from import_jobs where id = $1 and firm_id = $2 and status = 'ready'", [str(fd, "job_id"), u.firm_id]);
  if (!job) redirect(flash("/app/import", "This import has already been completed or cancelled.", "error"));
  if (str(fd, "op") === "cancel") {
    await q("update import_jobs set status = 'cancelled', rows = '[]' where id = $1", [job.id]);
    redirect(flash("/app/import", "Import cancelled. Nothing was saved."));
  }
  if (job.client_id) await requireClient(job.client_id, { write: true });
  const rows = (job.rows as Row[]).filter((r) => !r.errors.length);
  let contacts = 0;
  await tx(async (t) => {
    for (const r of rows) {
      const d = r.data as Record<string, any>;
      if (job.import_type === "clients_contacts") {
        const id = await insertClient(t, u.firm_id, u.id, { name: d.name, sector: d.sector, size: d.size });
        await audit(u, "import", "client", id, { client_id: id, details: { row: r.n } }, t);
        if (d.contact_email) {
          await t.query("insert into client_contacts (firm_id, client_id, name, email) values ($1,$2,$3,$4)", [u.firm_id, id, d.contact_name ?? d.contact_email, d.contact_email]);
          contacts++;
        }
      } else {
        const e = await t.query<{ id: string }>(`insert into ropa_entries (firm_id, client_id, state, purpose, lawful_basis, data_subjects, data_categories, recipients, retention_period, security_measures, system_owner, has_transfer, transfer_safeguard, involves_sensitive, is_high_risk, source)
          values ($1,$2,'active',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13,'import') returning id`,
          [u.firm_id, job.client_id, d.purpose, d.lawful_basis, d.data_subjects, d.data_categories, d.recipients, d.retention_period, d.security_measures, d.system_owner, d.has_transfer, d.transfer_safeguard, d.involves_sensitive]);
        await audit(u, "import", "ropa_entry", e.rows[0].id, { client_id: job.client_id, details: { row: r.n } }, t);
      }
    }
    await t.query("update import_jobs set status = 'completed', rows = '[]' where id = $1", [job.id]);
  });
  // Contacts are created but not invited automatically; invite them from each client's settings when ready.
  redirect(flash(job.client_id ? `/app/clients/${job.client_id}/ropa?tab=active` : "/app", `Imported ${rows.length} record${rows.length === 1 ? "" : "s"}.${contacts ? ` ${contacts} contacts added: invite them from each client's settings.` : ""}`));
}

export default async function Import({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireFirmRole("firm_admin");
  const sp = await searchParams;
  const job = sp.job ? await one("select * from import_jobs where id = $1 and firm_id = $2 and status = 'ready'", [sp.job, u.firm_id]) : null;
  const clients = await q("select id, name from clients where firm_id = $1 and archived_at is null order by name", [u.firm_id]);

  if (job) {
    const rows = [...(job.rows as Row[])].sort((a, b) => b.errors.length - a.errors.length || a.n - b.n);
    const bad = rows.filter((r) => r.errors.length).length;
    const cols = IMPORT_TYPES[job.import_type as ImportType].columns.filter((c) => !c.startsWith("contact_") || job.import_type === "clients_contacts").slice(0, 4);
    return (
      <>
        <PageHead title="Check your import" sub={`Step 5 of 7 · ${IMPORT_TYPES[job.import_type as ImportType].label}`} />
        {bad > 0 ? <Banner kind="warn">{bad} row{bad > 1 ? "s have" : " has"} problems and will be skipped. Fix them in your file and upload again, or import the valid rows now.</Banner>
          : <Banner kind="ok">All {rows.length} rows are valid.</Banner>}
        <div className="scroll">
          <table className="register">
            <thead><tr><th className="num">Row</th>{cols.map((c) => <th key={c}>{c.replace(/_/g, " ")}</th>)}<th>Problems</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.n} className={r.errors.length ? "selected" : ""}>
                <td className="num">{r.n}</td>
                {cols.map((c) => <td key={c} data-label={c}>{String(r.data[c === "transfer_outside_nigeria" ? "has_transfer" : c] ?? "")}</td>)}
                <td data-label="Problems" style={{ color: r.errors.length ? "var(--red-700)" : undefined }}>{r.errors.join(" ") || "None"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <form action={confirm} className="row" style={{ marginTop: 16 }}>
          <Hidden values={{ job_id: job.id }} />
          <Submit name="op" value="confirm" disabled={bad === rows.length}>Import {rows.length - bad} valid row{rows.length - bad === 1 ? "" : "s"}</Submit>
          <Submit className="btn secondary" name="op" value="cancel">Cancel import</Submit>
        </form>
        {bad === rows.length && <p className="why">No valid rows to import.</p>}
      </>
    );
  }

  const type = (IMPORT_TYPES[sp.type as ImportType] ? sp.type : "clients_contacts") as ImportType;
  const template = "data:text/csv;charset=utf-8," + encodeURIComponent(IMPORT_TYPES[type].columns.join(",") + "\n");
  return (
    <>
      <PageHead title="Import existing records" sub="Bring in clients or RoPA registers from spreadsheets. Nothing is saved until you confirm." />
      <Flash sp={sp} />
      <ol style={{ maxWidth: 640, paddingLeft: 20 }}>
        <li><form className="row" style={{ alignItems: "flex-end" }}><Field label="What are you importing?"><select name="type" defaultValue={type}>{Object.entries(IMPORT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field><div style={{ marginBottom: 20 }}><button className="btn secondary">Choose</button></div></form></li>
        <li style={{ marginBottom: 16 }}><a href={template} download={`dpo-copilot-${type}-template.csv`}>Download the {IMPORT_TYPES[type].label.toLowerCase()} template (CSV)</a> and copy your data into it. Keep the header row.</li>
        <li>
          <form action={upload}>
            <Hidden values={{ type }} />
            {type === "ropa_entries" && (
              <Field label="Client" required><select name="client_id" required defaultValue=""><option value="" disabled>Choose…</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            )}
            <Field label="CSV file" help="Excel users: File > Save As > CSV (UTF-8)." required><input type="file" name="file" accept=".csv,text/csv" required /></Field>
            <Submit>Upload and check</Submit>
          </form>
        </li>
      </ol>
      <p className="meta">Importing past DPIAs, policies and evidence files is not available yet. <Link href="/app">Back to clients</Link></p>
    </>
  );
}
