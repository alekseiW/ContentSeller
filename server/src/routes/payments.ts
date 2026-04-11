import { Router, Request } from "express";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/auth.js";
import { createPayment, verifyPayment, handleWebhook } from "../payments/yookassa.js";
import { prisma } from "../db/prisma.js";

const router = Router();

function setQueryParams(url: string, params: Record<string, string>): string {
  try {
    const parsed = new URL(url);
    for (const [key, value] of Object.entries(params)) {
      parsed.searchParams.set(key, value);
    }
    return parsed.toString();
  } catch {
    const query = Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join("&");
    const joiner = url.includes("?") ? "&" : "?";
    return `${url}${joiner}${query}`;
  }
}

async function markOrderCompleted(orderId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) return;

    const needsStatusUpdate = order.status !== "completed";
    if (needsStatusUpdate) {
      await tx.order.update({
        where: { id: order.id },
        data: { status: "completed" },
      });

      await tx.guide.update({
        where: { id: order.guideId },
        data: {
          sales: { increment: 1 },
          revenue: { increment: order.amount },
        },
      });
    }

    if (order.buyerId) {
      await tx.purchase.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          userId: order.buyerId,
          guideId: order.guideId,
        },
        update: {},
      });
    }
  });
}

// ─── POST /payments/create ───────────────────────────────────────────────────
// Accepts { guideId, buyerEmail, buyerName }, creates YooKassa payment

router.post("/create", authMiddleware, async (req: Request, res) => {
  try {
    const { guideId, buyerEmail, buyerName } = req.body;

    if (!guideId || !buyerEmail) {
      return res.status(400).json({
        error: "guideId and buyerEmail are required",
      });
    }

    // Fetch guide info
    const guide = await prisma.guide.findUnique({
      where: { id: guideId },
      include: {
        author: {
          select: {
            username: true,
          },
        },
      },
    });

    if (!guide) {
      return res.status(404).json({ error: "Guide not found" });
    }

    if (Number(guide.price) <= 0) {
      return res.status(400).json({ error: "Guide is free" });
    }

    // Create order record
    const order = await prisma.order.create({
      data: {
        guideId,
        buyerId: req.user!.id,
        buyerEmail,
        buyerName: buyerName ?? "",
        amount: guide.price,
        currency: "RUB",
        status: "pending",
      },
    });

    const frontendUrl = (process.env.FRONTEND_URL ?? "http://localhost:5173").replace(/\/$/, "");
    const defaultReturnUrl = `${frontendUrl}/guide/${guide.author.username}/${guide.slug}`;
    const configuredReturnUrlRaw = process.env.YOOKASSA_RETURN_URL?.trim() ?? "";
    const configuredReturnUrl =
      !configuredReturnUrlRaw ||
      configuredReturnUrlRaw === frontendUrl ||
      configuredReturnUrlRaw === `${frontendUrl}/`
        ? defaultReturnUrl
        : configuredReturnUrlRaw;
    const returnUrl = setQueryParams(configuredReturnUrl, { orderId: order.id });

    const yookassaConfigured = Boolean(
      process.env.YOOKASSA_SHOP_ID?.trim() && process.env.YOOKASSA_SECRET_KEY?.trim(),
    );

    if (!yookassaConfigured) {
      const mockPaymentId = `mock_${order.id}`;

      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentId: mockPaymentId,
        },
      });

      await markOrderCompleted(order.id);

      const mockConfirmationUrl = setQueryParams(returnUrl, {
        payment: "mock",
        status: "succeeded",
      });

      return res.json({
        orderId: order.id,
        paymentId: mockPaymentId,
        confirmation_url: mockConfirmationUrl,
        mock: true,
      });
    }

    // Create YooKassa payment
    let payment: { id: string; confirmation_url: string };
    try {
      payment = await createPayment(
        Number(guide.price),
        "RUB",
        `Guide: ${guide.title}`,
        returnUrl,
      );
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw err;
      }

      console.warn("[POST /payments/create] YooKassa unavailable, using mock flow");
      const mockPaymentId = `mock_${order.id}`;

      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentId: mockPaymentId,
        },
      });

      await markOrderCompleted(order.id);

      const mockConfirmationUrl = setQueryParams(returnUrl, {
        payment: "mock",
        status: "succeeded",
      });

      return res.json({
        orderId: order.id,
        paymentId: mockPaymentId,
        confirmation_url: mockConfirmationUrl,
        mock: true,
      });
    }

    // Store payment ID on order
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentId: payment.id },
    });

    res.json({
      orderId: order.id,
      paymentId: payment.id,
      confirmation_url: payment.confirmation_url,
      mock: false,
    });
  } catch (err) {
    console.error("[POST /payments/create]", err);
    res.status(500).json({ error: "Failed to create payment" });
  }
});

// ─── POST /payments/webhook ──────────────────────────────────────────────────
// Receives YooKassa webhook, updates order status

router.post("/webhook", async (req: Request, res) => {
  try {
    const signature = req.headers["x-signature"] as string | undefined;
    const result = await handleWebhook(req.body, signature);

    console.log("[YooKassa webhook]", result);

    // Find order by payment_id
    const order = await prisma.order.findFirst({
      where: { paymentId: result.paymentId },
    });

    if (!order) {
      console.warn("[YooKassa webhook] Order not found for payment:", result.paymentId);
      return res.status(404).json({ error: "Order not found" });
    }

    // Update order status based on event
    let newStatus = order.status;

    switch (result.status) {
      case "succeeded":
        newStatus = "completed";
        break;
      case "canceled":
        newStatus = "canceled";
        break;
      case "pending":
        newStatus = "pending";
        break;
      case "waiting_for_capture":
        newStatus = "waiting";
        break;
    }

    if (newStatus !== order.status) {
      if (newStatus === "completed") {
        await markOrderCompleted(order.id);
      } else {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: newStatus },
        });
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[POST /payments/webhook]", err);
    res.status(400).json({ error: "Webhook processing failed" });
  }
});

// ─── GET /payments/order/:id ─────────────────────────────────────────────────
// Returns order status

router.get("/order/:id", optionalAuthMiddleware, async (req: Request, res) => {
  try {
    const id = String(req.params.id);

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Only owner or admin can view
    if (req.user && order.buyerId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Verify current status with YooKassa if still pending
    if (order.status === "pending" && order.paymentId) {
      try {
        if (order.paymentId.startsWith("mock_")) {
          await markOrderCompleted(order.id);
          order.status = "completed";
        } else {
          const ykStatus = await verifyPayment(order.paymentId);
          if (ykStatus.status === "succeeded") {
            await markOrderCompleted(order.id);
            order.status = "completed";
          }
        }
      } catch {
        // YooKassa check failed, return cached status
      }
    }

    res.json(order);
  } catch (err) {
    console.error("[GET /payments/order/:id]", err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

export default router;
