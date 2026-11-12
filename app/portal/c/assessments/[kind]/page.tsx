import { requireContact } from "@/lib/auth";
import Assessments from "@/app/app/clients/[clientId]/assessments/[kind]/page";

// Client self-service: the firm's page, for the signed-in contact's own organisation (access is checked again inside).
export default async function PortalAssessments({ params, searchParams }: { params: Promise<{ kind: string }>; searchParams: Promise<Record<string, string>> }) {
  const u = await requireContact();
  return <Assessments params={params.then((p) => ({ ...p, clientId: u.client_id! }))} searchParams={searchParams} />;
}
