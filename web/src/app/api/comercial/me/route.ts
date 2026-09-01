import { NextResponse } from "next/server";
import { getComercialSession } from "@/lib/comercialAuth";
import { obterComercialPorId } from "@/lib/comercialStore";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vocationiq.app";

export async function GET() {
  const session = await getComercialSession();
  if (!session) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const comercial = await obterComercialPorId(session.comercialId);
  if (!comercial) return NextResponse.json({ error: "comercial não encontrado" }, { status: 404 });

  const commissionDue = Math.max(0, Number(comercial.total_commission_owed ?? 0) - Number(comercial.total_commission_paid ?? 0));

  return NextResponse.json({
    ...comercial,
    link: `${SITE_URL}?ref=${comercial.code}`,
    commissionDue,
  });
}
