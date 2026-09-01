import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Mesmo mecanismo do painel da Naveya (lib/report/adminAuth.ts): password
// simples partilhada (não contas de utilizador), cookie guarda o hash da
// password, nunca a password em si.

const COOKIE_NAME = "vocationiq_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 horas

function expectedHash(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(candidate: string): boolean {
  const expected = expectedHash();
  if (!expected) return false;
  const candidateHash = createHash("sha256").update(candidate).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(candidateHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sessionCookieValue(): string | null {
  return expectedHash();
}

export const ADMIN_COOKIE = { name: COOKIE_NAME, maxAge: MAX_AGE_SECONDS };

export async function isAdminAuthenticated(): Promise<boolean> {
  const expected = expectedHash();
  if (!expected) return false;
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value === expected;
}
