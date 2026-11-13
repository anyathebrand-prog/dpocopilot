import { requireContact } from "@/lib/auth";
import Dpias from "@/app/app/clients/[clientId]/dpias/page";

// Client self-service: the firm's page, for the signed-in contact's own organisation (access is checked again inside).
export default async function PortalDpias({ params, searchParams }: { params: Promise<Record<string, never>>; searchParams: Promise<Record<string, string>> }) {
  const u = await requireContact();
  return <Dpias params={params.then((p) => ({ ...p, clientId: u.client_id! }))} searchParams={searchParams} />;
}
