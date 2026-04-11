import { Router, Request } from "express";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/auth.js";
import { prisma } from "../db/prisma.js";

const router = Router();

// ─── POST /analytics/track ───────────────────────────────────────────────────
// Accepts { guideId, eventType, metadata }, records event

router.post("/track", optionalAuthMiddleware, async (req: Request, res) => {
  try {
    const { guideId, eventType, metadata } = req.body;

    if (!guideId || !eventType) {
      return res.status(400).json({
        error: "guideId and eventType are required",
      });
    }

    const userId = req.user?.id ?? null;
    const ip = req.ip ?? req.socket.remoteAddress ?? "";
    const userAgent = String(req.headers["user-agent"] ?? "");

    await prisma.analyticsEvent.create({
      data: {
        guideId,
        userId,
        eventType,
        metadata: metadata ?? {},
        ip,
        userAgent,
      },
    });

    // Increment guide views for page view events
    if (eventType === "page_view" || eventType === "view") {
      await prisma.guide.update({
        where: { id: guideId },
        data: { views: { increment: 1 } },
      });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[POST /analytics/track]", err);
    res.status(500).json({ error: "Failed to track event" });
  }
});

// ─── GET /analytics ─────────────────────────────────────────────────────────
// Returns aggregated stats for all guides of current user

router.get("/", authMiddleware, async (req: Request, res) => {
  try {
    const guides = await prisma.guide.findMany({
      where: { authorId: req.user!.id },
      select: {
        id: true,
        title: true,
        views: true,
        sales: true,
        revenue: true,
      },
    });

    const guideIds = guides.map((g) => g.id);
    const events = guideIds.length > 0
      ? await prisma.analyticsEvent.findMany({
          where: { guideId: { in: guideIds } },
          select: { eventType: true },
        })
      : [];

    const totalRevenue = guides.reduce((sum, g) => sum + Number(g.revenue), 0);
    const totalSales = guides.reduce((sum, g) => sum + g.sales, 0);
    const totalViews = guides.reduce((sum, g) => sum + g.views, 0);

    const eventCounts = events.reduce<Record<string, number>>((acc, e) => {
      acc[e.eventType] = (acc[e.eventType] ?? 0) + 1;
      return acc;
    }, {});

    const conversion = totalViews > 0 ? (totalSales / totalViews) * 100 : 0;

    res.json({
      total_revenue: totalRevenue,
      total_sales: totalSales,
      total_views: totalViews,
      conversion,
      events: eventCounts,
      guides_count: guides.length,
    });
  } catch (err) {
    console.error("[GET /analytics]", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// ─── GET /analytics/:guideId ─────────────────────────────────────────────────
// Returns aggregated stats for a guide

router.get("/:guideId", authMiddleware, async (req: Request, res) => {
  try {
    const guideId = String(req.params.guideId);

    // Verify ownership
    const guide = await prisma.guide.findUnique({
      where: { id: guideId },
      select: { id: true, authorId: true },
    });

    if (!guide) {
      return res.status(404).json({ error: "Guide not found" });
    }

    if (guide.authorId !== req.user!.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Fetch all events for this guide
    const events = await prisma.analyticsEvent.findMany({
      where: { guideId },
      select: {
        eventType: true,
        userId: true,
      },
    });

    // Aggregate
    const stats: Record<string, number> = {};
    const uniqueUsers = new Set<string>();

    for (const event of events) {
      stats[event.eventType] = (stats[event.eventType] ?? 0) + 1;
      if (event.userId) uniqueUsers.add(event.userId);
    }

    // Fetch order stats for this guide
    const orders = await prisma.order.findMany({
      where: { guideId },
      select: { status: true, amount: true },
    });

    const revenue = orders
      .filter((o) => o.status === "completed")
      .reduce((sum, o) => sum + Number(o.amount), 0);

    const totalOrders = orders.length;
    const completedOrders = orders.filter((o) => o.status === "completed").length;

    res.json({
      guideId,
      events: stats,
      totalEvents: events.length,
      uniqueUsers: uniqueUsers.size,
      orders: {
        total: totalOrders,
        completed: completedOrders,
        revenue,
      },
    });
  } catch (err) {
    console.error("[GET /analytics/:guideId]", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

export default router;
