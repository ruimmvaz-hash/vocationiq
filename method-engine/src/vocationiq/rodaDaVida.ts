// Roda da Vida — movida para o method-engine no redesenho do motor
// (Parte 5A) porque promptAdulto.ts (aqui) e relatorioTemplate.ts (web,
// SVG) precisam AMBOS da mesma computação: o prompt tem de saber os
// valores para poder instruir o LLM a referenciar os extremos no texto
// (pedido explícito desta ronda — antes disto, o LLM nunca via a Roda da
// Vida, só o template a desenhava depois, por isso não podia haver
// nenhuma frase a explicar um valor extremo). A cor (verde/âmbar/
// vermelho) fica no template — é apresentação, não dado.

import type { SavPorCasa, PesoPlaneta } from "./pesosPlanetas";

export interface DimensaoVida {
  nome: string;
  descricao: string;
  valor: number;
  /** Rótulo alternativo só para a etiqueta da roda (espaço fixo) — usado apenas quando "nome" tem uma palavra longa que corta na roda; a lista por baixo continua a mostrar "nome" por inteiro. */
  rotulo?: string;
}

const SAV_MIN = 18;
const SAV_MAX = 42;

/**
 * Valor 0-10 de uma dimensão da Roda da Vida (redesenho do motor, Parte
 * 1C): valor = (SAV_da_casa / SAV_max) * 6 + soma(peso de cada planeta
 * presente na casa) * 0.67. Para dimensões com mais de uma casa, calcula
 * casa a casa e faz a média. Capado a [0,10] só por segurança.
 */
function valorDimensao(savPorCasa: SavPorCasa[], pesos: PesoPlaneta[], casas: number[]): number {
  const valoresPorCasa = casas.map((casa) => {
    const sav = savPorCasa.find((h) => h.casa === casa)?.pontuacao ?? SAV_MIN;
    const somaPesos = pesos.filter((p) => p.casa === casa).reduce((soma, p) => soma + p.peso, 0);
    return (sav / SAV_MAX) * 6 + somaPesos * 0.67;
  });
  const media = valoresPorCasa.reduce((a, b) => a + b, 0) / valoresPorCasa.length;
  return Math.round(Math.min(10, Math.max(0, media)) * 10) / 10;
}

/**
 * Roda da Vida — 8 dimensões universais (não astrológicas no nome), cada
 * uma calculada a partir do SAV E do peso real dos planetas presentes
 * na(s) casa(s) clássica(s) que a sustentam. Sempre determinística —
 * nunca o LLM.
 */
export function computeRodaDaVida(savPorCasa: SavPorCasa[], pesos: PesoPlaneta[]): DimensaoVida[] {
  return [
    { nome: "Carreira / Propósito", descricao: "A força da sua vocação e direcção profissional", valor: valorDimensao(savPorCasa, pesos, [10]) },
    { nome: "Finanças / Recursos", descricao: "A sua relação natural com a geração e gestão de recursos", valor: valorDimensao(savPorCasa, pesos, [2]) },
    { nome: "Desenvolvimento Pessoal", rotulo: "Desenv. Pessoal", descricao: "A sua capacidade de crescer e expandir o seu mundo", valor: valorDimensao(savPorCasa, pesos, [1, 9]) },
    { nome: "Saúde / Energia", descricao: "A sua reserva de energia e capacidade de acção", valor: valorDimensao(savPorCasa, pesos, [6]) },
    { nome: "Relações / Rede", descricao: "A força das suas ligações e do seu círculo", valor: valorDimensao(savPorCasa, pesos, [7, 11]) },
    { nome: "Criatividade / Expressão", descricao: "A sua capacidade de criar e de se expressar", valor: valorDimensao(savPorCasa, pesos, [5]) },
    { nome: "Ambiente / Estilo de vida", descricao: "O que a sua carta pede em termos de base e de raízes", valor: valorDimensao(savPorCasa, pesos, [4]) },
    { nome: "Contribuição / Impacto", descricao: "O que deixa para além de si — a marca que fica nas pessoas e nos sistemas que toca", valor: valorDimensao(savPorCasa, pesos, [9, 11]) },
  ];
}
