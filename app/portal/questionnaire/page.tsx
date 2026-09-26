import Link from "next/link";
import { requireContact } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { answersOf } from "@/lib/data";
import { Flash, Banner } from "@/components/ui";
import { Questionnaire } from "@/components/questionnaire";

export default async function PortalQuestionnaire({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireContact();
  const sp = await searchParams;
  const qn = await one("select status from questionnaires where client_id = $1", [u.client_id]);
  const byFirm = (await q("select a.question_key from answers a join memberships m on m.user_id = a.updated_by where a.client_id = $1", [u.client_id])).map((r) => r.question_key);
  return (
    <>
      <p><Link href="/portal">Back to home</Link></p>
      <h1 style={{ fontSize: 24 }}>Onboarding questions</h1>
      <Flash sp={sp} />
      {qn!.status === "completed" ? <Banner kind="ok">You&apos;ve sent your answers. Your DPCO will contact you if they need anything else.</Banner> :
        <p className="meta">Your answers save each time you continue. You can stop and come back later.</p>}
      <Questionnaire answers={await answersOf(u.client_id!)} s={Number(sp.s ?? 0)} base="/portal/questionnaire" readOnly={qn!.status === "completed"} portal updatedByFirm={byFirm} />
    </>
  );
}
