import Link from "next/link";
import { Landmark, FolderUp, UserSearch } from "lucide-react";
import { requireContact } from "@/lib/auth";
import { q } from "@/lib/db";
import { todayWAT, endOfDayWAT } from "@/lib/rules";
import { Deadline, Empty } from "@/components/ui";

const TYPES = { car: ["Compliance Audit Return filing", Landmark], evidence: ["Evidence due", FolderUp], dsar: ["Reply to data subject request", UserSearch] } as const;

/** The client's own dated items. DSARs: only those this contact logged (FLAG-6 default, as on the portal home). */
export default async function PortalDeadlines() {
  const u = await requireContact();
  const rows = await q<{ type: keyof typeof TYPES; day: string; title: string; href: string | null }>(`
      select 'car' as type, car_filing_due_on as day, null as title, '/portal/car' as href from clients where id = $1 and car_filing_due_on is not null
      union all select 'evidence', due_on, title, '/portal/evidence/' || id from evidence_requests where client_id = $1 and due_on is not null and status in ('open','rejected')
      union all select 'dsar', deadline_on, requester_name, null from dsars where client_id = $1 and logged_by = $2 and status = 'open'
    order by day`, [u.client_id, u.id]);
  const today = todayWAT();
  return (
    <>
      <p><Link href="/portal">Back to home</Link></p>
      <h1 style={{ fontSize: 24 }}>Upcoming deadlines</h1>
      <p className="meta">Dates in West Africa Time (WAT).</p>
      {rows.length === 0 ? <Empty><p>Nothing due.</p></Empty> : rows.map((r, i) => {
        const [label, Icon] = TYPES[r.type];
        const text = <><b>{label}</b>{r.title && `: ${r.title}`}</>;
        return (
          <div key={i} className={`rule-row ${+endOfDayWAT(r.day) < Date.now() ? "urgent" : r.day <= today ? "soon" : "info"}`} style={{ display: "block" }}>
            <div className="row"><Icon aria-hidden size={18} />{r.href ? <Link href={r.href}>{text}</Link> : <span>{text}</span>}</div>
            <Deadline due={r.day} dateOnly />
          </div>
        );
      })}
    </>
  );
}
