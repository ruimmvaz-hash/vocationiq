import { NextResponse } from "next/server";
import { ADMIN_COOKIE, sessionCookieValue, verifyPassword } from "@/lib/adminAuth";

export async function POST(request: Request) {
  let password: string;
  try {
    const body = await request.json();
    password = body.password;
  } catch {
    return NextResponse.json({ error: "corpo inválido" }, { status: 400 });
  }

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "ADMIN_PASSWORD não configurada no servidor" }, { status: 500 });
  }
  if (!password || !verifyPassword(password)) {
    return NextResponse.json({ error: "password incorrecta" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE.name, sessionCookieValue()!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ADMIN_COOKIE.maxAge,
    path: "/",
  });
  return res;
}
