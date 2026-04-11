import { createHmac, timingSafeEqual } from "crypto";

// ─── Configuration ───────────────────────────────────────────────────────────

const shopId = process.env.YOOKASSA_SHOP_ID?.trim();
const secretKey = process.env.YOOKASSA_SECRET_KEY?.trim();
const baseUrl = "https://api.yookassa.ru/v3";

const headers = (extra: Record<string, string> = {}) => ({
  "Content-Type": "application/json",
  Accept: "application/json",
  "Idempotence-Key": crypto.randomUUID(),
  Authorization: `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`,
  ...extra,
});

function assertConfigured(): void {
  if (!shopId || !secretKey) {
    throw new Error("YooKassa not configured: YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY required");
  }
}

// ─── Create payment ──────────────────────────────────────────────────────────

/**
 * Creates a YooKassa payment link.
 */
export async function createPayment(
  amount: number,
  currency: string,
  description: string,
  returnUrl: string,
): Promise<{ id: string; confirmation_url: string }> {
  assertConfigured();

  const body = JSON.stringify({
    amount: { value: amount.toFixed(2), currency },
    confirmation: { type: "redirect", return_url: returnUrl },
    description,
    capture: true,
  });

  const res = await fetch(`${baseUrl}/payments`, {
    method: "POST",
    headers: headers(),
    body,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`YooKassa API error ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as {
    id: string;
    confirmation: { confirmation_url: string };
  };

  return {
    id: data.id,
    confirmation_url: data.confirmation?.confirmation_url ?? "",
  };
}

// ─── Verify payment ──────────────────────────────────────────────────────────

/**
 * Checks YooKassa payment status by ID.
 */
export async function verifyPayment(paymentId: string): Promise<{
  status: string;
  amount: number;
}> {
  assertConfigured();

  const res = await fetch(`${baseUrl}/payments/${paymentId}`, {
    method: "GET",
    headers: headers(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`YooKassa API error ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as {
    status: string;
    amount: { value: string; currency: string };
  };

  return {
    status: data.status,
    amount: parseFloat(data.amount.value),
  };
}

// ─── Webhook handler ─────────────────────────────────────────────────────────

/**
 * Processes a YooKassa webhook notification.
 * Verifies the HMAC-SHA256 signature if a secret key is present,
 * then extracts event, paymentId, and status from the body.
 */
export async function handleWebhook(
  body: any,
  signature: string | undefined,
): Promise<{ event: string; paymentId: string; status: string }> {
  // Signature verification (YooKassa sends notifications with a header)
  if (signature && secretKey) {
    const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
    const expectedSig = createHmac("sha256", secretKey).update(bodyStr).digest("hex");

    // Timing-safe comparison
    if (signature.length !== expectedSig.length) {
      throw new Error("Invalid webhook signature: length mismatch");
    }
    const valid = timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSig),
    );
    if (!valid) {
      throw new Error("Invalid webhook signature");
    }
  }

  const parsed = typeof body === "string" ? JSON.parse(body) : body;

  const event = parsed.event ?? "";
  const object = parsed.object ?? {};

  return {
    event,
    paymentId: object.id ?? "",
    status: object.status ?? "",
  };
}
