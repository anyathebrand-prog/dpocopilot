"use client";
import { useFormStatus } from "react-dom";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

/** Nav link that marks itself current. `exact` for section roots like /app. */
export function NavLink({ href, exact, children }: { href: string; exact?: boolean; children: ReactNode }) {
  const p = usePathname();
  const current = exact ? p === href : p === href || p.startsWith(href + "/");
  return <Link href={href} aria-current={current ? "page" : undefined}>{children}</Link>;
}

/** Submit button: keeps its label, shows a spinner and disables while the action runs. */
export function Submit({ children, className = "btn", disabled, name, value }: { children: ReactNode; className?: string; disabled?: boolean; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={disabled || pending} name={name} value={value}>
      {pending && <span className="spin" aria-hidden />}{children}
    </button>
  );
}

/** Breach countdown. Updates once a minute; not a live region (Design Brief DFLAG-3). */
export function Countdown({ due }: { due: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);
  const ms = Date.parse(due) - now;
  const abs = Math.abs(ms), h = Math.floor(abs / 3600_000), m = Math.floor((abs % 3600_000) / 60_000);
  return <span className="countdown num">{ms >= 0 ? `${h}h ${m}m left` : `Overdue by ${h}h ${m}m`}</span>;
}

/** Destructive or irreversible actions sit behind a native <dialog> confirmation. */
export function Confirm({ action, title, body, label, danger = true, children }: { action: (fd: FormData) => void | Promise<void>; title: string; body: string; label: string; danger?: boolean; children?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className={danger ? "btn danger" : "btn secondary"} onClick={() => ref.current?.showModal()}>{label}</button>
      <dialog ref={ref} className="panel" style={{ maxWidth: 480, boxShadow: "var(--float)" }} aria-labelledby="dlg-t">
        <form action={action}>
          <h2 id="dlg-t" style={{ marginTop: 0 }}>{title}</h2>
          <p>{body}</p>
          {children}
          <div className="row" style={{ marginTop: 16 }}>
            <Submit className={danger ? "btn danger" : "btn"}>{label}</Submit>
            <button type="button" className="btn secondary" onClick={() => ref.current?.close()}>Cancel</button>
          </div>
        </form>
      </dialog>
    </>
  );
}

/** Mobile "Sections" select for the grouped client navigation. */
export function SectionSelect({ options }: { options: { href: string; label: string }[] }) {
  const router = useRouter();
  const p = usePathname();
  const current = [...options].reverse().find((o) => p === o.href || p.startsWith(o.href + "/"))?.href ?? options[0].href;
  return (
    <label className="field" style={{ marginBottom: 0 }}>
      <span>Sections</span>
      <select value={current} onChange={(e) => router.push(e.target.value)}>
        {options.map((o) => <option key={o.href} value={o.href}>{o.label}</option>)}
      </select>
    </label>
  );
}
