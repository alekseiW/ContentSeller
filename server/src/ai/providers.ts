import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";

// ─── Client initialization ───────────────────────────────────────────────────

const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
const anthropicApiKey = process.env.ANTHROPIC_API_KEY?.trim();
const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
const grokApiKey = process.env.GROK_API_KEY?.trim();
const gigachatCredentials = process.env.GIGACHAT_API_KEY?.trim();

const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;
const anthropic = anthropicApiKey ? new Anthropic({ apiKey: anthropicApiKey }) : null;
const gemini = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
const groq = grokApiKey ? new Groq({ apiKey: grokApiKey }) : null;

// ─── GigaChat OAuth token management ─────────────────────────────────────────

let gigachatToken: string | null = null;
let gigachatTokenExpiry = 0;

async function getGigaChatToken(): Promise<string> {
  if (!gigachatCredentials) throw new Error("GigaChat not configured");

  // Reuse token if still valid (with 30s buffer)
  if (gigachatToken && Date.now() < gigachatTokenExpiry - 30_000) {
    return gigachatToken;
  }

  const uuid = crypto.randomUUID();
  const res = await fetch("https://ngw.devices.sberbank.ru:443/api/v2/oauth", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: `Basic ${gigachatCredentials}`,
      RqUID: uuid,
    },
    body: "scope=GIGACHAT_API_PERS",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GigaChat OAuth error: ${res.status} ${body}`);
  }

  const data = (await res.json()) as { access_token: string; expires_at: number };
  gigachatToken = data.access_token;
  gigachatTokenExpiry = data.expires_at * 1000; // convert to ms
  return gigachatToken;
}

const gigachat = gigachatCredentials
  ? new OpenAI({
      apiKey: "dummy", // will be overridden per-request
      baseURL: "https://gigachat.devices.sberbank.ru/api/v1/",
    })
  : null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

type ProviderFn = (prompt: string, systemPrompt?: string) => Promise<string>;

async function callOpenAI(prompt: string, systemPrompt?: string): Promise<string> {
  if (!openai) throw new Error("OpenAI not configured");
  const messages: OpenAI.ChatCompletionMessageParam[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
  });
  return res.choices[0]?.message?.content ?? "";
}

async function callAnthropic(prompt: string, systemPrompt?: string): Promise<string> {
  if (!anthropic) throw new Error("Anthropic not configured");
  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }],
  });
  const text = (res.content as Array<{ type: string; text?: string }>)
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("\n");
  if (!text) throw new Error("Anthropic returned empty content");
  return text;
}

async function callGemini(prompt: string, systemPrompt?: string): Promise<string> {
  if (!gemini) throw new Error("Gemini not configured");
  const model = gemini.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function callGroq(prompt: string, systemPrompt?: string): Promise<string> {
  if (!groq) throw new Error("Groq not configured");
  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });
  const res = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages,
  });
  return res.choices[0]?.message?.content ?? "";
}

async function callGigaChat(prompt: string, systemPrompt?: string): Promise<string> {
  if (!gigachat) throw new Error("GigaChat not configured");
  const token = await getGigaChatToken();
  const messages: OpenAI.ChatCompletionMessageParam[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });
  const res = await gigachat.chat.completions.create({
    model: "GigaChat-Max",
    messages,
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.choices[0]?.message?.content ?? "";
}

// Provider registry: each key maps to its call function
const providers: Record<string, ProviderFn> = {
  openai: callOpenAI,
  anthropic: callAnthropic,
  gemini: callGemini,
  groq: callGroq,
  gigachat: callGigaChat,
};

// Ordered fallback chain
const providerOrder = ["openai", "anthropic", "gemini", "groq", "gigachat"];

// ─── Core: generateText with fallback ────────────────────────────────────────

/**
 * Generate text trying providers in order: openai -> anthropic -> gemini -> groq.
 * Falls back on error. If a specific provider is requested, only that one is tried.
 */
export async function generateText(
  prompt: string,
  systemPrompt?: string,
  provider?: string,
): Promise<string> {
  const order = provider ? [provider] : providerOrder;

  for (const name of order) {
    const fn = providers[name];
    if (!fn) continue;
    try {
      const result = await fn(prompt, systemPrompt);
      if (result) return result;
    } catch (err) {
      console.warn(`[AI] ${name} failed:`, (err as Error).message);
    }
  }

  throw new Error("All AI providers failed");
}

// ─── Cover image generation ──────────────────────────────────────────────────

/**
 * Returns an image URL (data URL). Uses OpenAI DALL-E 3 if configured,
 * otherwise returns a placeholder gradient SVG as a data URL.
 */
export async function generateCover(prompt: string): Promise<string> {
  if (openai) {
    try {
      const res = await openai.images.generate({
        model: "dall-e-3",
        prompt,
        size: "1024x1024",
        response_format: "b64_json",
      });
      const b64 = res.data?.[0]?.b64_json;
      if (b64) return `data:image/png;base64,${b64}`;
    } catch (err) {
      console.warn("[AI] DALL-E failed:", (err as Error).message);
    }
  }

  // Fallback: placeholder gradient SVG
  const seed = Math.abs(hashCode(prompt)) % 360;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:hsl(${seed},70%,55%)"/>
          <stop offset="100%" style="stop-color:hsl(${(seed + 120) % 360},70%,55%)"/>
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" fill="url(#g)"/>
      <text x="512" y="530" text-anchor="middle" fill="rgba(255,255,255,0.85)"
        font-family="system-ui" font-size="36">${escapeXml(prompt.slice(0, 60))}</text>
    </svg>`.trim();
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

// ─── Structured text ─────────────────────────────────────────────────────────

export async function structureText(rawText: string): Promise<{
  sections: Array<{ title: string; content: string }>;
}> {
  let result: string;
  try {
    result = await generateText(rawText, `
You are a text structuring assistant. Take the raw text below and organize it into logical sections with titles and content.
Return ONLY valid JSON in this exact shape, no markdown, no explanation:
{"sections": [{"title": "Section Title", "content": "Section content here"}]}
  `);
  } catch {
    // Mock fallback: split text by paragraphs or sentences
    result = "";
  }

  if (result) {
    try {
      const json = extractJson(result);
      const parsed = JSON.parse(json) as {
        sections: Array<{ title: string; content: string }>;
      };
      if (parsed.sections?.length) return parsed;
    } catch {
      // fall through to fallback below
    }
  }

  // Fallback: treat entire text as a single section
  return { sections: [{ title: "Content", content: rawText }] };
}

// ─── Text improvement ────────────────────────────────────────────────────────

export async function improveText(text: string, instruction: string): Promise<string> {
  return generateText(text, `
You are a writing assistant. Improve the following text according to this instruction:
"${instruction}"
Return only the improved text, no explanation.
  `);
}

function applyMockEdit(text: string, mode: string, instruction?: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  switch (mode) {
    case "shorten": {
      const sentences = normalized.split(/(?<=[.!?])\s+/).filter(Boolean);
      if (sentences.length <= 1) return normalized;
      return sentences.slice(0, Math.max(1, Math.ceil(sentences.length / 2))).join(" ");
    }
    case "expand":
      return `${normalized}\n\nPractical example: apply this step with one concrete scenario and expected result.`;
    case "rewrite":
      return `${normalized}\n\nRewritten note: ${instruction?.trim() || "Adjusted for clearer delivery."}`;
    case "improve":
    default:
      return normalized
        .replace(/\s+,/g, ",")
        .replace(/\s+\./g, ".")
        .replace(/\s+!/g, "!")
        .replace(/\s+\?/g, "?");
  }
}

export async function editSelectionText(
  text: string,
  mode: string,
  instruction?: string,
): Promise<{ editedText: string; mode: string; mock: boolean; provider: string }> {
  const normalizedMode = mode.trim() || "improve";
  const normalizedInstruction = instruction?.trim() || "Improve style and readability.";

  try {
    const result = await generateText(
      `Text:\n${text}\n\nInstruction:\n${normalizedInstruction}`,
      `You are an in-editor writing copilot.
Mode: ${normalizedMode}.
Edit the provided text according to the instruction.
Return only the edited text, without explanations or markdown fences.`,
    );

    const edited = result.trim();
    if (edited) {
      return {
        editedText: edited,
        mode: normalizedMode,
        mock: false,
        provider: "llm",
      };
    }
  } catch {
    // fall through to mock response
  }

  return {
    editedText: applyMockEdit(text, normalizedMode, normalizedInstruction),
    mode: normalizedMode,
    mock: true,
    provider: "mock",
  };
}

// ─── Price suggestion ────────────────────────────────────────────────────────

export async function suggestPrice(
  title: string,
  description: string,
  wordCount: number,
): Promise<{ min: number; max: number; recommended: number }> {
  const fallback = {
    min: Math.max(99, Math.round(wordCount * 0.5)),
    max: Math.max(299, Math.round(wordCount * 2)),
    recommended: Math.max(199, Math.round(wordCount * 1.2)),
  };

  try {
    const result = await generateText(
      `Title: "${title}"\nDescription: "${description}"\nWord count: ${wordCount}`,
      `You are a pricing assistant for digital guides sold on the Russian market.
Based on the title, description, and word count, suggest a fair price range in Russian Rubles (RUB).
Return ONLY valid JSON in this shape:
{"min": 100, "max": 500, "recommended": 300}
Consider word count, topic complexity, and market rates for digital content in Russia.
      `,
    );
    const json = extractJson(result);
    const parsed = JSON.parse(json) as { min: number; max: number; recommended: number };
    if (parsed.min && parsed.max && parsed.recommended) return parsed;
    throw new Error("Invalid price response");
  } catch {
    return fallback;
  }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function extractJson(text: string): string {
  // Strip markdown code fences if present
  const stripped = text.replace(/^```(?:json)?\n?([\s\S]*?)\n?```$/m, "$1").trim();
  return stripped;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
