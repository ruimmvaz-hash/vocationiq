import { NextResponse } from "next/server";
import { listarPagosParaAlertaMahadasha, marcarMahadashaAlertaEnviado } from "@/lib/store";
import { obterRelatorioEntregue } from "@/lib/storage";
import { sendMahadashaAlertaEmail } from "@/lib/email";
import { PLANETA_PT } from "@/lib/relatorioTemplate";
import { DASHA_SEQUENCE, MAHADASHA_CLASSIFICACAO, type DashaLord } from "@naveya/method-engine";

// RETENÇÃO, TAREFA 2A — cron mensal (dia 1, 09:00, ver vercel.json) do
// alerta de mudança de Mahadasha, ~3 meses antes.
//
// Em vez de recalcular a astrologia do zero (geocodificação + motor
// Vimshottari) para cada cliente todos os meses, reaproveita-se
// `viq_relatorios.dados_tecnicos.datas.mahadashaAtual` — já calculado e
// guardado quando o relatório foi gerado (`obterRelatorioEntregue`, o
// mesmo dado que alimenta o "Mapa técnico" em /admin/relatorios/[id]).
// A PRÓXIMA Mahadasha não precisa de cálculo nenhum: a ordem dos 9
// senhores (DASHA_SEQUENCE) é sempre a mesma sequência cíclica fixa —
// basta avançar um índice a partir do senhor actual.
const JANELA_DIAS_MIN = 75;
const JANELA_DIAS_MAX = 106; // ~32 dias de largura — cobre a cadência mensal do cron sem deixar ninguém por alertar.

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "não autorizado" }, { status: 401 });

  let enviados = 0;
  let semRelatorio = 0;
  const erros: string[] = [];

  try {
    const candidatos = await listarPagosParaAlertaMahadasha();
    for (const intake of candidatos) {
      if (!intake.email) continue;
      try {
        const relatorio = await obterRelatorioEntregue(intake.id);
        const mahadashaAtual = relatorio?.dadosTecnicos?.datas?.mahadashaAtual;
        if (!mahadashaAtual) {
          semRelatorio++;
          continue;
        }

        const fimDate = new Date(mahadashaAtual.fim);
        const fimISO = fimDate.toISOString().slice(0, 10);
        const diasParaFim = (fimDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
        if (diasParaFim < JANELA_DIAS_MIN || diasParaFim > JANELA_DIAS_MAX) continue;
        if (intake.mahadasha_alerta_para_data === fimISO) continue; // já alertado para ESTA transição

        const senhorActual = mahadashaAtual.senhor as DashaLord;
        const indiceActual = DASHA_SEQUENCE.indexOf(senhorActual);
        const proximoSenhor = DASHA_SEQUENCE[(indiceActual + 1) % DASHA_SEQUENCE.length];
        const classificacaoProxima = MAHADASHA_CLASSIFICACAO[proximoSenhor];

        const resultado = await sendMahadashaAlertaEmail({
          to: intake.email,
          nome: intake.nome,
          mahadashaActual: PLANETA_PT[senhorActual] ?? senhorActual,
          proximaMahadasha: PLANETA_PT[proximoSenhor] ?? proximoSenhor,
          descricaoMudanca: classificacaoProxima.tema,
        });
        if (resultado.ok) {
          await marcarMahadashaAlertaEnviado(intake.id, fimISO);
          enviados++;
        } else {
          erros.push(`${intake.id}: ${resultado.detail}`);
        }
      } catch (err) {
        erros.push(`${intake.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    erros.push(`listagem: ${err instanceof Error ? err.message : String(err)}`);
  }

  return NextResponse.json({ ok: true, enviados, semRelatorio, erros });
}
