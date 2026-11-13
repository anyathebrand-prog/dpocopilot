import { redirect } from "next/navigation";
import { requireFirmRole, audit } from "@/lib/auth";
import { q, one } from "@/lib/db";
import { str, flash } from "@/lib/form";
import { fmtWAT } from "@/lib/rules";
import { DOMAINS, RATINGS, RATING_COLOR, DEFAULT_MODEL, IMPACT_NAMES, LIKELIHOOD_NAMES, checkModel, asModel, type Model } from "@/lib/tpra-model";
import { firmModel } from "@/lib/tpra";
import { Flash, Field, PageHead } from "@/components/ui";
import { Submit } from "@/components/client";
import { WeightTotal } from "@/components/risk-model-total";

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
  // One field tile: a label on top, then the input with its prefix ("up to", "from") and unit ("%", "months") attached.
  const tile = (key: string, label: React.ReactNode, name: string, v: number, lim: { min: number; max: number }, pre?: string, unit?: string) => (
    <label key={key} className="rm-tile">
      <span className="rm-tl">{label}</span>
      <span className="rm-in">{pre && <i>{pre}</i>}<input type="number" name={name} defaultValue={v} step={1} {...lim} />{unit && <i>{unit}</i>}</span>
    </label>
  );
  const last = (label: React.ReactNode, text: string) => <div className="rm-tile rm-last"><span className="rm-tl">{label}</span><span className="rm-auto">{text}</span></div>;
  const lvl = (i: number, name: string) => <><b className="rm-n">{i}</b>{name}</>;
  const dot = (r: (typeof RATINGS)[number]) => <><span className="rm-dot" style={{ background: RATING_COLOR[r] }} aria-hidden />{r}</>;
  const sec = (n: number, title: string, help: React.ReactNode, body: React.ReactNode, aside?: React.ReactNode) => (
    <section className="rm-sec" aria-labelledby={`rm-${n}`}>
      <header><span className="rm-step" aria-hidden>{n}</span><div><h3 id={`rm-${n}`}>{title}</h3><p className="meta">{help}</p></div>{aside}</header>
      {body}
    </section>
  );
  const total = DOMAINS.reduce((s, d) => s + m.weights[d.key], 0);
  return (
    <>
      <PageHead title="Third-party risk model" sub={<>Weights, thresholds and review cycles for Data Processor Third-Party Risk Assessments. Current: {m.version ? `version ${m.version}` : "the default model"}.</>} />
      <Flash sp={sp} />
      <form action={save} className="panel rm">
        {sec(1, "Control domain weights", "How much each control domain counts towards the processor's control score. They must add up to 100%.",
          <div className="rm-grid c3">{DOMAINS.map((d) => tile(d.key, d.label, `w_${d.key}`, m.weights[d.key], { min: 0, max: 100 }, undefined, "%"))}</div>,
          <WeightTotal initial={total} />)}
        {sec(2, "Impact levels", "The highest total of the six impact factors (6 to 18) for each level.",
          <div className="rm-grid c5">{[0, 1, 2, 3].map((i) => tile(`ib${i}`, lvl(i + 1, IMPACT_NAMES[i + 1]), `ib_${i}`, m.impact_bands[i], { min: 6, max: 17 }, "up to"))}{last(lvl(5, IMPACT_NAMES[5]), "Above the Major limit")}</div>)}
        {sec(3, "Likelihood levels", "The lowest control score for each level. Stronger controls mean a lower likelihood.",
          <div className="rm-grid c5">{[0, 1, 2, 3].map((i) => tile(`lb${i}`, lvl(i + 1, LIKELIHOOD_NAMES[i + 1]), `lb_${i}`, m.likelihood_bands[i], { min: 1, max: 100 }, "from", "%"))}{last(lvl(5, LIKELIHOOD_NAMES[5]), "Below the Likely limit")}</div>)}
        {sec(4, "Rating bands", "The highest residual score (Impact × Likelihood, 1 to 25) for each rating.",
          <div className="rm-grid c4">{(["Low", "Medium", "High"] as const).map((r, i) => tile(r, dot(r), `rb_${i}`, m.rating_bands[i], { min: 1, max: 24 }, "up to"))}{last(dot("Critical"), "Above the High limit")}</div>)}
        {sec(5, "Review cycles", "How often a processor is reassessed at each rating. 0 means before any data is shared.",
          <div className="rm-grid c4">{RATINGS.map((r) => tile(r, dot(r), `rv_${r}`, m.review_months[r], { min: 0, max: 60 }, undefined, "months"))}</div>)}
        {sec(6, "Other settings", "Defaults applied to every assessment.",
          <div className="rm-grid two">
            <label className="rm-tile"><span className="rm-tl">Sensitive-data floor (minimum Impact)</span>
              <span className="rm-in"><select name="floor" defaultValue={m.floor}><option value={0}>Off</option>{[2, 3, 4, 5].map((x) => <option key={x} value={x}>{x} · {IMPACT_NAMES[x]}</option>)}</select></span></label>
            {tile("bh", "Default breach-notice window in the DPA", "breach_hours", m.breach_hours, { min: 1, max: 720 }, undefined, "hours")}
          </div>)}
        <div className="rm-save">
          <Field label="What changed (for the version history)"><input name="note" placeholder="e.g. Raised the weight for information security" /></Field>
          <Submit>Save as a new version</Submit>
        </div>
        <p className="meta rm-foot">The default follows the DPO Copilot TPRA model: weights {DOMAINS.map((d) => `${d.label} ${DEFAULT_MODEL.weights[d.key]}%`).join(", ")}. It is a practical model, not a format prescribed by the NDPC.</p>
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
