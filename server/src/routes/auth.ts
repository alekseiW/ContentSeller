import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma.js";

// ─── Config ────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET environment variable is required in production");
}
const JWT_SECRET_DEV = JWT_SECRET || "dev-secret-change-in-production";
const JWT_EXPIRES_IN = "7d";
const BCRYPT_ROUNDS = 12;

// ─── Types ─────────────────────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        role?: string;
      };
    }
  }
}

// ─── Token helpers ─────────────────────────────────────────────────────────

export function generateToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET_DEV, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): { sub: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET_DEV) as { sub: string };
  } catch {
    return null;
  }
}

// ─── Password helpers ──────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function comparePasswords(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── Auth routes ───────────────────────────────────────────────────────────

import { Router } from "express";

const router = Router();

// ─── POST /auth/register ──────────────────────────────────────────────────

router.post("/register", async (req: Request, res) => {
  try {
    const { email, password, fullName, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({
        error: "email, password, and username are required",
      });
    }

    // Check uniqueness
    const existingEmail = await prisma.profile.findUnique({
      where: { email },
    });
    if (existingEmail) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const existingUsername = await prisma.profile.findUnique({
      where: { username },
    });
    if (existingUsername) {
      return res.status(409).json({ error: "Username already taken" });
    }

    // Create profile
    const passwordHash = await hashPassword(password);
    const profile = await prisma.profile.create({
      data: {
        email,
        passwordHash,
        fullName: fullName || username,
        username,
      },
    });

    const token = generateToken(profile.id);

    res.status(201).json({
      token,
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.fullName,
        username: profile.username,
      },
    });
  } catch (err) {
    console.error("[POST /auth/register]", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// ─── POST /auth/login ─────────────────────────────────────────────────────

router.post("/login", async (req: Request, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const profile = await prisma.profile.findUnique({ where: { email } });
    if (!profile) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await comparePasswords(password, profile.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = generateToken(profile.id);

    res.json({
      token,
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.fullName,
        username: profile.username,
      },
    });
  } catch (err) {
    console.error("[POST /auth/login]", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ─── GET /auth/me ─────────────────────────────────────────────────────────

router.get("/me", authMiddleware, async (req: Request, res) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: req.user!.id },
    });

    if (!profile) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      username: profile.username,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      socialLinks: profile.socialLinks,
      isSelfEmployed: profile.isSelfEmployed,
    });
  } catch (err) {
    console.error("[GET /auth/me]", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// ─── PATCH /auth/me ───────────────────────────────────────────────────────

router.patch("/me", authMiddleware, async (req: Request, res) => {
  try {
    const { fullName, avatarUrl, bio, socialLinks, isSelfEmployed } = req.body;

    const profile = await prisma.profile.update({
      where: { id: req.user!.id },
      data: {
        fullName,
        avatarUrl,
        bio,
        socialLinks,
        isSelfEmployed,
      },
    });

    res.json({
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      username: profile.username,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      socialLinks: profile.socialLinks,
      isSelfEmployed: profile.isSelfEmployed,
    });
  } catch (err) {
    console.error("[PATCH /auth/me]", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;

// ─── Auth middleware ───────────────────────────────────────────────────────

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split("Bearer ")[1];
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.user = {
    id: payload.sub,
    role: "authenticated",
  };

  next();
}

/**
 * Optional auth — attaches user if token is valid, but does not block.
 */
export function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split("Bearer ")[1];
  const payload = verifyToken(token);

  if (payload) {
    req.user = {
      id: payload.sub,
      role: "authenticated",
    };
  }

  next();
}
