import { requireContact } from "@/lib/auth";
import Remediation from "@/app/app/clients/[clientId]/remediation/page";

// Client self-service: the firm's page, for the signed-in contact's own organisation (access is checked again inside).
export default async function PortalRemediation({ params, searchParams }: { params: Promise<Record<string, never>>; searchParams: Promise<Record<string, string>> }) {
  const u = await requireContact();
  return <Remediation params={params.then((p) => ({ ...p, clientId: u.client_id! }))} searchParams={searchParams} />;
}
