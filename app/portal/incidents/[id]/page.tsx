import Link from "next/link";
import { notFound } from "next/navigation";
import { requireContact } from "@/lib/auth";
import { one } from "@/lib/db";
import { answersOf } from "@/lib/data";
import { list } from "@/lib/questionnaire";
import { computed } from "@/lib/incidents";
import { fmtDate } from "@/lib/rules";
import { Flash } from "@/components/ui";
import { IncidentForm } from "../form";

export default async function IncidentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const u = await requireContact();
  const { id } = await params;
  const sp = await searchParams;
  const r = await one<{ id: string; number: string; data: Record<string, string> }>("select id, number, data from incidents where id = $1 and client_id = $2", [/^[0-9a-f-]{36}$/.test(id) ? id : null, u.client_id]);
  if (!r) notFound();
  const x = computed(r.data), depts = list((await answersOf(u.client_id!)).org_departments);
  return (
    <>
      <nav className="meta"><Link href="/portal/incidents">Incident register</Link> / {r.number}</nav>
      <h1 style={{ fontSize: 24 }}>{r.number} · {r.data.title}</h1>
      <p className="meta">NDPC deadline (72h): <b>{x.deadline ? fmtDate(x.deadline) : "not required / not set"}</b> · Notification: <b>{x.status}</b>{x.days !== null && ` · ${x.days} day${x.days === 1 ? "" : "s"} to notify`}</p>
      <Flash sp={sp} />
      <IncidentForm id={r.id} data={r.data} depts={depts} />
    </>
  );
}
