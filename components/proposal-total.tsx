"use client";
import { useEffect, useRef, useState } from "react";

const FEE = { width: 140, textAlign: "right" } as const;

/** Extra services typed in by the firm (xs/xd/xa, repeated), with an "Add item" button. */
export function ExtraItems({ initial }: { initial: { service: string; description?: string; amount: number }[] }) {
  const [rows, setRows] = useState(() => initial.map((l, k) => ({ k, ...l })));
  const [next, setNext] = useState(initial.length);
  return (
    <tbody>
      {rows.map((r) => (
        <tr key={r.k}>
          <td><input name="xs" defaultValue={r.service} placeholder="Service name" aria-label="Additional service" /></td>
          <td><input name="xd" defaultValue={r.description ?? ""} placeholder="Detail (optional)" aria-label="Detail" /></td>
          <td>
            <div className="row" style={{ gap: 6, flexWrap: "nowrap", justifyContent: "flex-end" }}>
              <input name="xa" inputMode="decimal" defaultValue={r.amount || ""} placeholder="0.00" aria-label="Fee" style={FEE} />
              <button type="button" className="btn secondary" aria-label="Remove item" onClick={() => setRows((x) => x.filter((y) => y.k !== r.k))}>×</button>
            </div>
          </td>
        </tr>
      ))}
      <tr><td colSpan={3}><button type="button" className="btn secondary" onClick={() => { setRows((x) => [...x, { k: next, service: "", description: "", amount: 0 }]); setNext(next + 1); }}>+ Add item</button></td></tr>
    </tbody>
  );
}

/** Live subtotal, VAT and total under the Fee column: ticked services (s0/a0, …) plus extra items with a name (xs/xa). */
export function ProposalTotal({ vatRate, symbol, locale }: { vatRate: number; symbol: string; locale: string }) {
  const ref = useRef<HTMLTableSectionElement>(null);
  const [t, setT] = useState({ sub: 0, vat: 0 });
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const num = (v: string) => { const n = Number(v.replace(/[^\d.]/g, "")); return Number.isFinite(n) ? n : 0; };
    const calc = () => {
      let sub = 0;
      form.querySelectorAll<HTMLInputElement>('input[name^="a"]').forEach((a) => {
        const i = a.name.slice(1);
        if (/^\d+$/.test(i) && form.querySelector<HTMLInputElement>(`input[name="s${i}"]`)?.checked) sub += num(a.value);
      });
      const names = form.querySelectorAll<HTMLInputElement>('input[name="xs"]');
      form.querySelectorAll<HTMLInputElement>('input[name="xa"]').forEach((a, k) => { if (names[k]?.value.trim()) sub += num(a.value); });
      const vatOn = form.querySelector<HTMLInputElement>('input[name="vat"]')?.checked;
      const vat = vatOn ? Math.round(sub * vatRate) / 100 : 0;
      setT((o) => (o.sub === sub && o.vat === vat ? o : { sub, vat }));
    };
    calc();
    const obs = new MutationObserver(calc);
    obs.observe(form, { childList: true, subtree: true });
    form.addEventListener("input", calc);
    form.addEventListener("change", calc);
    return () => { obs.disconnect(); form.removeEventListener("input", calc); form.removeEventListener("change", calc); };
  }, [vatRate]);
  const f = (n: number) => symbol + n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const R = { textAlign: "right" } as const;
  return (
    <tfoot ref={ref} aria-live="polite">
      <tr><td colSpan={2} style={R}>Subtotal</td><td style={R}>{f(t.sub)}</td></tr>
      {t.vat > 0 && <tr><td colSpan={2} style={R}>VAT ({vatRate}%)</td><td style={R}>{f(t.vat)}</td></tr>}
      <tr style={{ fontWeight: 700 }}><td colSpan={2} style={R}>Total</td><td style={{ ...R, fontSize: "1.1em" }}>{f(t.sub + t.vat)}</td></tr>
    </tfoot>
  );
}
