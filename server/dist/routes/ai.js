import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { generateText, generateCover, structureText, improveText, editSelectionText, suggestPrice, } from "../ai/index.js";
const router = Router();
// All AI routes require authentication
router.use(authMiddleware);
// ─── POST /ai/structure ──────────────────────────────────────────────────────
// Accepts { text: string }, returns structured sections
router.post("/structure", async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || typeof text !== "string") {
            return res.status(400).json({ error: "text (string) is required" });
        }
        const result = await structureText(text);
        res.json(result);
    }
    catch (err) {
        console.error("[AI /structure]", err);
        res.status(500).json({ error: "Failed to structure text" });
    }
});
// ─── POST /ai/generate ───────────────────────────────────────────────────────
// Accepts { topic: string }, returns generated guide outline
router.post("/generate", async (req, res) => {
    try {
        const { topic } = req.body;
        if (!topic || typeof topic !== "string") {
            return res.status(400).json({ error: "topic (string) is required" });
        }
        const result = await generateText(topic, `
You are a guide content generator. Create a detailed outline for a guide about: "${topic}".
Return ONLY valid JSON in this shape:
{
  "title": "Guide title",
  "sections": [
    { "title": "Section title", "content": "What this section covers", "estimatedWordCount": 500 }
  ]
}
`);
        res.json(JSON.parse(extractJson(result)));
    }
    catch (err) {
        console.error("[AI /generate]", err);
        res.status(500).json({ error: "Failed to generate guide outline" });
    }
});
// ─── POST /ai/improve ────────────────────────────────────────────────────────
// Accepts { text: string, instruction: string }, returns improved text
router.post("/improve", async (req, res) => {
    try {
        const { text, instruction } = req.body;
        if (!text || typeof text !== "string") {
            return res.status(400).json({ error: "text (string) is required" });
        }
        if (!instruction || typeof instruction !== "string") {
            return res.status(400).json({ error: "instruction (string) is required" });
        }
        const result = await improveText(text, instruction);
        res.json({ improvedText: result });
    }
    catch (err) {
        console.error("[AI /improve]", err);
        res.status(500).json({ error: "Failed to improve text" });
    }
});
// ─── POST /ai/edit-selection ────────────────────────────────────────────────
// Accepts { text: string, mode?: string, instruction?: string }
router.post("/edit-selection", async (req, res) => {
    try {
        const { text, mode, instruction } = req.body;
        if (!text || typeof text !== "string") {
            return res.status(400).json({ error: "text (string) is required" });
        }
        if (mode !== undefined && typeof mode !== "string") {
            return res.status(400).json({ error: "mode must be a string" });
        }
        if (instruction !== undefined && typeof instruction !== "string") {
            return res.status(400).json({ error: "instruction must be a string" });
        }
        const result = await editSelectionText(text, typeof mode === "string" ? mode : "improve", typeof instruction === "string" ? instruction : undefined);
        res.json(result);
    }
    catch (err) {
        console.error("[AI /edit-selection]", err);
        res.status(500).json({ error: "Failed to edit selected text" });
    }
});
// ─── POST /ai/suggest-price ─────────────────────────────────────────────────
// Accepts { title, description, wordCount }, returns price suggestion in RUB
router.post("/suggest-price", async (req, res) => {
    try {
        const { title, description, wordCount } = req.body;
        if (!title || !description || typeof wordCount !== "number") {
            return res.status(400).json({
                error: "title, description, and wordCount are required",
            });
        }
        const result = await suggestPrice(title, description, wordCount);
        res.json(result);
    }
    catch (err) {
        console.error("[AI /suggest-price]", err);
        res.status(500).json({ error: "Failed to suggest price" });
    }
});
// ─── POST /ai/generate-content ───────────────────────────────────────────────
// Accepts { prompt: string, context?: string, maxLength?: number }
// Returns { content: string; mock: boolean; provider: string }
router.post("/generate-content", async (req, res) => {
    try {
        const { prompt, context, maxLength } = req.body;
        if (!prompt || typeof prompt !== "string") {
            return res.status(400).json({ error: "prompt (string) is required" });
        }
        const maxLen = typeof maxLength === "number" ? maxLength : 2000;
        const ctx = typeof context === "string" ? context : "";
        const fullPrompt = ctx
            ? `Context:\n${ctx}\n\nGenerate content based on this prompt:\n${prompt}`
            : prompt;
        const systemPrompt = `You are a professional content writer for a digital guide platform.
Write engaging, well-structured content based on the user's prompt.
Use clear headings, practical examples, and actionable advice.
Keep the response under ${maxLen} characters.
Return only the content text, no markdown fences or explanations.`;
        const content = await generateText(fullPrompt, systemPrompt);
        res.json({
            content: content.trim(),
            mock: false,
            provider: "llm",
        });
    }
    catch (err) {
        console.error("[AI /generate-content]", err);
        // Fallback mock
        const { prompt } = req.body;
        res.json({
            content: `Here is content about "${prompt || "your topic"}".\n\nThis is a placeholder. Connect an AI API key to generate real content.`,
            mock: true,
            provider: "mock",
        });
    }
});
// ─── POST /ai/cover ──────────────────────────────────────────────────────────
// Accepts { prompt: string }, returns image data URL
router.post("/cover", async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt || typeof prompt !== "string") {
            return res.status(400).json({ error: "prompt (string) is required" });
        }
        const imageUrl = await generateCover(prompt);
        res.json({ imageUrl });
    }
    catch (err) {
        console.error("[AI /cover]", err);
        res.status(500).json({ error: "Failed to generate cover image" });
    }
});
// ─── Utilities ───────────────────────────────────────────────────────────────
function extractJson(text) {
    return text.replace(/^```(?:json)?\n?([\s\S]*?)\n?```$/m, "$1").trim();
}
export default router;
