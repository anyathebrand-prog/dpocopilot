import Link from "next/link";
import { ndpcBlock } from "@/lib/ndpc-guard";
import { requireFirm } from "@/lib/auth";
import { q } from "@/lib/db";
import { naira } from "@/lib/invoice";
import { money } from "@/lib/proposal";
import { fmtDate } from "@/lib/rules";
import { PageHead, Flash, Empty, Field, Banner } from "@/components/ui";
import { ProposalForm } from "./form";

/** Proposals to prospective clients: NDPA/GAID compliance proposal and contract, with cover letter. */
export default async function Proposals({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireFirm();
  const sp = await searchParams;
  const rows = await q("select * from proposals where firm_id = $1 order by created_at desc", [u.firm_id]);
  // Verify the client against last year's NDPC audit filings before the proposal form opens.
  const check = (sp.check ?? "").trim().slice(0, 200), year = new Date().getFullYear() - 1;
  const blocked = check ? await ndpcBlock(u.firm_id, check) : null;
  const verified = !!check && !blocked;
  return (
    <>
      <PageHead title="Proposals" sub="Data protection compliance proposals and service agreements for prospective clients, with a cover letter." />
      <Flash sp={sp} />
      {rows.length === 0 ? <Empty><p>No proposals yet.</p></Empty> : (
        <table className="register">
          <thead><tr><th>Proposal</th><th>Client</th><th>Date</th><th className="num">Total</th><th>Status</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td><Link href={`/app/proposals/${r.id}`}>{r.number}</Link></td>
              <td data-label="Client"><span style={{ display: "inline-block", width: 10, height: 10, background: r.primary_color, marginRight: 6 }} aria-hidden />{r.client_name}</td>
              <td data-label="Date" className="small">{fmtDate(String(r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at).slice(0, 10))}</td>
              <td data-label="Total" className="num">{naira(money(r as any).total)}</td>
              <td data-label="Status" className="small">{r.status}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
      <details className="group" open={!!sp.new || rows.length === 0} style={{ marginTop: 24 }}>
        <summary>New proposal</summary>
        <form className="panel row" style={{ maxWidth: 720, alignItems: "flex-end", marginBottom: 12 }}>
            <input type="hidden" name="new" value="1" />
            <Field label="Name of the client" help={`Checked against the NDPC's ${year} audit filings before you continue.`} required>
              <input name="check" defaultValue={check} required minLength={3} style={{ width: 380 }} />
            </Field>
            <button className="btn">Verify</button>
        </form>
        {blocked && <Banner kind="error">{blocked}</Banner>}
        {check && !blocked && <Banner kind="ok"><b>{check}</b> is not on the NDPC&apos;s {year} audit list. You can go ahead with the proposal.</Banner>}
        {verified && <ProposalForm name={check} />}
      </details>
    </>
  );
}
