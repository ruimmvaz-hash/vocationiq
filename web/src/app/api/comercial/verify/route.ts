import { NextResponse } from "next/server";
import { verifyMagicLinkToken, createSessionToken, REP_SESSION_COOKIE } from "@/lib/comercialAuth";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vocationiq.app";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) return NextResponse.redirect(`${SITE_URL}/comercial`);

  const payload = verifyMagicLinkToken(token);
  if (!payload) return NextResponse.redirect(`${SITE_URL}/comercial?erro=link-invalido`);

  const sessionToken = createSessionToken(payload.comercialId, payload.email);
  if (!sessionToken) return NextResponse.redirect(`${SITE_URL}/comercial?erro=nao-configurado`);

  const res = NextResponse.redirect(`${SITE_URL}/comercial/dashboard`);
  res.cookies.set(REP_SESSION_COOKIE.name, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: REP_SESSION_COOKIE.maxAge,
    path: "/",
  });
  return res;
}
