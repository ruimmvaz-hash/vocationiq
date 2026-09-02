import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { hasSupabaseAdmin } from "@/lib/supabaseAdmin";
import { obterIntake } from "@/lib/store";

// Diagnóstico admin-gated para o problema recorrente "/avaliacao
// redirecciona para a homepage mesmo com o pedido correcto no Supabase":
// devolve exactamente o que a app vê ao ler o pedido, sem ter de vasculhar
// os logs da Vercel. Uso: /api/admin/debug-intake?id=<uuid>, autenticado
// como admin.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "parâmetro ?id= em falta" }, { status: 400 });

  if (!hasSupabaseAdmin) {
    return NextResponse.json({ hasSupabaseAdmin: false, id, encontrado: false, nota: "SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY em falta neste deploy — é por isso que /avaliacao redirecciona sempre." });
  }

  const intake = await obterIntake(id);
  return NextResponse.json({
    hasSupabaseAdmin: true,
    id,
    encontrado: !!intake,
    payment_status: intake?.payment_status ?? null,
    report_status: intake?.report_status ?? null,
    delivered_at: intake?.delivered_at ?? null,
    passaria_no_guard_de_avaliacao: intake?.report_status === "delivered",
  });
}
