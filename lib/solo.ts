import { q } from "./db";
import { send } from "./auth";

const BASE = () => process.env.APP_URL ?? "http://localhost:3000";

/** In-app notification + email to a firm's active members (optionally only some roles). */
export async function notifyFirm(firmId: string, kind: string, message: string, link: string, roles?: string[]) {
  const people = await q<{ user_id: string; email: string }>(`select m.user_id, u.email from memberships m join users u on u.id = m.user_id
    where m.firm_id = $1 and m.status = 'active' and ($2::text[] is null or m.role = any($2))`, [firmId, roles ?? null]);
  for (const p of people) {
    await q("insert into notifications (firm_id, recipient_user_id, kind, message, link) values ($1,$2,$3,$4,$5)", [firmId, p.user_id, kind, message, link]);
    await send("email", p.email, kind, `${message} Log in to view: ${BASE()}${link}`);
  }
}
export const REVIEWERS = ["firm_admin", "lead_consultant"];
