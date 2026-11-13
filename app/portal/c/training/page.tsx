import { requireContact } from "@/lib/auth";
import TrainingPlan from "@/app/app/clients/[clientId]/training/page";

// Client self-service: the firm's page, for the signed-in contact's own organisation (access is checked again inside).
export default async function PortalTrainingPlan({ params, searchParams }: { params: Promise<Record<string, never>>; searchParams: Promise<Record<string, string>> }) {
  const u = await requireContact();
  return <TrainingPlan params={params.then((p) => ({ ...p, clientId: u.client_id! }))} searchParams={searchParams} />;
}
