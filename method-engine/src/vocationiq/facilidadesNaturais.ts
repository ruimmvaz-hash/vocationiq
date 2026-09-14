// VocationIQ — secção "Para que tem facilidade natural" (correcção do
// especialista), entre "Quem é" e "O que o perfil sustenta". Calculado
// 100% deterministicamente a partir dos pesos já calculados por
// `computePesosPlanetas` — nunca pelo LLM (mesmo princípio já aplicado à
// explicação dos 4 gráficos em relatorioTemplate.ts: um facto visível ao
// cliente que depende de aritmética não pode depender de o LLM decidir
// escrevê-lo ou não).
//
// Nível por categoria = média do peso dos 2 planetas associados,
// classificada pelos MESMOS 2 limiares já usados em todo o motor (≥1,3
// forte/alto, ≥0,9 moderado/médio, abaixo disso fraco/baixo — ver
// `avaliarSinal` em catalogoVocacional.ts e a legenda "Peso de cada
// planeta" em promptAdulto.ts) — nunca um limiar novo só para esta
// secção.

import type { ClassicalGraha } from "../lifeReport/types";
import type { PesoPlaneta } from "./pesosPlanetas";

export type NivelFacilidade = "Alto" | "Médio" | "Baixo";

/** Correcção do especialista (ronda "relatório Marta", ponto 3) — a frase de cada nível já existia só em registo "você" (conjugação de 3ª pessoa: "Precisa", "Consegue", "Executa"); usada tal como estava no ramo adolescente, ficava inconsistente com o resto do relatório em "tu". Cada nível passa a ter as duas versões, nunca uma reconjugação automática (risco de erro gramatical silencioso) — escritas à mão, mesmo sentido e registo das frases "você" já aprovadas. */
export interface CategoriaFacilidade {
  categoria: string;
  emoji: string;
  planetas: [ClassicalGraha, ClassicalGraha];
  descricaoCategoria: string;
  frases: Record<NivelFacilidade, { voce: string; tu: string }>;
}

/** As 6 categorias, os planetas que as sustentam, e a frase curta por nível — texto fixo, nunca gerado pelo LLM (só o NÍVEL depende dos dados desta pessoa). */
const CATEGORIAS: CategoriaFacilidade[] = [
  {
    categoria: "Pessoas",
    emoji: "🤝",
    planetas: ["Moon", "Venus"],
    descricaoCategoria: "facilidade com relações, empatia, equipas",
    frases: {
      Alto: { voce: "Cria ligação com as pessoas de forma natural, sem esforço.", tu: "Crias ligação com as pessoas de forma natural, sem esforço." },
      Médio: { voce: "Consegue relacionar-se bem, sem ser o ponto mais forte do perfil.", tu: "Consegues relacionar-te bem, sem ser o ponto mais forte do perfil." },
      Baixo: { voce: "Precisa de mais esforço deliberado para se ligar às pessoas à sua volta.", tu: "Precisas de mais esforço deliberado para te ligares às pessoas à tua volta." },
    },
  },
  {
    categoria: "Ideias",
    emoji: "💡",
    planetas: ["Mercury", "Jupiter"],
    descricaoCategoria: "criatividade, visão, inovação",
    frases: {
      Alto: { voce: "Explica ideias complexas e gera visão de forma natural.", tu: "Explicas ideias complexas e geras visão de forma natural." },
      Médio: { voce: "Lida bem com ideias novas, sem ser o ponto mais forte do perfil.", tu: "Lidas bem com ideias novas, sem ser o ponto mais forte do perfil." },
      Baixo: { voce: "Precisa de mais esforço para gerar e comunicar ideias novas.", tu: "Precisas de mais esforço para gerar e comunicar ideias novas." },
    },
  },
  {
    categoria: "Execução",
    emoji: "⚙️",
    planetas: ["Saturn", "Mars"],
    descricaoCategoria: "organização, disciplina, processos",
    frases: {
      Alto: { voce: "Organiza-se e executa com disciplina, sem precisar de supervisão externa.", tu: "Organizas-te e executas com disciplina, sem precisar de supervisão externa." },
      Médio: { voce: "Executa com estrutura, mas beneficia de apoio externo para manter o ritmo.", tu: "Executas com estrutura, mas beneficias de apoio externo para manter o ritmo." },
      Baixo: { voce: "Precisa de mais esforço para manter disciplina e processos ao longo do tempo.", tu: "Precisas de mais esforço para manter disciplina e processos ao longo do tempo." },
    },
  },
  {
    categoria: "Investigação",
    emoji: "🔍",
    planetas: ["Mercury", "Saturn"],
    descricaoCategoria: "análise, detalhe, pesquisa",
    frases: {
      Alto: { voce: "Analisa com rigor e atenção ao detalhe de forma natural.", tu: "Analisas com rigor e atenção ao detalhe de forma natural." },
      Médio: { voce: "Consegue investigar e analisar, sem ser a sua maior força natural.", tu: "Consegues investigar e analisar, sem ser a tua maior força natural." },
      Baixo: { voce: "Precisa de mais esforço nesta área — análise e detalhe não são o seu ponto mais forte.", tu: "Precisas de mais esforço nesta área — análise e detalhe não são o teu ponto mais forte." },
    },
  },
  {
    categoria: "Comunicação",
    emoji: "📣",
    planetas: ["Mercury", "Venus"],
    descricaoCategoria: "explicar, persuadir, apresentar",
    frases: {
      Alto: { voce: "Explica e persuade com facilidade, mesmo perante audiências difíceis.", tu: "Explicas e persuades com facilidade, mesmo perante audiências difíceis." },
      Médio: { voce: "Comunica bem, sem ser o traço mais forte do perfil.", tu: "Comunicas bem, sem ser o traço mais forte do perfil." },
      Baixo: { voce: "Precisa de mais esforço para explicar e persuadir com clareza.", tu: "Precisas de mais esforço para explicar e persuadir com clareza." },
    },
  },
  {
    categoria: "Liderança",
    emoji: "🎯",
    planetas: ["Sun", "Mars"],
    descricaoCategoria: "decidir, orientar, responsabilidade",
    frases: {
      Alto: { voce: "Assume responsabilidade e decide com naturalidade, mesmo sob pressão.", tu: "Assumes responsabilidade e decides com naturalidade, mesmo sob pressão." },
      Médio: { voce: "Consegue liderar quando é preciso, sem ser o seu ponto mais forte.", tu: "Consegues liderar quando é preciso, sem ser o teu ponto mais forte." },
      Baixo: { voce: "Precisa de mais esforço para assumir posições de decisão e responsabilidade.", tu: "Precisas de mais esforço para assumir posições de decisão e responsabilidade." },
    },
  },
];

function pesoDoPlaneta(pesos: PesoPlaneta[], graha: ClassicalGraha): number {
  return pesos.find((p) => p.planeta === graha)?.peso ?? 0;
}

function nivelDePeso(pesoMedia: number): NivelFacilidade {
  if (pesoMedia >= 1.3) return "Alto";
  if (pesoMedia >= 0.9) return "Médio";
  return "Baixo";
}

export interface FacilidadeNatural {
  categoria: string;
  emoji: string;
  planetas: [ClassicalGraha, ClassicalGraha];
  pesoMedia: number;
  nivel: NivelFacilidade;
  frase: string;
}

/** As 6 categorias com o nível e a frase já resolvidos para esta pessoa — sempre as 6, pela mesma ordem, nunca filtradas nem reordenadas (a ordem de apresentação não é ranking). `usarTu` escolhe o registo da frase (ver CategoriaFacilidade); omisso = "você" (comportamento anterior, ramo adulto). */
export function calcularFacilidadesNaturais(pesos: PesoPlaneta[], usarTu = false): FacilidadeNatural[] {
  return CATEGORIAS.map((cat) => {
    const [a, b] = cat.planetas;
    const pesoMedia = Math.round(((pesoDoPlaneta(pesos, a) + pesoDoPlaneta(pesos, b)) / 2) * 1000) / 1000;
    const nivel = nivelDePeso(pesoMedia);
    return {
      categoria: cat.categoria,
      emoji: cat.emoji,
      planetas: cat.planetas,
      pesoMedia,
      nivel,
      frase: usarTu ? cat.frases[nivel].tu : cat.frases[nivel].voce,
    };
  });
}
