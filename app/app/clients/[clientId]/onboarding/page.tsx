import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { answersOf } from "@/lib/data";
import { progress } from "@/lib/questionnaire";
import { sendQuestionnaire, completeQuestionnaire } from "@/lib/onboarding";
import { fmtWAT } from "@/lib/rules";
import { Flash, Hidden, Field, Banner } from "@/components/ui";
import { Submit } from "@/components/client";
import { Questionnaire } from "@/components/questionnaire";

const STATUS: Record<string, string> = { not_sent: "Not sent", sent: "Sent", in_progress: "In progress", completed: "Completed" };

export default async function Onboarding({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { clientId } = await params;
  const sp = await searchParams;
  const { client } = await requireClient(clientId);
  const qn = await one("select q.*, cc.name as contact_name from questionnaires q left join client_contacts cc on cc.id = q.assigned_contact_id where q.client_id = $1", [clientId]);
  const contacts = await q("select id, name, email from client_contacts where client_id = $1 and status <> 'invite_revoked'", [clientId]);
  const answers = await answersOf(clientId);
  const base = `/app/clients/${clientId}/onboarding`;
  const ro = !!client.archived_at;
  return (
    <>
      <h2 style={{ marginTop: 0 }}>Onboarding questionnaire</h2>
      <Flash sp={sp} />
      <p>Status: <b>{STATUS[qn!.status]}{qn!.status === "in_progress" && `, ${progress(answers)}% answered`}</b>
        {qn!.contact_name && <span className="meta"> · Sent to {qn!.contact_name}{qn!.sent_at && `, ${fmtWAT(qn!.sent_at)}`}</span>}
        {qn!.completed_at && <span className="meta"> · Completed {fmtWAT(qn!.completed_at)}</span>}</p>

      {!ro && qn!.status !== "completed" && (contacts.length ? (
        <form action={sendQuestionnaire} className="row" style={{ alignItems: "flex-end", marginBottom: 24 }}>
          <Hidden values={{ client_id: clientId, reminder: qn!.status === "not_sent" ? "" : "1" }} />
          <Field label="Client contact"><select name="contact_id" defaultValue={qn!.assigned_contact_id ?? contacts[0].id}>{contacts.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}</select></Field>
          <div style={{ marginBottom: 20 }}><Submit className="btn secondary">{qn!.status === "not_sent" ? "Send to contact" : "Send reminder"}</Submit></div>
        </form>
      ) : <Banner>Invite a client contact first to send the questionnaire. <Link href={`/app/clients/${clientId}/settings`}>Client settings</Link></Banner>)}

      {qn!.status === "completed" && !ro && (
        <Banner>Completed. If answers change, save them and run &quot;Update inventory&quot; to add new items. Existing RoPA entries are not overwritten.
          <form action={completeQuestionnaire} style={{ marginTop: 8 }}><Hidden values={{ client_id: clientId }} /><Submit className="btn secondary">Update inventory</Submit></form>
        </Banner>
      )}
      <p className="meta">You can fill in answers on the client&apos;s behalf. Each section saves separately.</p>
      <Questionnaire answers={answers} s={Number(sp.s ?? 0)} base={base} clientId={clientId} readOnly={ro} />
    </>
  );
}
