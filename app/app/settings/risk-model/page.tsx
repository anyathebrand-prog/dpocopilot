import { redirect } from "next/navigation";
import { requireFirmRole, audit } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { str, flash } from "@/lib/form";
import { fmtWAT } from "@/lib/rules";
import { DOMAINS, RATINGS, DEFAULT_MODEL, IMPACT_NAMES, LIKELIHOOD_NAMES, checkModel, asModel, type Model } from "@/lib/tpra-model";
import { firmModel } from "@/lib/tpra";
import { Flash, Field, PageHead } from "@/components/ui";
import { Submit } from "@/components/client";

// Firm settings: the third-party risk model. Every save is a new version; assessments keep the version they were scored under.
const B = "/app/settings/risk-model";
const n = (fd: FormData, k: string) => Number(str(fd, k));

async function save(fd: FormData) {
  "use server";
  const u = await requireFirmRole("firm_admin");
  const m: Model = {
    version: 0,
    weights: Object.fromEntries(DOMAINS.map((d) => [d.key, n(fd, `w_${d.key}`)])),
    impact_bands: [0, 1, 2, 3].map((i) => n(fd, `ib_${i}`)) as Model["impact_bands"],
    likelihood_bands: [0, 1, 2, 3].map((i) => n(fd, `lb_${i}`)) as Model["likelihood_bands"],
    rating_bands: [0, 1, 2].map((i) => n(fd, `rb_${i}`)) as Model["rating_bands"],
    review_months: Object.fromEntries(RATINGS.map((r) => [r, n(fd, `rv_${r}`)])) as Model["review_months"],
    floor: n(fd, "floor"), breach_hours: n(fd, "breach_hours"),
  };
  const err = checkModel(m);
  if (err) redirect(flash(B, err, "error"));
  const cur = await firmModel(u.firm_id);
  const same = JSON.stringify({ ...cur, version: 0 }) === JSON.stringify({ ...asModel(m), version: 0 });
  if (same) redirect(flash(B, "No changes to save."));
  const v = (await one<{ v: number }>("select coalesce(max(version), 0) + 1 as v from tpra_models where firm_id = $1", [u.firm_id]))!.v;
  await q("insert into tpra_models (firm_id, version, model, note, created_by) values ($1,$2,$3,$4,$5)", [u.firm_id, v, JSON.stringify({ ...m, version: v }), str(fd, "note") || null, u.id]);
  await audit(u, "update", "tpra_model", null, { details: { version: v } });
  redirect(flash(B, `Saved as version ${v}. New assessments and reassessments use it; existing assessments keep the version they were scored under.`));
}

export default async function RiskModel({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const u = await requireFirmRole("firm_admin");
  const m = await firmModel(u.firm_id);
  const hist = await q("select t.version, t.note, t.created_at, t.model, us.name from tpra_models t left join users us on us.id = t.created_by where t.firm_id = $1 order by t.version desc", [u.firm_id]);
  const num = (name: string, v: number, w = 90, extra: Record<string, number> = {}) => <input type="number" name={name} defaultValue={v} style={{ width: w }} {...extra} />;
  return (
    <>
      <PageHead title="Third-party risk model" sub={<>Weights, thresholds and review cycles for Data Processor Third-Party Risk Assessments. Current: {m.version ? `version ${m.version}` : "the default model"}.</>} />
      <Flash sp={sp} />
      <form action={save} className="panel" style={{ maxWidth: 820 }}>
        <h3>Control domain weights (must add up to 100%)</h3>
        <div className="row" style={{ flexWrap: "wrap", gap: 12 }}>{DOMAINS.map((d) => <label key={d.key} className="small">{d.label}<br />{num(`w_${d.key}`, m.weights[d.key], 80, { min: 0, max: 100, step: 1 })} %</label>)}</div>
        <h3>Impact: highest factor total for each level (6–18)</h3>
        <div className="row" style={{ gap: 12 }}>{[0, 1, 2, 3].map((i) => <label key={i} className="small">{i + 1} {IMPACT_NAMES[i + 1]}<br />up to {num(`ib_${i}`, m.impact_bands[i], 70, { min: 6, max: 17 })}</label>)}<span className="small">5 {IMPACT_NAMES[5]}: above</span></div>
        <h3>Likelihood: lowest control % for each level</h3>
        <div className="row" style={{ gap: 12 }}>{[0, 1, 2, 3].map((i) => <label key={i} className="small">{i + 1} {LIKELIHOOD_NAMES[i + 1]}<br />from {num(`lb_${i}`, m.likelihood_bands[i], 70, { min: 1, max: 100 })} %</label>)}<span className="small">5 {LIKELIHOOD_NAMES[5]}: below</span></div>
        <h3>Rating bands: highest residual score (1–25)</h3>
        <div className="row" style={{ gap: 12 }}>{["Low", "Medium", "High"].map((r, i) => <label key={r} className="small">{r}<br />up to {num(`rb_${i}`, m.rating_bands[i], 70, { min: 1, max: 24 })}</label>)}<span className="small">Critical: above</span></div>
        <h3>Review cycles (months; 0 = before any data is shared)</h3>
        <div className="row" style={{ gap: 12 }}>{RATINGS.map((r) => <label key={r} className="small">{r}<br />{num(`rv_${r}`, m.review_months[r], 70, { min: 0, max: 60 })}</label>)}</div>
        <h3>Other</h3>
        <div className="row" style={{ gap: 16 }}>
          <label className="small">Sensitive-data floor (minimum Impact)<br /><select name="floor" defaultValue={m.floor} style={{ width: "auto" }}><option value={0}>Off</option>{[2, 3, 4, 5].map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
          <label className="small">Default breach-notice window in the DPA<br />{num("breach_hours", m.breach_hours, 80, { min: 1, max: 720 })} hours</label>
        </div>
        <Field label="What changed (for the version history)"><input name="note" /></Field>
        <div className="row"><Submit>Save as a new version</Submit></div>
        <p className="meta" style={{ marginTop: 8 }}>The default follows the DPO Copilot TPRA model: weights {DOMAINS.map((d) => `${d.label} ${DEFAULT_MODEL.weights[d.key]}%`).join(", ")}. It is a practical model, not a format prescribed by the NDPC.</p>
      </form>
      <h2>Version history</h2>
      {hist.length ? (
        <table className="register"><thead><tr><th>Version</th><th>Saved</th><th>By</th><th>Note</th><th>Weights</th></tr></thead>
          <tbody>{hist.map((h) => <tr key={h.version}><td className="num">v{h.version}</td><td className="small">{fmtWAT(h.created_at)}</td><td className="small">{h.name}</td><td className="small">{h.note ?? "—"}</td>
            <td className="small">{DOMAINS.map((d) => `${d.label.split(" ")[0]} ${asModel(h.model).weights[d.key]}%`).join(", ")}</td></tr>)}</tbody></table>
      ) : <p className="meta">No changes yet: the default model applies.</p>}
    </>
  );
}
