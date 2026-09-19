// Núcleo partilhado por capturar-baseline.ts e verificar.ts — chama as
// MESMAS funções reais de produção que as rotas usam (calcularDadosAstrologicos
// / calcularDadosAstrologicosAdolescente), nunca reimplementa lógica do
// catálogo. Não chama a Anthropic — só interessa se as CANDIDATAS e a sua
// convergência se mantêm estáveis entre alterações ao motor, nunca o texto.

import { calcularDadosAstrologicos, calcularDadosAstrologicosAdolescente } from "../../src/lib/relatorioAdultoCompute";
import type { FixtureClienteReal } from "./fixtures";

export interface CandidataSnapshot {
  origem: "destinosDeAreaActual" | "destinosAlternativos" | "candidatasForaDaLista";
  id: string;
  nome: string;
  convergencia: number;
  nivelConfianca?: number;
}

export interface SnapshotCliente {
  chave: string;
  candidatas: CandidataSnapshot[];
}

function extrairCandidatas(catalogo: any): CandidataSnapshot[] {
  const out: CandidataSnapshot[] = [];
  for (const origem of ["destinosDeAreaActual", "destinosAlternativos", "candidatasForaDaLista"] as const) {
    for (const c of catalogo[origem] ?? []) {
      out.push({ origem, id: c.id, nome: c.nome, convergencia: c.convergencia, nivelConfianca: c.nivelConfianca });
    }
  }
  return out.sort((a, b) => (a.origem === b.origem ? a.id.localeCompare(b.id) : a.origem.localeCompare(b.origem)));
}

export async function computarSnapshot(fixture: FixtureClienteReal): Promise<SnapshotCliente> {
  const dados =
    fixture.ramo === "adulto"
      ? await calcularDadosAstrologicos(fixture.intake, fixture.coordenadas)
      : await calcularDadosAstrologicosAdolescente(fixture.intake, fixture.coordenadas);
  return { chave: fixture.chave, candidatas: extrairCandidatas(dados.catalogoResultados) };
}
