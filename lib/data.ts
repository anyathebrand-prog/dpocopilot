import { q, one } from "./db";
import type { Ctx, Ropa } from "./templates";
import type { Answers } from "./questionnaire";

export async function answersOf(clientId: string): Promise<Answers> {
  const rows = await q<{ question_key: string; answer: unknown }>("select question_key, answer from answers where client_id = $1", [clientId]);
  return Object.fromEntries(rows.map((r) => [r.question_key, r.answer]));
}

export async function loadCtx(clientId: string, ropaIds?: string[]): Promise<Ctx> {
  const c = await one("select name from clients where id = $1", [clientId]);
  const a = await answersOf(clientId);
  const ropa = ropaIds
    ? await q<Ropa>("select * from ropa_entries where id = any($1::uuid[]) and client_id = $2 order by created_at", [ropaIds, clientId])
    : await q<Ropa>("select * from ropa_entries where client_id = $1 and state = 'active' order by created_at", [clientId]);
  return { orgName: String(a.org_legal_name || c?.name || ""), address: a.org_address ? String(a.org_address) : undefined, ropa };
}

export type Version = {
  id: string; firm_id: string; client_id: string; parent_type: string; parent_id: string; version_no: number; status: string;
  body: string; ai_generated: boolean; ai_proposal: string | null; created_at: Date;
  submitted_at: Date | null; approved_at: Date | null; approved_by_name: string | null; submitted_by_name: string | null;
};

const VERSION_SELECT = `select v.*, ua.name as approved_by_name, us.name as submitted_by_name from content_versions v
  left join users ua on ua.id = v.approved_by left join users us on us.id = v.submitted_by`;

export const latestVersion = (type: string, parentId: string) =>
  one<Version>(`${VERSION_SELECT} where v.parent_type = $1 and v.parent_id = $2 order by v.version_no desc limit 1`, [type, parentId]);

export const versionsOf = (type: string, parentId: string) =>
  q<Version>(`${VERSION_SELECT} where v.parent_type = $1 and v.parent_id = $2 order by v.version_no desc`, [type, parentId]);

export const getVersion = async (id: string) => (UUID.test(id) ? one<Version>(`${VERSION_SELECT} where v.id = $1`, [id]) : undefined);
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function signatureFor(versionId: string) {
  return one("select s.*, cc.name as contact_name from signatures s join client_contacts cc on cc.id = s.contact_id where s.version_id = $1 order by s.signed_at desc limit 1", [versionId]);
}

export async function setting(key: string) {
  return (await one<{ published_value: string }>("select published_value from platform_settings where key = $1", [key]))?.published_value;
}

/** Items waiting for firm approval (FR2.4): breach notifications first, then DSARs by deadline, then oldest first. */
export async function reviewQueue(scope: string, args: unknown[]) {
  return q(`select v.id, v.parent_type, v.parent_id, v.submitted_at, c.id as client_id, c.name as client_name, us.name as submitted_by,
      coalesce(d.title, doc.title, case when bn.audience = 'regulator' then 'Breach notification to NDPC' else 'Breach notice to data subjects' end, 'DSAR response: ' || ds.requester_name) as title,
      coalesce(b.deadline_at, (ds.deadline_on::text || 'T23:59:59+01:00')::timestamptz) as due_at,
      case v.parent_type when 'breach_notification' then 0 when 'dsar' then 1 else 2 end as prio,
      case v.parent_type when 'dpia' then 'dpias/' || v.parent_id when 'document' then 'documents/' || v.parent_id
        when 'breach_notification' then 'breaches/' || bn.breach_id else 'dsars/' || v.parent_id end as path
    from content_versions v join clients c on c.id = v.client_id left join users us on us.id = v.submitted_by
    left join dpias d on v.parent_type = 'dpia' and d.id = v.parent_id
    left join documents doc on v.parent_type = 'document' and doc.id = v.parent_id
    left join breach_notifications bn on v.parent_type = 'breach_notification' and bn.id = v.parent_id
    left join breaches b on b.id = bn.breach_id
    left join dsars ds on v.parent_type = 'dsar' and ds.id = v.parent_id
    where v.status = 'in_review' and c.archived_at is null and ${scope}
    order by prio, due_at nulls last, v.submitted_at`, args);
}
