import { createHmac, timingSafeEqual } from "node:crypto";
import { confirmPayment } from "@/lib/checkout";

/** Paystack webhook. Signature: HMAC-SHA512 of the raw body with the secret key, hex, in x-paystack-signature. */
export async function POST(req: Request) {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) return new Response("Not configured", { status: 404 });
  const raw = await req.text();
  const sig = req.headers.get("x-paystack-signature") ?? "";
  const want = createHmac("sha512", key).update(raw).digest("hex");
  if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return new Response("Bad signature", { status: 401 });
  const body = JSON.parse(raw);
  const ref = String(body?.data?.reference ?? "");
  // Status is re-checked with Paystack's verify API before anything is released.
  if (body?.event === "charge.success" && /^DPOC-[0-9a-f-]{36}$/.test(ref)) await confirmPayment(ref);
  return new Response("ok");
}
