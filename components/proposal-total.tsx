"use client";
import { useEffect, useRef, useState } from "react";

/** Live subtotal, VAT and total for the proposal form: sums the ticked services' amounts (a0, a1, … with s0, s1, …). */
export function ProposalTotal({ vatRate, symbol, locale }: { vatRate: number; symbol: string; locale: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ sub: 0, vat: 0 });
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const calc = () => {
      let sub = 0;
      form.querySelectorAll<HTMLInputElement>('input[name^="a"]').forEach((a) => {
        const i = a.name.slice(1);
        if (!/^\d+$/.test(i) || !form.querySelector<HTMLInputElement>(`input[name="s${i}"]`)?.checked) return;
        const n = Number(a.value.replace(/[^\d.]/g, ""));
        if (Number.isFinite(n)) sub += n;
      });
      const vatOn = form.querySelector<HTMLInputElement>('input[name="vat"]')?.checked;
      setT({ sub, vat: vatOn ? Math.round(sub * vatRate) / 100 : 0 });
    };
    calc();
    form.addEventListener("input", calc);
    form.addEventListener("change", calc);
    return () => { form.removeEventListener("input", calc); form.removeEventListener("change", calc); };
  }, [vatRate]);
  const f = (n: number) => symbol + n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div ref={ref} className="panel" aria-live="polite" style={{ maxWidth: 420, marginTop: 12 }}>
      <div className="spread"><span>Subtotal</span><span>{f(t.sub)}</span></div>
      {t.vat > 0 && <div className="spread"><span>VAT ({vatRate}%)</span><span>{f(t.vat)}</span></div>}
      <div className="spread" style={{ fontWeight: 700, fontSize: "1.1em", marginTop: 6 }}><span>Total</span><span>{f(t.sub + t.vat)}</span></div>
    </div>
  );
}
