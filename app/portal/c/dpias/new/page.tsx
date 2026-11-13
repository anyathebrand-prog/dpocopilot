import { requireContact } from "@/lib/auth";
import NewDpia from "@/app/app/clients/[clientId]/dpias/new/page";

// Client self-service: the firm's page, for the signed-in contact's own organisation (access is checked again inside).
export default async function PortalNewDpia({ params, searchParams }: { params: Promise<Record<string, never>>; searchParams: Promise<Record<string, string>> }) {
  const u = await requireContact();
  return <NewDpia params={params.then((p) => ({ ...p, clientId: u.client_id! }))} searchParams={searchParams} />;
}
