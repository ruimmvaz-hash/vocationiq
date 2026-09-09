import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { getSupabaseAdmin, hasSupabaseAdmin } from "@/lib/supabaseAdmin";

// ENDPOINT TEMPORÁRIO — REMOVER APÓS USO.
//
// Criado para destravar a Tarefa 2 (relatório exemplo anonimizado,
// "Verónica S.") sem o fundador ter de exportar manualmente um texto
// longo a partir do editor SQL do Supabase (o rascunho tem várias
// páginas — colar/copiar por ali é pouco fiável). Devolve exactamente
// os campos que `reconstruirHTMLRelatorio` (relatorioAdultoCompute.ts)
// precisa para reconstruir o relatório: a linha do intake completa +
// rascunho_texto + coordenadas_nascimento (evita geocodificar de novo)
// — nunca só `dados_tecnicos`, que sozinho não chega (falta
// catalogoResultados, usado em "Opções que ainda não considerou").
//
// Autenticação: MESMO mecanismo do resto do backoffice
// (isAdminAuthenticated — cookie de sessão de 8h, definido em
// /admin/login) — não um "?password=" novo na URL. A password nunca
// devia viajar na própria URL (fica em histórico do browser, logs de
// acesso, etc.) — o mecanismo que já existe evita isso por completo:
// basta estar autenticado em /admin no mesmo browser.
//
// Uso: autenticar em /admin/login, depois abrir
// /api/admin/exportar-exemplo?nome=alexandra — o browser faz download
// do ficheiro JSON directamente (Content-Disposition: attachment).
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Não autenticado — inicia sessão em /admin/login neste browser primeiro." }, { status: 401 });
  }

  const nome = new URL(request.url).searchParams.get("nome");
  if (!nome) return NextResponse.json({ error: "parâmetro ?nome= em falta" }, { status: 400 });

  if (!hasSupabaseAdmin) {
    return NextResponse.json({ error: "SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY em falta neste deploy." }, { status: 503 });
  }

  const supabase = await getSupabaseAdmin();
  const { data: intake, error: intakeError } = await supabase.from("vocationiq_intakes").select("*").ilike("nome", `%${nome}%`).limit(1).maybeSingle();
  if (intakeError) return NextResponse.json({ error: `Falha ao procurar o pedido: ${intakeError.message}` }, { status: 500 });
  if (!intake) return NextResponse.json({ error: `Nenhum pedido encontrado com nome a conter "${nome}".` }, { status: 404 });

  const { data: relatorio, error: relatorioError } = await supabase
    .from("viq_relatorios")
    .select("rascunho_texto, coordenadas_nascimento, rascunho_criado_em")
    .eq("intake_id", intake.id)
    .not("rascunho_texto", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (relatorioError) return NextResponse.json({ error: `Falha ao procurar o relatório: ${relatorioError.message}` }, { status: 500 });
  if (!relatorio) return NextResponse.json({ error: `Pedido "${intake.nome}" encontrado, mas sem nenhum rascunho gerado (viq_relatorios.rascunho_texto vazio).` }, { status: 404 });

  const corpo = JSON.stringify({ intake, ...relatorio }, null, 2);
  return new NextResponse(corpo, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="exemplo-${intake.id}.json"`,
    },
  });
}
