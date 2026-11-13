import { requireContact } from "@/lib/auth";
import Dpia from "@/app/app/clients/[clientId]/dpias/[dpiaId]/page";

// Client self-service: the firm's page, for the signed-in contact's own organisation (access is checked again inside).
export default async function PortalDpia({ params, searchParams }: { params: Promise<{ dpiaId: string }>; searchParams: Promise<Record<string, string>> }) {
  const u = await requireContact();
  return <Dpia params={params.then((p) => ({ ...p, clientId: u.client_id! }))} searchParams={searchParams} />;
}
