import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "./db";
import { env } from "./env";
import type { User } from "@prisma/client";

export function generateReferralCode(name?: string | null): string {
  const base = (name ?? "USER")
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, "X");
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `LEADGEN-${base}${suffix}`;
}

const SESSION_COOKIE = "lg_session";
const SESSION_DAYS = 30;

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.authSecret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function destroySession(): void {
  cookies().set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getSessionUserId(): Promise<string | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const id = await getSessionUserId();
  if (!id) return null;
  const user = await db.user.findUnique({ where: { id } });
  if (!user || user.deletedAt) return null;
  return user;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHENTICATED", "Authentication required");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new AuthError("FORBIDDEN", "Admin access required");
  return user;
}

export class AuthError extends Error {
  code: "UNAUTHENTICATED" | "FORBIDDEN";
  constructor(code: "UNAUTHENTICATED" | "FORBIDDEN", message: string) {
    super(message);
    this.code = code;
  }
}

/** Verify the caller owns the resource (tenant isolation / IDOR guard). */
export function assertOwnership(resourceUserId: string, user: User): void {
  if (resourceUserId !== user.id && user.role !== "ADMIN") {
    throw new AuthError("FORBIDDEN", "You do not have access to this resource");
  }
}
