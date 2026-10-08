import { PROPOSAL_SECTORS, TIERS, MILESTONES, type Fin } from "@/lib/proposal";
import { SERVICES, type Line } from "@/lib/invoice";
import { Field, Hidden } from "@/components/ui";
import { Submit } from "@/components/client";
import { saveProposal } from "./actions";

/** The proposal form, empty for a new proposal or filled from an existing one. */
export function ProposalForm({ p }: { p?: Record<string, any> }) {
  const f: Fin = p?.fin ?? {}, lines: Line[] = p?.lines ?? [], line = (s: string) => lines.find((l) => l.service === s);
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

      <h3>Services and fees</h3>
      <table className="register">
        <thead><tr><th>Service</th><th>Detail (optional)</th><th>Fee (₦)</th></tr></thead>
        <tbody>{SERVICES.map((s, i) => (
          <tr key={s}>
            <td><label className="check"><input type="checkbox" name={`s${i}`} defaultChecked={!!line(s)} />{s}</label></td>
            <td><input name={`d${i}`} defaultValue={line(s)?.description ?? ""} placeholder="e.g. up to 3 DPIAs" /></td>
            <td><input name={`a${i}`} inputMode="decimal" defaultValue={line(s)?.amount ?? ""} placeholder="0.00" style={{ width: 140 }} /></td>
          </tr>
        ))}</tbody>
      </table>
      <Field label="Payment terms"><input name="payment_terms" defaultValue={p?.payment_terms ?? "Payments are linked to the delivery milestones below."} /></Field>
      <h3>Payment schedule (% of the total)</h3>
      <div className="row">{MILESTONES.map((ms, i) => <Field key={ms} label={`Stage ${i + 1}`} help={ms.replace(/ \(Gate \d\)/, "")}><input type="number" name={`pay${i}`} min={0} max={100} defaultValue={(f.schedule ?? [30, 20, 20, 20, 10])[i]} style={{ width: 80 }} /></Field>)}</div>
      <label className="check" style={{ marginTop: 8 }}><input type="checkbox" name="vat" defaultChecked={p ? Number(p.vat_rate) > 0 : true} />Add VAT (7.5%)</label>
      <Field label="Additional payment notes"><textarea name="notes" rows={2} defaultValue={p?.notes ?? ""} /></Field>
      <Submit>{p ? "Save proposal" : "Create proposal"}</Submit>
    </form>
  );
}
