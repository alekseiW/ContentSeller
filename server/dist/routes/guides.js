import { Router } from "express";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/auth.js";
import { prisma } from "../db/prisma.js";
const router = Router();
function slugify(value) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}\s-]/gu, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "guide";
}
async function generateUniqueSlug(authorId, baseTitle) {
    const base = slugify(baseTitle);
    let candidate = base;
    let counter = 2;
    while (true) {
        const existing = await prisma.guide.findFirst({
            where: { authorId, slug: candidate },
            select: { id: true },
        });
        if (!existing)
            return candidate;
        candidate = `${base}-${counter}`;
        counter += 1;
    }
}
function mapGuideUpdates(input) {
    const mapped = { ...input };
    if ("cover_image" in mapped) {
        mapped.coverImage = mapped.cover_image;
        delete mapped.cover_image;
    }
    if ("accent_color" in mapped) {
        mapped.accentColor = mapped.accent_color;
        delete mapped.accent_color;
    }
    if ("show_preview" in mapped) {
        mapped.showPreview = mapped.show_preview;
        delete mapped.show_preview;
    }
    if ("preview_sections" in mapped) {
        mapped.previewSections = mapped.preview_sections;
        delete mapped.preview_sections;
    }
    if ("is_course" in mapped) {
        mapped.isCourse = mapped.is_course;
        delete mapped.is_course;
    }
    if ("published_at" in mapped) {
        mapped.publishedAt = mapped.published_at;
        delete mapped.published_at;
    }
    return mapped;
}
const PAID_INLINE_REGEX = /<span\b[^>]*data-paid-text\s*=\s*["']?true["']?[^>]*>[\s\S]*?<\/span>/gi;
const PAID_BLOCK_REGEX = /<div[^>]*data-paid-block=["']?true["']?[^>]*>[\s\S]*?<\/div>/gi;
function redactPaidBlocksFromHtml(html) {
    return html.replace(PAID_BLOCK_REGEX, (match) => {
        return `<div class="gh-locked-block" data-locked="true">
      <div class="gh-locked-block-icon">&#128274;</div>
      <div class="gh-locked-block-text">This content is locked</div>
      <div class="gh-locked-block-hint">Purchase this guide to unlock</div>
    </div>`;
    });
}
function redactPaidInlineHtml(html) {
    return html.replace(PAID_INLINE_REGEX, '<span data-paid-text="true" class="gh-paid-inline-placeholder">Paid content</span>');
}
function redactInlinePaidContent(content) {
    if (typeof content === "string") {
        if (content.trim().startsWith("<")) {
            return redactPaidInlineHtml(content);
        }
        return content;
    }
    if (!content || typeof content !== "object") {
        return content;
    }
    const next = { ...content };
    if (typeof next.html === "string") {
        next.html = redactPaidInlineHtml(next.html);
    }
    return next;
}
function buildLockedSectionContent() {
    return {
        version: 2,
        format: "tiptap",
        html: '<p><strong>Locked section.</strong> Purchase the guide to unlock this part.</p>',
        doc: null,
        locked: true,
    };
}
// ─── GET /guides — returns user's own guides ────────────────────────────────
router.get("/", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const guides = await prisma.guide.findMany({
            where: { authorId: userId },
            orderBy: { createdAt: "desc" },
        });
        res.json(guides);
    }
    catch (err) {
        console.error("[GET /guides]", err);
        res.status(500).json({ error: "Failed to fetch guides" });
    }
});
// ─── POST /guides — creates a new guide ──────────────────────────────────────
router.post("/", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, slug, description, price, cover_image, accent_color, template, show_preview, preview_sections, is_course, sections } = req.body;
        if (!title) {
            return res.status(400).json({ error: "title is required" });
        }
        const resolvedSlug = slug ? String(slug) : await generateUniqueSlug(userId, String(title));
        // Insert guide with sections in a transaction
        const guide = await prisma.guide.create({
            data: {
                authorId: userId,
                title,
                slug: resolvedSlug,
                description: description ?? "",
                price: price ?? 0,
                coverImage: cover_image ?? null,
                accentColor: accent_color ?? "#6366f1",
                template: template ?? "minimal",
                showPreview: show_preview ?? true,
                previewSections: preview_sections ?? [],
                isCourse: is_course ?? false,
                status: "draft",
                ...(sections?.length > 0 && {
                    sections: {
                        create: sections.map((s, i) => ({
                            title: s.title ?? "",
                            content: s.content ?? {},
                            sectionOrder: s.section_order ?? s.order ?? i,
                            hiddenUntilPayment: s.hidden_until_payment ?? false,
                        })),
                    },
                }),
            },
            include: { sections: true },
        });
        res.status(201).json(guide);
    }
    catch (err) {
        console.error("[POST /guides]", err);
        res.status(500).json({ error: "Failed to create guide" });
    }
});
// ─── GET /guides/:id — returns guide with sections ───────────────────────────
router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const id = String(req.params.id);
        const userId = req.user.id;
        const guide = await prisma.guide.findUnique({
            where: { id },
            include: { sections: { orderBy: { sectionOrder: "asc" } } },
        });
        if (!guide) {
            return res.status(404).json({ error: "Guide not found" });
        }
        if (guide.authorId !== userId) {
            return res.status(403).json({ error: "Access denied" });
        }
        res.json(guide);
    }
    catch (err) {
        console.error("[GET /guides/:id]", err);
        res.status(500).json({ error: "Failed to fetch guide" });
    }
});
// ─── PATCH /guides/:id — updates guide ───────────────────────────────────────
router.patch("/:id", authMiddleware, async (req, res) => {
    try {
        const id = String(req.params.id);
        const userId = req.user.id;
        const { sections, ...rawGuideUpdates } = req.body;
        const guideUpdates = mapGuideUpdates(rawGuideUpdates);
        // Verify ownership
        const existing = await prisma.guide.findFirst({
            where: { id, authorId: userId },
            select: { id: true },
        });
        if (!existing) {
            return res.status(404).json({ error: "Guide not found or access denied" });
        }
        // Update guide and sections in a transaction
        const guide = await prisma.$transaction(async (tx) => {
            // Update guide fields
            if (Object.keys(guideUpdates).length > 0) {
                await tx.guide.update({
                    where: { id },
                    data: guideUpdates,
                });
            }
            // Replace sections if provided and non-empty
            if (sections !== undefined && sections.length > 0) {
                await tx.guideSection.deleteMany({ where: { guideId: id } });
                await tx.guideSection.createMany({
                    data: sections.map((s, i) => ({
                        guideId: id,
                        title: s.title ?? "",
                        content: s.content ?? {},
                        sectionOrder: s.section_order ?? s.order ?? i,
                        hiddenUntilPayment: s.hidden_until_payment ?? false,
                    })),
                });
            }
            return tx.guide.findUnique({
                where: { id },
                include: { sections: { orderBy: { sectionOrder: "asc" } } },
            });
        });
        res.json(guide);
    }
    catch (err) {
        console.error("[PATCH /guides/:id]", err);
        res.status(500).json({ error: "Failed to update guide" });
    }
});
// ─── DELETE /guides/:id — deletes guide ──────────────────────────────────────
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const id = String(req.params.id);
        const userId = req.user.id;
        const existing = await prisma.guide.findFirst({
            where: { id, authorId: userId },
            select: { id: true },
        });
        if (!existing) {
            return res.status(404).json({ error: "Guide not found or access denied" });
        }
        // Cascade delete handles sections via FK
        await prisma.guide.delete({ where: { id } });
        res.json({ message: "Guide deleted" });
    }
    catch (err) {
        console.error("[DELETE /guides/:id]", err);
        res.status(500).json({ error: "Failed to delete guide" });
    }
});
// ─── GET /guides/catalog ────────────────────────────────────────────────────────────
// Returns published guides with optional search/filter
// Query params: q (search), sort (newest|popular|price_asc|price_desc), page, limit
router.get("/catalog", async (req, res) => {
    try {
        const q = typeof req.query.q === "string" ? req.query.q : "";
        const sort = typeof req.query.sort === "string" ? req.query.sort : "newest";
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;
        const where = { publishedAt: { not: null } };
        if (q) {
            where.OR = [
                { title: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
            ];
        }
        const orderBy = {};
        switch (sort) {
            case "popular":
                orderBy.sales = "desc";
                break;
            case "price_asc":
                orderBy.price = "asc";
                break;
            case "price_desc":
                orderBy.price = "desc";
                break;
            default:
                orderBy.publishedAt = "desc";
        }
        const [guides, total] = await Promise.all([
            prisma.guide.findMany({
                where,
                orderBy,
                skip,
                take: limit,
                include: {
                    author: {
                        select: {
                            fullName: true,
                            username: true,
                            avatarUrl: true,
                        },
                    },
                },
            }),
            prisma.guide.count({ where }),
        ]);
        res.json({
            guides: guides.map((g) => ({
                id: g.id,
                title: g.title,
                slug: g.slug,
                description: g.description,
                coverImage: g.coverImage,
                accentColor: g.accentColor,
                price: Number(g.price),
                sales: Number(g.sales),
                publishedAt: g.publishedAt,
                author: {
                    fullName: g.author.fullName,
                    username: g.author.username,
                    avatarUrl: g.author.avatarUrl,
                },
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (err) {
        console.error("[GET /guides/catalog]", err);
        res.status(500).json({ error: "Failed to fetch catalog" });
    }
});
// ─── GET /guides/author/:username ────────────────────────────────────────────────────────────
// Returns author profile + their published guides
router.get("/author/:username", optionalAuthMiddleware, async (req, res) => {
    try {
        const username = String(req.params.username);
        const author = await prisma.profile.findUnique({
            where: { username },
            select: {
                id: true,
                fullName: true,
                username: true,
                bio: true,
                avatarUrl: true,
            },
        });
        if (!author) {
            return res.status(404).json({ error: "Author not found" });
        }
        const guides = await prisma.guide.findMany({
            where: {
                authorId: author.id,
                publishedAt: { not: null },
            },
            orderBy: { publishedAt: "desc" },
            select: {
                id: true,
                title: true,
                slug: true,
                description: true,
                coverImage: true,
                accentColor: true,
                price: true,
                sales: true,
                revenue: true,
                publishedAt: true,
            },
        });
        res.json({
            author: {
                fullName: author.fullName,
                username: author.username,
                bio: author.bio,
                avatarUrl: author.avatarUrl,
            },
            guides: guides.map((g) => ({
                id: g.id,
                title: g.title,
                slug: g.slug,
                description: g.description,
                coverImage: g.coverImage,
                accentColor: g.accentColor,
                price: Number(g.price),
                sales: Number(g.sales),
                publishedAt: g.publishedAt,
            })),
        });
    }
    catch (err) {
        console.error("[GET /guides/author/:username]", err);
        res.status(500).json({ error: "Failed to fetch author profile" });
    }
});
// ─── GET /guides/:username/:slug/public — public guide (no auth) ─────────────
router.get("/:username/:slug/public", optionalAuthMiddleware, async (req, res) => {
    try {
        const username = String(req.params.username);
        const slug = String(req.params.slug);
        const guide = await prisma.guide.findFirst({
            where: {
                slug,
                status: "published",
                author: { username },
            },
            include: {
                sections: { orderBy: { sectionOrder: "asc" } },
                author: {
                    select: {
                        username: true,
                        fullName: true,
                        avatarUrl: true,
                        bio: true,
                        socialLinks: true,
                    },
                },
            },
        });
        if (!guide) {
            return res.status(404).json({ error: "Published guide not found" });
        }
        let hasPurchased = false;
        if (req.user?.id) {
            if (req.user.id === guide.authorId) {
                hasPurchased = true;
            }
            else {
                const purchase = await prisma.purchase.findFirst({
                    where: {
                        guideId: guide.id,
                        userId: req.user.id,
                    },
                    select: { id: true },
                });
                hasPurchased = Boolean(purchase);
            }
        }
        const sections = guide.sections.map((section) => {
            if (hasPurchased) {
                return section;
            }
            if (section.hiddenUntilPayment) {
                return {
                    ...section,
                    content: buildLockedSectionContent(),
                };
            }
            return {
                ...section,
                content: redactInlinePaidContent(section.content),
            };
        });
        // Also redact paid blocks from HTML content in each section
        for (const section of sections) {
            const s = section;
            if (typeof s.content === 'object' && s.content !== null) {
                const content = s.content;
                if (typeof content.html === 'string') {
                    content.html = redactPaidBlocksFromHtml(content.html);
                }
            }
            else if (typeof s.content === 'string' && s.content.trim().startsWith('<')) {
                s.content = redactPaidBlocksFromHtml(s.content);
            }
        }
        res.json({
            ...guide,
            sections,
            hasPurchased,
        });
    }
    catch (err) {
        console.error("[GET /guides/:username/:slug/public]", err);
        res.status(500).json({ error: "Failed to fetch public guide" });
    }
});
// ─── GET /guides/:id/sections ────────────────────────────────────────────────
router.get("/:id/sections", authMiddleware, async (req, res) => {
    try {
        const id = String(req.params.id);
        const sections = await prisma.guideSection.findMany({
            where: { guideId: id },
            orderBy: { sectionOrder: "asc" },
        });
        res.json(sections);
    }
    catch (err) {
        console.error("[GET /guides/:id/sections]", err);
        res.status(500).json({ error: "Failed to fetch sections" });
    }
});
// ─── POST /guides/:id/sections ───────────────────────────────────────────────
router.post("/:id/sections", authMiddleware, async (req, res) => {
    try {
        const id = String(req.params.id);
        const { title, content, section_order, hidden_until_payment } = req.body;
        const section = await prisma.guideSection.create({
            data: {
                guideId: id,
                title: title ?? "",
                content: content ?? {},
                sectionOrder: section_order ?? req.body.order ?? 0,
                hiddenUntilPayment: hidden_until_payment ?? false,
            },
        });
        res.status(201).json(section);
    }
    catch (err) {
        console.error("[POST /guides/:id/sections]", err);
        res.status(500).json({ error: "Failed to create section" });
    }
});
// ─── PATCH /sections/:sectionId ──────────────────────────────────────────────
router.patch("/sections/:sectionId", authMiddleware, async (req, res) => {
    try {
        const sectionId = String(req.params.sectionId);
        const updates = { ...req.body };
        // Verify ownership through the parent guide
        const section = await prisma.guideSection.findUnique({
            where: { id: sectionId },
            include: { guide: { select: { authorId: true } } },
        });
        if (!section) {
            return res.status(404).json({ error: "Section not found" });
        }
        if (section.guide.authorId !== req.user.id) {
            return res.status(403).json({ error: "Not authorized" });
        }
        if ("section_order" in updates) {
            updates.sectionOrder = updates.section_order;
            delete updates.section_order;
        }
        if ("order" in updates) {
            updates.sectionOrder = updates.order;
            delete updates.order;
        }
        if ("hidden_until_payment" in updates) {
            updates.hiddenUntilPayment = updates.hidden_until_payment;
            delete updates.hidden_until_payment;
        }
        const updatedSection = await prisma.guideSection.update({
            where: { id: sectionId },
            data: updates,
        });
        res.json(updatedSection);
    }
    catch (err) {
        console.error("[PATCH /sections/:sectionId]", err);
        res.status(500).json({ error: "Failed to update section" });
    }
});
// ─── DELETE /sections/:sectionId ─────────────────────────────────────────────
router.delete("/sections/:sectionId", authMiddleware, async (req, res) => {
    try {
        const sectionId = String(req.params.sectionId);
        // Verify ownership through the parent guide
        const section = await prisma.guideSection.findUnique({
            where: { id: sectionId },
            include: { guide: { select: { authorId: true } } },
        });
        if (!section) {
            return res.status(404).json({ error: "Section not found" });
        }
        if (section.guide.authorId !== req.user.id) {
            return res.status(403).json({ error: "Not authorized" });
        }
        await prisma.guideSection.delete({
            where: { id: sectionId },
        });
        res.json({ message: "Section deleted" });
    }
    catch (err) {
        console.error("[DELETE /sections/:sectionId]", err);
        res.status(500).json({ error: "Failed to delete section" });
    }
});
export default router;
