import { sendCarReminders } from "@/lib/reminders";

// Call once a day (e.g. 08:00 WAT) from any scheduler: Vercel Cron, system cron, or `curl -H "authorization: Bearer $CRON_SECRET"`.
// ponytail: a plain HTTP trigger; move to the pg-boss deadline scheduler (TRD §5) when more reminder types arrive.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const allowed = secret ? req.headers.get("authorization") === `Bearer ${secret}` : process.env.NODE_ENV !== "production";
  if (!allowed) return new Response("Unauthorized", { status: 401 });
  return Response.json(await sendCarReminders());
}
