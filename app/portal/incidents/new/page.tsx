import Link from "next/link";
import { requireContact } from "@/lib/auth";
import { answersOf } from "@/lib/data";
import { list } from "@/lib/questionnaire";
import { todayWAT } from "@/lib/rules";
import { Flash } from "@/components/ui";
import { IncidentForm } from "../form";

export default async function NewIncident({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireContact();
  const sp = await searchParams;
  const depts = list((await answersOf(u.client_id!)).org_departments);
  return (
    <>
      <nav className="meta"><Link href="/portal/incidents">Incident register</Link> / Log incident</nav>
      <h1 style={{ fontSize: 24 }}>Log incident</h1>
      <Flash sp={sp} />
      <IncidentForm depts={depts} data={{ date_reported: todayWAT(), discovered_on: todayWAT(), status: "Reported" }} />
    </>
  );
}
