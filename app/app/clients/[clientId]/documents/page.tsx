import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { q } from "@/lib/db";
import { generateDocument } from "@/lib/content";
import { TEMPLATE_TITLES } from "@/lib/templates";
import { Flash, Chip, Empty, Hidden, Field } from "@/components/ui";
import { Submit } from "@/components/client";

export default async function Documents({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId } = await params;
  const sp = await searchParams;
  const { client } = await requireClient(clientId);
  const rows = await q(`select d.*, v.status, v.version_no, v.ai_generated from documents d
    join lateral (select * from content_versions where parent_type = 'document' and parent_id = d.id order by version_no desc limit 1) v on true
    where d.client_id = $1 order by d.created_at desc`, [clientId]);
  const active = await q("select 1 from ropa_entries where client_id = $1 and state = 'active' limit 1", [clientId]);
  return (
    <>
      <h2 style={{ marginTop: 0 }}>Documents</h2>
      <Flash sp={sp} />
      {!client.archived_at && (
        <form action={generateDocument} className="panel row" style={{ alignItems: "flex-end", marginBottom: 24 }}>
          <Hidden values={{ client_id: clientId }} />
          <Field label="Template"><select name="template_key">{Object.entries(TEMPLATE_TITLES).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></Field>
          <div style={{ marginBottom: 20 }}><Submit>Generate document</Submit></div>
          {!active.length && <p className="why" style={{ width: "100%" }}>No active RoPA entries yet, so some fields can&apos;t be pre-filled. You can still generate and edit by hand.</p>}
        </form>
      )}
      {rows.length === 0 ? <Empty><p>Generate your first policy from the client&apos;s data map.</p></Empty> : (
        <table className="register">
          <thead><tr><th>Document</th><th>Status</th><th className="num">Version</th><th>NDPA provisions</th></tr></thead>
          <tbody>{rows.map((d) => (
            <tr key={d.id}>
              <td><Link href={`/app/clients/${clientId}/documents/${d.id}`}>{d.title}</Link></td>
              <td data-label="Status"><Chip status={d.status} ai={d.ai_generated} /></td>
              <td data-label="Version" className="num">{d.version_no}</td>
              <td data-label="NDPA" className="small">{d.ndpa_refs}{d.reference_tags && <div className="meta">Also: {d.reference_tags}</div>}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </>
  );
}
