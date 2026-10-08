import { PROPOSAL_SECTORS, TIERS, WORKSTREAMS, TRAINING_TIERS, STATUTORY, OPTIONAL, INTERNAL, RETAINER, MILESTONES, type Fin } from "@/lib/proposal";
import { Field, Hidden } from "@/components/ui";
import { Submit } from "@/components/client";
import { saveProposal } from "./actions";

const money = (name: string, v?: number) => <input name={name} inputMode="decimal" defaultValue={v || ""} placeholder="0" style={{ width: 150 }} />;
const rows = (prefix: string, items: [string, string, string][], vals?: Record<string, number>) => (
  <table className="register"><tbody>{items.map(([k, n, s]) => <tr key={k}><td><b>{n}</b><div className="meta">{s}</div></td><td>{money(`${prefix}_${k}`, vals?.[k])}</td></tr>)}</tbody></table>
);

/** The proposal form, empty for a new proposal or filled from an existing one. */
export function ProposalForm({ p }: { p?: Record<string, any> }) {
  const f: Fin = p?.fin ?? {};
  return (
    <form action={saveProposal} className="panel" style={{ maxWidth: 920 }}>
      {p && <Hidden values={{ id: p.id }} />}
      <h3 style={{ marginTop: 0 }}>Client</h3>
      <Field label="Name of the client" required><input name="client_name" required defaultValue={p?.client_name ?? ""} /></Field>
      <Field label="Address" required><textarea name="address" rows={2} required defaultValue={p?.address ?? ""} /></Field>
      <Field label="Email address of the client" required><input type="email" name="email" required defaultValue={p?.email ?? ""} /></Field>
      <div className="row">
        <Field label="Addressed to (name)"><input name="contact_name" defaultValue={p?.contact_name ?? ""} /></Field>
        <Field label="Their designation"><input name="contact_title" defaultValue={p?.contact_title ?? ""} placeholder="e.g. Managing Director" /></Field>
        <Field label="Accountable officer (title)" help="Who the DPO reports to"><input name="accountable_title" defaultValue={p?.accountable_title ?? ""} placeholder="e.g. Chief Executive Officer" /></Field>
      </div>
      <div className="row">
        <Field label="Sector" help="Adds the sector's regulation."><select name="sector" defaultValue={p?.sector ?? ""}><option value="">–</option>{PROPOSAL_SECTORS.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Expected GAID tier"><select name="tier" defaultValue={p?.tier ?? "TBC"}>{Object.entries(TIERS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label="Number of staff"><input type="number" name="staff_count" min={0} defaultValue={p?.staff_count ?? ""} style={{ width: 120 }} /></Field>
        <Field label="Data subjects (approx.)" help="Customers, students, patients…"><input type="number" name="subjects_count" min={0} defaultValue={p?.subjects_count ?? ""} style={{ width: 140 }} /></Field>
      </div>
      <Field label="Departments and units, one per line" help="One Data Protection Champion each. Sizes the champion network."><textarea name="departments" rows={4} defaultValue={p?.departments ?? ""} placeholder={"Human Resources\nFinance\nICT\nCustomer Service"} /></Field>

      <h3>Branding</h3>
      <div className="row" style={{ alignItems: "flex-end" }}>
        <Field label="Client primary colour"><input type="color" name="primary_color" defaultValue={p?.primary_color ?? "#0D1F4A"} style={{ width: 80, height: 40 }} /></Field>
        <Field label="Client secondary colour"><input type="color" name="secondary_color" defaultValue={p?.secondary_color ?? "#2A7DE1"} style={{ width: 80, height: 40 }} /></Field>
        <Field label="Client logo (optional)" help="PNG or JPEG under 1 MB. Your firm's logo comes from Firm profile.">
          {p?.logo && <span style={{ display: "block", marginBottom: 6 }}>{/* eslint-disable-next-line @next/next/no-img-element -- stored data URL */}<img src={p.logo} alt="Client logo" style={{ height: 36 }} /> <label className="check" style={{ display: "inline-flex" }}><input type="checkbox" name="remove_logo" />Remove</label></span>}
          <input type="file" name="logo" accept=".png,.jpg,.jpeg,image/png,image/jpeg" />
        </Field>
      </div>

      <h3>Programme</h3>
      <div className="row">
        <Field label="Proposed start date"><input type="date" name="start_on" defaultValue={p?.start_on ?? ""} /></Field>
        <Field label="Duration (months)"><input type="number" name="duration_months" min={1} max={36} defaultValue={p?.duration_months ?? 12} style={{ width: 120 }} /></Field>
        <Field label="DPIAs in scope"><input type="number" name="dpias" min={0} max={100} defaultValue={f.dpias ?? 5} style={{ width: 120 }} /></Field>
        <Field label="Valid for (days)"><input type="number" name="validity_days" min={1} max={365} defaultValue={p?.validity_days ?? 90} style={{ width: 120 }} /></Field>
      </div>

      <h3>9.1 Professional services (₦)</h3>
      {rows("w", WORKSTREAMS, f.work)}
      <h3>9.2 Training and certification</h3>
      <table className="register"><thead><tr><th>Tier</th><th>Participants</th><th>Unit cost (₦)</th></tr></thead><tbody>
        {TRAINING_TIERS.map(([k, n, a]) => <tr key={k}><td><b>{n}</b><div className="meta">{a}</div></td><td><input type="number" name={`tn_${k}`} min={0} defaultValue={f.training?.[k]?.n || ""} style={{ width: 100 }} /></td><td>{money(`tu_${k}`, f.training?.[k]?.unit)}</td></tr>)}
      </tbody></table>
      <h3>9.3 Statutory fees (₦)</h3>
      {rows("s", STATUTORY, f.statutory)}
      <h3>Option A — regulatory baseline (optional)</h3>
      <div className="row">
        <Field label="Option A total (₦)">{money("a_total", f.option_a?.total)}</Field>
        <Field label="What Option A covers"><input name="a_scope" defaultValue={f.option_a?.scope ?? ""} placeholder="e.g. Registration, sampled audit, core policy set, DPO certified, first CAR filed" style={{ minWidth: 420 }} /></Field>
      </div>
      <h3>9.5 Option C — optional components (₦)</h3>
      {rows("o", OPTIONAL, f.optional)}
      <h3>9.6 Internal establishment costs (borne by the client, ₦ per year)</h3>
      {rows("i", INTERNAL, f.internal)}
      <Field label="Champion honorarium per champion per year (₦)">{money("honorarium", f.honorarium)}</Field>
      <h3>9.7 Years 2–3 annual retainer (₦)</h3>
      {rows("r", RETAINER, f.retainer)}
      <h3>Payment schedule (% of Option B)</h3>
      <div className="row">{MILESTONES.map((ms, i) => <Field key={ms} label={`Stage ${i + 1}`} help={ms.replace(/ \(Gate \d\)/, "")}><input type="number" name={`pay${i}`} min={0} max={100} defaultValue={(f.schedule ?? [30, 20, 20, 20, 10])[i]} style={{ width: 80 }} /></Field>)}</div>
      <label className="check" style={{ marginTop: 8 }}><input type="checkbox" name="vat" defaultChecked={p ? Number(p.vat_rate) > 0 : true} />Add VAT (7.5%)</label>
      <Field label="Additional payment notes"><textarea name="notes" rows={2} defaultValue={p?.notes ?? ""} /></Field>
      <Submit>{p ? "Save proposal" : "Create proposal"}</Submit>
    </form>
  );
}
