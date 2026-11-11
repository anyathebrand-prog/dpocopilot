import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClient, audit } from "@/lib/auth";
import { q, tx } from "@/lib/db";
import { str, all, flash } from "@/lib/form";
import { answersOf } from "@/lib/data";
import { list } from "@/lib/questionnaire";
import { departmentOptions } from "@/lib/ropa-fields";
import { draftDpiaBody, DPIA_DOCS } from "@/lib/dpia-draft";
import { storeFile, ACCEPT } from "@/lib/files";
import { Field, Hidden, Flash } from "@/components/ui";
import { Submit } from "@/components/client";
import { DpiaEntries } from "@/components/dpia-entries";

/** One DPIA per entry (a system or process). Each is drafted straight away from the client's records, all 13 steps. */
async function create(fd: FormData) {
  "use server";
  const { user, client } = await requireClient(str(fd, "client_id"), { write: true });
  const year = Number(str(fd, "assessment_year")), picked = all(fd, "ropa");
  const titles = fd.getAll("title").map((x) => String(x).trim().slice(0, 300)), depts = fd.getAll("dept").map((x) => String(x).trim().slice(0, 120));
  const systems = fd.getAll("system").map((x) => String(x).trim().slice(0, 200));
  const entries = titles.map((title, i) => ({ title, system: systems[i] ?? "", dept: depts[i] ?? "", files: fd.getAll(`docs${i}`).filter((f): f is File => f instanceof File && f.size > 0) })).filter((e) => e.title);
  const self = `/app/clients/${client.id}/dpias/new`;
  if (!entries.length) redirect(flash(self, "Enter the system or process to assess.", "error"));
  if (!Number.isInteger(year) || year < 2019 || year > 2100) redirect(flash(self, "Enter the assessment year as four digits, for example 2026.", "error"));
  const valid = await q("select id from ropa_entries where client_id = $1 and id = any($2::uuid[])", [client.id, picked]);
  if (valid.length !== picked.length) redirect("/forbidden");
  // Store every document first, so a rejected file stops before any DPIA is created.
  const stored: string[][] = [];
  for (const e of entries) {
    const ids: string[] = [];
    for (const f of e.files) { const r = await storeFile(user, client as { id: string; firm_id: string }, f, null); if ("error" in r) redirect(flash(self, r.error, "error")); ids.push(r.id); }
    stored.push(ids);
  }
  const ids: string[] = [];
  for (const [k, e] of entries.entries()) {
    // Linked activities: the ones ticked, plus the department's active RoPA entries.
    const inDept = e.dept ? (await q<{ id: string }>("select id from ropa_entries where client_id = $1 and state = 'active' and lower(department) = lower($2)", [client.id, e.dept])).map((r) => r.id) : [];
    const ropa = [...new Set([...picked, ...inDept])];
    const body = await draftDpiaBody(client.id, ropa, { system: e.system || e.title, department: e.dept || undefined });
    ids.push(await tx(async (t) => {
      const d = await t.query<{ id: string }>("insert into dpias (firm_id, client_id, title, assessment_year, created_by, system_name) values ($1,$2,$3,$4,$5,$6) returning id", [client.firm_id, client.id, e.title, year, user.id, e.system || null]);
      if (stored[k].length) await t.query("update files set dpia_id = $2 where id = any($1::uuid[]) and client_id = $3", [stored[k], d.rows[0].id, client.id]);
      for (const r of ropa) await t.query("insert into dpia_ropa (dpia_id, ropa_entry_id) values ($1,$2)", [d.rows[0].id, r]);
      await t.query("insert into content_versions (firm_id, client_id, parent_type, parent_id, version_no, body, created_by) values ($1,$2,'dpia',$3,1,$4,$5)", [client.firm_id, client.id, d.rows[0].id, JSON.stringify(body), user.id]);
      await audit(user, "create", "dpia", d.rows[0].id, { client_id: client.id, details: { assessment_year: year, system: e.system || undefined, department: e.dept || undefined, documents: stored[k].length, drafted: true } }, t);
      return d.rows[0].id;
    }));
  }
  const msg = "drafted from the client's records. Review each step, complete the [To be completed] parts and edit as needed.";
  if (ids.length === 1) redirect(flash(`/app/clients/${client.id}/dpias/${ids[0]}`, `DPIA started and all 13 steps ${msg}`));
  redirect(flash(`/app/clients/${client.id}/dpias?year=${year}`, `${ids.length} DPIAs started, each ${msg}`));
}

export default async function NewDpia({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId } = await params;
  const sp = await searchParams;
  await requireClient(clientId, { write: true });
  const ropa = await q("select id, purpose, department, involves_sensitive, is_high_risk from ropa_entries where client_id = $1 and state = 'active' order by purpose", [clientId]);
  const from = ropa.find((r) => r.id === sp.ropa);
  const departments = departmentOptions(list((await answersOf(clientId)).org_departments), ropa.map((r) => r.department));
  return (
    <>
      <h2 style={{ marginTop: 0 }}>Start DPIA</h2>
      <p className="meta">A DPIA is carried out for a specific system. Add one entry per system (use + Add entry for more), with its supporting documents. Every step is drafted from the company profile, onboarding answers and RoPA, and stays editable.</p>
      <Flash sp={sp} />
      <form action={create} style={{ maxWidth: 820 }}>
        <Hidden values={{ client_id: clientId }} />
        <DpiaEntries initial={{ title: from?.purpose ?? "", system: "", dept: from?.department ?? "" }} departments={departments} docs={DPIA_DOCS} accept={ACCEPT} />
        <Field label="Assessment year" required help="The year these DPIAs assess. Used to look DPIAs up by year.">
          <input type="number" name="assessment_year" min={2019} max={2100} required defaultValue={Number(sp.year) || new Date().getFullYear()} style={{ width: 140 }} />
        </Field>
        {ropa.length > 0 && (
          <fieldset>
            <legend>Other processing activities to cover (optional)</legend>
            <p className="meta" style={{ marginTop: 0 }}>Ticked activities are linked to every entry above, in addition to each entry&apos;s department activities.</p>
            {ropa.map((r) => (
              <label key={r.id} className="check"><input type="checkbox" name="ropa" value={r.id} defaultChecked={r.id === sp.ropa} />{r.purpose}
                {r.department && <span className="meta"> · {r.department}</span>}
                {(r.involves_sensitive || r.is_high_risk) && <span className="meta"> · {r.involves_sensitive ? "sensitive data" : "high risk"}</span>}</label>
            ))}
          </fieldset>
        )}
        <div className="row"><Submit>Create and draft DPIA</Submit><Link className="btn secondary" href={`/app/clients/${clientId}/dpias`}>Cancel</Link></div>
      </form>
    </>
  );
}
