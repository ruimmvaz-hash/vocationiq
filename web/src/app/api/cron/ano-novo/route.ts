import { NextResponse } from "next/server";
import { listarClientesComRelatorioEntregue, marcarAnoNovoEmailEnviado } from "@/lib/store";
import { listarLeadsElegiveisNatal, marcarLeadEmailEnviado } from "@/lib/leadsStore";
import { sendAnoNovoEmail } from "@/lib/email";

// RETENÇÃO FASE 2, TAREFA 4, EMAIL 3 — "Feliz Ano Novo" (31 de
// Dezembro), sem venda, para clientes e leads consentidos. Mesmo padrão
// de natal-feliz/route.ts.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "não autorizado" }, { status: 401 });

  const agora = new Date();
  if (agora.getUTCMonth() !== 11 || agora.getUTCDate() !== 31) {
    return NextResponse.json({ ok: true, fora_da_janela: true, enviadosClientes: 0, enviadosLeads: 0, erros: [] });
  }

  const anoActual = agora.getUTCFullYear();
  let enviadosClientes = 0;
  let enviadosLeads = 0;
  const erros: string[] = [];

  try {
    const clientes = await listarClientesComRelatorioEntregue();
    for (const { relatorioId, intake, anoNovoEnviadoAno } of clientes) {
      if (!intake.email) continue;
      if (anoNovoEnviadoAno === anoActual) continue;
      try {
        const resultado = await sendAnoNovoEmail({ to: intake.email, nome: intake.nome });
        if (resultado.ok) {
          await marcarAnoNovoEmailEnviado(relatorioId, anoActual);
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
    const leads = await listarLeadsElegiveisNatal("ano_novo_enviado_ano");
    for (const lead of leads) {
      try {
        const resultado = await sendAnoNovoEmail({ to: lead.email, nome: "" });
        if (resultado.ok) {
          await marcarLeadEmailEnviado(lead.id, "ano_novo_enviado_ano", anoActual);
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
