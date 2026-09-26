import Link from "next/link";
import type { ReactNode } from "react";
import { requireContact } from "@/lib/auth";
import { one } from "@/lib/db";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const u = await requireContact();
  const c = await one("select name from clients where id = $1", [u.client_id]);
  return (
    <>
      <header className="portal-top">
        <div className="inner">
          <div><b>{c!.name}</b><div className="meta">Compliance portal · {u.firm_name}</div></div>
          <Link href="/account" className="btn quiet">Account</Link>
        </div>
      </header>
      <main id="main" className="portal">{children}</main>
    </>
  );
}
