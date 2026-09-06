// Roda da Vida — movida para o method-engine no redesenho do motor
// (Parte 5A) porque promptAdulto.ts (aqui) e relatorioTemplate.ts (web,
// SVG) precisam AMBOS da mesma computação: o prompt tem de saber os
// valores para poder instruir o LLM a referenciar os extremos no texto
// (pedido explícito desta ronda — antes disto, o LLM nunca via a Roda da
// Vida, só o template a desenhava depois, por isso não podia haver
// nenhuma frase a explicar um valor extremo). A cor (verde/âmbar/
// vermelho) fica no template — é apresentação, não dado.

import { valorCasaUnificado, type SavPorCasa, type PesoPlaneta } from "./pesosPlanetas";
import type { ClassicalGraha } from "../lifeReport/types";

export interface DimensaoVida {
  nome: string;
  descricao: string;
  valor: number;
  /** Rótulo alternativo só para a etiqueta da roda (espaço fixo) — usado apenas quando "nome" tem uma palavra longa que corta na roda; a lista por baixo continua a mostrar "nome" por inteiro. */
  rotulo?: string;
}

const SAV_MIN = 18;

/**
 * Valor 0-10 de uma dimensão da Roda da Vida — usa `valorCasaUnificado`
 * (`pesosPlanetas.ts`), a fórmula final aprovada pelo especialista após 3
 * rondas de diagnóstico, partilhada com o Anexo "Apoio por área de vida"
 * e o Radar de competências para os 3 nunca divergirem entre si. Para
 * dimensões com mais de uma casa, calcula casa a casa e faz a média.
 */
function valorDimensao(savPorCasa: SavPorCasa[], pesos: PesoPlaneta[], casas: number[], regentesCasas: Record<number, ClassicalGraha>): number {
  const valoresPorCasa = casas.map((casa) => {
    const sav = savPorCasa.find((h) => h.casa === casa)?.pontuacao ?? SAV_MIN;
    return valorCasaUnificado(sav, casa, pesos, regentesCasas).valor;
  });
  const media = valoresPorCasa.reduce((a, b) => a + b, 0) / valoresPorCasa.length;
  return Math.round(media * 10) / 10;
}

/**
 * Roda da Vida — 8 dimensões universais (não astrológicas no nome), cada
 * uma calculada a partir do SAV, do peso dos planetas presentes, E do
 * peso do regente real da(s) casa(s) clássica(s) que a sustentam. Sempre
 * determinística — nunca o LLM.
 */
export function computeRodaDaVida(savPorCasa: SavPorCasa[], pesos: PesoPlaneta[], regentesCasas: Record<number, ClassicalGraha>): DimensaoVida[] {
  return [
    { nome: "Carreira / Propósito", descricao: "A força da sua vocação e direcção profissional", valor: valorDimensao(savPorCasa, pesos, [10], regentesCasas) },
    { nome: "Finanças / Recursos", descricao: "A sua relação natural com a geração e gestão de recursos", valor: valorDimensao(savPorCasa, pesos, [2], regentesCasas) },
    { nome: "Desenvolvimento Pessoal", rotulo: "Desenv. Pessoal", descricao: "A sua capacidade de crescer e expandir o seu mundo", valor: valorDimensao(savPorCasa, pesos, [1, 9], regentesCasas) },
    { nome: "Saúde / Energia", descricao: "A sua reserva de energia e capacidade de acção", valor: valorDimensao(savPorCasa, pesos, [6], regentesCasas) },
    { nome: "Relações / Rede", descricao: "A força das suas ligações e do seu círculo", valor: valorDimensao(savPorCasa, pesos, [7, 11], regentesCasas) },
    { nome: "Criatividade / Expressão", descricao: "A sua capacidade de criar e de se expressar", valor: valorDimensao(savPorCasa, pesos, [5], regentesCasas) },
    { nome: "Ambiente / Estilo de vida", descricao: "O que a sua carta pede em termos de base e de raízes", valor: valorDimensao(savPorCasa, pesos, [4], regentesCasas) },
    { nome: "Contribuição / Impacto", descricao: "O que deixa para além de si — a marca que fica nas pessoas e nos sistemas que toca", valor: valorDimensao(savPorCasa, pesos, [9, 11], regentesCasas) },
  ];
}
