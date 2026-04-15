import { z } from "zod";

// ─── Auth ────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(1, "Full name is required").max(100),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, _ and -"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

// ─── Guides ──────────────────────────────────────────────────────────────────

export const createGuideSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional().default(""),
  coverImage: z.string().url().optional().nullable(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default("#6366f1"),
  price: z.number().min(0).max(999999).optional().default(0),
  showPreview: z.boolean().optional().default(true),
  template: z.string().max(50).optional().default("minimal"),
  sections: z
    .array(
      z.object({
        title: z.string().max(200),
        content: z.unknown().optional().default({}),
        hidden_until_payment: z.boolean().optional().default(false),
      }),
    )
    .optional(),
});

export const updateGuideSchema = createGuideSchema.partial();

export const updateSectionSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.unknown().optional(),
  order: z.number().int().min(0).optional(),
  hidden_until_payment: z.boolean().optional(),
});

// ─── Payments ────────────────────────────────────────────────────────────────

export const createPaymentSchema = z.object({
  guideId: z.string().uuid("Invalid guide ID"),
  buyerEmail: z.string().email("Invalid email address"),
  buyerName: z.string().max(100).optional(),
});

// ─── AI ──────────────────────────────────────────────────────────────────────

export const structureTextSchema = z.object({
  text: z.string().min(1, "Text is required").max(50000),
});

export const improveTextSchema = z.object({
  text: z.string().min(1, "Text is required").max(50000),
  instruction: z.string().max(500).optional().default("Improve style and clarity"),
});

export const editSelectionSchema = z.object({
  text: z.string().min(1, "Text is required").max(50000),
  mode: z.string().max(50).optional().default("improve"),
  instruction: z.string().max(500).optional(),
});

export const generateContentSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(2000),
  context: z.string().max(10000).optional(),
  maxLength: z.number().int().min(100).max(10000).optional().default(2000),
});

// ─── Upload ──────────────────────────────────────────────────────────────────

export const uploadMetadataSchema = z.object({
  guideId: z.string().uuid().optional(),
  alt: z.string().max(200).optional(),
});

// ─── Helper: validate request body ───────────────────────────────────────────

export function validateBody<T extends z.ZodType>(
  schema: T,
  body: unknown,
): { data: z.infer<T>; error?: undefined } | { data?: undefined; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const firstError = result.error.issues[0];
    return { error: `${firstError.path.join(".")}: ${firstError.message}` };
  }
  return { data: result.data };
}
