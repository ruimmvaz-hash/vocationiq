import { NextResponse } from "next/server";
import { getComercialSession } from "@/lib/comercialAuth";
import { obterComercialPorId, pedirPagamentoComercial } from "@/lib/comercialStore";

export async function POST(request: Request) {
  const session = await getComercialSession();
  if (!session) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "corpo inválido" }, { status: 400 });
  }
  const { taxId, taxCountry } = (body ?? {}) as { taxId?: string; taxCountry?: string };
  if (!taxId?.trim() || !taxCountry?.trim()) return NextResponse.json({ error: "id fiscal e país são obrigatórios" }, { status: 400 });

  const comercial = await obterComercialPorId(session.comercialId);
  if (!comercial) return NextResponse.json({ error: "comercial não encontrado" }, { status: 404 });
  if (comercial.status !== "active") return NextResponse.json({ error: "só comerciais activos podem pedir pagamento" }, { status: 403 });

  const owed = Number(comercial.total_commission_owed ?? 0) - Number(comercial.total_commission_paid ?? 0);
  if (owed <= 0) return NextResponse.json({ error: "não há comissão em dívida" }, { status: 400 });

  try {
    await pedirPagamentoComercial(comercial.id, { taxId: taxId.trim(), taxCountry: taxCountry.trim() });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
