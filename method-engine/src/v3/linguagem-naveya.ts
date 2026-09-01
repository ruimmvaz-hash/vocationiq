// FASE 1 — DECISÃO DE LINGUAGEM, GLOBAL E PERMANENTE. Aplica-se a todo o
// motor v3 e a todos os prompts que vamos construir a seguir.
//
// O motor pode e deve usar conceitos astrológicos como base de cálculo e
// como fonte dos sinais. O relatório que o cliente lê NUNCA usa termos
// técnicos astrológicos soltos — cada conceito tem uma DEFINIÇÃO NAVEYA,
// a tradução do sinal técnico para linguagem humana e concreta.
//
// Fonte normativa do MOVIMENTO de tradução: `CODE-5-pares-traducao.md`
// (28 pares reprovado/aprovado, de um único relatório real). Esse
// documento é explícito: "estes pares ensinam o MOVIMENTO. Nunca o
// fraseado" — imitar as frases à letra despe o produto da exclusividade
// que justifica o preço. Por isso as `DEFINICOES_*` abaixo NÃO são frases
// para copiar para o relatório: são a matéria-prima que o LLM usa para
// ESCREVER a sua própria frase, no tom e densidade de cada secção — o
// mesmo padrão que CODE-5 já estabelece para o resto do prompt (ver
// `prompt.ts`, regra 5 do motor antigo: "o sujeito da frase é sempre a
// pessoa", nunca o elemento técnico).
//
// Este ficheiro não importa CODE-5-pares-traducao.md como módulo (é
// Markdown, não código) — "importar como referência" significa: cada
// definição abaixo foi calibrada contra o movimento que esse documento
// ensina (mecânica → vida; nomear a função não chega, tem de se dizer o
// que a pessoa FAZ com ela), e comentários apontam para a secção relevante
// de CODE-5 onde a calibração se apoia.

import type { Graha } from "../lifeReport/types";
import type { Avastha } from "../lifeReport/avasthaBaladi";
import type { NivelMaitri } from "./panchadhaMaitri";
import type { NiveauConfianca } from "../types-v3";
import type { ZodiacSign } from "../data/tables";
import type { NakshatraName } from "../astrology/nakshatra";

// ── Nomes de signo, em português — não é "definição Naveya" (não há
// significado psicológico a traduzir aqui), é só o nome que a nota de
// leitura da Abertura usa ("Continuas a ser de Sagitário" — CODE-1-v2).
export const NOME_SIGNO_PT: Record<ZodiacSign, string> = {
  Aries: "Carneiro",
  Taurus: "Touro",
  Gemini: "Gémeos",
  Cancer: "Caranguejo",
  Leo: "Leão",
  Virgo: "Virgem",
  Libra: "Balança",
  Scorpio: "Escorpião",
  Sagittarius: "Sagitário",
  Capricorn: "Capricórnio",
  Aquarius: "Aquário",
  Pisces: "Peixes",
};

// ── Planetas (os 9 grahas) ──────────────────────────────────────────────
// Cada definição descreve o MECANISMO DE VIDA do graha, não a mitologia
// nem a função técnica (CODE-5, família A "mecânica no corpo": "a
// localização desapareceu inteira... ganhou uma consequência que ela pode
// testar contra a própria experiência").

export const DEFINICOES_GRAHA: Record<Graha, string> = {
  Sun: "a necessidade de ser reconhecida como fonte — de que o que faz leve o seu nome, e de não desaparecer dentro de uma estrutura maior do que ela.",
  Moon: "o que a pessoa sente antes de pensar — a sua leitura mais rápida e mais fiável da situação, mesmo quando não consegue justificá-la em palavras.",
  Mars: "a capacidade de arrancar, de decidir e de agir sem esperar por permissão — onde está forte, a pessoa não hesita; onde está fraca, adia até a decisão se tomar sozinha.",
  Mercury: "a forma como processa, fala e negocia o mundo — o que entra por linguagem e sai por argumento, incluindo a distância entre o que pensa e o que diz.",
  Jupiter: "a direcção de crescimento e a confiança de que vale a pena continuar — onde aponta, o esforço rende mais do que o investido; onde falta, cresce-se por teimosia, não por convicção.",
  Venus: "o que a pessoa acha bonito, o que valoriza e por quem se deixa atrair — e, pela mesma medida, o que está disposta a pagar e a receber em troca.",
  Saturn: "o que exige tempo, estrutura e disciplina antes de dar fruto — onde está, não há atalho; o que se ganha aqui não se perde depois.",
  Rahu: "o apetite que nunca se sente satisfeito — a direcção para onde a pessoa é empurrada mesmo sem experiência prévia, e que cresce quanto mais se persegue.",
  Ketu: "o que já foi dominado em vidas ou capítulos anteriores e por isso já não dá gosto — a competência que sobra sem vontade de a usar.",
};

/**
 * Nome do graha em português — usado a partir da CORRECÇÃO GLOBAL de
 * 23/08/2026 (ver `INSTRUCAO_PADRAO`): o termo técnico deixou de ser
 * proibido no texto do cliente e passou a ser OBRIGATÓRIO, sempre
 * acompanhado da definição Naveya. Como `termotecnico` chega em inglês
 * (as chaves de `Graha`), sem esta tabela o LLM escreveria "Saturn", não
 * "Saturno". Rahu/Ketu mantêm-se sem tradução — não têm nome próprio em
 * português na tradição, e CODE-4/CODE-1 já os usam assim, sem tradução.
 */
export const NOME_GRAHA_PT: Record<Graha, string> = {
  Sun: "Sol",
  Moon: "Lua",
  Mars: "Marte",
  Mercury: "Mercúrio",
  Jupiter: "Júpiter",
  Venus: "Vénus",
  Saturn: "Saturno",
  Rahu: "Rahu",
  Ketu: "Ketu",
};

/**
 * Corpos ocidentais lentos (Urano/Neptuno/Plutão) — usados só em trânsito
 * (`transitsV3.ts`), nunca como posição natal do D-1 védico, por isso
 * vivem fora de `Graha`/`DEFINICOES_GRAHA` (esse tipo é fechado aos 9
 * grahas clássicos + nós). Adicionado ao implementar a Secção 11 — O
 * Relógio (23/08/2026): sem esta tabela, `formatarSinalParaPrompt` devolvia
 * `null` para metade dos `slowTransits` (Urano, Neptuno, Plutão), e a
 * secção não tinha como traduzir 3 dos 6 trânsitos lentos. Calibrado pelo
 * mesmo movimento de CODE-5 (mecânica → efeito de vida), não pela
 * mitologia do corpo.
 */
export type CorpoOcidental = "Uranus" | "Neptune" | "Pluto";

/**
 * BUG ENCONTRADO E CORRIGIDO 23/08/2026, ao construir a lista de termos do
 * Critério E (verificacao.ts): `termoTecnicoEmPortugues` nunca tinha uma
 * entrada para `CorpoOcidental` — caía no `return t` genérico e devolvia
 * o nome EM INGLÊS ("Pluto", não "Plutão"). Isto já tinha produzido
 * "TERMO A ESCREVER NO TEXTO: Pluto" nos dry-runs aprovados das Secções
 * 11, 12 e 13 (Relógio, Plano, Custo) — nenhum desses dry-runs escreveu
 * "Pluto" no texto final porque os dry-runs são feitos à mão por mim,
 * seguindo o SENTIDO da definição, nunca copiando literalmente o campo
 * "TERMO A ESCREVER NO TEXTO" — mas um LLM real, a seguir a instrução à
 * letra, escreveria "Pluto" em português. Corrigido aqui; as três secções
 * já aprovadas não precisam de ser reconstruídas (a lógica delas já
 * chama `formatarSinalParaPrompt`, que agora usa esta tabela
 * automaticamente) — só os testes que fixavam o texto antigo precisam de
 * ser actualizados.
 */
export const NOME_CORPO_OCIDENTAL_PT: Record<CorpoOcidental, string> = {
  Uranus: "Urano",
  Neptune: "Neptuno",
  Pluto: "Plutão",
};

export const DEFINICOES_CORPO_OCIDENTAL: Record<CorpoOcidental, string> = {
  Uranus: "a ruptura súbita que liberta — o que quebra um molde antigo sem aviso, precisamente porque esse molde já não cabia na pessoa que ela é agora.",
  Neptune: "a dissolução do que parecia sólido — onde os limites ficam menos nítidos, por bem (inspiração, entrega) ou por mal (confusão, ilusão), consoante o que já ali estava.",
  Pluto: "a transformação que não pede licença — o que precisa de morrer para que outra coisa, mais verdadeira, possa nascer no seu lugar; não se negocia, só se atravessa.",
};

// ── Nakshatras (27 mansões lunares) ──────────────────────────────────────
// GAP FECHADO 23/08/2026 — até aqui, a nakshatra da Lua (Secção 4) era
// traduzida por PROXIMIDADE, via o regente clássico dessa nakshatra (ver
// nota em prompt-v3.ts, Secção 4). Esta tabela dá a cada nakshatra a sua
// PRÓPRIA definição Naveya, no formato pedido: `nome` (transliteração
// padrão, só para o motor — chave que bate com `NakshatraName` de
// astrology/nakshatra.ts, nunca aparece ao cliente), `nomeEvocativo` (o
// termo a mostrar no texto — uma imagem em português, nunca uma tradução
// literal do sânscrito), `definicao` (o padrão de comportamento real que
// esta nakshatra descreve) e `movimento` (como essa energia age no mundo —
// mecânica → efeito de vida, calibrado pelo movimento de CODE-5, nunca
// pela descrição técnica de um site de astrologia).
//
// NOTA DE ORTOGRAFIA — a chave 23 usa "Dhanishta" (uma só "th"), a grafia
// já fixada em astrology/nakshatra.ts (`NAKSHATRAS`); o pedido desta
// sessão escreveu "Dhanishtha" — mantida a grafia do código existente
// para as chaves baterem com `getNakshatra()`/`NAKSHATRA_LORDS` sem
// conversão adicional.
//
// Quatro nomes evocativos aqui reaproveitam, deliberadamente, imagens já
// usadas (e entregues a um cliente real) em Relatorio-Rui-v7-MELHORADO-
// com-roda.html — "a mansão do tambor" (Dhanishta), "a mansão da lâmina e
// do fogo" (Krittika), "a mansão dos cem curandeiros" (Shatabhisha) e "a
// mansão do regresso da luz" (Punarvasu, cujo significado clássico é
// precisamente "o retorno da luz/do bem") — por serem imagens já
// validadas na prática, não por acaso.

export interface NakshatraDef {
  /** Transliteração padrão — chave interna, nunca aparece ao cliente. Bate com `NakshatraName` (astrology/nakshatra.ts). */
  nome: NakshatraName;
  /** O termo a mostrar no texto do cliente — uma imagem em português, nunca tradução literal do sânscrito. */
  nomeEvocativo: string;
  /** O que este nakshatra representa, em linguagem humana concreta — um padrão de comportamento real. */
  definicao: string;
  /** Como esta energia age no mundo — mecânica → efeito de vida (movimento de CODE-5), nunca descrição técnica. */
  movimento: string;
}

export const DEFINICOES_NAKSHATRA: Record<NakshatraName, NakshatraDef> = {
  Ashwini: {
    nome: "Ashwini",
    nomeEvocativo: "a que chega primeiro",
    definicao: "a pressa boa — o impulso de agir antes de qualquer garantia, de curar ou resolver depressa, sem esperar que o caminho esteja todo desenhado.",
    movimento: "onde está, a pessoa arranca primeiro e explica depois; é a primeira a tentar e a primeira a oferecer ajuda — e cansa-se depressa de quem pensa longamente antes de agir.",
  },
  Bharani: {
    nome: "Bharani",
    nomeEvocativo: "a que carrega até ao fim",
    definicao: "a capacidade de aguentar o peso que os outros largam — de levar um processo até ao fim, mesmo quando dói, porque começou e não é gente de abandonar a meio.",
    movimento: "onde está, a pessoa não foge da parte difícil de qualquer processo — uma gestação, um luto, uma transformação — e sai do outro lado mudada, nunca ilesa.",
  },
  Krittika: {
    nome: "Krittika",
    nomeEvocativo: "a lâmina e o fogo que separam o real",
    definicao: "o corte que separa o que é verdadeiro do que é decoração — a incapacidade de continuar a fingir que algo funciona quando já não funciona.",
    movimento: "onde está, a pessoa corta relações, projectos ou ilusões assim que vê que já não servem — sem sentimentalismo, e às vezes antes de estar preparada para a perda que isso implica.",
  },
  Rohini: {
    nome: "Rohini",
    nomeEvocativo: "a que faz crescer o que toca",
    definicao: "o cuidado que faz crescer — a que rega, alimenta e embeleza o que toca, e não desiste de nutrir mesmo quando o crescimento é lento.",
    movimento: "onde está, a pessoa investe tempo real em fazer uma coisa florescer — uma relação, um projecto, um corpo — e mede o valor pelo cuidado posto, não pela velocidade do resultado.",
  },
  Mrigashira: {
    nome: "Mrigashira",
    nomeEvocativo: "a busca que nunca pára",
    definicao: "a procura permanente — nunca estar de todo satisfeita com o que já encontrou, porque há sempre mais uma pergunta, mais um sítio, mais uma versão a explorar.",
    movimento: "onde está, a pessoa persegue a coisa seguinte antes de esgotar a anterior — o caminho interessa-lhe mais do que qualquer chegada, o que a torna curiosa e, por vezes, difícil de fixar.",
  },
  Ardra: {
    nome: "Ardra",
    nomeEvocativo: "a tempestade que limpa",
    definicao: "a ruptura que limpa — a capacidade de atravessar uma tempestade emocional sem fugir dela, e de sair do outro lado a ver com mais clareza do que antes.",
    movimento: "onde está, a pessoa aprende pela crise, não pela teoria — precisa de sentir o colapso de uma ideia ou situação antes de conseguir construir a seguinte, mais verdadeira.",
  },
  Punarvasu: {
    nome: "Punarvasu",
    nomeEvocativo: "o regresso da luz",
    definicao: "o regresso ao que é essencial depois de perder tudo o resto — a certeza, quase teimosa, de que o que é verdadeiro nesta pessoa não desaparece, mesmo depois de uma queda.",
    movimento: "onde está, a pessoa reconstrói depois de perder — recomeça sem amargura, porque sabe, por experiência, que o essencial nela sobrevive ao que se perdeu.",
  },
  Pushya: {
    nome: "Pushya",
    nomeEvocativo: "o alimento que não se esgota",
    definicao: "o cuidado que nutre sem pedir nada em troca — a capacidade de sustentar outra pessoa, um projecto ou uma casa, de forma estável e sem drama.",
    movimento: "onde está, a pessoa constrói coisas feitas para durar — o que dá, dá bem dado, e o que constrói aguenta o tempo, precisamente por não ter sido feito à pressa nem por cálculo.",
  },
  Ashlesha: {
    nome: "Ashlesha",
    nomeEvocativo: "a que vê o que não se diz",
    definicao: "a percepção do que fica por dizer — a capacidade de entrar onde não foi explicitamente convidada e perceber, antes de qualquer um, o que realmente se passa.",
    movimento: "onde está, a pessoa lê intenções escondidas e guarda segredos (os seus e os alheios) com naturalidade — é confiável precisamente porque raramente revela tudo o que sabe.",
  },
  Magha: {
    nome: "Magha",
    nomeEvocativo: "o trono que honra quem veio antes",
    definicao: "a autoridade que vem de linhagem — o direito de ocupar um lugar de destaque que não se inventou sozinho, mas que se herdou e tem de honrar.",
    movimento: "onde está, a pessoa age com um à-vontade natural de comando, e sente o peso de representar mais do que ela própria — a família, a tradição, o nome que carrega.",
  },
  "Purva Phalguni": {
    nome: "Purva Phalguni",
    nomeEvocativo: "o fruto que se colhe por prazer",
    definicao: "a criação por gosto, não por obrigação — a recusa de fazer uma coisa só porque é preciso, sem que ela também traga prazer ou beleza.",
    movimento: "onde está, a pessoa rende menos quando o trabalho é só dever, e rende muito mais quando encontra nele algum prazer genuíno — o prazer não é luxo, é o combustível real.",
  },
  "Uttara Phalguni": {
    nome: "Uttara Phalguni",
    nomeEvocativo: "o pacto que não se quebra",
    definicao: "a lealdade que se cumpre — o que se combinou, cumpre-se; o que se prometeu, entrega-se, mesmo quando já não é conveniente.",
    movimento: "onde está, a pessoa constrói alianças duradouras — sócios, casamentos, amizades de longo prazo — porque é confiável de forma consistente, não só quando dá jeito.",
  },
  Hasta: {
    nome: "Hasta",
    nomeEvocativo: "as mãos que fazem o que a mente vê",
    definicao: "a habilidade de tornar tangível o que só existia como ideia — de usar as próprias mãos, literais ou figuradas, para materializar precisão.",
    movimento: "onde está, a pessoa cuida através de fazer bem feito — a precisão é a sua forma de demonstrar afecto e competência ao mesmo tempo, mais do que qualquer palavra.",
  },
  Chitra: {
    nome: "Chitra",
    nomeEvocativo: "a que dá forma ao que não tinha forma",
    definicao: "a necessidade de criar beleza onde não havia nenhuma — a incapacidade de deixar algo feio ou informe quando podia ser bonito.",
    movimento: "onde está, a pessoa não trata a estética como decoração — trata-a como parte do próprio funcionamento das coisas, e nota, antes de mais ninguém, quando algo está desalinhado.",
  },
  Swati: {
    nome: "Swati",
    nomeEvocativo: "o vento que não se prende",
    definicao: "a independência como necessidade vital, não como capricho — a capacidade de se adaptar a qualquer direcção sem nunca perder o próprio rumo interno.",
    movimento: "onde está, a pessoa resiste a ser presa a uma estrutura fixa — flexibiliza-se com facilidade, mas nunca abdica do direito de decidir por si própria o que faz a seguir.",
  },
  Vishakha: {
    nome: "Vishakha",
    nomeEvocativo: "a seta que não desvia",
    definicao: "a determinação que não se distrai — a capacidade de escolher um alvo e seguir até lá, mesmo quando o caminho é longo ou pouco recompensador a meio.",
    movimento: "onde está, a pessoa persiste depois de os outros desistirem — o foco é quase teimoso, e é precisamente por isso que consegue terminar o que muitos abandonam.",
  },
  Anuradha: {
    nome: "Anuradha",
    nomeEvocativo: "a amizade que não desiste",
    definicao: "a lealdade construída ao longo do tempo, com quem passou pelas mesmas dificuldades — o compromisso que se aprofunda precisamente onde outros desistiram.",
    movimento: "onde está, a pessoa constrói rede e comunidade de forma disciplinada, um vínculo de cada vez, e é através dessa rede — não sozinha — que os seus projectos se sustentam.",
  },
  Jyeshtha: {
    nome: "Jyeshtha",
    nomeEvocativo: "a mais velha que protege o que é seu",
    definicao: "a autoridade que vem de proteger, não de pedir licença — o instinto de liderar e de cuidar de quem está a seu cargo, mesmo sem título formal para isso.",
    movimento: "onde está, a pessoa assume responsabilidade por outros sem que lha peçam — ocupa o espaço de comando quando é preciso, e carrega o peso disso sem se queixar em voz alta.",
  },
  Mula: {
    nome: "Mula",
    nomeEvocativo: "a raiz que não aceita a superfície",
    definicao: "a necessidade de chegar à raiz de tudo — a incapacidade de aceitar uma resposta superficial quando sabe que há algo mais fundo por baixo.",
    movimento: "onde está, a pessoa desmonta o que é preciso desmontar para investigar até ao fundo — sistemas, crenças ou situações inteiras — mesmo que isso implique destruir antes de reconstruir.",
  },
  "Purva Ashadha": {
    nome: "Purva Ashadha",
    nomeEvocativo: "a convicção que convence antes de provar",
    definicao: "a força de uma visão que chega antes dos factos que a confirmam — a capacidade de acreditar, e de fazer os outros acreditarem, antes de haver prova.",
    movimento: "onde está, a pessoa entusiasma e arrasta outros para uma direcção pela força da própria convicção — vence pelo entusiasmo antes de vencer pelos números.",
  },
  "Uttara Ashadha": {
    nome: "Uttara Ashadha",
    nomeEvocativo: "a vitória que não se perde",
    definicao: "a conquista construída devagar, sem atalhos — o tipo de vitória que, precisamente por ter demorado, não se desfaz facilmente depois.",
    movimento: "onde está, a pessoa tem paciência para o jogo longo — não procura o resultado rápido, e o que constrói dessa forma aguenta o tempo muito melhor do que o que se ganha depressa.",
  },
  Shravana: {
    nome: "Shravana",
    nomeEvocativo: "o ouvido que aprende mais do que ensina",
    definicao: "a escuta como forma de poder — a capacidade de ouvir de verdade o que outra pessoa diz, e o que não consegue dizer, e de aprender mais ouvindo do que falando.",
    movimento: "onde está, a pessoa absorve informação, histórias e conhecimento de quem está à volta, e usa essa escuta acumulada como base real da própria autoridade.",
  },
  Dhanishta: {
    nome: "Dhanishta",
    nomeEvocativo: "o tambor que junta",
    definicao: "o ritmo que une um grupo — a capacidade de fazer com que várias pessoas se movam juntas, na mesma direcção, ao mesmo tempo.",
    movimento: "onde está, a pessoa constrói em grupo o que nunca construiria sozinha — prospera através de redes e de esforço colectivo, e sente o sucesso como mais forte quando é partilhado.",
  },
  Shatabhisha: {
    nome: "Shatabhisha",
    nomeEvocativo: "os cem curandeiros do mistério",
    definicao: "a cura que vem de olhar para o que os outros preferem não ver — o à-vontade com o que é estranho, oculto ou incompreendido pela maioria.",
    movimento: "onde está, a pessoa prefere a solidão à superficialidade, e é precisamente nesse espaço isolado que encontra respostas ou curas que ninguém mais via — o mistério é território, não ameaça.",
  },
  "Purva Bhadrapada": {
    nome: "Purva Bhadrapada",
    nomeEvocativo: "a chama que arde antes de se explicar",
    definicao: "a intensidade que precisa de se transformar em algo — um sentir tão forte que não cabe em conversa pequena nem em respostas mornas.",
    movimento: "onde está, a pessoa age movida por paixão antes de conseguir explicar porquê — a transformação que provoca, em si e nos outros, vem dessa intensidade, não de um plano cuidadosamente calculado.",
  },
  "Uttara Bhadrapada": {
    nome: "Uttara Bhadrapada",
    nomeEvocativo: "a sabedoria que não se apressa",
    definicao: "a profundidade que não tem pressa — a capacidade de aguentar um processo lento e invisível durante anos, sem precisar de mostrar resultado a cada passo.",
    movimento: "onde está, a pessoa constrói coisas destinadas a durar muito mais do que a própria vida — o valor do que faz só se revela com o tempo, nunca de imediato.",
  },
  Revati: {
    nome: "Revati",
    nomeEvocativo: "a porta que se fecha com graça",
    definicao: "a capacidade de guiar alguém, ou a si própria, até ao fim de um percurso, e de fechar esse ciclo sem violência, com um cuidado quase maternal.",
    movimento: "onde está, a pessoa acompanha os outros na última parte de uma jornada — e trata cada final não como uma perda, mas como a porta que abre para o que vem depois.",
  },
};

// ── Casas (1-12) ─────────────────────────────────────────────────────────
// CODE-5, item C-bis: "saiu o inventário de ocupantes... entrou o que ela
// faz na segunda-feira de manhã" — por isso cada casa é definida como uma
// ÁREA DE ACÇÃO CONCRETA, não como categoria astrológica.

export const DEFINICOES_CASA: Record<number, string> = {
  1: "como a pessoa se apresenta e o que faz com o próprio corpo e presença.",
  2: "o que possui, o que vale e como fala de si mesma.",
  3: "como comunica, aprende e se relaciona com quem está próximo dela.",
  4: "a base de onde parte — casa, raiz, aquilo que a sustenta por dentro.",
  5: "o que cria por gosto próprio, e onde arrisca por prazer, não por dever.",
  6: "o trabalho do dia a dia, a rotina, e o que tem de resolver sozinha.",
  7: "os acordos, as parcerias e quem está do outro lado da mesa.",
  8: "o que se partilha, o que se perde e o que se transforma quando algo acaba.",
  9: "o sentido, o estudo e aquilo em que acredita sem precisar de prova.",
  10: "o lugar público, a carreira e o nome pelo qual é conhecida.",
  11: "os ganhos, a rede e a quem pertence.",
  12: "o que fica escondido — o trabalho invisível, o descanso, e o que se perde sem ser contado.",
};

/**
 * Rótulo Naveya CURTO por casa — usado pela roda (diagramas.ts) e pela
 * Secção 5 (texto e diagrama têm de usar a MESMA tradução, por pedido
 * explícito de 23/08/2026). Diferente de `DEFINICOES_CASA` (frase
 * completa, usada nos sinais de prompt) — este é o rótulo compacto dado
 * literalmente no pedido, para caber junto à roda e ser repetido em
 * prosa sem soar a definição de dicionário.
 *
 * Vive aqui (não em diagramas.ts) porque tanto `diagramas.ts` como
 * `prompt-v3.ts` precisam dele, e `diagramas.ts` já importa
 * `PAPEL_CAMADA` de `prompt-v3.ts` — pôr este mapa em `prompt-v3.ts`
 * criaria um import circular (prompt-v3 → diagramas → prompt-v3).
 * `linguagem-naveya.ts` não depende de nenhum dos dois, por isso é o
 * sítio neutro.
 */
export const ROTULO_CASA_NAVEYA: Record<number, string> = {
  1: "como te apresentas",
  2: "o que possuis e vales",
  3: "como comunicas",
  4: "as raízes e o privado",
  5: "o que crias por prazer",
  6: "o trabalho diário",
  7: "os acordos e parcerias",
  8: "as transformações",
  9: "o que te expande",
  10: "a carreira e o nome",
  11: "a rede e os ganhos",
  12: "o que trabalhas por dentro",
};

/**
 * O propósito de alma (dharma) que o signo do Karakamsha (D-9) indica,
 * na tradição clássica — traduzido para o mesmo registo "mecânica → vida"
 * de `DEFINICOES_GRAHA` (CODE-5), nunca mitologia do signo nem previsão.
 * Acrescentado 25/08/2026 ("Correcções críticas ao motor v3", ponto 5) —
 * o Karakamsha estava calculado (`karakas.atmakarakaD9Sign`) mas nunca
 * usado nos prompts.
 */
export const DEFINICOES_KARAKAMSHA_SIGNO: Record<ZodiacSign, string> = {
  Aries: "abrir caminho onde ainda não há caminho — o propósito realiza-se ao decidir primeiro e ao aceitar o risco de errar em público, não ao esperar que outro vá à frente.",
  Taurus: "construir algo que dure — o propósito realiza-se ao dar forma estável e concreta a algo, devagar, até se tornar valor que não se desfaz com facilidade.",
  Gemini: "ligar o que está separado — o propósito realiza-se ao traduzir, explicar e pôr em contacto pessoas ou ideias que, sem essa ponte, ficariam cada uma no seu canto.",
  Cancer: "sustentar quem precisa de abrigo — o propósito realiza-se ao criar um lugar (literal ou não) onde outros se sintam protegidos e possam crescer sem medo.",
  Leo: "ser reconhecível naquilo que faz — o propósito realiza-se ao assumir o centro quando é preciso liderar ou criar, e ao deixar que o próprio nome fique associado ao resultado.",
  Virgo: "aperfeiçoar o que já existe — o propósito realiza-se ao entrar no detalhe que os outros saltam, e ao pôr ordem e utilidade real onde havia só intenção.",
  Libra: "equilibrar o que está desigual — o propósito realiza-se ao mediar, ao decidir com justiça entre partes, e ao construir acordos que sirvam mais do que um lado.",
  Scorpio: "atravessar o que os outros evitam — o propósito realiza-se ao entrar onde há crise, perda ou transformação, e ao sair do outro lado com algo mais verdadeiro.",
  Sagittarius: "dar sentido mais largo ao que via de perto — o propósito realiza-se ao ensinar, estudar ou viajar até encontrar um quadro maior onde tudo o resto encaixa.",
  Capricorn: "erguer estrutura que aguenta o peso do tempo — o propósito realiza-se ao assumir responsabilidade a longo prazo e ao chegar, devagar, a uma posição de autoridade merecida.",
  Aquarius: "servir um grupo maior do que si próprio — o propósito realiza-se ao pensar fora do molde já aceite, e ao pôr essa ideia ao serviço de uma comunidade, não só de si.",
  Pisces: "dissolver a fronteira entre si e o outro — o propósito realiza-se ao cuidar, perdoar ou criar sem exigir crédito individual pelo que sai das próprias mãos.",
};

/**
 * A Arudha Lagna (AL) é sempre uma CASA (o valor calculado em
 * `CamadaA.arudhaLagna`, ver camada-a.ts), nunca um signo — por isso a
 * sua tradução Naveya reaproveita `ROTULO_CASA_NAVEYA`/`DEFINICOES_CASA`
 * pela casa correspondente; esta única frase serve só de INTRODUÇÃO ao
 * conceito (o que a Arudha Lagna É, distinto da casa em si), para os
 * prompts que a usam (Secção 9).
 */
export const DEFINICAO_ARUDHA_LAGNA =
  "a imagem pública real — não quem a pessoa é por dentro, mas a forma como o mundo a lê à primeira vista, antes de a conhecer melhor.";

/**
 * Banda ABSOLUTA de SAV (correcção 23/08/2026) — ancorada à média teórica
 * (~28, escala 0-56), nunca por ranking de posição dentro da própria
 * carta (uma carta "generosa" teria tudo "forte" por ranking; uma carta
 * "pobre" teria tudo "fraco" — a banda absoluta evita as duas distorções).
 * Mesma lógica partilhada entre a roda (diagramas.ts) e a Secção 5
 * (prompt-v3.ts) — por isso vive aqui, no sítio neutro.
 */
export function bandaAbsolutaSav(pontuacao: number): "forte" | "medio" | "fraco" {
  if (pontuacao >= 32) return "forte";
  if (pontuacao >= 25) return "medio";
  return "fraco";
}

// ── Dignidade clássica (exaltação/queda/domicílio) — modificadores ──────

export const DEFINICOES_DIGNIDADE_CLASSICA: Record<"exaltacao" | "queda" | "domicilio" | "debilitado" | "moolatrikona", string> = {
  exaltacao: "funciona no seu melhor estado possível — com mais alcance do que o normal, quase sem esforço.",
  queda: "funciona abaixo do seu potencial — custa mais a dar o resultado que devia dar naturalmente.",
  domicilio: "está em terreno seu — não precisa de se justificar nem de se adaptar para funcionar.",
  debilitado: "trabalha contra a corrente — o que produz exige mais confirmação e mais tempo do que o normal.",
  moolatrikona: "está no seu terreno mais natural de todos — mais à vontade aqui do que em qualquer outro sítio, incluindo o seu próprio domicílio.",
};

/**
 * Nome a mostrar no texto para cada chave de `DEFINICOES_DIGNIDADE_CLASSICA`
 * — as chaves são ASCII simplificado (chaves de objecto), não a palavra
 * portuguesa correcta. Adicionada na correcção global de linguagem de
 * 23/08/2026: sem isto, `termoTecnicoEmPortugues` devolveria "exaltacao"
 * (sem acento) em vez de "exaltação" no texto do cliente.
 */
export const NOME_DIGNIDADE_CLASSICA_PT: Record<keyof typeof DEFINICOES_DIGNIDADE_CLASSICA, string> = {
  exaltacao: "exaltação",
  queda: "queda",
  domicilio: "domicílio",
  debilitado: "debilitado",
  moolatrikona: "moolatrikona",
};

/**
 * Converte o `DignityDetail` clássico (data/dignity.ts: "Exalted" |
 * "Debilitated" | "Own" | "Friend" | "Enemy" | "Neutral" | "Moolatrikona")
 * para o termotecnico que `traduzirSinal` reconhece. Devolve `null` para
 * Friend/Enemy/Neutral — esses não têm definição própria aqui porque são
 * substituídos pela Panchadha Maitri (ver dignidadeV3.ts): quando a
 * dignidade clássica é uma destas três, a força real do planeta é dada
 * pelo grau de Panchadha (adhi-mitra/mitra/sama/shatru/adhi-shatru), não
 * por este mapa. Chamar aqui com Friend/Enemy/Neutral e não ter Panchadha
 * disponível é sinal de dado em falta, não de tradução omissa.
 */
export function termotecnicoDeDignidadeClassica(d: "Exalted" | "Debilitated" | "Own" | "Friend" | "Enemy" | "Neutral" | "Moolatrikona"): string | null {
  switch (d) {
    case "Exalted":
      return "exaltacao";
    case "Debilitated":
      return "debilitado";
    case "Own":
      return "domicilio";
    case "Moolatrikona":
      return "moolatrikona";
    default:
      return null; // Friend/Enemy/Neutral — ver Panchadha Maitri
  }
}

// ── Panchadha Maitri (5 graus de amizade) — modificadores relacionais ───
// Usado quando um graha ocupa o signo de outro (ex.: Vénus em Capricórnio,
// regido por Saturno) — ver `panchadhaMaitri.ts`.

export const DEFINICOES_MAITRI: Record<NivelMaitri, string> = {
  "adhi-mitra": "está em casa de um grande aliado — o que aí se constrói tem apoio a dobrar, quase sem atrito.",
  mitra: "está em casa de um aliado — o terreno ajuda mais do que atrapalha.",
  sama: "está em terreno que não ajuda nem atrapalha — o resultado depende inteiramente do que a pessoa fizer.",
  shatru: "está em terreno que resiste — o que aí se faz custa mais do que devia custar.",
  "adhi-shatru": "está em terreno hostil a dobrar — o que aí se tenta raramente sai como planeado à primeira.",
};

// ── Avasthas (Baladi — idade do planeta no signo) ───────────────────────
// CODE-5 nunca tratou avasthas directamente, mas a mesma regra aplica-se:
// nomear o estado não chega, tem de se dizer o efeito.

export const DEFINICOES_AVASTHA: Record<Avastha, string> = {
  Bala: "ainda em formação — a capacidade existe mas ainda não tem experiência acumulada; cresce com uso, não com espera.",
  Kumara: "a ganhar forma — já não é inexperiência, mas ainda não é domínio; testa-se e ajusta-se.",
  Yuva: "no seu auge — é aqui que a capacidade entrega o máximo do que tem para dar, sem desconto.",
  Vriddha: "já deu o que tinha a dar da forma antiga — funciona melhor a transmitir e a orientar do que a executar de raiz.",
  Mrita: "esgotada na forma como se apresentava até agora — insistir do mesmo jeito não rende; pede-se uma forma nova, não mais esforço na antiga.",
};

// ── Escala de confiança (v3, 6ª regra que manda) — reaproveitada como
// framing de linguagem para o LLM, nunca mostrada ao cliente com este nome ──

export const DEFINICOES_NIVEL_CONFIANCA: Record<NiveauConfianca, string> = {
  "convergencia-forte": "isto não é uma leitura entre outras — é o ponto onde várias medidas independentes da carta apontam exactamente ao mesmo sítio. Escreva com a firmeza que isso merece.",
  "sinal-forte": "há confirmação real, mas mais estreita do que uma convergência forte — escreva com confiança, sem a apresentar como a conclusão mais sólida do relatório.",
  leitura: "é uma interpretação sólida, sem uma segunda medida independente a confirmá-la — escreva-a como leitura, nunca como facto assente.",
  "em-aberto": "a carta não decide isto sozinha — diga isso com honestidade e devolva a decisão à pessoa, nunca finja uma certeza que a carta não dá.",
};

// ── Composição: um "sinal" completo, pronto a inserir no prompt ─────────
//
// CORRECÇÃO GLOBAL — 23/08/2026. A regra "zero termos técnicos" estava
// errada e foi substituída pelo utilizador: termos astrológicos SÃO
// permitidos no texto do cliente, mas SEMPRE acompanhados da definição
// Naveya imediatamente a seguir, no formato «[termo] — [definição]».
// Exemplo dado no pedido: "Saturno — o que exige tempo, estrutura e
// disciplina antes de dar fruto — é o centro da tua carta." Antes disto,
// `INSTRUCAO_PADRAO` dizia o oposto ("nunca o termo técnico... se aparecer
// no texto final, é falha de geração") — substituída por
// `instrucaoMostrarTermo()`, que passa a exigir o termo, não a proibi-lo.
//
// EXCEPÇÃO MANTIDA, POR DECISÃO DESTA SESSÃO (não coberta pelos exemplos
// do pedido, que são todos sobre sinais astrológicos — planetas, signos,
// dashas): os níveis da escala de confiança (`convergencia-forte` /
// `sinal-forte` / `leitura` / `em-aberto`) continuam a NÃO aparecer no
// texto com o nome técnico. A 6ª regra que manda (CODE-1-esqueleto-v3.md)
// define esta escala como calibração da FIRMEZA da escrita, nunca como
// etiqueta visível ao cliente — nada no pedido desta correcção manda o
// contrário. Sinalizado aqui como decisão explícita, a confirmar se
// divergir do que o utilizador queria.

export interface SinalParaPrompt {
  /** O termo técnico em bruto (ex. "Saturn", "casa-10") — só para o SINAL de depuração; nunca o que o LLM deve escrever no texto (ver `termoParaTexto`). */
  sinalTecnico: string;
  /** O termo em português, pronto a aparecer no texto do cliente (ex. "Saturno", "casa 10") — null para sinais que continuam a não se nomear (níveis de confiança). */
  termoParaTexto: string | null;
  /** A definição Naveya — o que acompanha o termo, ou (para níveis de confiança) o que orienta o sentido da frase sem nomear o termo. */
  definicaoNaveya: string;
  /** A instrução fixa que acompanha este sinal (ver formatarSinalParaPrompt). */
  instrucao: string;
}

/**
 * Traduz o termotecnico em bruto (chaves inglesas de `Graha`, "casa-N",
 * slugs de dignidade/maitri/avastha) para a palavra que deve aparecer no
 * texto do cliente. Grahas usam `NOME_GRAHA_PT`; "casa-N" vira "casa N";
 * o resto (dignidade clássica, Panchadha Maitri, avastha) já está em
 * português corrente e fica como está.
 */
function termoTecnicoEmPortugues(termotecnico: string): string {
  const t = termotecnico.trim();
  if (t in NOME_GRAHA_PT) return NOME_GRAHA_PT[t as Graha];
  if (t in NOME_CORPO_OCIDENTAL_PT) return NOME_CORPO_OCIDENTAL_PT[t as CorpoOcidental];
  if (t in NOME_DIGNIDADE_CLASSICA_PT) return NOME_DIGNIDADE_CLASSICA_PT[t as keyof typeof NOME_DIGNIDADE_CLASSICA_PT];
  if (t in DEFINICOES_NAKSHATRA) return DEFINICOES_NAKSHATRA[t as NakshatraName].nomeEvocativo;
  const casaMatch = t.match(/^casa[- ]?(\d{1,2})$/i);
  if (casaMatch) return `casa ${casaMatch[1]}`;
  return t;
}

export function instrucaoMostrarTermo(termoParaTexto: string): string {
  return `Escrever sempre o termo técnico — «${termoParaTexto}» — seguido de " — " e a definição Naveya acima, no formato «${termoParaTexto} — definição — resto da frase». Pode adaptar-se a definição gramaticalmente ao encaixe da frase (e enriquecer com o que for específico desta colocação), mas o sentido dado pela definição tem de se manter reconhecível. Nunca o termo sozinho sem a definição a seguir, e nunca a definição sem nomear o termo antes.`;
}

const INSTRUCAO_NIVEL_CONFIANCA =
  "Este é um nível de confiança interno (escala da 6ª regra que manda, CODE-1-esqueleto-v3.md) — nunca nomeie o termo técnico no texto. Use a definição acima só para calibrar a FIRMEZA com que escreve esta frase.";

/**
 * Resolve a definição Naveya de um sinal técnico, no contexto dado.
 * `termotecnico` identifica o QUE traduzir (ex.: "Saturn", "casa-10",
 * "exaltacao", "Bala", "adhi-mitra", "sinal-forte"); `contexto` identifica
 * o PAPEL que esse sinal desempenha nesta carta (ex.: "Atmakaraka",
 * "regente da casa 10", "planeta em trânsito") — usado para compor a
 * definição final quando o papel muda o sentido da tradução (ver exemplo
 * no pedido: "Atmakaraka em Saturno" não é só "Saturno", é "a alma
 * escolheu aprender através de...").
 *
 * Devolve null quando o termo não está catalogado — o chamador decide
 * então se marca [TRADUÇÃO PENDENTE] (ver prompt.ts, regra 5b do motor
 * antigo: "a dificuldade de tradução é sinal de que falta contexto do
 * mapa, não de que o dado é dispensável") em vez de inventar uma definição
 * nova.
 */
export function traduzirSinal(termotecnico: string, contexto: string): string | null {
  const t = termotecnico.trim();

  if (t in DEFINICOES_GRAHA) {
    const base = DEFINICOES_GRAHA[t as Graha];
    return aplicarPapel(base, contexto);
  }

  if (t in DEFINICOES_CORPO_OCIDENTAL) {
    const base = DEFINICOES_CORPO_OCIDENTAL[t as CorpoOcidental];
    return aplicarPapel(base, contexto);
  }

  if (t in DEFINICOES_NAKSHATRA) {
    const nak = DEFINICOES_NAKSHATRA[t as NakshatraName];
    // `movimento` começa sempre em minúscula ("onde está...") — capitaliza ao juntar a `definicao`, que termina em ponto final, para não produzir "...reconstruir. onde está..." com letra minúscula a seguir a um ponto.
    const movimentoCapitalizado = nak.movimento.charAt(0).toUpperCase() + nak.movimento.slice(1);
    return aplicarPapel(`${nak.definicao} ${movimentoCapitalizado}`, contexto);
  }

  const casaMatch = t.match(/^casa[- ]?(\d{1,2})$/i);
  if (casaMatch) {
    const n = Number(casaMatch[1]);
    if (DEFINICOES_CASA[n]) return DEFINICOES_CASA[n];
  }

  if (t in DEFINICOES_DIGNIDADE_CLASSICA) return DEFINICOES_DIGNIDADE_CLASSICA[t as keyof typeof DEFINICOES_DIGNIDADE_CLASSICA];
  if (t in DEFINICOES_MAITRI) return DEFINICOES_MAITRI[t as NivelMaitri];
  if (t in DEFINICOES_AVASTHA) return DEFINICOES_AVASTHA[t as Avastha];
  if (t in DEFINICOES_NIVEL_CONFIANCA) return DEFINICOES_NIVEL_CONFIANCA[t as NiveauConfianca];

  return null;
}

/**
 * Papéis que mudam o SENTIDO de um graha (não a definição base, o ângulo
 * de leitura dela). Cobre só os papéis já usados no v3/CODE-2 até agora
 * — estender aqui à medida que novos papéis entrarem no motor.
 *
 * CORRIGIDO 23/08/2026 — a primeira versão usava
 * `definicaoBase.replace(/^a |^o /, "")` para tentar encaixar a definição
 * como complemento directo de uma frase ("...aprender através de {a
 * necessidade...}" → "...através de necessidade..."). Como as definições
 * em DEFINICOES_GRAHA nem sempre começam por "a "/"o " sozinho (ex.:
 * Saturno começa por "o que exige..." — "o " aqui é parte de "o que",
 * não um artigo solto), a regex cortava a palavra errada e produzia texto
 * sem gramática ("aprender através de que exige tempo..."). Mesma classe
 * de erro já corrigida em `espinha.ts` (`construirAfirmacaoNaveya`).
 * Corrigido aqui da mesma forma: nunca cortar a definição, embutir a
 * frase inteira depois de dois pontos.
 */
function aplicarPapel(definicaoBase: string, contexto: string): string {
  const c = contexto.toLowerCase();
  const semPonto = definicaoBase.endsWith(".") ? definicaoBase.slice(0, -1) : definicaoBase;
  if (c.includes("atmakaraka")) {
    return `a alma desta pessoa escolheu aprender através disto: ${semPonto}. É por isso que os atalhos que evitam essa aprendizagem nunca satisfazem completamente.`;
  }
  if (c.includes("amatyakaraka")) {
    return `a carreira desta pessoa cumpre-se através disto: ${semPonto}.`;
  }
  if (c.includes("karakamsha")) {
    return `é aqui que aquilo em que a pessoa quer tornar-se amadurece: ${semPonto}.`;
  }
  if (c.startsWith("regente da casa") || c.startsWith("regente de")) {
    return `quem decide o que acontece nesta área é isto: ${semPonto}.`;
  }
  if (c.includes("trânsito") || c.includes("transito")) {
    return `o que está agora a activar-se é isto: ${semPonto}.`;
  }
  if (c.includes("mahadasha") || c.includes("antardasha") || c.includes("período") || c.includes("periodo")) {
    return `este período pede que a pessoa viva por dentro isto: ${semPonto}.`;
  }
  return definicaoBase;
}

/**
 * Monta o bloco de 3 partes que todo prompt do motor v3 usa para passar um
 * sinal astrológico ao LLM: o sinal técnico (para o modelo entender o que
 * está a traduzir), a definição Naveya, e a instrução — desde a correcção
 * de 23/08/2026, a instrução exige nomear o termo (seguido da definição),
 * excepto para níveis de confiança, que continuam a não se nomear (ver
 * nota no topo do ficheiro). Devolve null quando `traduzirSinal` não
 * encontra definição — o chamador decide então entre marcar [TRADUÇÃO
 * PENDENTE] ou pedir uma definição nova antes de usar este sinal em
 * produção.
 */
export function formatarSinalParaPrompt(termotecnico: string, contexto: string): SinalParaPrompt | null {
  const definicaoNaveya = traduzirSinal(termotecnico, contexto);
  if (!definicaoNaveya) return null;
  const ehNivelConfianca = termotecnico.trim() in DEFINICOES_NIVEL_CONFIANCA;
  const termoParaTexto = ehNivelConfianca ? null : termoTecnicoEmPortugues(termotecnico);
  const instrucao = ehNivelConfianca ? INSTRUCAO_NIVEL_CONFIANCA : instrucaoMostrarTermo(termoParaTexto!);
  return { sinalTecnico: `${contexto}: ${termotecnico}`, termoParaTexto, definicaoNaveya, instrucao };
}

/** Serializa um SinalParaPrompt no formato de texto literal do pedido (SINAL / DEFINIÇÃO NAVEYA / INSTRUÇÃO), incluindo o termo em português quando aplicável. */
export function serializarSinal(sinal: SinalParaPrompt): string {
  const linhaTermo = sinal.termoParaTexto ? `\nTERMO A ESCREVER NO TEXTO: ${sinal.termoParaTexto}` : "";
  return `SINAL: ${sinal.sinalTecnico}${linhaTermo}\nDEFINIÇÃO NAVEYA: "${sinal.definicaoNaveya}"\nINSTRUÇÃO: ${sinal.instrucao}`;
}
