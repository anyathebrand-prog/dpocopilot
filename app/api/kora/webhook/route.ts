import { createHmac, timingSafeEqual } from "node:crypto";
import { confirmPayment } from "@/lib/checkout";

/** Kora webhook (charge.success). Signature: HMAC-SHA256 of the JSON `data` object with the secret key, hex, in x-korapay-signature. */
export async function POST(req: Request) {
  const key = process.env.KORA_SECRET_KEY;
  if (!key) return new Response("Not configured", { status: 404 });
  const body = await req.json().catch(() => null);
  const sig = req.headers.get("x-korapay-signature") ?? "";
  const want = createHmac("sha256", key).update(JSON.stringify(body?.data ?? null)).digest("hex");
  if (!body?.data || sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return new Response("Bad signature", { status: 401 });
  const ref = String(body.data.reference ?? "");
  // Status is re-checked with Kora's API before anything is released.
  if (body.event === "charge.success" && /^DPOC-[0-9a-f-]{36}$/.test(ref)) await confirmPayment(ref);
  return new Response("ok");
}
