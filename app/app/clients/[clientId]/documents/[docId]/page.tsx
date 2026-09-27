import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClient, audit } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { latestVersion, versionsOf, getVersion, signatureFor } from "@/lib/data";
import { saveBody } from "@/lib/content";
import { TODO } from "@/lib/templates";
import { str, opt, flash } from "@/lib/form";
import { Flash, Field, Hidden, Chip, Seal, Doc, Banner } from "@/components/ui";
import { Submit } from "@/components/client";
import { ReviewBar, AiPanel, Versions } from "@/components/workflow";

async function saveMapping(fd: FormData) {
  "use server";
  const d = await one("select id, client_id from documents where id = $1", [str(fd, "doc_id")]);
  if (!d) redirect("/forbidden");
  const { user } = await requireClient(d.client_id, { write: true });
  await q("update documents set ndpa_refs = $2, reference_tags = $3 where id = $1", [d.id, opt(fd, "ndpa_refs"), opt(fd, "reference_tags")]);
  await audit(user, "update", "document", d.id, { client_id: d.client_id, details: { mapping: true } });
  redirect(flash(`/app/clients/${d.client_id}/documents/${d.id}`, "Mapping saved"));
}

export default async function DocumentPage({ params, searchParams }: { params: Promise<{ clientId: string; docId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId, docId } = await params;
  const sp = await searchParams;
  const { user, client } = await requireClient(clientId);
  const d = await one("select * from documents where id = $1 and client_id = $2", [/^[0-9a-f-]{36}$/.test(docId) ? docId : null, clientId]);
  if (!d) redirect("/forbidden");
  const latest = (await latestVersion("document", d.id))!;
  const picked = sp.v ? await getVersion(sp.v) : null;
  const v = picked && picked.parent_id === d.id ? picked : latest;
  const viewingOld = v.id !== latest.id;
  const editable = v.status === "draft" && !viewingOld && !client.archived_at;
  const back = `/app/clients/${clientId}/documents/${d.id}`;
  const sig = v.status === "client_signed_off" ? await signatureFor(v.id) : null;
  return (
    <>
      <nav className="meta" aria-label="Breadcrumb"><Link href={`/app/clients/${clientId}/documents`}>Documents</Link> / {d.title}</nav>
      <h2 style={{ marginTop: 8 }}>{d.title} <Chip status={v.status} ai={v.ai_generated} /></h2>
      <Flash sp={sp} />
      {viewingOld && <Banner>You are viewing version {v.version_no}. <Link href={back}>Go to the current version</Link></Banner>}
      {editable && v.body.includes(TODO) && <Banner kind="warn">Some fields couldn&apos;t be pre-filled from the data map. They are highlighted as {TODO}.</Banner>}
      <div className="with-rail">
        <div>
          <Seal v={v} sig={sig} />
          {editable ? (
            <form action={saveBody}>
              <Hidden values={{ id: v.id, back }} />
              <Field label="Document text" help="Start a line with # for the title, ## for a heading, - for a bullet.">
                <textarea name="body" className="doc-edit" defaultValue={v.body} />
              </Field>
              <Submit>Save draft</Submit>
            </form>
          ) : null}
          <h3>{editable ? "Preview" : "Document"}</h3>
          <Doc body={v.body} className={v.status === "draft" ? `draft ${v.ai_generated ? "ai-origin" : ""}` : ""} />
        </div>
        <aside>
          {!viewingOld && !client.archived_at && <ReviewBar v={v} user={user} back={back} signoff />}
          {editable && <AiPanel v={v} back={back} label="Improve with AI" />}
          <section className="panel">
            <h3>NDPA mapping</h3>
            <form action={saveMapping}>
              <Hidden values={{ doc_id: d.id }} />
              <fieldset disabled={!!client.archived_at}>
                <Field label="NDPA 2023 provisions"><input name="ndpa_refs" defaultValue={d.ndpa_refs ?? ""} /></Field>
                <Field label="Other standards (reference only)" help="For example: ISO 27001, GDPR. Not assessed in V1."><input name="reference_tags" defaultValue={d.reference_tags ?? ""} /></Field>
                <Submit className="btn secondary">Save mapping</Submit>
              </fieldset>
            </form>
          </section>
          <Versions versions={await versionsOf("document", d.id)} current={v.id} base={back} />
        </aside>
      </div>
    </>
  );
}
