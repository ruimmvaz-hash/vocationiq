import { NextResponse } from "next/server";
import { listarClientesComRelatorioEntregue, marcarInicioAnoEmailEnviado } from "@/lib/store";
import { sendInicioAnoEmail } from "@/lib/email";
import { PLANETA_PT } from "@/lib/relatorioTemplate";
import { MAHADASHA_CLASSIFICACAO, type DashaLord } from "@naveya/method-engine";
import type { DadosTecnicosArmazenados } from "@/lib/storage";

// RETENÇÃO FASE 2, TAREFA 3A — cron anual (2 de Janeiro, 09:00, ver
// vercel.json) do email de início de ano, com o período astrológico
// actual de cada cliente.
//
// Reaproveita `viq_relatorios.dados_tecnicos.datas` — já calculado
// quando o relatório foi gerado — em vez de recalcular a astrologia.
// Nota sobre o pedido literal: a copy tem dois parágrafos alternativos
// ("favorável" vs "consolidação"), mas não existe nenhum sinal/dado já
// calculado que classifique uma Mahadasha como "favorável" ou não — só
// o `abertura` de `MAHADASHA_CLASSIFICACAO`, o enquadramento do próprio
// método para aquele senhor (o mesmo texto já usado no relatório). Para
// não inventar um critério de "favorabilidade" sem base nos dados,
// usa-se sempre esse `abertura` real como parágrafo extra, em vez de
// tentar decidir entre as duas variantes propostas — ver relatório final.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "não autorizado" }, { status: 401 });

  let enviados = 0;
  let semDadosTecnicos = 0;
  const erros: string[] = [];
  const anoActual = new Date().getUTCFullYear();

  try {
    const clientes = await listarClientesComRelatorioEntregue();
    for (const { relatorioId, intake, dadosTecnicos, inicioAnoEnviadoAno } of clientes) {
      if (!intake.email) continue;
      if (inicioAnoEnviadoAno === anoActual) continue;
      try {
        const datas = (dadosTecnicos as DadosTecnicosArmazenados | null)?.datas;
        if (!datas?.mahadashaAtual || !datas?.antardashaAtual) {
          semDadosTecnicos++;
          continue;
        }

        const senhorMaha = datas.mahadashaAtual.senhor as DashaLord;
        const classificacao = MAHADASHA_CLASSIFICACAO[senhorMaha];
        const resultado = await sendInicioAnoEmail({
          to: intake.email,
          nome: intake.nome,
          mahadasha: PLANETA_PT[senhorMaha] ?? senhorMaha,
          antardasha: PLANETA_PT[datas.antardashaAtual.senhor] ?? datas.antardashaAtual.senhor,
          descricaoPeriodo: classificacao.tema,
          paragrafoExtra: classificacao.abertura,
        });
        if (resultado.ok) {
          await marcarInicioAnoEmailEnviado(relatorioId, anoActual);
          enviados++;
        } else {
          erros.push(`${relatorioId}: ${resultado.detail}`);
        }
      } catch (err) {
        erros.push(`${relatorioId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    erros.push(`listagem: ${err instanceof Error ? err.message : String(err)}`);
  }

  return NextResponse.json({ ok: true, enviados, semDadosTecnicos, erros });
}
