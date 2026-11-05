import { redirect } from "next/navigation";
import { requireFirmRole, audit } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { str, flash } from "@/lib/form";
import { fmtWAT } from "@/lib/rules";
import { naira } from "@/lib/invoice";
import { money } from "@/lib/proposal";
import { notifyFirm } from "@/lib/solo";
import { PageHead, Flash, Hidden, Empty, Field } from "@/components/ui";
import { Submit } from "@/components/client";

const BACK = "/app/solo-dpos";
const reviewer = () => requireFirmRole("firm_admin", "lead_consultant");

async function decide(fd: FormData) {
  "use server";
  const u = await reviewer();
  const ok = str(fd, "op") === "approve";
  const f = await one("update firms set dpco_status = $3 where id = $1 and dpco_firm_id = $2 and dpco_status = 'pending' returning id, name", [str(fd, "firm_id"), u.firm_id, ok ? "approved" : "declined"]);
  if (!f) redirect(BACK);
  await audit(u, "update", "firm", f.id, { firm_id: u.firm_id, details: { solo_dpo: f.id, decision: ok ? "approved" : "declined" } });
  await notifyFirm(f.id, "solo_decision", ok ? `${u.firm_name} has approved you. You can now use your DPO Copilot workspace.` : `${u.firm_name} declined your request to work under them. Sign in to choose another DPCO firm.`, ok ? "/app" : "/choose-dpco");
  redirect(flash(BACK, ok ? `${f.name} approved and notified.` : `${f.name} declined and notified.`));
}

async function review(fd: FormData) {
  "use server";
  const u = await reviewer();
  const ok = str(fd, "op") === "approve", note = str(fd, "note").slice(0, 2000);
  if (!ok && !note) redirect(flash(BACK, "Say what needs changing before returning the proposal.", "error"));
  const p = await one(`update proposals p set review_status = $3, review_note = $4, reviewed_by = $5, reviewed_at = now() from firms f
    where p.id = $1 and f.id = p.firm_id and f.dpco_firm_id = $2 and f.dpco_status = 'approved' and p.review_status = 'submitted' returning p.id, p.number, p.client_name, p.firm_id`,
    [str(fd, "id"), u.firm_id, ok ? "approved" : "returned", note || null, u.id]);
  if (!p) redirect(BACK);
  await audit(u, "update", "proposal", p.id, { firm_id: u.firm_id, details: { review: ok ? "approved" : "returned" } });
  await notifyFirm(p.firm_id, "proposal_decision", ok
    ? `${u.firm_name} approved proposal ${p.number} for ${p.client_name}. You can now download the PDF and send it to the client.`
    : `${u.firm_name} returned proposal ${p.number} for ${p.client_name}: ${note}`, `/app/proposals/${p.id}`);
  redirect(flash(BACK, ok ? `Proposal ${p.number} approved and sent back.` : `Proposal ${p.number} returned with your note.`));
}

/** A Solo DPO's professional details from sign-up, with their certificate and CV. */
function Profile({ s }: { s: Record<string, any> }) {
  if (!s.certification) return null;
  const file = (kind: string) => `/solo-file?firm=${s.id}&kind=${kind}`;
  return (
    <div className="small" style={{ marginTop: 6 }}>
      {s.certification} · {s.years_experience} year{s.years_experience === 1 ? "" : "s"} · {s.state} · {s.phone}
      <div className="row" style={{ gap: 12 }}><a href={file("cert")} target="_blank">Certificate</a>{s.cv_name && <a href={file("cv")} target="_blank">CV</a>}{s.linkedin && <a href={s.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>}</div>
    </div>
  );
}

/** DPCO firm: approve Solo DPOs who want to work under the firm, and review their proposals before they reach clients. */
export default async function SoloDpos({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await reviewer();
  const sp = await searchParams;
  const solos = await q(`select f.id, f.name, f.dpco_status, us.name as person, us.email, sp.phone, sp.state, sp.years_experience, sp.certification, sp.ndpc_number, sp.linkedin, sp.cert_name, sp.cv_name from firms f
    left join solo_profiles sp on sp.firm_id = f.id
    left join lateral (select x.name, x.email from memberships m join users x on x.id = m.user_id where m.firm_id = f.id and m.status = 'active' limit 1) us on true
    where f.dpco_firm_id = $1 and f.dpco_status in ('pending','approved') order by f.name`, [u.firm_id]);
  const props = await q(`select p.*, f.name as solo from proposals p join firms f on f.id = p.firm_id
    where f.dpco_firm_id = $1 and f.dpco_status = 'approved' and p.review_status = 'submitted' order by p.updated_at`, [u.firm_id]);
  const pending = solos.filter((s) => s.dpco_status === "pending"), approved = solos.filter((s) => s.dpco_status === "approved");
  const exp = (id: string, doc: string, f: string) => `/export?kind=proposal&id=${id}&doc=${doc}&format=${f}`;
  return (
    <>
      <PageHead title="Solo DPOs" sub="Independent DPOs working under your firm. Approve them, and approve their proposals before they reach clients." />
      <Flash sp={sp} />
      <h2>Requests to work under {u.firm_name}</h2>
      {pending.length === 0 ? <p className="meta">No requests waiting.</p> : pending.map((s) => (
        <form key={s.id} action={decide} className="rule-row info"><Hidden values={{ firm_id: s.id }} />
          <span><b>{s.person ?? s.name}</b> · {s.name}<div className="meta">{s.email}</div><Profile s={s} /></span>
          <span className="row"><Submit name="op" value="approve">Approve</Submit><Submit className="btn secondary" name="op" value="decline">Decline</Submit></span>
        </form>
      ))}
      <h2>Proposals to review</h2>
      {props.length === 0 ? <p className="meta">No proposals waiting.</p> : props.map((p) => (
        <div key={p.id} className="panel" style={{ marginBottom: 12 }}>
          <div className="spread">
            <span><b>{p.client_name}</b> · {p.number} · {naira(money(p as any).total)}<div className="meta">From {p.solo} · submitted {fmtWAT(p.updated_at)}</div></span>
            <span className="row"><a className="btn secondary" href={exp(p.id, "proposal", "pdf")} target="_blank">Proposal PDF</a><a className="btn secondary" href={exp(p.id, "proposal", "doc")}>Word</a><a className="btn secondary" href={exp(p.id, "letter", "pdf")} target="_blank">Cover letter</a></span>
          </div>
          <form action={review} className="row" style={{ marginTop: 8, alignItems: "flex-end" }}><Hidden values={{ id: p.id }} />
            <Field label="Note to the Solo DPO" help="Required when returning it for changes."><input name="note" style={{ width: 360 }} /></Field>
            <Submit name="op" value="approve">Approve</Submit><Submit className="btn secondary" name="op" value="return">Return for changes</Submit>
          </form>
        </div>
      ))}
      <h2>Working under {u.firm_name}</h2>
      {approved.length === 0 ? <Empty><p>No approved Solo DPOs yet.</p></Empty> : (
        <table className="register"><thead><tr><th>Solo DPO</th><th>Practice</th><th>Details</th></tr></thead>
          <tbody>{approved.map((s) => <tr key={s.id}><td>{s.person}<div className="meta">{s.email}</div></td><td data-label="Practice">{s.name}</td><td data-label="Details"><Profile s={s} /></td></tr>)}</tbody></table>
      )}
    </>
  );
}
