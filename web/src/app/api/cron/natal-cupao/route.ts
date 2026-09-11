import { NextResponse } from "next/server";
import { listarClientesComRelatorioEntregue, marcarNatalCupaoEmailEnviado } from "@/lib/store";
import { listarLeadsElegiveisNatal, marcarLeadEmailEnviado } from "@/lib/leadsStore";
import { criarCupao, gerarCodigoCupao, obterOuCriarCupaoPorCodigo } from "@/lib/cupoesStore";
import { sendNatalCupaoEmail } from "@/lib/email";

// RETENÇÃO FASE 2, TAREFA 4, EMAIL 1 — cupão de Natal (10%), enviado a
// clientes E a leads com consentimento RGPD (viq_leads.consentimento_rgpd
// = true).
//
// FALTA 3 — o schedule em vercel.json já restringe nativamente este cron
// a 5-23 de Dezembro ("0 9 5-23 12 *"), mas mantém-se AQUI, no código, a
// mesma verificação explícita pedida — defesa extra caso o cron seja
// alguma vez invocado fora dessa janela (teste manual, schedule mal
// configurado).
//
// FALTA 2 — mecanismo do cupão DIFERENTE consoante o destinatário:
// clientes recebem um código pessoal, único, ligado ao seu intake
// (mesmo mecanismo da FASE 1 TAREFA 1); leads não têm intake nem
// relatório, por isso recebem um único código GENÉRICO partilhado por
// toda a campanha (ex.: "NATAL2026"), criado uma vez e reaproveitado.
function dentroDaJanelaDeNatal(agora: Date): boolean {
  return agora.getUTCMonth() === 11 && agora.getUTCDate() >= 5 && agora.getUTCDate() <= 23;
}

function validoAte31Janeiro(agora: Date): number {
  const anoAlvo = agora.getUTCMonth() === 11 ? agora.getUTCFullYear() + 1 : agora.getUTCFullYear();
  const alvo = new Date(Date.UTC(anoAlvo, 0, 31));
  return Math.max(1, Math.ceil((alvo.getTime() - agora.getTime()) / (24 * 60 * 60 * 1000)));
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "não autorizado" }, { status: 401 });

  const agora = new Date();
  if (!dentroDaJanelaDeNatal(agora)) return NextResponse.json({ ok: true, fora_da_janela: true, enviadosClientes: 0, enviadosLeads: 0, erros: [] });

  const anoActual = agora.getUTCFullYear();
  const validoDias = validoAte31Janeiro(agora);
  let enviadosClientes = 0;
  let enviadosLeads = 0;
  const erros: string[] = [];

  try {
    const clientes = await listarClientesComRelatorioEntregue();
    for (const { relatorioId, intake, natalCupaoEnviadoAno } of clientes) {
      if (!intake.email) continue;
      if (natalCupaoEnviadoAno === anoActual) continue;
      try {
        const codigo = gerarCodigoCupao("NATAL", intake.id, anoActual);
        const cupao = await criarCupao({ codigo, descontoPercentagem: 10, intakeId: intake.id, motivo: `Natal ${anoActual}`, validoDias, transferivel: true });
        const resultado = await sendNatalCupaoEmail({ to: intake.email, nome: intake.nome, codigoCupao: cupao.codigo });
        if (resultado.ok) {
          await marcarNatalCupaoEmailEnviado(relatorioId, anoActual);
          enviadosClientes++;
        } else {
          erros.push(`cliente ${relatorioId}: ${resultado.detail}`);
        }
      } catch (err) {
        erros.push(`cliente ${relatorioId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    erros.push(`listagem clientes: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    const codigoCampanha = `NATAL${anoActual}`;
    const cupaoCampanha = await obterOuCriarCupaoPorCodigo({
      codigo: codigoCampanha,
      descontoPercentagem: 10,
      intakeId: null,
      motivo: `Natal ${anoActual} — leads`,
      validoDias,
      transferivel: true,
      maxRedemptions: 5000,
    });

    const leads = await listarLeadsElegiveisNatal("natal_cupao_enviado_ano");
    for (const lead of leads) {
      try {
        const resultado = await sendNatalCupaoEmail({ to: lead.email, nome: "", codigoCupao: cupaoCampanha.codigo });
        if (resultado.ok) {
          await marcarLeadEmailEnviado(lead.id, "natal_cupao_enviado_ano", anoActual);
          enviadosLeads++;
        } else {
          erros.push(`lead ${lead.id}: ${resultado.detail}`);
        }
      } catch (err) {
        erros.push(`lead ${lead.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    erros.push(`listagem leads: ${err instanceof Error ? err.message : String(err)}`);
  }

  return NextResponse.json({ ok: true, enviadosClientes, enviadosLeads, erros });
}
