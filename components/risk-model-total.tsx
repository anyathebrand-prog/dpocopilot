"use client";
import { useEffect, useRef, useState } from "react";

/** Live total of the control domain weights; turns red when it is not 100%. Reads inputs named w_* in its form. */
export function WeightTotal({ initial }: { initial: number }) {
  const ref = useRef<HTMLOutputElement>(null);
  const [total, setTotal] = useState(initial);
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const sum = () => setTotal([...form.querySelectorAll<HTMLInputElement>('input[name^="w_"]')].reduce((s, i) => s + (Number(i.value) || 0), 0));
    form.addEventListener("input", sum);
    return () => form.removeEventListener("input", sum);
  }, []);
  return (
    <output ref={ref} className={`rm-total${total === 100 ? " ok" : " bad"}`} aria-live="polite">
      Total {total}%{total === 100 ? "" : ` (must be 100%)`}
    </output>
  );
}
