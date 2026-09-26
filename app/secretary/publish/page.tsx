import { q } from "@/lib/db";
import { publishAll, discardAll, pendingSummary } from "@/lib/secretary";
import { fmtWAT } from "@/lib/rules";
import { Flash, PageHead, Empty } from "@/components/ui";
import { Confirm } from "@/components/client";

export default async function Publish({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const pending = await pendingSummary();
  const history = await q("select p.*, u.name from publish_events p join users u on u.id = p.published_by order by p.published_at desc limit 50");
  return (
    <>
      <PageHead title="Publish and history" />
      <Flash sp={sp} />
      <h2 style={{ marginTop: 0 }}>Pending changes</h2>
      {pending.length === 0 ? <p className="meta">All content is published.</p> : (
        <>
          <ul>{pending.map((p, i) => <li key={i}>{p}</li>)}</ul>
          <div className="row">
            <Confirm action={publishAll} title="Publish these changes?" body="This goes live for all firms immediately." label="Publish" danger={false} />
            <Confirm action={discardAll} title="Discard all unpublished changes?" body="Drafts are deleted and pending retirements are cancelled." label="Discard drafts" />
          </div>
        </>
      )}
      <h2>History</h2>
      {history.length === 0 ? <Empty><p>Nothing published yet. The initial seed content is version v0-seed.</p></Empty> : (
        <table className="register">
          <thead><tr><th>When (WAT)</th><th>By</th><th>What changed</th></tr></thead>
          <tbody>{history.map((h) => <tr key={h.id}><td className="num small">{fmtWAT(h.published_at)}</td><td data-label="By">{h.name}</td><td data-label="Changes" className="small">{h.summary}</td></tr>)}</tbody>
        </table>
      )}
    </>
  );
}
