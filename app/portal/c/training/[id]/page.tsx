import { requireContact } from "@/lib/auth";
import TrainingSession from "@/app/app/clients/[clientId]/training/[id]/page";

// Client self-service: the firm's page, for the signed-in contact's own organisation (access is checked again inside).
export default async function PortalTrainingSession({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const u = await requireContact();
  return <TrainingSession params={params.then((p) => ({ ...p, clientId: u.client_id! }))} searchParams={searchParams} />;
}
