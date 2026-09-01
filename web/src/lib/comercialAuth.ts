import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Mesmo mecanismo do sistema de comerciais da Naveya (lib/salesRep/auth.ts):
// magic link + sessão, ambos um token HMAC auto-assinado (não JWT), sem
// password. Secret e cookie próprios do VocationIQ — nunca partilhados
// com a Naveya, mesmo correndo no mesmo projecto Supabase.

const SESSION_COOKIE = "viq_rep_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 dias
const MAGIC_LINK_TTL_MS = 60 * 60 * 1000; // 1 hora

export const REP_SESSION_COOKIE = { name: SESSION_COOKIE, maxAge: SESSION_MAX_AGE_SECONDS };

function secret(): string | null {
  return process.env.COMERCIAL_TOKEN_SECRET || null;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()!).update(payload).digest("hex");
}

function issueToken(comercialId: string, email: string, ttlMs: number): string | null {
  if (!secret()) return null;
  const exp = Date.now() + ttlMs;
  const payload = `${comercialId}.${encodeURIComponent(email)}.${exp}`;
  return Buffer.from(`${payload}.${sign(payload)}`).toString("base64url");
}

function verifyToken(token: string): { comercialId: string; email: string } | null {
  if (!secret()) return null;
  let decoded: string;
  try {
    decoded = Buffer.from(token, "base64url").toString("utf-8");
  } catch {
    return null;
  }
  const parts = decoded.split(".");
  if (parts.length !== 4) return null;
  const [comercialId, encodedEmail, expStr, signature] = parts;
  const payload = `${comercialId}.${encodedEmail}.${expStr}`;
  const expected = sign(payload);
  const a = Buffer.from(expected, "utf-8");
  const b = Buffer.from(signature, "utf-8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return null;
  return { comercialId, email: decodeURIComponent(encodedEmail) };
}

export function createMagicLinkToken(comercialId: string, email: string): string | null {
  return issueToken(comercialId, email, MAGIC_LINK_TTL_MS);
}

export function createSessionToken(comercialId: string, email: string): string | null {
  return issueToken(comercialId, email, SESSION_MAX_AGE_SECONDS * 1000);
}

export function verifyMagicLinkToken(token: string): { comercialId: string; email: string } | null {
  return verifyToken(token);
}

export async function getComercialSession(): Promise<{ comercialId: string; email: string } | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}
