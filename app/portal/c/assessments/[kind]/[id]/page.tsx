import { requireContact } from "@/lib/auth";
import Assessment from "@/app/app/clients/[clientId]/assessments/[kind]/[id]/page";

// Client self-service: the firm's page, for the signed-in contact's own organisation (access is checked again inside).
export default async function PortalAssessment({ params, searchParams }: { params: Promise<{ kind: string; id: string }>; searchParams: Promise<Record<string, string>> }) {
  const u = await requireContact();
  return <Assessment params={params.then((p) => ({ ...p, clientId: u.client_id! }))} searchParams={searchParams} />;
}
