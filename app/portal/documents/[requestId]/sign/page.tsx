import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireContact, audit, send, notifyTeam, clientIp } from "@/lib/auth";
import { q, one, tx } from "@/lib/db";
import { newOtp, sha256 } from "@/lib/crypto";
import { dpiaText } from "@/lib/templates";
import { riskLevel, fmtWAT } from "@/lib/rules";
import { str, flash } from "@/lib/form";
import { Flash, Field, Hidden, Doc, Banner } from "@/components/ui";
import { Submit } from "@/components/client";

// FR14.3 default (TRD §6.1, pending PRD Q-1): typed name + one-time code by email + hash of the exact version.
// ponytail: SMS channel and certificate-based e-signature not wired; add behind sendCode if the founder chooses them.

async function load(requestId: string) {
  const u = await requireContact();
  const s = await one(`select s.*, v.body, v.status as v_status, v.version_no, v.parent_type, v.parent_id, coalesce(d.title, dp.title) as title,
      (select max(version_no) from content_versions x where x.parent_type = v.parent_type and x.parent_id = v.parent_id) as latest_no
    from signoff_requests s join content_versions v on v.id = s.version_id
    left join documents d on v.parent_type = 'document' and d.id = v.parent_id left join dpias dp on v.parent_type = 'dpia' and dp.id = v.parent_id
    where s.id = $1 and s.client_id = $2`, [/^[0-9a-f-]{36}$/.test(requestId) ? requestId : null, u.client_id]);
  if (!s) redirect("/forbidden");
  const body = s.parent_type === "dpia" ? dpiaText(s.title, s.body, riskLevel) : s.body;
  return { u, s, body, self: `/portal/documents/${s.id}/sign` };
}

async function sendCode(fd: FormData) {
  "use server";
  const { u, s, self } = await load(str(fd, "request_id"));
  if (s.status !== "pending") redirect(flash("/portal/documents", "This document no longer needs signing.", "error"));
  const recent = await one<{ n: number }>("select count(*)::int as n from otp_challenges where user_id = $1 and created_at > now() - interval '15 minutes'", [u.id]);
  if (recent!.n >= 5) redirect(flash(self, "Too many codes requested. Wait 15 minutes and try again.", "error"));
  const code = newOtp();
  await q("insert into otp_challenges (user_id, request_id, code_hash, expires_at) values ($1,$2,$3, now() + interval '10 minutes')", [u.id, s.id, sha256(`${s.id}:${code}`)]);
  await send("email", u.email, "otp", `Your DPO Copilot signing code is ${code}. It expires in 10 minutes.`);
  redirect(flash(self, `We sent a 6-digit code to ${u.email}. It expires in 10 minutes.`));
}

async function sign(fd: FormData) {
  "use server";
  const { u, s, body, self } = await load(str(fd, "request_id"));
  const name = str(fd, "typed_name"), code = str(fd, "code");
  if (name.length < 2) redirect(flash(self, "Type your full name.", "error"));
  if (fd.get("consent") !== "on") redirect(flash(self, "Tick the box to confirm you are signing.", "error"));
  const ch = await one("select * from otp_challenges where user_id = $1 and request_id = $2 and consumed_at is null order by created_at desc limit 1", [u.id, s.id]);
  if (!ch || +ch.expires_at < Date.now()) redirect(flash(self, "Your code has expired. Send a new code.", "error"));
  if (ch.attempts >= 5) redirect(flash("/portal/documents", "Too many wrong codes. Request a new code later.", "error"));
  // The attempt is counted in its own statement so it sticks even when signing fails.
  await q("update otp_challenges set attempts = attempts + 1 where id = $1", [ch.id]);
  if (ch.code_hash !== sha256(`${s.id}:${code}`)) redirect(flash(self, `That code is wrong. ${4 - ch.attempts} attempt${4 - ch.attempts === 1 ? "" : "s"} left.`, "error"));
  if (s.status !== "pending" || s.v_status !== "awaiting_client_signoff" || s.version_no !== s.latest_no) redirect(flash("/portal/documents", "This version is no longer current. Your DPCO will send the new version.", "error"));
  const h = await headers();
  await tx(async (t) => {
    await t.query("update otp_challenges set consumed_at = now() where id = $1", [ch.id]);
    await t.query(`insert into signatures (firm_id, client_id, request_id, version_id, contact_id, user_id, typed_name, content_sha256, otp_channel, ip, user_agent)
      values ($1,$2,$3,$4,$5,$6,$7,$8,'email',$9,$10)`, [s.firm_id, s.client_id, s.id, s.version_id, u.contact_id, u.id, name, sha256(body), await clientIp(), h.get("user-agent")]);
    await t.query("update signoff_requests set status = 'signed' where id = $1 and status = 'pending'", [s.id]);
    await t.query("update content_versions set status = 'client_signed_off' where id = $1 and status = 'awaiting_client_signoff'", [s.version_id]);
    await audit(u, "sign", s.parent_type, s.parent_id, { client_id: s.client_id, details: { version: s.version_no } }, t);
  });
  await notifyTeam(s.firm_id, s.client_id, "signed_off", `${s.title} was signed by ${name}`, `/app/clients/${s.client_id}/${s.parent_type === "dpia" ? "dpias" : "documents"}/${s.parent_id}`);
  redirect(flash("/portal/documents", `Signed. ${s.title} version ${s.version_no} is recorded with your signature.`));
}

export default async function SignPage({ params, searchParams }: { params: Promise<{ requestId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { requestId } = await params;
  const sp = await searchParams;
  const { u, s, body } = await load(requestId);
  const ch = await one("select expires_at, attempts from otp_challenges where user_id = $1 and request_id = $2 and consumed_at is null order by created_at desc limit 1", [u.id, s.id]);
  const live = ch && +ch.expires_at > Date.now() && ch.attempts < 5;
  const h = <Hidden values={{ request_id: s.id }} />;
  return (
    <>
      <p><Link href="/portal/documents">Back to documents</Link></p>
      <h1 style={{ fontSize: 24 }}>{s.title}</h1>
      <p className="meta">Version {s.version_no}. Read the whole document before signing.</p>
      <Flash sp={sp} />
      {s.status !== "pending" ? <Banner>This document no longer needs your signature.</Banner> : (
        <>
          <Doc body={body} />
          <section className="panel" style={{ marginTop: 24 }} aria-labelledby="sg">
            <h2 id="sg" style={{ marginTop: 0 }}>Sign this document</h2>
            {!live ? (
              <form action={sendCode}>{h}
                <p>We&apos;ll email a 6-digit code to <b>{u.email}</b> to confirm it&apos;s you.</p>
                <Submit>Send code</Submit>
              </form>
            ) : (
              <>
                <form action={sign}>{h}
                  <Field label="Type your full name" required><input name="typed_name" autoComplete="name" required defaultValue={u.name} /></Field>
                  <Field label="6-digit code" help={`Sent to ${u.email}. Expires ${fmtWAT(ch.expires_at)}.`} required>
                    <input name="code" className="otp" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required />
                  </Field>
                  <label className="check"><input type="checkbox" name="consent" required />I have read version {s.version_no} of this document and I approve it on behalf of my organisation.</label>
                  <div className="sticky-bar"><Submit>Sign document</Submit></div>
                </form>
                <form action={sendCode} style={{ marginTop: 12 }}>{h}<Submit className="btn quiet">Send a new code</Submit></form>
              </>
            )}
          </section>
        </>
      )}
    </>
  );
}
