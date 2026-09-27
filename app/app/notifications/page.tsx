import Link from "next/link";
import { redirect } from "next/navigation";
import { requireFirm } from "@/lib/auth";
import { q } from "@/lib/db";
import { fmtWAT } from "@/lib/rules";
import { PageHead, Empty } from "@/components/ui";
import { Submit } from "@/components/client";

async function markAllRead() {
  "use server";
  const u = await requireFirm();
  await q("update notifications set read_at = now() where recipient_user_id = $1 and read_at is null", [u.id]);
  redirect("/app/notifications");
}

async function open(fd: FormData) {
  "use server";
  const u = await requireFirm();
  const r = await q<{ link: string }>("update notifications set read_at = coalesce(read_at, now()) where id = $1 and recipient_user_id = $2 returning link", [String(fd.get("id")), u.id]);
  redirect(r[0]?.link?.startsWith("/app/") ? r[0].link : "/app/notifications");
}

/** C01: breach alerts pinned first until opened. */
export default async function Notifications() {
  const u = await requireFirm();
  const rows = await q(`select * from notifications where recipient_user_id = $1 order by (kind = 'breach_reported' and read_at is null) desc, created_at desc limit 100`, [u.id]);
  return (
    <>
      <PageHead title="Notifications">{rows.some((r) => !r.read_at) && <form action={markAllRead}><Submit className="btn secondary">Mark all read</Submit></form>}</PageHead>
      {rows.length === 0 ? <Empty><p>No notifications.</p></Empty> : rows.map((n) => (
        <form key={n.id} action={open} className={`rule-row ${n.kind === "breach_reported" && !n.read_at ? "urgent" : n.read_at ? "" : "info"}`}>
          <input type="hidden" name="id" value={n.id} />
          <div>
            <button className="btn quiet" style={{ padding: 0, fontWeight: n.read_at ? 400 : 700, height: "auto", color: n.kind === "breach_reported" && !n.read_at ? "var(--red-700)" : undefined }}>{n.message}</button>
            <div className="meta">{fmtWAT(n.created_at)}{!n.read_at && " · Unread"}</div>
          </div>
        </form>
      ))}
      <p className="meta" style={{ marginTop: 16 }}><Link href="/app">Back to clients</Link></p>
    </>
  );
}
