import { SECCAO_TITULOS, type CandidataForaDaLista } from "@naveya/method-engine";

// Redesenho do motor VocationIQ, Parte 3 — arquitectura de 3 passos.
// Gerar (já existente) → Criticar (2ª chamada, 20 critérios — 12
// originais + 13-16 das 4 camadas técnicas + 17-19 de precisão de
// ligação/nomeação técnica + 20 detector explícito da palavra "carta",
// correcção do especialista) → Reescrever (3ª chamada, só se algum
// critério falhar). Tudo dentro do mesmo clique em "Gerar rascunho"/
// "Regenerar" — nunca uma acção separada do admin.
//
// CORRECÇÃO (ronda seguinte) — o critério 20 é novo: nenhum dos 19
// critérios anteriores verificava explicitamente a palavra "carta" no
// TEXTO GERADO PELO LLM (a proibição só existia como regra na geração,
// nunca como critério na crítica) — por isso, quando o LLM violava a
// regra, nada na crítica automática apanhava isso nem forçava reescrita.
// Confirmado por leitura de código: nenhum resíduo de "carta" existe em
// nenhuma instrução do prompt (ver promptAdulto.ts) — a causa era mesmo
// esta lacuna na crítica, não um exemplo a ser imitado.

const INSTRUCAO_CRITICA = `Tens à tua frente:
 A) O prompt técnico completo
 B) O rascunho gerado

 Verifica contra estes critérios:

 1. TOM: há 'tu', 'teu', 'tua', 'tens' no texto?
    Lista cada ocorrência.

 2. REPETIÇÃO: a mesma conclusão aparece em mais de uma secção?
    Lista cada repetição.

 3. PLANETAS FRACOS: todos os planetas com peso < 0,9 são
    nomeados? Lista os que faltam.

 4. ÁREA ACTUAL: é usada como capital acumulado ou ignorada?

 5. OPÇÃO DECLARADA vs PERFIL: a opção é testada ou só
    confirmada?

 6. TENSÕES: tensões entre sinais contraditórios são nomeadas?
    Lista as que faltam.

 7. CANDIDATA FORA DA LISTA: foi testada contra catálogo
    ou só os 3 eixos abstractos?

 8. HORIZONTE TEMPORAL: há afirmações directas para
    períodos > 18 meses?

 9. PRIMEIRA PESSOA DO PLURAL: há 'identificámos', 'vimos',
    'calculámos'?

 10. MAHADASHA: o tom do ciclo maior abre a secção do plano?

 11. RODA DA VIDA: as dimensões com valor ≤ 4 ou ≥ 7 são
     referenciadas no texto?

 12. KARAKAMSHA: foi lido sempre com o Atmakaraka (nunca
     isolado)?

 13. AVASTHAS: INSTRUCAO_AVASTHAS tem 3 condições — verifica CADA UMA
     contra os dados técnicos (peso e avastha de cada planeta):
     (a) um planeta citado nas camadas de "Derivadas da área actual" está
         em Mrita?
     (b) um planeta com peso ≥1,3 está em Mrita?
     (c) um planeta com peso <0,9 está em Yuva?
     Para CADA condição que se aplica (pode ser mais do que uma ao mesmo
     tempo, ou nenhuma), confirma que foi explicada na secção "Quem é"
     com a frase-padrão correspondente. Se alguma condição aplicável não
     foi mencionada: FALHA — reescrita obrigatória, diz exactamente qual
     das 3 condições ((a), (b) ou (c)) foi ignorada.

 14. CONJUNÇÕES: cada conjunção activa foi usada numa frase concreta
     em "Quem é"? Se alguma foi ignorada: FALHA.

 15. YOGAS POR CANDIDATA: para cada yoga activo, existe uma frase na
     leitura de alguma candidata ou opção que o cita com o padrão
     "Existe também..."? Se existe yoga activo e nenhuma candidata
     o cita: FALHA — reescrita obrigatória.

 16. VARGOTTAMA: se existe planeta Vargottama nos dados técnicos,
     a palavra "Vargottama" ou "estrutural" aparece na secção
     "Quem é"? Se não aparecer: FALHA — reescrita obrigatória.

 17. ABERTURA DAS CANDIDATAS: cada candidata fora da lista abre com
     ligação explícita a dom de "Quem é" antes de qualquer camada
     técnica? Se abre directamente com Atmakaraka, eixo do
     rendimento ou camadas técnicas sem a frase de ligação: FALHA
     — reescrita obrigatória.

 18. NOMEAÇÃO TÉCNICA — AVASTHAS: qualquer menção a maturidade
     planetária sem incluir "avastha" e o nome técnico do estado
     (Bala/Yuva/Vriddha/Mrita) juntos, num ÚNICO parêntese (nunca
     "avastha" e o nome técnico em dois parênteses seguidos, ex.:
     "(avastha) de declínio (Vriddha)" — proibido, soa a jargão
     dentro de jargão; correcto: "de declínio (avastha Vriddha)"):
     FALHA — reescrita obrigatória.

 19. NOMEAÇÃO TÉCNICA — CONJUNÇÕES: qualquer menção a fusão de
     traços sem incluir os dois planetas entre parênteses: FALHA
     — reescrita obrigatória.

 20. PALAVRA PROIBIDA — "CARTA": o texto usa a palavra "carta" (ou
     "mapa astral"/"mapa natal") em vez de "perfil"? Lista cada
     ocorrência exacta. Se aparecer mesmo uma vez: FALHA —
     reescrita obrigatória.

 21. NÍVEL DE CONFIANÇA DA CANDIDATA: para cada candidata fora da lista
     marcada como "Nível 2" nos dados técnicos, o texto usa linguagem de
     confiança reduzida (ex.: "vale explorar", "sinal genuíno mas não é
     o mais forte do perfil"), distinta da linguagem sem reserva usada
     nas candidatas "Nível 1"? Se uma candidata Nível 2 é escrita com a
     mesma certeza que uma Nível 1 (ex.: "o seu perfil sustenta X com
     clareza" sem qualquer qualificador): FALHA — reescrita obrigatória.

 22. APRESENTAÇÃO DAS CANDIDATAS (SEM TECTO DE 3, COM AGRUPAMENTO POR
     CLUSTER — correcção do especialista): a secção A) traz a pool
     completa de candidatas (pode ter muito mais de 3) e, quando aplicável,
     "Grupos de candidatas" (listas de nomes com convergência de base quase
     idêntica, já calculadas deterministicamente — nunca inventadas pelo
     LLM). Confirma:
     (a) existe o bloco "SELECÇÃO_CANDIDATAS:" antes de qualquer secção
         GRUPO/CANDIDATA (obrigatório sempre que a pool tem pelo menos 1
         candidata);
     (b) cada candidata APRESENTADA (individual ou dentro de um grupo) tem
         uma ligação nomeável e verificável a um dom já nomeado em "Quem
         é" — para uma individual, citada na sua própria frase de
         abertura; para uma candidata dentro de um grupo, a ligação pode
         estar só no bloco "GRUPO:" partilhado (nunca precisa de repetir
         a frase de abertura por candidata dentro do grupo);
     (c) NENHUMA candidata que passa (b) foi omitida do texto — compara a
         lista de nomes da pool completa (secção A) contra os nomes que
         de facto aparecem em blocos CANDIDATA no texto; toda candidata
         com ligação nomeável válida tem de estar presente, sem excepção.
         Se falta alguma (mesmo citada como "não escolhida" no raciocínio
         "SELECÇÃO_CANDIDATAS:" sem razão de falha de ligação): FALHA —
         "não escolhida por já haver 3" ou "para não alongar a secção" já
         não são razões válidas, o tecto de 3 foi removido;
     (d) AGRUPAMENTO: quando 2 ou mais candidatas apresentadas pertencem
         ao mesmo grupo em "Grupos de candidatas", elas aparecem sob um
         único bloco "GRUPO:" com a convergência de base escrita UMA SÓ
         VEZ — se em vez disso cada uma repete a mesma explicação
         astrológica de base (mesmas camadas, mesmo raciocínio) em blocos
         CANDIDATA individuais separados, isto é FALHA (repetição que o
         agrupamento existe precisamente para evitar). Ao contrário, um
         "GRUPO:" cujos membros NÃO correspondem a nenhum grupo real da
         secção "Grupos de candidatas" é FALHA (agrupamento inventado);
     (e) o raciocínio em "SELECÇÃO_CANDIDATAS:" explica com sentido por
         que as candidatas ausentes ficaram de fora (só motivo válido:
         reprovaram o Passo 1 — sem ligação nomeável a um dom já nomeado).
     Se falhar (a), (b), (c) ou (d): FALHA — força REAPRESENTAÇÃO DA POOL
     COMPLETA (refazer o filtro de ligação e o agrupamento — nunca só
     reescrever a frase de abertura da candidata actual). Se (e) parecer
     arbitrário, ausente, ou justificar uma omissão por "já há candidatas
     suficientes": FALHA — reescrita do bloco de raciocínio.

 23. ANGLICISMOS: o texto usa palavras inglesas coladas ao português em
     vez da tradução natural — "also" (em vez de "também"), "however"
     (em vez de "no entanto"/"contudo"), "actually" (em vez de "de
     facto"/"na verdade"), "basically" (em vez de "no fundo"),
     "furthermore"/"moreover" (em vez de "além disso"), ou qualquer outra
     palavra inglesa comum solta no meio de uma frase portuguesa? Lista
     cada ocorrência exacta. Se aparecer mesmo uma vez: FALHA — reescrita
     obrigatória.

 24. EXPLICAÇÃO DOS GRÁFICOS — NUNCA ESCRITA PELO LLM (correcção do
     especialista, bug real encontrado ao verificar o relatório da
     Alexandra: este critério pedia 4 blocos "EXPLICAÇÃO_GRÁFICO:" que
     uma correcção ANTERIOR já tinha decidido deixarem de ser
     responsabilidade do LLM — ver DESVIO junto de INSTRUCAO_VARGOTTAMA
     em promptAdulto.ts: depois de 5 gerações reais seguidas sem NENHUMA
     ocorrência desses blocos, a explicação dos 4 gráficos passou a ser
     gerada 100% por código em relatorioTemplate.ts, a partir dos MESMOS
     dados técnicos — nunca mais pedida ao LLM. Este critério continuava
     a marcar FALHA sempre, forçando reescritas inúteis a tentar
     adicionar um conteúdo que o próprio sistema já não quer que o LLM
     escreva.
     O rascunho NÃO deve conter nenhum bloco "EXPLICAÇÃO_GRÁFICO:" nem
     "LINHA_GRÁFICO:" — se não existir nenhum: PASSA (comportamento
     correcto, o código trata disto à parte). Se existir algum: FALHA —
     o LLM está a inventar uma secção que já não lhe compete, reescrita
     obrigatória para a remover por completo.

 25. NÚMEROS DE CÁLCULO INTERNO EM TEXTO VISÍVEL (correcção do
     especialista, pós-PDF real): fora do bloco "SELECÇÃO_CANDIDATAS:"
     (que nunca chega ao cliente), o texto visível cita algum destes em
     bruto — "soma de pesos", "convergência [N] camadas", "Nível 1"/
     "Nível 2", ou um peso numérico exacto de planeta (ex.: "peso
     1,76")? Lista cada ocorrência exacta e a secção onde aparece. Se
     aparecer mesmo uma vez fora do bloco de raciocínio: FALHA —
     reescrever traduzindo para a linguagem de confiança (ver critério
     de ESCALA DE CONFIANÇA), nunca reproduzir o número em bruto.

 26. CANDIDATA/GRUPO EM MARKDOWN EM VEZ DO MARCADOR LITERAL (correcção
     do especialista — diagnóstico directo de texto em bruto real):
     TODA candidata na secção "Candidata fora da lista" usa o marcador
     literal "CANDIDATA: <nome>" — nunca "**<nome>** — ..." nem
     qualquer outra formatação markdown/bold a substituir o marcador?
     TODO grupo usa "GRUPO: <nome1>; <nome2>; ..." — nunca "**Grupo N**
     — ..." nem título bold sem a lista de nomes? Encontraste alguma
     candidata ou grupo escrito em bold-header markdown em vez do
     marcador literal exigido: FALHA — cita o nome exacto e a linha
     onde ocorre. (A explicação dos 4 gráficos numéricos já não depende
     do LLM — é gerada por código — por isso não faz parte deste
     critério.)
     Se falhar: FALHA — força reescrita da secção afectada inteira,
     usando sempre os marcadores literais exactos (nunca markdown bold
     como substituto, por mais parecido que o formato final pareça ao
     humano).

 27. DOM ANTES DO PERCURSO, VIA_RESUMIDA E CUSTO_PRINCIPAL PRESENTES
     (correcção do especialista — "dom/talento em vez de percurso", pós-
     PDF real: as descrições estavam centradas em duração de curso e
     trajecto, sem nunca dizer o porquê do talento):
     (a) Cada candidata (individual ou bloco GRUPO partilhado) abre
         mesmo com uma frase de dom baseada no "FACTOR DE DOM" dado nos
         dados técnicos — nunca com quanto tempo demora a formação, nem
         com "esta via exige..."? Encontraste alguma candidata a abrir
         directamente pelo percurso/duração, sem a frase de dom antes:
         FALHA — cita o nome exacto.
     (b) O percurso/via de entrada, quando mencionado, fica reduzido a
         no máximo 1 linha? Encontraste um parágrafo inteiro sobre
         duração de curso, trajecto académico ou entrada no mercado:
         FALHA — cita o nome exacto.
     (c) TODA candidata apresentada tem, dentro do seu próprio texto, as
         linhas "VIA_RESUMIDA:" e "CUSTO_PRINCIPAL:" (marcador literal,
         3-8 palavras cada, específicas desta candidata)? Falta alguma
         das duas em alguma candidata: FALHA — cita o nome exacto e qual
         das duas falta.
     Se falhar (a), (b) ou (c): FALHA — força reescrita das candidatas
     afectadas, nunca do relatório inteiro.

 28. RESPOSTA DIRECTA À PERGUNTA ESPECÍFICA (correcção do especialista —
     bug crítico diagnosticado no relatório real da Alexandra: perguntou
     "seria gestão ou economia?", o rascunho respondeu "economia" só
     implicitamente algures no texto mas depois sugeriu "Direito" como
     candidata fora da lista sem nunca reconhecer a contradição): se os
     dados técnicos têm uma pergunta específica declarada,
     (a) a secção "Leitura por opção" abre, antes de qualquer outra
         análise, com o formato exacto "A pergunta [...] tem resposta
         directa: [...]. Aqui está porquê: [...]"?
     (b) essa mesma resposta (não uma diferente) já apareceu no primeiro
         parágrafo da secção "Abertura"?
     (c) nenhuma candidata em "Candidata fora da lista" contradiz essa
         resposta sem o reconhecer explicitamente (ou, na ausência de
         explicação defensável, sem ter sido omitida)?
     (d) (correcção do especialista, ronda "relatório Alexandra 2" —
         a mesma pergunta, em formato sim/não, produziu em geração real
         "...tem resposta directa: não — direito tem mais sustentação
         estrutural...", um veredicto fechado disfarçado de resposta
         directa, exactamente o que "zero fatalismo" proíbe) a resposta
         directa NÃO é um "sim"/"não" isolado nem uma variante que julga
         se a pessoa acertou ou errou na própria pergunta (proibido:
         "não é a opção mais sustentada", "não — [outra opção] tem mais
         sustentação")? Cita a frase exacta se encontrares um "sim"/"não"
         nessa posição.
     Se falhar (a), (b) ou (d): FALHA — reescrita obrigatória da abertura
     da secção afectada. Se falhar (c): cita o nome exacto da candidata
     que contradiz sem explicação — FALHA, reescrita dessa candidata.

 29. ABERTURA RESPONDE À SITUAÇÃO DA PESSOA (correcção do especialista):
     o primeiro parágrafo da secção "Abertura" responde directamente à
     situação da pessoa (resposta à pergunta específica, ou uma âncora
     com 2-3 pontos fortes do perfil quando não há pergunta) — ou começa
     por dados técnicos, gráficos, ou análise abstracta antes disso? Se
     começa por dados técnicos/análise abstracta: FALHA — reescrita
     obrigatória do primeiro parágrafo.

 30. VALIDAÇÃO EXPLÍCITA DAS OPÇÕES DECLARADAS (correcção do
     especialista): cada opção declarada, na secção "Leitura por opção",
     termina com uma das três conclusões exactas (sustenta com clareza /
     sustenta parcialmente, com o que está a favor e o que exige mais
     esforço / não sustenta de forma natural, com a razão)? Lista
     qualquer opção que fique sem nenhuma das três, ou cuja conclusão
     seja substituída por prosa vaga sobre prós/contras sem fechar numa
     delas. Se faltar em alguma opção: FALHA — reescrita dessa opção.

 31. PLANO EM PERÍODOS RELATIVOS (correcção do especialista): "O plano"
     usa sempre períodos relativos ao momento da leitura ("nas próximas
     2 semanas"/"no próximo mês"/"nos próximos 3 meses"/"nos próximos 6
     a 12 meses"), nunca datas fixas nem meses do calendário (excepto a
     data real de fim da Mahadasha/Antardasha actual, que se mantém)? E
     tem pelo menos 3 acções concretas e específicas (rastreáveis a esta
     pessoa e a esta opção — nunca "explorar opções na área X" ou
     equivalente genérico)? Lista cada data fixa/mês de calendário
     inventado e cada acção genérica encontrada. Se falhar qualquer uma
     das duas condições: FALHA — reescrita obrigatória da secção.

 32. PARÁGRAFO ANTI "ISTO DÁ PARA TUDO" (correcção do especialista —
     ORDEM, "novo parágrafo de abertura em 'Opções que ainda não
     considerou'"): o prompt técnico (A, abaixo) dá o parágrafo EXACTO a
     inserir logo a seguir à frase de abertura da secção "Candidata fora
     da lista" (procura "insere este parágrafo — EXACTO" em A). Quando o
     prompt técnico dá esse parágrafo (ou seja, quando existem pelo
     menos 2 candidatas na pool):
     (a) o rascunho contém esse parágrafo, palavra por palavra, sem
         paráfrase nem resumo?
     (b) as duas opções citadas no parágrafo ("a mesma raiz que sustenta
         X sustenta também Y") são exactamente as duas dadas no prompt
         técnico — nunca duas outras, nunca inventadas pelo LLM?
     (c) o parágrafo aparece ANTES de qualquer candidata/grupo, logo a
         seguir à frase de abertura da secção?
     Se o prompt técnico NÃO dá nenhum parágrafo (menos de 2 candidatas
     na pool), este critério não se aplica — PASSA automaticamente.
     Se falhar (a), (b) ou (c): FALHA — reescrita obrigatória da
     abertura desta secção, reproduzindo o parágrafo exactamente como
     dado no prompt técnico.

 33. PROFUNDIDADE DA LEITURA POR OPÇÃO (correcção do especialista, ronda
     "relatório Marta", ponto 2 — problema mais grave encontrado nessa
     ronda: cada opção declarada saiu como uma única frase com um
     badge, nada mais). Para CADA bloco "### <nome>" na secção "Leitura
     por opção": confirma que os 6 pontos numerados (1 a 6) exigidos no
     prompt técnico (A, abaixo — "PROFUNDIDADE OBRIGATÓRIA") estão
     TODOS presentes. Dos pontos 1 a 5, cada um tem de ser o seu próprio
     parágrafo com pelo menos 3 frases — nunca um resumo de 1-2 frases a
     seguir ao cabeçalho, nunca um ponto ausente, nunca um ponto
     reduzido a uma única frase-conclusão.
     EXCEPÇÃO EXPLÍCITA — PONTO 6 (correcção do especialista, ronda
     "Miguel — engenharia", nunca repetir isto: a crítica aplicou este
     mínimo de 3 frases também ao ponto 6 e marcou FALHA sobre um ponto
     que estava correcto por desenho, enquanto um ponto genuinamente
     curto — o ponto 3, na mesma ronda — passou sem ser apanhado): o
     ponto 6 é sempre a frase-molde fixa e curta descrita em
     INSTRUCAO_VALIDACAO_OPCOES (critério 30) — "sustenta com clareza" /
     "sustenta parcialmente" / "não sustenta de forma natural", seguida
     de "Aqui está porquê" — NUNCA um parágrafo de 3+ frases. O mínimo de
     3 frases desta secção aplica-se só aos pontos 1 a 5; o ponto 6
     nunca é avaliado por tamanho aqui, só pela validação do critério 30.
     Lista, para cada opção, quantos dos 6 pontos encontraste (todos têm
     de estar presentes) e, só dos pontos 1 a 5, quantas frases tinha o
     mais curto.
     Se QUALQUER opção declarada tiver menos de 6 pontos numerados, ou
     algum dos pontos 1 a 5 tiver menos de 3 frases: FALHA — reescrita
     obrigatória dessa opção (e de qualquer outra na mesma condição),
     expandindo cada ponto em falta ou raso para o mesmo nível de
     desenvolvimento já exigido no prompt técnico — nunca aceitar a
     versão resumida só porque tecnicamente cobre o tema.

 O teu raciocínio acima pode ser livre (texto corrido, bullets, o que te ajudar a verificar bem cada critério) — mas a resposta TEM de terminar com um bloco final, delimitado exactamente por estas duas linhas literais, sem nenhuma variação (correcção do especialista, bug real: um resumo em prosa livre — negrito inconsistente entre PASSA e FALHA, números sub-divididos como "28(d)", verdictos escritos numa linha diferente do número — impedia o sistema de saber com fiabilidade quais critérios tinham mesmo falhado, escondendo o motivo real da reescrita seguinte. Este bloco é a ÚNICA parte que o sistema lê automaticamente — todo o resto serve só para apoiar o teu raciocínio):

 ===RESULTADO_MAQUINA_INICIO===
 1) PASSA
 2) FALHA: <resumo do problema, uma frase única, sem quebras de linha>
 3) PASSA
 ... (uma linha por CADA número de 1 até 33, por esta ordem exacta, sem excepção, sem saltar nenhum)
 33) PASSA
 ===RESULTADO_MAQUINA_FIM===

 Regras deste bloco, sem excepção:
 - Um número por linha, de 1 até 33 — nunca omitir um número, nunca juntar dois números na mesma linha, nunca sub-dividir um número em letras (nunca "28a)"/"28(d)" — se um critério tem sub-condições, o veredicto aqui é FALHA se qualquer sub-condição falhar, só PASSA se todas passarem).
 - Sem markdown dentro do bloco — sem **negrito**, sem itálico, texto simples, um ")" a separar o número do veredicto (nunca ".").
 - O veredicto aqui é sempre a tua conclusão FINAL e definitiva — se mudaste de opinião durante a análise acima, é a versão corrigida que entra aqui, nunca a primeira impressão.
 - Este bloco é a ÚNICA fonte que o sistema usa para decidir se o rascunho precisa de reescrita — um critério que discutiste acima mas sem linha correspondente dentro deste bloco é tratado como não avaliado, e reescrito por segurança mesmo que a tua análise o tenha dado como PASSA.`;

/**
 * PROMPT CACHING (correcção do especialista, pedido do Rui — visibilidade
 * e custo real por geração, ronda "regeneração Alexandra 10") — o bloco
 * de instruções da crítica + o prompt técnico completo (`promptTecnico`,
 * ~30 mil tokens neste relatório) é IDÊNTICO entre a crítica original e
 * todas as críticas pós-reescrita do MESMO ciclo de "Regenerar" (mesma
 * pessoa, mesmo prompt técnico — só o rascunho avaliado muda a cada
 * chamada) — candidato directo a `cache_control` da Anthropic (ver
 * gerarTexto em route.ts). Por isso a função devolve os dois blocos
 * separados: `cacheavel` (estático dentro do ciclo) e `resto` (o
 * rascunho, sempre variável, nunca cacheável).
 *
 * `construirPromptCritica`/`construirPromptCriticaAdolescente` continuam
 * a devolver a MESMA string única de sempre (usada para guardar e
 * mostrar o prompt completo no admin, e em qualquer sítio que só precise
 * do texto) — compostas a partir destes blocos, nunca duplicando o
 * texto do template, para as duas formas nunca poderem divergir.
 */
export interface BlocosPromptCritica {
  /** Instruções da crítica + prompt técnico completo — estático dentro do mesmo ciclo de regeneração, candidato a cache_control. */
  cacheavel: string;
  /** O rascunho concreto a avaliar — muda a cada chamada, nunca cacheável. */
  resto: string;
}

export function construirBlocosPromptCritica(promptTecnico: string, rascunho: string): BlocosPromptCritica {
  return {
    cacheavel: `${INSTRUCAO_CRITICA}\n\n=== A) PROMPT TÉCNICO ENVIADO ===\n${promptTecnico}`,
    resto: `\n\n=== B) RASCUNHO GERADO ===\n${rascunho}`,
  };
}

export function construirPromptCritica(promptTecnico: string, rascunho: string): string {
  const { cacheavel, resto } = construirBlocosPromptCritica(promptTecnico, rascunho);
  return `${cacheavel}${resto}`;
}

// TAREFA 1 / FALTA 1 (correcção do especialista, ronda de produção do
// motor adolescente) — 2 dos 12 critérios são especificamente adultos:
// o critério 1 (TOM) verifica "tu/teu/tua/tens" porque o relatório adulto
// usa "você" — mas o adolescente usa "tu" (ver promptAdolescente.ts), por
// isso o mesmo critério aplicado sem alterar reprovaria SEMPRE um
// relatório adolescente correcto. O critério 4 (ÁREA ACTUAL) não existe
// no ramo adolescente (não há área de trabalho actual) — substituído por
// "OPÇÃO EM CIMA DA MESA". Os restantes 10 critérios são genéricos e
// aplicam-se sem alteração a ambos os ramos.
const INSTRUCAO_CRITICA_ADOLESCENTE = `Tens à tua frente:
 A) O prompt técnico completo
 B) O rascunho gerado

 Verifica contra estes critérios:

 1. TOM: há 'você', 'seu', 'sua' no texto? (o relatório adolescente usa
    SEMPRE 'tu' — 'você' é um erro aqui, ao contrário do relatório
    adulto.) Lista cada ocorrência.

 2. REPETIÇÃO: a mesma conclusão aparece em mais de uma secção?
    Lista cada repetição.

 3. PLANETAS FRACOS: todos os planetas com peso < 0,9 são
    nomeados? Lista os que faltam.

 4. OPÇÃO EM CIMA DA MESA: cada opção em cima da mesa é usada como
    ponto de partida real (com o curso concreto listado) ou ignorada?

 5. OPÇÃO EM CIMA DA MESA vs PERFIL: cada opção é testada contra o
    perfil ou só confirmada sem crítica?

 6. TENSÕES: tensões entre sinais contraditórios são nomeadas?
    Lista as que faltam.

 7. CANDIDATA FORA DA LISTA: foi testada contra catálogo
    ou só os 3 eixos abstractos?

 8. HORIZONTE TEMPORAL: há afirmações directas para
    períodos > 18 meses?

 9. PRIMEIRA PESSOA DO PLURAL: há 'identificámos', 'vimos',
    'calculámos'?

 10. MAHADASHA: o tom do ciclo maior abre a secção do plano?

 11. RODA DA VIDA: as dimensões com valor ≤ 4 ou ≥ 7 são
     referenciadas no texto?

 12. KARAKAMSHA: foi lido sempre com o Atmakaraka (nunca
     isolado)?

 13. AVASTHAS: INSTRUCAO_AVASTHAS tem 3 condições — verifica CADA UMA
     contra os dados técnicos (peso e avastha de cada planeta):
     (a) um planeta citado nas camadas de "Derivadas da área actual" está
         em Mrita?
     (b) um planeta com peso ≥1,3 está em Mrita?
     (c) um planeta com peso <0,9 está em Yuva?
     Para CADA condição que se aplica (pode ser mais do que uma ao mesmo
     tempo, ou nenhuma), confirma que foi explicada na secção "Quem é"
     com a frase-padrão correspondente. Se alguma condição aplicável não
     foi mencionada: FALHA — reescrita obrigatória, diz exactamente qual
     das 3 condições ((a), (b) ou (c)) foi ignorada.

 14. CONJUNÇÕES: cada conjunção activa foi usada numa frase concreta
     em "Quem é"? Se alguma foi ignorada: FALHA.

 15. YOGAS POR CANDIDATA: para cada yoga activo, existe uma frase na
     leitura de alguma candidata ou opção que o cita com o padrão
     "Existe também..."? Se existe yoga activo e nenhuma candidata
     o cita: FALHA — reescrita obrigatória.

 16. VARGOTTAMA: se existe planeta Vargottama nos dados técnicos,
     a palavra "Vargottama" ou "estrutural" aparece na secção
     "Quem é"? Se não aparecer: FALHA — reescrita obrigatória.

 17. ABERTURA DAS CANDIDATAS: cada candidata fora da lista abre com
     ligação explícita a dom de "Quem é" antes de qualquer camada
     técnica? Se abre directamente com Atmakaraka, eixo do
     rendimento ou camadas técnicas sem a frase de ligação: FALHA
     — reescrita obrigatória.

 18. NOMEAÇÃO TÉCNICA — AVASTHAS: qualquer menção a maturidade
     planetária sem incluir "avastha" e o nome técnico do estado
     (Bala/Yuva/Vriddha/Mrita) juntos, num ÚNICO parêntese (nunca
     "avastha" e o nome técnico em dois parênteses seguidos, ex.:
     "(avastha) de declínio (Vriddha)" — proibido, soa a jargão
     dentro de jargão; correcto: "de declínio (avastha Vriddha)"):
     FALHA — reescrita obrigatória.

 19. NOMEAÇÃO TÉCNICA — CONJUNÇÕES: qualquer menção a fusão de
     traços sem incluir os dois planetas entre parênteses: FALHA
     — reescrita obrigatória.

 20. PALAVRA PROIBIDA — "CARTA": o texto usa a palavra "carta" (ou
     "mapa astral"/"mapa natal") em vez de "perfil"? Lista cada
     ocorrência exacta. Se aparecer mesmo uma vez: FALHA —
     reescrita obrigatória.

 21. NÍVEL DE CONFIANÇA DA CANDIDATA: para cada candidata fora da lista
     marcada como "Nível 2" nos dados técnicos, o texto usa linguagem de
     confiança reduzida (ex.: "vale explorar", "sinal genuíno mas não é
     o mais forte do perfil"), distinta da linguagem sem reserva usada
     nas candidatas "Nível 1"? Se uma candidata Nível 2 é escrita com a
     mesma certeza que uma Nível 1 (ex.: "o seu perfil sustenta X com
     clareza" sem qualquer qualificador): FALHA — reescrita obrigatória.

 22. APRESENTAÇÃO DAS CANDIDATAS (SEM TECTO DE 3, COM AGRUPAMENTO POR
     CLUSTER — correcção do especialista): a secção A) traz a pool
     completa de candidatas (pode ter muito mais de 3) e, quando aplicável,
     "Grupos de candidatas" (listas de nomes com convergência de base quase
     idêntica, já calculadas deterministicamente — nunca inventadas pelo
     LLM). Confirma:
     (a) existe o bloco "SELECÇÃO_CANDIDATAS:" antes de qualquer secção
         GRUPO/CANDIDATA (obrigatório sempre que a pool tem pelo menos 1
         candidata);
     (b) cada candidata APRESENTADA (individual ou dentro de um grupo) tem
         uma ligação nomeável e verificável a um dom já nomeado em "Quem
         é" — para uma individual, citada na sua própria frase de
         abertura; para uma candidata dentro de um grupo, a ligação pode
         estar só no bloco "GRUPO:" partilhado (nunca precisa de repetir
         a frase de abertura por candidata dentro do grupo);
     (c) NENHUMA candidata que passa (b) foi omitida do texto — compara a
         lista de nomes da pool completa (secção A) contra os nomes que
         de facto aparecem em blocos CANDIDATA no texto; toda candidata
         com ligação nomeável válida tem de estar presente, sem excepção.
         Se falta alguma (mesmo citada como "não escolhida" no raciocínio
         "SELECÇÃO_CANDIDATAS:" sem razão de falha de ligação): FALHA —
         "não escolhida por já haver 3" ou "para não alongar a secção" já
         não são razões válidas, o tecto de 3 foi removido;
     (d) AGRUPAMENTO: quando 2 ou mais candidatas apresentadas pertencem
         ao mesmo grupo em "Grupos de candidatas", elas aparecem sob um
         único bloco "GRUPO:" com a convergência de base escrita UMA SÓ
         VEZ — se em vez disso cada uma repete a mesma explicação
         astrológica de base (mesmas camadas, mesmo raciocínio) em blocos
         CANDIDATA individuais separados, isto é FALHA (repetição que o
         agrupamento existe precisamente para evitar). Ao contrário, um
         "GRUPO:" cujos membros NÃO correspondem a nenhum grupo real da
         secção "Grupos de candidatas" é FALHA (agrupamento inventado);
     (e) o raciocínio em "SELECÇÃO_CANDIDATAS:" explica com sentido por
         que as candidatas ausentes ficaram de fora (só motivo válido:
         reprovaram o Passo 1 — sem ligação nomeável a um dom já nomeado).
     Se falhar (a), (b), (c) ou (d): FALHA — força REAPRESENTAÇÃO DA POOL
     COMPLETA (refazer o filtro de ligação e o agrupamento — nunca só
     reescrever a frase de abertura da candidata actual). Se (e) parecer
     arbitrário, ausente, ou justificar uma omissão por "já há candidatas
     suficientes": FALHA — reescrita do bloco de raciocínio.

 23. ANGLICISMOS: o texto usa palavras inglesas coladas ao português em
     vez da tradução natural — "also" (em vez de "também"), "however"
     (em vez de "no entanto"/"contudo"), "actually" (em vez de "de
     facto"/"na verdade"), "basically" (em vez de "no fundo"),
     "furthermore"/"moreover" (em vez de "além disso"), ou qualquer outra
     palavra inglesa comum solta no meio de uma frase portuguesa? Lista
     cada ocorrência exacta. Se aparecer mesmo uma vez: FALHA — reescrita
     obrigatória.

 24. EXPLICAÇÃO DOS GRÁFICOS — NUNCA ESCRITA PELO LLM (correcção do
     especialista, bug real encontrado ao verificar o relatório da
     Alexandra: este critério pedia 4 blocos "EXPLICAÇÃO_GRÁFICO:" que
     uma correcção ANTERIOR já tinha decidido deixarem de ser
     responsabilidade do LLM — ver DESVIO junto de INSTRUCAO_VARGOTTAMA
     em promptAdulto.ts: depois de 5 gerações reais seguidas sem NENHUMA
     ocorrência desses blocos, a explicação dos 4 gráficos passou a ser
     gerada 100% por código em relatorioTemplate.ts, a partir dos MESMOS
     dados técnicos — nunca mais pedida ao LLM. Este critério continuava
     a marcar FALHA sempre, forçando reescritas inúteis a tentar
     adicionar um conteúdo que o próprio sistema já não quer que o LLM
     escreva.
     O rascunho NÃO deve conter nenhum bloco "EXPLICAÇÃO_GRÁFICO:" nem
     "LINHA_GRÁFICO:" — se não existir nenhum: PASSA (comportamento
     correcto, o código trata disto à parte). Se existir algum: FALHA —
     o LLM está a inventar uma secção que já não lhe compete, reescrita
     obrigatória para a remover por completo.

 25. NÚMEROS DE CÁLCULO INTERNO EM TEXTO VISÍVEL (correcção do
     especialista, pós-PDF real): fora do bloco "SELECÇÃO_CANDIDATAS:"
     (que nunca chega ao cliente), o texto visível cita algum destes em
     bruto — "soma de pesos", "convergência [N] camadas", "Nível 1"/
     "Nível 2", ou um peso numérico exacto de planeta (ex.: "peso
     1,76")? Lista cada ocorrência exacta e a secção onde aparece. Se
     aparecer mesmo uma vez fora do bloco de raciocínio: FALHA —
     reescrever traduzindo para a linguagem de confiança (ver critério
     de ESCALA DE CONFIANÇA), nunca reproduzir o número em bruto.

 26. CANDIDATA/GRUPO EM MARKDOWN EM VEZ DO MARCADOR LITERAL (correcção
     do especialista — diagnóstico directo de texto em bruto real):
     TODA candidata na secção "Candidata fora da lista" usa o marcador
     literal "CANDIDATA: <nome>" — nunca "**<nome>** — ..." nem
     qualquer outra formatação markdown/bold a substituir o marcador?
     TODO grupo usa "GRUPO: <nome1>; <nome2>; ..." — nunca "**Grupo N**
     — ..." nem título bold sem a lista de nomes? Encontraste alguma
     candidata ou grupo escrito em bold-header markdown em vez do
     marcador literal exigido: FALHA — cita o nome exacto e a linha
     onde ocorre. (A explicação dos 4 gráficos numéricos já não depende
     do LLM — é gerada por código — por isso não faz parte deste
     critério.)
     Se falhar: FALHA — força reescrita da secção afectada inteira,
     usando sempre os marcadores literais exactos (nunca markdown bold
     como substituto, por mais parecido que o formato final pareça ao
     humano).

 27. DOM ANTES DO PERCURSO, VIA_RESUMIDA E CUSTO_PRINCIPAL PRESENTES
     (correcção do especialista — "dom/talento em vez de percurso", pós-
     PDF real: as descrições estavam centradas em duração de curso e
     trajecto, sem nunca dizer o porquê do talento):
     (a) Cada candidata (individual ou bloco GRUPO partilhado) abre
         mesmo com uma frase de dom baseada no "FACTOR DE DOM" dado nos
         dados técnicos — nunca com quanto tempo demora a formação, nem
         com "esta via exige..."? Encontraste alguma candidata a abrir
         directamente pelo percurso/duração, sem a frase de dom antes:
         FALHA — cita o nome exacto.
     (b) O percurso/via de entrada, quando mencionado, fica reduzido a
         no máximo 1 linha? Encontraste um parágrafo inteiro sobre
         duração de curso, trajecto académico ou entrada no mercado:
         FALHA — cita o nome exacto.
     (c) TODA candidata apresentada tem, dentro do seu próprio texto, as
         linhas "VIA_RESUMIDA:" e "CUSTO_PRINCIPAL:" (marcador literal,
         3-8 palavras cada, específicas desta candidata)? Falta alguma
         das duas em alguma candidata: FALHA — cita o nome exacto e qual
         das duas falta.
     Se falhar (a), (b) ou (c): FALHA — força reescrita das candidatas
     afectadas, nunca do relatório inteiro.

 28. RESPOSTA DIRECTA À PERGUNTA ESPECÍFICA (correcção do especialista —
     bug crítico diagnosticado no relatório real da Alexandra: perguntou
     "seria gestão ou economia?", o rascunho respondeu "economia" só
     implicitamente algures no texto mas depois sugeriu "Direito" como
     candidata fora da lista sem nunca reconhecer a contradição): se os
     dados técnicos têm uma pergunta específica (implícita, via "qual
     opção te parece mais provável hoje?"),
     (a) a secção "Leitura por opção" abre, antes de qualquer outra
         análise, com o formato exacto "A pergunta [...] tem resposta
         directa: [...]. Aqui está porquê: [...]"?
     (b) essa mesma resposta (não uma diferente) já apareceu no primeiro
         parágrafo da secção "Abertura"?
     (c) nenhuma candidata em "Candidata fora da lista" contradiz essa
         resposta sem o reconhecer explicitamente (ou, na ausência de
         explicação defensável, sem ter sido omitida)?
     (d) (correcção do especialista, ronda "relatório Alexandra 2" —
         a mesma pergunta, em formato sim/não, produziu em geração real
         "...tem resposta directa: não — direito tem mais sustentação
         estrutural...", um veredicto fechado disfarçado de resposta
         directa, exactamente o que "zero fatalismo" proíbe) a resposta
         directa NÃO é um "sim"/"não" isolado nem uma variante que julga
         se a pessoa acertou ou errou na própria pergunta (proibido:
         "não é a opção mais sustentada", "não — [outra opção] tem mais
         sustentação")? Cita a frase exacta se encontrares um "sim"/"não"
         nessa posição.
     Se falhar (a), (b) ou (d): FALHA — reescrita obrigatória da abertura
     da secção afectada. Se falhar (c): cita o nome exacto da candidata
     que contradiz sem explicação — FALHA, reescrita dessa candidata.

 29. ABERTURA RESPONDE À SITUAÇÃO DA PESSOA (correcção do especialista):
     o primeiro parágrafo da secção "Abertura" responde directamente à
     situação da pessoa (resposta à pergunta implícita, ou uma âncora
     com 2-3 pontos fortes do perfil quando não há nenhuma opção
     declarada como "mais provável") — ou começa por dados técnicos,
     gráficos, ou análise abstracta antes disso? Se começa por dados
     técnicos/análise abstracta: FALHA — reescrita obrigatória do
     primeiro parágrafo.

 30. VALIDAÇÃO EXPLÍCITA DAS OPÇÕES EM CIMA DA MESA (correcção do
     especialista): cada opção em cima da mesa, na secção "Leitura por
     opção", termina com uma das três conclusões exactas (sustenta com
     clareza / sustenta parcialmente, com o que está a favor e o que
     exige mais esforço / não sustenta de forma natural, com a razão)?
     Lista qualquer opção que fique sem nenhuma das três, ou cuja
     conclusão seja substituída por prosa vaga sobre prós/contras sem
     fechar numa delas. Se faltar em alguma opção: FALHA — reescrita
     dessa opção.

 31. PLANO EM PERÍODOS RELATIVOS (correcção do especialista): "O plano"
     usa sempre períodos relativos ao momento da leitura ("nas próximas
     2 semanas"/"no próximo mês"/"nos próximos 3 meses"/"nos próximos 6
     a 12 meses"), nunca datas fixas nem meses do calendário (excepto a
     data real de fim da Mahadasha/Antardasha actual, que se mantém)? E
     tem pelo menos 3 acções concretas e específicas (rastreáveis a esta
     pessoa e a esta decisão escolar — nunca "explorar carreiras" ou
     equivalente genérico)? Lista cada data fixa/mês de calendário
     inventado e cada acção genérica encontrada. Se falhar qualquer uma
     das duas condições: FALHA — reescrita obrigatória da secção.

 32. PARÁGRAFO ANTI "ISTO DÁ PARA TUDO" (correcção do especialista —
     ORDEM, "novo parágrafo de abertura em 'Opções que ainda não
     considerou'"): o prompt técnico (A, abaixo) dá o parágrafo EXACTO a
     inserir logo a seguir à frase de abertura da secção "Candidata fora
     da lista" (procura "insere este parágrafo — EXACTO" em A). Quando o
     prompt técnico dá esse parágrafo (ou seja, quando existem pelo
     menos 2 candidatas na pool):
     (a) o rascunho contém esse parágrafo, palavra por palavra, sem
         paráfrase nem resumo?
     (b) as duas opções citadas no parágrafo ("a mesma raiz que sustenta
         X sustenta também Y") são exactamente as duas dadas no prompt
         técnico — nunca duas outras, nunca inventadas pelo LLM?
     (c) o parágrafo aparece ANTES de qualquer candidata/grupo, logo a
         seguir à frase de abertura da secção?
     Se o prompt técnico NÃO dá nenhum parágrafo (menos de 2 candidatas
     na pool), este critério não se aplica — PASSA automaticamente.
     Se falhar (a), (b) ou (c): FALHA — reescrita obrigatória da
     abertura desta secção, reproduzindo o parágrafo exactamente como
     dado no prompt técnico.

 33. PROFUNDIDADE DA LEITURA POR OPÇÃO (correcção do especialista, ronda
     "relatório Marta", ponto 2 — problema mais grave encontrado nessa
     ronda: cada opção declarada saiu como uma única frase com um
     badge, nada mais). Para CADA bloco "### <nome>" na secção "Leitura
     por opção": confirma que os 6 pontos numerados (1 a 6) exigidos no
     prompt técnico (A, abaixo — "PROFUNDIDADE OBRIGATÓRIA") estão
     TODOS presentes. Dos pontos 1 a 5, cada um tem de ser o seu próprio
     parágrafo com pelo menos 3 frases — nunca um resumo de 1-2 frases a
     seguir ao cabeçalho, nunca um ponto ausente, nunca um ponto
     reduzido a uma única frase-conclusão.
     EXCEPÇÃO EXPLÍCITA — PONTO 6 (correcção do especialista, ronda
     "Miguel — engenharia", nunca repetir isto: a crítica aplicou este
     mínimo de 3 frases também ao ponto 6 e marcou FALHA sobre um ponto
     que estava correcto por desenho, enquanto um ponto genuinamente
     curto — o ponto 3, na mesma ronda — passou sem ser apanhado): o
     ponto 6 é sempre a frase-molde fixa e curta descrita em
     INSTRUCAO_VALIDACAO_OPCOES (critério 30) — "sustenta com clareza" /
     "sustenta parcialmente" / "não sustenta de forma natural", seguida
     de "Aqui está porquê" — NUNCA um parágrafo de 3+ frases. O mínimo de
     3 frases desta secção aplica-se só aos pontos 1 a 5; o ponto 6
     nunca é avaliado por tamanho aqui, só pela validação do critério 30.
     Lista, para cada opção, quantos dos 6 pontos encontraste (todos têm
     de estar presentes) e, só dos pontos 1 a 5, quantas frases tinha o
     mais curto.
     Se QUALQUER opção declarada tiver menos de 6 pontos numerados, ou
     algum dos pontos 1 a 5 tiver menos de 3 frases: FALHA — reescrita
     obrigatória dessa opção (e de qualquer outra na mesma condição),
     expandindo cada ponto em falta ou raso para o mesmo nível de
     desenvolvimento já exigido no prompt técnico — nunca aceitar a
     versão resumida só porque tecnicamente cobre o tema.

 34. NENHUMA OPÇÃO FUNDIDA NEM EM FALTA (correcção do especialista,
     ronda "Miguel — opções fundidas" — bug real: a pessoa declarou 2
     linhas distintas em "Opções em cima da mesa" no prompt técnico e o
     rascunho saiu com um único bloco "### " a fundir as duas num nome
     composto). Conta as linhas de "Opções em cima da mesa" no prompt
     técnico (A, abaixo) — cada linha começa por "- " e não é uma
     sub-linha de curso/QNQ/via. Conta os blocos "### " na secção
     "Leitura por opção" do rascunho (B). Os dois números têm de bater
     certo, UM A UM — nunca um bloco "### " cujo nome combine duas
     linhas diferentes com "e"/","/";" (verifica isto sempre, mesmo que
     as contagens batam por coincidência: um nome de bloco "### " que
     contenha, na íntegra, duas linhas inteiras de "Opções em cima da
     mesa" coladas é FALHA, mesmo que o total dê certo por acidente).
     Se as contagens não baterem, ou houver um bloco fundido: FALHA —
     lista as linhas declaradas e os blocos encontrados lado a lado,
     reescrita obrigatória para um bloco "### " completo e independente
     por cada linha declarada, nunca combinadas.

 O teu raciocínio acima pode ser livre (texto corrido, bullets, o que te ajudar a verificar bem cada critério) — mas a resposta TEM de terminar com um bloco final, delimitado exactamente por estas duas linhas literais, sem nenhuma variação (correcção do especialista, bug real: um resumo em prosa livre — negrito inconsistente entre PASSA e FALHA, números sub-divididos como "28(d)", verdictos escritos numa linha diferente do número — impedia o sistema de saber com fiabilidade quais critérios tinham mesmo falhado, escondendo o motivo real da reescrita seguinte. Este bloco é a ÚNICA parte que o sistema lê automaticamente — todo o resto serve só para apoiar o teu raciocínio):

 ===RESULTADO_MAQUINA_INICIO===
 1) PASSA
 2) FALHA: <resumo do problema, uma frase única, sem quebras de linha>
 3) PASSA
 ... (uma linha por CADA número de 1 até 34, por esta ordem exacta, sem excepção, sem saltar nenhum)
 34) PASSA
 ===RESULTADO_MAQUINA_FIM===

 Regras deste bloco, sem excepção:
 - Um número por linha, de 1 até 34 — nunca omitir um número, nunca juntar dois números na mesma linha, nunca sub-dividir um número em letras (nunca "28a)"/"28(d)" — se um critério tem sub-condições, o veredicto aqui é FALHA se qualquer sub-condição falhar, só PASSA se todas passarem).
 - Sem markdown dentro do bloco — sem **negrito**, sem itálico, texto simples, um ")" a separar o número do veredicto (nunca ".").
 - O veredicto aqui é sempre a tua conclusão FINAL e definitiva — se mudaste de opinião durante a análise acima, é a versão corrigida que entra aqui, nunca a primeira impressão.
 - Este bloco é a ÚNICA fonte que o sistema usa para decidir se o rascunho precisa de reescrita — um critério que discutiste acima mas sem linha correspondente dentro deste bloco é tratado como não avaliado, e reescrito por segurança mesmo que a tua análise o tenha dado como PASSA.`;

export function construirBlocosPromptCriticaAdolescente(promptTecnico: string, rascunho: string): BlocosPromptCritica {
  return {
    cacheavel: `${INSTRUCAO_CRITICA_ADOLESCENTE}\n\n=== A) PROMPT TÉCNICO ENVIADO ===\n${promptTecnico}`,
    resto: `\n\n=== B) RASCUNHO GERADO ===\n${rascunho}`,
  };
}

export function construirPromptCriticaAdolescente(promptTecnico: string, rascunho: string): string {
  const { cacheavel, resto } = construirBlocosPromptCriticaAdolescente(promptTecnico, rascunho);
  return `${cacheavel}${resto}`;
}

export interface CriterioCritica {
  numero: number;
  nome: string;
  passa: boolean;
  detalhe: string;
  /** AUDITORIA (correcção do especialista, ronda "auditoria de erros") — true quando esta entrada não veio da resposta da Anthropic mas foi criada porque o número nunca apareceu (resposta truncada ou critério ignorado pelo modelo). Nunca é `passa: true`. */
  ausenteDaResposta?: boolean;
}

export interface ResultadoCritica {
  criterios: CriterioCritica[];
  falhas: string[];
  /** `null` quando a resposta não seguiu o formato pedido em nenhuma linha — nunca se assume "passou tudo" nesse caso, mas também não se força uma reescrita sobre dados não interpretáveis (ver storage.ts/route.ts: crítica não parseável fica registada, sem reescrita automática). */
  todosPassaram: boolean | null;
  /** AUDITORIA — true quando algum número entre 1 e `totalEsperado` nunca apareceu na resposta (ver `parseCritica`). Nunca invisível: o chamador deve mostrar isto no admin, não só registar em log. */
  criteriosEmFalta: number[];
}

const REGEX_LINHA_CRITERIO = /^\s*(\d{1,2})\.\s*(?:([^:\n]+):\s*)?(PASSA|FALHA)\b\s*(?:[-\u2013\u2014]\s*(.*))?$/gim;

/** CORRECAO (ronda "regeneracao Alexandra 7", bug real, segunda camada -- ver
 * INSTRUCAO_CRITICA / INSTRUCAO_CRITICA_ADOLESCENTE, bloco
 * "===RESULTADO_MAQUINA_INICIO===...===RESULTADO_MAQUINA_FIM==="): a critica
 * costumava terminar com um resumo em PROSA LIVRE, e essa liberdade produziu,
 * em generacoes reais sucessivas, tres formatos incompativeis entre si --
 * "N. NOME: PASSA" limpo, "N. NOME: **FALHA**" com negrito so no veredicto
 * que falha (nunca em PASSA), e "1. **Criterio N (NOME):**" com a numeracao
 * exterior da lista de falhas a tapar o numero real do criterio dentro do
 * texto, ou ainda "28(d)" a sub-dividir um numero em letras. Nenhuma regex
 * de uma linha aguenta esta variedade com fiabilidade. Fonte de verdade
 * agora: um bloco final delimitado por marcadores literais, formato fixo e
 * mais simples ("N) PASSA"/"N) FALHA: detalhe", sem negrito, sem sub-numeros)
 * que a instrucao exige ser sempre a conclusao FINAL e definitiva. */
const REGEX_BLOCO_MAQUINA = /===RESULTADO_MAQUINA_INICIO===([\s\S]*?)===RESULTADO_MAQUINA_FIM===/;
const REGEX_LINHA_MAQUINA = /^\s*(\d{1,2})\)\s*(PASSA|FALHA)\b\s*(?:[:\-\u2013\u2014]\s*(.*))?$/gim;

/** Total de critérios definidos em cada instrução de crítica (ver INSTRUCAO_CRITICA / INSTRUCAO_CRITICA_ADOLESCENTE) — usados por `parseCritica` para detectar cortes silenciosos. Actualizar sempre que um critério novo for acrescentado (auditoria de erros, Set 2026: 8192 tokens tinham ficado dimensionados para 23, quando já existiam 33/34 — exactamente o tipo de desfasamento que este total serve para apanhar). */
export const TOTAL_CRITERIOS_ADULTO = 33;
export const TOTAL_CRITERIOS_ADOLESCENTE = 34;

/**
 * Extrai os critérios "N. NOME: PASSA|FALHA — detalhe" da resposta da crítica. Nunca lança erro em formato inesperado — devolve o que conseguir parsear.
 *
 * AUDITORIA (correcção do especialista, ronda "auditoria de erros") — bug real encontrado: um critério que nunca aparece na resposta (porque a chamada foi cortada por `max_tokens`, ou o modelo simplesmente o saltou) ficava fora de `falhas` como se tivesse passado — nunca disparava reescrita. `totalEsperado` faz o oposto: qualquer número de 1 a `totalEsperado` que não tenha uma linha correspondente na resposta entra em `criteriosEmFalta` e é tratado como FALHA forçada (nunca como "não avaliado"). Passar `undefined` mantém o comportamento antigo (sem verificação de completude) — usado só onde o total de critérios não é conhecido à partida.
 *
 * DUAS FONTES, UMA PRIORITÁRIA (ver comentário em REGEX_BLOCO_MAQUINA acima):
 * 1) o bloco máquina, quando presente — sempre a fonte que prevalece para
 *    qualquer número que ele cubra, porque é a única parte da resposta que a
 *    própria instrução pede como veredicto final.
 * 2) formato legado "N. NOME: PASSA|FALHA — detalhe", como rede de segurança
 *    para respostas antigas (geradas antes deste bloco existir) ou para um
 *    número que o bloco máquina tenha, por acidente, deixado de fora —
 *    procurado em TODO o texto (análise detalhada + qualquer resumo em
 *    prosa), com a ÚLTIMA ocorrência de cada número a prevalecer sobre as
 *    anteriores (a crítica costuma escrever um veredicto inicial na análise
 *    detalhada e só corrigi-lo mais tarde, no resumo — a versão de fecho é
 *    sempre a que conta, nunca a primeira impressão), e sem marcação de
 *    negrito markdown a atrapalhar o reconhecimento.
 */
export function parseCritica(textoCritica: string, totalEsperado?: number): ResultadoCritica {
  const doBlocoMaquina = new Map<number, CriterioCritica>();
  const blocoMatch = textoCritica.match(REGEX_BLOCO_MAQUINA);
  if (blocoMatch) {
    let m: RegExpExecArray | null;
    REGEX_LINHA_MAQUINA.lastIndex = 0;
    while ((m = REGEX_LINHA_MAQUINA.exec(blocoMatch[1]))) {
      const numero = Number(m[1]);
      doBlocoMaquina.set(numero, {
        numero,
        nome: `Critério ${numero}`,
        passa: m[2].toUpperCase() === "PASSA",
        detalhe: (m[3] ?? "").trim(),
      });
    }
  }

  const doFormatoLegado = new Map<number, CriterioCritica>();
  const textoLimpo = textoCritica.replace(/(\*\*|__)/g, "");
  let match: RegExpExecArray | null;
  REGEX_LINHA_CRITERIO.lastIndex = 0;
  while ((match = REGEX_LINHA_CRITERIO.exec(textoLimpo))) {
    const numero = Number(match[1]);
    doFormatoLegado.set(numero, {
      numero,
      nome: (match[2] ?? `Critério ${numero}`).trim(),
      passa: match[3].toUpperCase() === "PASSA",
      detalhe: (match[4] ?? "").trim(),
    });
  }

  // O bloco máquina, quando cobre um número, tem sempre prioridade sobre o formato legado para esse mesmo número.
  const combinado = new Map<number, CriterioCritica>([...doFormatoLegado, ...doBlocoMaquina]);
  const criterios = Array.from(combinado.values()).sort((a, b) => a.numero - b.numero);

  const criteriosEmFalta: number[] = [];
  if (totalEsperado && criterios.length > 0) {
    for (let n = 1; n <= totalEsperado; n++) {
      if (!combinado.has(n)) {
        criteriosEmFalta.push(n);
        criterios.push({
          numero: n,
          nome: `CRITÉRIO ${n} AUSENTE DA RESPOSTA`,
          passa: false,
          detalhe: "Não avaliado nesta chamada — resposta da crítica possivelmente truncada ou incompleta. Tratado como falha por segurança (nunca se assume que um critério ausente passou).",
          ausenteDaResposta: true,
        });
      }
    }
    criterios.sort((a, b) => a.numero - b.numero);
  }

  const falhas = criterios.filter((c) => !c.passa).map((c) => `${c.numero}. ${c.nome}${c.detalhe ? `: ${c.detalhe}` : ""}`);
  return { criterios, falhas, todosPassaram: criterios.length ? falhas.length === 0 : null, criteriosEmFalta };
}

/**
 * AUDITORIA (bug real encontrado, ronda "regeneração Alexandra" —
 * caso real: crítica com 6 falhas reais, reescrita automática que NÃO
 * as corrigiu de facto, e o admin sem qualquer aviso ao reabrir a
 * página) — o aviso "⚠ Atenção antes de aprovar" só existia como
 * estado local do browser (SeccaoRascunho.tsx), criado só na resposta
 * de um `fetch` ao vivo (gerar/regenerar/reescrever). Ao recarregar a
 * página, ou voltar a ela mais tarde (o momento em que a aprovação de
 * facto acontece), o aviso desaparecia mesmo que a crítica guardada
 * continuasse a reprovar o texto guardado. Esta função, partilhada
 * entre o servidor (page.tsx, calculada a partir do `criticaLlm`
 * persistido, sempre que a página carrega) e o cliente (SeccaoRascunho.tsx,
 * na resposta ao vivo de gerar/regenerar), garante que as duas fontes
 * mostram exactamente o mesmo aviso com a mesma lógica.
 */
export function construirAvisoRascunho(data: { geracaoTruncada?: boolean; criticaTruncada?: boolean; criteriosEmFalta?: number[]; precisaRevisaoManual?: boolean; falhasRestantes?: string[] }): string | null {
  const partes: string[] = [];
  if (data.geracaoTruncada) partes.push("a geração do texto foi cortada a meio (resposta demasiado longa para o limite de tokens) — o relatório pode estar incompleto.");
  if (data.criticaTruncada) partes.push("a crítica automática foi cortada a meio — pode não ter avaliado todos os critérios.");
  if (data.criteriosEmFalta && data.criteriosEmFalta.length > 0) partes.push(`critérios nunca avaliados pela crítica (tratados como falha por segurança): ${data.criteriosEmFalta.join(", ")}.`);
  // Nota de fraseado — nunca afirma "esgotou as tentativas de reescrita": esta função corre
  // tanto a seguir a uma reescrita ao vivo como, no servidor, sobre o estado já persistido (onde
  // não se sabe se a reescrita chegou a correr) — a única afirmação sempre verdadeira nos dois
  // casos é "o texto guardado agora ainda reprova a crítica guardada agora".
  if (data.precisaRevisaoManual) partes.push(`o texto actualmente guardado ainda reprova a crítica automática — revê à mão antes de aprovar${data.falhasRestantes?.length ? `: ${data.falhasRestantes.join(" | ")}` : "."}`);
  return partes.length ? `⚠ Atenção antes de aprovar — ${partes.join(" ")}` : null;
}

// TAREFA #40 (mudança de arquitectura) — o critério 22 (SELECÇÃO DAS
// CANDIDATAS) pode exigir escolher uma candidata DIFERENTE da pool
// completa, não só reescrever uma frase — mas a pool só existe no
// prompt técnico original (secção "Candidatas do catálogo"), nunca no
// rascunho já escrito. Sem reenviar o prompt técnico aqui, a reescrita
// não tinha como "reseleccionar" nada — só podia reescrever a mesma
// candidata com palavras diferentes, inventando uma ligação que a regra
// proíbe. `construirPromptReescrita` passa a incluir sempre o prompt
// técnico completo (o mesmo padrão já usado em `construirPromptCritica`)
// para qualquer falha que precise de voltar aos dados de origem, não só
// a de selecção de candidatas.
const INSTRUCAO_REESCRITA = `Reescreve este relatório corrigindo TODAS as falhas identificadas abaixo, sem nenhuma excepção.

REGRA MAIS IMPORTANTE DESTA TAREFA (correcção do especialista — bug real
encontrado: uma reescrita anterior devolveu texto marcado como "corrigido"
mas manteve, palavra por palavra, 5 das 6 falhas apontadas pela crítica,
incluindo frases proibidas repetidas exactamente como estavam e blocos
inteiros que deviam ter sido escritos de raiz e continuaram ausentes):
corrigir uma falha NUNCA significa deixá-la como estava. Antes de dares a
resposta por terminada, relê cada falha da lista abaixo, uma a uma, contra
o texto que vais entregar, e confirma que já não é verdade — se a frase,
o parágrafo ou o bloco que a crítica citou ainda existe no teu texto final,
igual ou quase igual, NÃO corrigiste essa falha, tens de voltar a escrevê-la.
Quando a falha pede algo que ainda não existe no texto (um marcador em
falta como "EXPLICAÇÃO_GRÁFICO:", uma referência ausente como
"Karakamsha", um parágrafo que devia estar noutra secção) — ESCREVE esse
conteúdo novo por inteiro, não reformules o que já lá está à volta dele.

Não alteres o que está correcto — só o que a lista de falhas abaixo aponta.
Mantém todos os marcadores machine-readable (FRASE_ABERTURA:, IDENTIDADE:, DOM:, LIMITAÇÃO:, SÍNTESE:, INSIGHT:, FORÇA:, SELECÇÃO_CANDIDATAS:, GRUPO:, CANDIDATA:, PRIMEIRO PASSO:) e todos os cabeçalhos "## " das 6 secções, incluindo "## Quem é".
Se alguma falha for de APRESENTAÇÃO DAS CANDIDATAS (força REAPRESENTAÇÃO DA POOL COMPLETA): volta à secção "Candidatas do catálogo" (e "Grupos de candidatas") no prompt técnico (A, abaixo) e apresenta TODAS as candidatas da pool completa que ligam com clareza a um dom já nomeado em "Quem é" — sem tecto de 3, agrupando as de convergência de base quase idêntica sob um único bloco "GRUPO:" em vez de repetir a mesma explicação por candidata; nunca inventes uma ligação para uma candidata que não a tenha, nem omitas uma que a tenha só porque já há outras.`;

/**
 * GUARDA DETERMINÍSTICA (correcção do especialista — "Direito" a ganhar
 * um bloco "### " nesta secção sem estar em "Opções em cima da mesa"
 * recorreu TRÊS vezes em produção real — commit 65209c4, depois de novo
 * na ronda "regeneração Alexandra 4" apesar de um "PROIBIDO ABSOLUTO"
 * explícito, depois de novo na ronda seguinte apesar de uma verificação
 * mecânica ainda mais explícita no prompt). Mesmo padrão já usado nesta
 * base de código quando um comportamento do LLM falha repetidamente apesar
 * de instrução reforçada (ver EXPLICAÇÃO_GRÁFICO em relatorioTemplate.ts):
 * sai da responsabilidade do LLM e passa a ser aplicado em código,
 * sempre, sem depender de o LLM "lembrar-se" da regra. Só actua quando
 * `opcoesPermitidas` vem da lista estruturada real (nunca no caso
 * "legado" de texto livre, onde não há lista fixa para comparar).
 * Remove qualquer bloco "### <nome>" dentro da secção "Leitura por
 * opção" cujo nome não corresponda (sem acentos, sem maiúsculas/minúsculas,
 * espaço aparado) a nenhuma linha de `opcoesPermitidas`.
 */
export function removerBlocosOpcaoNaoAutorizados(texto: string, opcoesPermitidas: string[]): { texto: string; blocosRemovidos: string[] } {
  if (!opcoesPermitidas.length) return { texto, blocosRemovidos: [] };

  const normalizar = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  const permitidasNormalizadas = new Set(opcoesPermitidas.map(normalizar));

  const inicioSeccao = texto.indexOf(`## ${SECCAO_TITULOS.leituraPorOpcao}`);
  if (inicioSeccao === -1) return { texto, blocosRemovidos: [] };
  const buscaFim = texto.indexOf("\n## ", inicioSeccao + 1);
  const fimSeccao = buscaFim === -1 ? texto.length : buscaFim;

  const antes = texto.slice(0, inicioSeccao);
  const seccao = texto.slice(inicioSeccao, fimSeccao);
  const depois = texto.slice(fimSeccao);

  const partes = seccao.split(/\n(?=### )/);
  const intro = partes[0];
  const blocosRemovidos: string[] = [];
  const blocosMantidos = partes.slice(1).filter((bloco) => {
    const nomeLinha = bloco.split("\n", 1)[0];
    const nome = nomeLinha.replace(/^###\s*/, "").trim();
    const autorizado = permitidasNormalizadas.has(normalizar(nome));
    if (!autorizado) blocosRemovidos.push(nome);
    return autorizado;
  });

  if (!blocosRemovidos.length) return { texto, blocosRemovidos: [] };

  const seccaoNova = [intro, ...blocosMantidos].join("\n");
  return { texto: antes + seccaoNova + depois, blocosRemovidos };
}

/**
 * GUARDA DETERMINÍSTICA — CONTAGEM DE BLOCOS "### " EM "LEITURA POR
 * OPÇÃO" (critério 34, "NENHUMA OPÇÃO FUNDIDA NEM EM FALTA") — correcção
 * do especialista, ronda "Miguel — engenharia". O histórico desta
 * secção já documentou, uma vez, exactamente este defeito em produção
 * real com este mesmo par de opções ("Engenharia Biomédica" e
 * "Engenharia e Gestão Industrial", ver comentário "Miguel — opções
 * fundidas" em promptAdolescente.ts): o nome da segunda opção contém a
 * palavra "e" dentro do próprio nome do curso, e o LLM fundiu as duas
 * num único bloco "### Engenharia biomédica e engenharia e gestão
 * industrial". `removerBlocosOpcaoNaoAutorizados` (acima) já remove
 * esse bloco fundido — o nome composto não bate com nenhuma opção
 * autorizada — mas só regista a remoção num `console.error`, nunca como
 * falha que force uma reescrita: sem esta guarda, o resultado era um
 * relatório entregue com a secção "Leitura por opção" silenciosamente
 * SEM NENHUM bloco para essas duas opções — pior do que o bloco fundido
 * visível, que pelo menos mostrava o problema.
 *
 * O critério 34 já pede à crítica LLM para verificar isto ("Contagens
 * batem, sem fusão") — mas é só julgamento do LLM sobre o mesmo texto,
 * com a mesma inconsistência já confirmada nos critérios 9/20/33 (ver
 * `verificarProfundidadeLeituraPorOpcao`, ronda "Miguel — engenharia":
 * a mesma crítica que inventou uma falha inexistente no ponto 6 não viu
 * um ponto 3 genuinamente curto). Por isso sai da responsabilidade
 * exclusiva da crítica e é verificado directamente em código, sempre,
 * sobre o texto realmente entregue — já depois de
 * `removerBlocosOpcaoNaoAutorizados` ter corrido — mesmo padrão das
 * outras guardas desta secção do ficheiro.
 */
export function verificarContagemBlocosOpcao(texto: string, opcoesPermitidas: string[]): string[] {
  if (!opcoesPermitidas.length) return [];

  const normalizar = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  const inicioSeccao = texto.indexOf(`## ${SECCAO_TITULOS.leituraPorOpcao}`);
  if (inicioSeccao === -1) {
    return [
      `34. NENHUMA OPÇÃO FUNDIDA NEM EM FALTA (guarda determinística, contagem automática): a secção "${SECCAO_TITULOS.leituraPorOpcao}" não foi encontrada no texto — esperava ${opcoesPermitidas.length} bloco(s) "### ", um por cada opção declarada (${opcoesPermitidas.join("; ")}).`,
    ];
  }
  const buscaFim = texto.indexOf("\n## ", inicioSeccao + 1);
  const fimSeccao = buscaFim === -1 ? texto.length : buscaFim;
  const seccao = texto.slice(inicioSeccao, fimSeccao);
  const blocos = seccao.split(/\n(?=### )/).slice(1);
  const nomesBlocos = blocos.map((b) => b.split("\n", 1)[0].replace(/^###\s*/, "").trim());

  if (blocos.length !== opcoesPermitidas.length) {
    return [
      `34. NENHUMA OPÇÃO FUNDIDA NEM EM FALTA (guarda determinística, contagem automática): esperava exactamente ${opcoesPermitidas.length} bloco(s) "### " em "${SECCAO_TITULOS.leituraPorOpcao}" — um por cada linha de "Opções em cima da mesa" (${opcoesPermitidas.join("; ")}) — mas encontrou ${blocos.length}${nomesBlocos.length ? ` (${nomesBlocos.join("; ")})` : ""}. Nunca fundir duas opções num único bloco, nunca omitir uma — escreve um bloco "### " completo e distinto por cada opção declarada, com o nome exacto dessa linha.`,
    ];
  }

  const nomesBlocosNormalizados = new Set(nomesBlocos.map(normalizar));
  const emFalta = opcoesPermitidas.filter((o) => !nomesBlocosNormalizados.has(normalizar(o)));
  if (emFalta.length) {
    return [
      `34. NENHUMA OPÇÃO FUNDIDA NEM EM FALTA (guarda determinística): o número de blocos bate (${blocos.length}), mas o(s) nome(s) não correspondem exactamente às opções declaradas — falta(m): ${emFalta.join("; ")}. Encontrado(s): ${nomesBlocos.join("; ")}. Cada bloco "### " tem de usar o nome exacto de uma opção declarada, nunca um nome fundido, parafraseado ou reordenado.`,
    ];
  }
  return [];
}

/**
 * GUARDA DETERMINÍSTICA — YOGA DE GRUPO: TODAS OU NENHUMA (critério 15,
 * "YOGAS POR CANDIDATA") — correcção do especialista, ronda "relatório
 * Nádia". A instrução técnica já documentava este exacto defeito como
 * bug recorrente (`promptAdulto.ts`, "YOGA DE GRUPO — TODAS OU NENHUMA"):
 * quando um yoga se aplica como reforço geral a um GRUPO inteiro de
 * candidatas (bloco "GRUPO:" partilhado), o LLM tende a escrever a
 * frase do yoga só no parágrafo partilhado do grupo — nunca repetida em
 * cada bloco "CANDIDATA:" individual dentro desse grupo, apesar da
 * instrução exigir isso explicitamente. Confirmado de novo em produção
 * real (relatório da Nádia, Set/2026): "SELECÇÃO_CANDIDATAS" concluiu
 * correctamente que um Raja Yoga reforça geral 13 candidatas do
 * "Grupo 1", o parágrafo partilhado do bloco "GRUPO:" mencionou o yoga
 * uma vez — mas nenhum dos 13 blocos "CANDIDATA:" individuais dentro
 * desse grupo repetiu a menção, exactamente o padrão já documentado.
 *
 * O critério 15 já pede à crítica LLM para verificar isto — mas é só
 * julgamento do LLM sobre o mesmo texto que gerou o defeito, com a
 * mesma inconsistência já confirmada nos critérios 9/20/33/34 (ver
 * `verificarContagemBlocosOpcao`): no mesmo relatório da Nádia, a
 * própria crítica LLM que apanhou esta falha real também reprovou o
 * critério 6 de outro relatório por engano no passado — não é fiável
 * sozinha. Por isso sai da responsabilidade exclusiva da crítica e é
 * verificado directamente em código, sempre, sobre o texto realmente
 * entregue, mesmo padrão das outras guardas desta secção do ficheiro.
 *
 * Verifica só grupos cujo parágrafo partilhado mencione "yoga" — um
 * grupo sem yoga aplicável não exige nada dos seus membros. Para cada
 * grupo com yoga, cada nome listado em "GRUPO:" tem de ter a palavra
 * "yoga" algures no seu próprio bloco "CANDIDATA:" — não valida o
 * conteúdo exacto da frase (isso continua a cargo da crítica LLM), só
 * a presença mínima que a instrução técnica exige.
 */
export function verificarYogaDeGrupo(texto: string): string[] {
  const falhasExtra: string[] = [];
  const marcadorGrupo = /^GRUPO: (.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = marcadorGrupo.exec(texto))) {
    const nomesGrupo = match[1]
      .split(";")
      .map((n) => n.trim())
      .filter(Boolean);
    const inicioGrupo = match.index;

    // O parágrafo partilhado do grupo vai desta linha até ao primeiro
    // "CANDIDATA:" a seguir (ou até ao próximo "GRUPO:"/fim do texto,
    // no caso raro de um grupo sem nenhum bloco "CANDIDATA:" a seguir).
    const buscaPrimeiraCandidata = texto.indexOf("\nCANDIDATA:", inicioGrupo);
    const buscaProximoGrupo = texto.indexOf("\nGRUPO:", inicioGrupo + 1);
    const candidatos = [buscaPrimeiraCandidata, buscaProximoGrupo].filter((i) => i !== -1);
    const fimParagrafoGrupo = candidatos.length ? Math.min(...candidatos) : texto.length;
    const paragrafoGrupo = texto.slice(inicioGrupo, fimParagrafoGrupo);

    if (!/yoga/i.test(paragrafoGrupo)) continue; // este grupo não invoca nenhum yoga — nada a verificar

    const semMencao: string[] = [];
    for (const nome of nomesGrupo) {
      const marcadorCandidata = `CANDIDATA: ${nome}`;
      const inicioCandidata = texto.indexOf(marcadorCandidata, fimParagrafoGrupo);
      if (inicioCandidata === -1) continue; // bloco próprio não encontrado — outro critério (22) já cobre isso

      const buscaFimCandidata = texto.indexOf("\nCANDIDATA:", inicioCandidata + 1);
      const buscaFimGrupo = texto.indexOf("\nGRUPO:", inicioCandidata + 1);
      const fimCandidatos = [buscaFimCandidata, buscaFimGrupo].filter((i) => i !== -1);
      const fimBloco = fimCandidatos.length ? Math.min(...fimCandidatos) : texto.length;
      const blocoCandidata = texto.slice(inicioCandidata, fimBloco);

      if (!/yoga/i.test(blocoCandidata)) semMencao.push(nome);
    }

    if (semMencao.length) {
      falhasExtra.push(
        `15. YOGAS POR CANDIDATA (guarda determinística — yoga de grupo): o grupo "${nomesGrupo.join("; ")}" invoca um yoga no parágrafo partilhado de "GRUPO:", mas falta a frase "Existe também..." (ou equivalente, mencionando o yoga) no bloco "CANDIDATA:" individual de: ${semMencao.join("; ")}. A regra é todas ou nenhuma — se o yoga se aplica ao grupo, tem de aparecer no bloco de CADA membro, nunca só no parágrafo partilhado.`,
      );
    }
  }

  return falhasExtra;
}

/**
 * GUARDA DETERMINÍSTICA — YOGA DE "REFORÇO GERAL" NOMEADO EM
 * SELECÇÃO_CANDIDATAS, FORA DE UM BLOCO "GRUPO:" FORMAL (critério 15,
 * segunda forma) — correcção do especialista, ronda "regeneração Marta".
 * Caso real confirmado: `verificarYogaDeGrupo` (acima) só apanha a regra
 * "YOGA DE GRUPO — TODAS OU NENHUMA" quando o yoga é invocado no
 * parágrafo PARTILHADO de um bloco "GRUPO:" formal — mas a própria
 * instrução (INSTRUCAO_YOGAS, promptAdulto.ts) define "grupo" de forma
 * mais larga: qualquer conjunto de candidatas que o raciocínio em
 * "SELECÇÃO_CANDIDATAS:" identifique como partilhando um yoga como
 * reforço geral, mesmo quando essas candidatas nunca chegam a formar um
 * bloco "GRUPO:" (podem estar espalhadas como candidatas individuais).
 * No relatório real da Marta: "SELECÇÃO_CANDIDATAS:" afirmou
 * explicitamente que tanto o Raja Yoga como o Dhana Yoga se aplicam,
 * como reforço geral, a três candidatas (uma delas — Técnico de Design
 * Gráfico — apresentada como candidata INDIVIDUAL, nunca dentro de um
 * bloco "GRUPO:") — mas cada candidata acabou por citar só um dos dois
 * yogas, nunca os dois, violando a regra "todas ou nenhuma" em ambas as
 * direcções.
 *
 * Esta guarda nunca tenta resolver referências anafóricas ("aplica-se
 * também a estas três", "a ambas") — só actua quando a própria frase em
 * "SELECÇÃO_CANDIDATAS:" nomeia EXPLICITAMENTE 2 ou mais candidatas da
 * pool ao lado do nome do yoga. Preferir um falso negativo (uma frase
 * anafórica que a guarda não consegue interpretar com segurança fica
 * sem verificação) a um falso positivo (adivinhar mal a que candidatas
 * uma referência anafórica se refere, e forçar uma reescrita sobre uma
 * selecção de candidatas já correcta) — mesma prioridade absoluta já
 * aplicada em `verificarCandidatasElegiveisPresentes` (critério 22):
 * nunca pôr em causa a direcção vocacional já correcta por excesso de
 * zelo automático.
 *
 * Também nunca marca falha para uma candidata cujo bloco "CANDIDATA:"
 * é só um reencaminhamento para "Leitura por opção" (candidatas que já
 * eram opções declaradas — ver "ver leitura completa acima" nesses
 * blocos, TAREFA #40/INSTRUCAO_SELECCAO_CANDIDATAS): a ausência da
 * frase de yoga nesse bloco resumido é esperada por desenho, nunca uma
 * omissão real.
 */
function extrairBlocoCandidataNaSeccao(texto: string, nome: string, inicioBusca: number, fimSeccao: number): string | null {
  const marcador = `CANDIDATA: ${nome}`;
  const inicio = texto.indexOf(marcador, inicioBusca);
  if (inicio === -1 || inicio >= fimSeccao) return null;
  const buscaFimCandidata = texto.indexOf("\nCANDIDATA:", inicio + 1);
  const buscaFimGrupo = texto.indexOf("\nGRUPO:", inicio + 1);
  const candidatosFim = [buscaFimCandidata, buscaFimGrupo, fimSeccao].filter((i) => i !== -1 && i <= fimSeccao);
  const fim = candidatosFim.length ? Math.min(...candidatosFim) : fimSeccao;
  return texto.slice(inicio, fim);
}

const NOMES_YOGA_CONHECIDOS = ["Raja Yoga", "Dhana Yoga", "Viparita Raja Yoga"];
const PADRAO_ANAFORA_CANDIDATAS = /^\s*(estas?|esses?|ambas?|ambos|todas|todos|tais)\b/i;

export function verificarYogasReforcoGeralNomeados(texto: string, candidatasPool: CandidataForaDaLista[]): string[] {
  if (candidatasPool.length < 2) return [];

  const inicioSeccao = texto.indexOf(`## ${SECCAO_TITULOS.candidataForaDaLista}`);
  if (inicioSeccao === -1) return []; // secção ausente já é apanhado por `verificarCandidatasElegiveisPresentes`

  const buscaFimSeccao = texto.indexOf("\n## ", inicioSeccao + 1);
  const fimSeccao = buscaFimSeccao === -1 ? texto.length : buscaFimSeccao;

  const marcadorSeleccao = "SELECÇÃO_CANDIDATAS:";
  const inicioSeleccao = texto.indexOf(marcadorSeleccao, inicioSeccao);
  if (inicioSeleccao === -1 || inicioSeleccao >= fimSeccao) return [];

  const fimBlocoSeleccaoBusca = [texto.indexOf("\nCANDIDATA:", inicioSeleccao), texto.indexOf("\nGRUPO:", inicioSeleccao)].filter((i) => i !== -1 && i < fimSeccao);
  const fimBlocoSeleccao = fimBlocoSeleccaoBusca.length ? Math.min(...fimBlocoSeleccaoBusca) : fimSeccao;
  const blocoSeleccao = texto.slice(inicioSeleccao, fimBlocoSeleccao);

  const falhasExtra: string[] = [];
  // Cada frase (cortada por ponto final ou ponto-e-vírgula) é avaliada
  // isoladamente — nunca cruza informação com a frase seguinte, para
  // nunca associar um yoga a candidatas nomeadas noutra frase.
  const frases = blocoSeleccao.split(/(?<=[.;])\s+/);

  for (const frase of frases) {
    for (const nomeYoga of NOMES_YOGA_CONHECIDOS) {
      if (!frase.includes(nomeYoga)) continue;
      const matchAplicaSe = frase.match(/aplica-se(?:\s+também)?\s+a\s+(.+)/i);
      if (!matchAplicaSe) continue;
      const clausula = matchAplicaSe[1];
      if (PADRAO_ANAFORA_CANDIDATAS.test(clausula)) continue; // referência anafórica — nunca adivinhar

      const candidatasNaFrase = candidatasPool.filter((c) => clausula.includes(c.nome));
      if (candidatasNaFrase.length < 2) continue; // "todas ou nenhuma" só se aplica a um yoga partilhado por 2+

      const semCitacao: string[] = [];
      for (const c of candidatasNaFrase) {
        const bloco = extrairBlocoCandidataNaSeccao(texto, c.nome, inicioSeccao, fimSeccao);
        if (!bloco) continue; // candidata não localizável no texto — já reportado por `verificarCandidatasElegiveisPresentes`
        if (/ver leitura completa acima/i.test(bloco)) continue; // opção declarada, reencaminhada — nunca é omissão real
        if (!bloco.includes(nomeYoga)) semCitacao.push(c.nome);
      }
      if (semCitacao.length) {
        falhasExtra.push(
          `15. YOGAS POR CANDIDATA (guarda determinística — reforço geral nomeado em SELECÇÃO_CANDIDATAS): o raciocínio interno afirma que o "${nomeYoga}" se aplica, como reforço geral, a ${candidatasNaFrase.map((c) => c.nome).join("; ")} — mas falta a frase "Existe também..." (citando este yoga pelo nome) no bloco "CANDIDATA:" de: ${semCitacao.join("; ")}. A regra é todas ou nenhuma — se SELECÇÃO_CANDIDATAS já decidiu que este yoga reforça o conjunto inteiro, tem de aparecer no bloco de CADA candidata nomeada, nunca só nalgumas.`,
        );
      }
    }
  }

  return falhasExtra;
}

/**
 * GUARDA DETERMINÍSTICA — LINGUAGEM DE RESERVA PARA CANDIDATAS NÍVEL 2
 * (critério 21) — correcção do especialista, ronda "regeneração Marta
 * 2". INSTRUCAO_NIVEL_CANDIDATAS (promptAdulto.ts) exige que toda
 * candidata Nível 2 (âncora pessoal — Atmakaraka/Amatyakaraka/Stellium/
 * Regente dignificado, mas SEM o planeta de maior peso) seja escrita
 * com um qualificador de reserva audível ("não é o sinal mais forte,
 * mas é genuíno e específico" / "há aqui um fio que vale a pena puxar"
 * / "vale explorar, sem ser ainda uma certeza estrutural") — nunca com
 * a mesma confiança plena de uma candidata Nível 1. Bug real
 * confirmado no relatório da Marta: três candidatas Nível 2 (Ciência
 * Política, História da Arte, Música) escritas sem nenhum destes
 * qualificadores.
 *
 * `candidatasPool` já traz `nivelConfianca` por candidata (mesmos
 * dados de `catalogoResultados.candidatasForaDaLista` já usados nas
 * guardas de critério 22 e 15) — nunca precisa de inferir o nível a
 * partir do texto. A verificação em si é um sinal POSITIVO (a lista de
 * marcadores abaixo cobre as três formulações exactas da instrução
 * mais variações já observadas em produção) — nunca tenta enumerar
 * todas as frases válidas possíveis, porque a instrução pede
 * explicitamente variação de redacção. Prefere, tal como as guardas
 * anteriores, um falso negativo (uma reserva genuína escrita de forma
 * ainda não coberta pelos marcadores, que a guarda deixa passar) a
 * arriscar interromper uma candidata já correcta com um falso
 * positivo — mas, ao contrário de `verificarCandidatasElegiveisPresentes`
 * e `verificarYogasReforcoGeralNomeados`, esta guarda depende de
 * reconhecer uma CLASSE de linguagem, não uma correspondência exacta
 * de nome — se em produção aparecer uma reserva genuína com uma
 * redacção nova, o correcto é alargar a lista de marcadores abaixo,
 * nunca desligar a guarda.
 *
 * Candidatas cujo bloco "CANDIDATA:" é só um reencaminhamento para
 * "Leitura por opção" ("ver leitura completa acima") ficam de fora —
 * a exigência de reserva aplica-se ao texto que a candidata realmente
 * tem, nunca a um resumo que remete para outro sítio.
 */
const MARCADORES_RESERVA_NIVEL2 = [
  "não é o sinal mais forte",
  "vale a pena puxar",
  "vale explorar",
  "sem ser ainda uma certeza",
  "genuíno e específico",
  "fio que vale a pena",
  "menos robusto",
  "sinal real, mas",
];

export function verificarLinguagemReservaNivel2(texto: string, candidatasPool: CandidataForaDaLista[]): string[] {
  const candidatasNivel2 = candidatasPool.filter((c) => c.nivelConfianca === 2);
  if (!candidatasNivel2.length) return [];

  const inicioSeccao = texto.indexOf(`## ${SECCAO_TITULOS.candidataForaDaLista}`);
  if (inicioSeccao === -1) return []; // secção ausente já reportado por `verificarCandidatasElegiveisPresentes`

  const buscaFimSeccao = texto.indexOf("\n## ", inicioSeccao + 1);
  const fimSeccao = buscaFimSeccao === -1 ? texto.length : buscaFimSeccao;

  const normalizar = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const marcadoresNormalizados = MARCADORES_RESERVA_NIVEL2.map(normalizar);

  const semReserva: string[] = [];
  for (const c of candidatasNivel2) {
    const bloco = extrairBlocoCandidataNaSeccao(texto, c.nome, inicioSeccao, fimSeccao);
    if (!bloco) continue; // não localizável — já reportado por `verificarCandidatasElegiveisPresentes`
    if (/ver leitura completa acima/i.test(bloco)) continue; // reencaminhamento — regra não se aplica aqui
    const blocoNormalizado = normalizar(bloco);
    const temReserva = marcadoresNormalizados.some((m) => blocoNormalizado.includes(m));
    if (!temReserva) semReserva.push(c.nome);
  }

  if (semReserva.length) {
    return [
      `21. LINGUAGEM DE CONFIANÇA POR NÍVEL (guarda determinística): ${semReserva.join("; ")} ${semReserva.length > 1 ? "são candidatas Nível 2" : "é candidata Nível 2"} (âncora pessoal, sem o planeta de maior peso), mas o(s) respectivo(s) bloco(s) "CANDIDATA:" não contêm nenhum qualificador de reserva (ex.: "não é o sinal mais forte, mas é genuíno e específico" / "há aqui um fio que vale a pena puxar" / "vale explorar, sem ser ainda uma certeza estrutural"). Nível 2 nunca pode ser escrito com a mesma confiança plena de Nível 1 — a reserva tem de ser audível na frase.`,
    ];
  }
  return [];
}

/**
 * GUARDA DETERMINÍSTICA — FRASE-PADRÃO DE VARGOTTAMA (critério 16) —
 * correcção do especialista, ronda "regeneração Marta 2". A crítica LLM
 * mostrou-se especificamente pouco fiável neste critério: numa ronda
 * apanhou correctamente uma falta real, na ronda seguinte — já com o
 * texto corrigido — voltou a acusar a mesma coisa, sem razão. Padrão
 * consistente com a crítica a verificar a presença literal da palavra
 * "Vargottama" (que o sistema está desenhado para NUNCA usar no texto
 * do cliente — ver INSTRUCAO_VARGOTTAMA) em vez da frase-paráfrase que
 * a instrução realmente exige. Substituir este critério por código
 * elimina o falso positivo recorrente, não só apanha mais bugs.
 *
 * `planetasVargottama` vem de `blocoVargottama(d1)` (`@naveya/method-
 * engine`) já parseado para uma lista de nomes — a MESMA função
 * determinística que o prompt usa para listar os planetas Vargottama
 * nos dados técnicos, nunca uma segunda derivação a divergir dela.
 *
 * A verificação procura, dentro da secção "Quem é", uma frase que
 * mencione o planeta E contenha o fragmento "duas dimensões" —
 * distintivo do padrão exacto exigido pela instrução ("aparece com a
 * mesma força em duas dimensões independentes do perfil") e não usado,
 * em nenhum relatório revisto nesta sessão, para nenhum outro fim.
 * Aceita variações de redacção (ex.: "nessas duas dimensões" para um
 * segundo planeta Vargottama, para nunca repetir a frase ipsis verbis)
 * — nunca exige o template literal palavra por palavra, porque a
 * variação de redacção entre candidatas/planetas é uma exigência geral
 * do próprio prompt (ver INSTRUCAO_ABERTURA_CANDIDATAS).
 */
export function verificarFraseVargottama(texto: string, planetasVargottama: string[]): string[] {
  if (!planetasVargottama.length) return [];

  const inicioSeccao = texto.indexOf(`## ${SECCAO_TITULOS.quemE}`);
  if (inicioSeccao === -1) return []; // secção ausente é outra falha, não desta guarda

  const buscaFimSeccao = texto.indexOf("\n## ", inicioSeccao + 1);
  const fimSeccao = buscaFimSeccao === -1 ? texto.length : buscaFimSeccao;
  const seccao = texto.slice(inicioSeccao, fimSeccao);

  const PADRAO_VARGOTTAMA = /duas dimens(õ|o)es/i;
  const frases = seccao.split(/(?<=[.!?])\s+/);

  const semFrase: string[] = [];
  for (const planeta of planetasVargottama) {
    const temFrase = frases.some((f) => f.includes(planeta) && PADRAO_VARGOTTAMA.test(f));
    if (!temFrase) semFrase.push(planeta);
  }

  if (semFrase.length) {
    return [
      `16. VARGOTTAMA (guarda determinística): ${semFrase.join("; ")} ${semFrase.length > 1 ? "são planetas Vargottama" : "é planeta Vargottama"} nos dados técnicos, mas a secção "${SECCAO_TITULOS.quemE}" não contém, para ${semFrase.length > 1 ? "eles" : "ele"}, a frase-padrão obrigatória (INSTRUCAO_VARGOTTAMA): "[Planeta] é o traço mais estável deste perfil — aparece com a mesma força em duas dimensões independentes do perfil, o que significa que não muda com as circunstâncias nem depende de esforço para existir" (ou uma variação clara do mesmo padrão). NUNCA usar a palavra "Vargottama" no texto — só esta paráfrase.`,
    ];
  }
  return [];
}

/**
 * GUARDA DETERMINÍSTICA — CANDIDATAS ELEGÍVEIS SEM RASTO NENHUM NO TEXTO
 * (critério 22, "candidata fora da lista em falta") — correcção do

 * (critério 22, "candidata fora da lista em falta") — correcção do
 * especialista, ronda "regeneração Nádia 2". Caso real confirmado: a
 * pool completa (TAREFA #40, `catalogarDestinos()`) trazia "Ciências da
 * Educação" com a soma de pesos MAIS ALTA de toda a pool — e essa
 * candidata não apareceu em lado nenhum do texto final: nem bloco
 * "CANDIDATA:"/"GRUPO:", nem sequer nomeada no bloco interno
 * "SELECÇÃO_CANDIDATAS:" como tendo reprovado o Passo 1. Silêncio
 * total sobre a candidata de maior peso da pool.
 *
 * Esta guarda NUNCA verifica se a exclusão de uma candidata foi
 * "correcta" — isso é um juízo de ligação narrativa (INSTRUCAO_
 * SELECCAO_CANDIDATAS, Passo 1) que só o LLM pode fazer, e uma
 * candidata pode legitimamente reprovar esse filtro. O que a guarda
 * verifica é mais estreito e 100% mecânico: o próprio prompt TORNA
 * OBRIGATÓRIO nomear, no bloco "SELECÇÃO_CANDIDATAS:", TODA candidata
 * da pool que reprova o Passo 1 ("quais candidatas da pool completa
 * (nomeia-as pelo nome...) reprovaram o Passo 1 e porquê" — ver
 * INSTRUCAO_SELECCAO_CANDIDATAS em promptAdulto.ts). Ou seja: toda
 * candidata da pool tem de aparecer OU como "CANDIDATA:"/"GRUPO:" OU
 * nomeada (aceite ou rejeitada) dentro da secção "Candidata fora da
 * lista" — nunca ausente das duas coisas ao mesmo tempo. É essa
 * ausência total, nunca a decisão de incluir ou não, que esta guarda
 * apanha — por isso não arrisca nenhum falso positivo sobre uma
 * exclusão legítima do Passo 1 (essa fica sempre registada, por
 * exigência do próprio prompt), e nunca força uma reescrita que possa
 * alterar uma selecção de candidatas já correcta — prioridade absoluta
 * confirmada pelo especialista: a direcção vocacional apresentada
 * nunca pode ser posta em causa por uma guarda a corrigir de mais.
 *
 * `candidatasPool` vem de `catalogoResultados.candidatasForaDaLista`
 * (`ResultadoCatalogoVocacional`, `@naveya/method-engine`) — já
 * calculado deterministicamente antes do prompt ser construído, e por
 * isso disponível no mesmo request sem nenhuma chamada extra à
 * Anthropic (no PATCH "reescrever", onde o rascunho guardado não traz
 * o catálogo, o mesmo padrão já usado para `opcoesAdolescente` em
 * `verificarContagemBlocosOpcao` aplica-se aqui: repetir a chamada,
 * puramente determinística, a `calcularDadosAstrologicos(Adolescente)`
 * só para obter de novo `catalogoResultados`).
 */
export function verificarCandidatasElegiveisPresentes(texto: string, candidatasPool: CandidataForaDaLista[]): string[] {
  if (!candidatasPool.length) return [];

  const normalizar = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  const inicioSeccao = texto.indexOf(`## ${SECCAO_TITULOS.candidataForaDaLista}`);
  if (inicioSeccao === -1) {
    return [
      `22. CANDIDATAS ELEGÍVEIS SEM RASTO NENHUM (guarda determinística): a secção "${SECCAO_TITULOS.candidataForaDaLista}" não foi encontrada no texto, mas a pool tem ${candidatasPool.length} candidata(s) elegível(is) (${candidatasPool.map((c) => c.nome).join("; ")}) — pelo menos o cabeçalho da secção, com a frase de ausência ou as candidatas, tem de estar presente.`,
    ];
  }
  const buscaFim = texto.indexOf("\n## ", inicioSeccao + 1);
  const fimSeccao = buscaFim === -1 ? texto.length : buscaFim;
  const seccao = normalizar(texto.slice(inicioSeccao, fimSeccao));

  const semRasto = candidatasPool.filter((c) => !seccao.includes(normalizar(c.nome)));
  if (semRasto.length) {
    const detalhe = semRasto
      .sort((a, b) => b.somaPesoCamadas - a.somaPesoCamadas)
      .map((c) => `${c.nome} (soma de pesos ${c.somaPesoCamadas.toFixed(2)}, Nível ${c.nivelConfianca})`)
      .join("; ");
    return [
      `22. CANDIDATAS ELEGÍVEIS SEM RASTO NENHUM (guarda determinística): a pool completa tinha estas candidatas sem NENHUMA menção na secção "${SECCAO_TITULOS.candidataForaDaLista}" — nem bloco "CANDIDATA:"/"GRUPO:", nem sequer nomeadas como reprovadas no bloco "SELECÇÃO_CANDIDATAS:": ${detalhe}. O prompt exige que toda candidata da pool completa seja nomeada nesse bloco, aceite ou rejeitada — silêncio total sobre uma candidata (em especial a de maior soma de pesos) é sempre uma falha a corrigir, nunca uma omissão aceitável.`,
    ];
  }
  return [];
}

/**
 * GUARDA DETERMINÍSTICA — JUSTIFICAÇÃO DE REJEIÇÃO REPETIDA/GENÉRICA NO
 * BLOCO "SELECÇÃO_CANDIDATAS:" (critério 35) — caso real confirmado
 * (relatório da Nádia, pedido de revisão do Rui): a instrução (Passo 1
 * de INSTRUCAO_SELECCAO_CANDIDATAS, critério 22(e) da crítica) exige que
 * cada candidata da pool completa REJEITADA no Passo 1 tenha, no bloco
 * "SELECÇÃO_CANDIDATAS:", uma razão PRÓPRIA (que camadas dela, em
 * concreto, não se ligam a nenhum dom já nomeado) — nunca uma frase
 * genérica copiada para várias candidatas diferentes, só trocando o
 * nome. A guarda 22 (verificarCandidatasElegiveisPresentes) só confirma
 * que cada nome APARECE mencionado algures no bloco — nunca se a razão
 * dada é genuína ou um "carimbo" reutilizado, por isso deixava passar
 * exactamente o padrão observado num relatório real: a esmagadora
 * maioria da pool (20 de 22) rejeitada com a MESMA frase-modelo, palavra
 * por palavra — nunca apanhado por nenhuma guarda existente, porque
 * tecnicamente cada nome "aparecia" no bloco. Isto (não a contagem de
 * convergência em si) é a causa directa de relatórios reais mostrarem
 * poucas alternativas mesmo com uma pool grande: o Passo 1 é um filtro
 * inteiramente julgado pelo LLM, sem piso nenhum, e sem esta guarda uma
 * rejeição em massa com um único motivo copiado nunca era apanhada.
 *
 * Esta guarda NUNCA decide quem é aceite ou rejeitado, e nunca força
 * nenhuma candidata a entrar — só compara o texto da razão dada a
 * candidatas DIFERENTES rejeitadas (normalizado, com o próprio nome
 * removido) e falha quando ≥3 candidatas distintas partilham a mesma
 * razão, palavra por palavra. A correcção nunca é "aceitar candidatas à
 * força" — é escrever uma razão específica a cada uma (o mais provável,
 * dado que a maioria dos casos reais tem razões genuinamente distintas
 * disponíveis), ou, no caso raro de a razão ser mesmo idêntica porque
 * partilham a mesma ligação a um dom nomeado, isso já não é "sem ligação
 * nomeável" — e a candidata devia ter passado o Passo 1 e ser
 * apresentada (agrupada, se a convergência de base for também idêntica).
 */
export function verificarJustificacaoRejeicaoCandidatas(texto: string, candidatasPool: CandidataForaDaLista[]): string[] {
  if (candidatasPool.length < 4) return [];

  const normalizar = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();

  const inicioSeccao = texto.indexOf(`## ${SECCAO_TITULOS.candidataForaDaLista}`);
  if (inicioSeccao === -1) return [];
  const buscaFimSeccao = texto.indexOf("\n## ", inicioSeccao + 1);
  const fimSeccao = buscaFimSeccao === -1 ? texto.length : buscaFimSeccao;
  const seccao = texto.slice(inicioSeccao, fimSeccao);

  const MARCADOR_SELECCAO = "SELECÇÃO_CANDIDATAS:";
  const MARCADOR_CANDIDATA = "CANDIDATA:";
  const MARCADOR_GRUPO = "GRUPO:";

  const posSeleccao = seccao.indexOf(MARCADOR_SELECCAO);
  if (posSeleccao === -1) return []; // ausência do bloco já é apanhada pelo critério 22

  const regexProximoMarcador = new RegExp(`^(${MARCADOR_CANDIDATA}|${MARCADOR_GRUPO})`, "gm");
  regexProximoMarcador.lastIndex = posSeleccao + MARCADOR_SELECCAO.length;
  const mProximo = regexProximoMarcador.exec(seccao);
  const fimBlocoSeleccao = mProximo ? mProximo.index : seccao.length;
  const blocoSeleccao = seccao.slice(posSeleccao + MARCADOR_SELECCAO.length, fimBlocoSeleccao);

  const nomesEscritos = new Set<string>();
  for (const m of seccao.matchAll(new RegExp(`^${MARCADOR_CANDIDATA}\\s*(.*)$`, "gm"))) {
    const nome = m[1]?.trim();
    if (nome) nomesEscritos.add(normalizar(nome));
  }
  for (const m of seccao.matchAll(new RegExp(`^${MARCADOR_GRUPO}\\s*(.*)$`, "gm"))) {
    for (const nome of (m[1] ?? "").split(";")) {
      const n = nome.trim();
      if (n) nomesEscritos.add(normalizar(n));
    }
  }

  const rejeitadas = candidatasPool.filter((c) => !nomesEscritos.has(normalizar(c.nome)));
  if (rejeitadas.length < 3) return [];

  const clausulas = blocoSeleccao
    .split(/(?<=[.;])\s+|\n+/)
    .map((c) => c.trim())
    .filter(Boolean);

  const razaoPorCandidata = new Map<string, string>();
  for (const c of rejeitadas) {
    const nomeNorm = normalizar(c.nome);
    const clausula = clausulas.find((cl) => normalizar(cl).includes(nomeNorm));
    if (!clausula) continue; // sem razão nenhuma dada — já apanhado pela guarda 22
    const semNome = normalizar(clausula).split(nomeNorm).join(" ");
    const semPontuacao = semNome
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (semPontuacao.length < 15) continue; // curto demais para comparar com confiança
    razaoPorCandidata.set(c.nome, semPontuacao);
  }

  const grupos = new Map<string, string[]>();
  for (const [nome, razao] of razaoPorCandidata) {
    if (!grupos.has(razao)) grupos.set(razao, []);
    grupos.get(razao)!.push(nome);
  }

  const grupoRepetido = [...grupos.entries()].find(([, nomes]) => nomes.length >= 3);
  if (!grupoRepetido) return [];

  const [razaoPartilhada, nomesAfectados] = grupoRepetido;
  return [
    `35. JUSTIFICAÇÃO DE REJEIÇÃO REPETIDA/GENÉRICA (guarda determinística — caso real confirmado, relatório da Nádia): ${nomesAfectados.length} candidatas rejeitadas no Passo 1 — ${nomesAfectados.join(", ")} — partilham, no bloco "SELECÇÃO_CANDIDATAS:", exactamente a mesma razão de rejeição (só o nome muda): "${razaoPartilhada.slice(0, 200)}". Cada candidata rejeitada precisa de uma razão PRÓPRIA e específica (que camadas dela, em concreto, não se ligam a nenhum dom nomeado em "Quem é"). Se a razão é genuinamente a mesma para várias candidatas, isso significa que partilham a MESMA ligação a um dom nomeado — e nesse caso não deviam ter sido rejeitadas, deviam ter passado o Passo 1 e ser apresentadas (agrupadas, se a convergência de base for também idêntica).`,
  ];
}

/**
 * GUARDA DETERMINÍSTICA — ORDEM DO PARÁGRAFO ANTI-"ISTO DÁ PARA TUDO"
 * (critério 32) — caso real confirmado (relatório do próprio Rui):
 * INSTRUCAO da secção "Candidata fora da lista" (promptAdulto.ts) exige,
 * por esta ordem exacta: (1) frase de abertura própria da secção (1-2
 * frases), (2) logo a seguir, ANTES de qualquer candidata ou bloco de
 * raciocínio, o parágrafo `paragrafoAntiDaParaTudo` na íntegra, (3) só
 * depois o bloco "SELECÇÃO_CANDIDATAS:". No caso real, o parágrafo saiu
 * DEPOIS de SELECÇÃO_CANDIDATAS — ordem invertida.
 *
 * Esta guarda verifica APENAS a ordem/presença do parágrafo — nunca o
 * conteúdo da selecção de candidatas em si — por isso uma correcção
 * nunca pode alterar qual candidata é aceite/rejeitada nem a sua ordem,
 * só a posição deste parágrafo fixo dentro da secção.
 */
export function verificarOrdemParagrafoAntiDaParaTudo(texto: string, paragrafoAntiDaParaTudoTexto: string | null): string[] {
  if (!paragrafoAntiDaParaTudoTexto) return [];

  const inicioSeccao = texto.indexOf(`## ${SECCAO_TITULOS.candidataForaDaLista}`);
  if (inicioSeccao === -1) return []; // secção ausente é outra falha, não desta guarda

  const buscaFimSeccao = texto.indexOf("\n## ", inicioSeccao + 1);
  const fimSeccao = buscaFimSeccao === -1 ? texto.length : buscaFimSeccao;
  const seccao = texto.slice(inicioSeccao, fimSeccao);

  const posSeleccao = seccao.indexOf("SELECÇÃO_CANDIDATAS:");
  if (posSeleccao === -1) return []; // ausência do bloco é outra falha, não desta guarda

  // Fragmento estável e curto do início do parágrafo obrigatório —
  // suficiente para localizá-lo sem exigir reprodução carácter a
  // carácter do parágrafo inteiro nesta guarda.
  const fragmentoParagrafo = paragrafoAntiDaParaTudoTexto.slice(0, 60);
  const posParagrafo = seccao.indexOf(fragmentoParagrafo);

  if (posParagrafo === -1) {
    return [
      `32. PARÁGRAFO ANTI-"ISTO DÁ PARA TUDO" AUSENTE (guarda determinística): a secção "${SECCAO_TITULOS.candidataForaDaLista}" tem 2+ candidatas na pool (pelo que o parágrafo é obrigatório), mas o texto não contém o parágrafo exacto exigido logo a seguir à frase de abertura da secção.`,
    ];
  }

  if (posParagrafo > posSeleccao) {
    return [
      `32. ORDEM DO PARÁGRAFO ANTI-"ISTO DÁ PARA TUDO" (guarda determinística): este parágrafo obrigatório tem de aparecer ANTES do bloco "SELECÇÃO_CANDIDATAS:", logo a seguir à frase de abertura da secção — mas no texto aparece DEPOIS de "SELECÇÃO_CANDIDATAS:". Move o parágrafo (sem alterar uma palavra do seu conteúdo) para a posição correcta, sem tocar na selecção de candidatas em si.`,
    ];
  }

  return [];
}

export function construirPromptReescrita(promptTecnico: string, rascunhoOriginal: string, falhas: string[]): string {
  return `${INSTRUCAO_REESCRITA}\nFalhas a corrigir:\n${falhas.map((f) => `- ${f}`).join("\n")}\n\n=== A) PROMPT TÉCNICO ORIGINAL ===\n${promptTecnico}\n\n=== B) RELATÓRIO ORIGINAL ===\n${rascunhoOriginal}`;
}

/**
 * GUARDA DETERMINÍSTICA — PROFUNDIDADE DA LEITURA POR OPÇÃO (correcção do
 * especialista — critério 33 falhou em rondas reais sucessivas, com pontos
 * DIFERENTES a ficar curtos de cada vez (2/3/5, depois 1/2/3/5, depois só
 * 3/5), apesar de reforço de prompt a cada ronda ("VERIFICAÇÃO OBRIGATÓRIA,
 * PONTO A PONTO" já existe nos dois motores desde a ronda 3/4). Mesmo
 * padrão de esgotamento de prompt já visto com EXPLICAÇÃO_GRÁFICO e o
 * bloco "Direito" não autorizado: sai da responsabilidade exclusiva da
 * crítica (que julga o mesmo texto de forma inconsistente entre chamadas —
 * já se viu o critério 33 dado como PASSA numa ronda com o mesmo tipo de
 * défice que outra ronda apanhou) e passa a ser verificado directamente em
 * código, sempre, sobre o texto realmente gerado.
 *
 * CORRECÇÃO DE ROOT CAUSE (ronda seguinte): a primeira versão desta guarda
 * usava um mínimo de PALAVRAS por ponto (35). Testada contra o caso real
 * que a motivou (Alexandra, pontos 3 e 5 de "gestão" e "economia", que a
 * crítica LLM apanhou correctamente como "1-2 frases, abaixo do mínimo de
 * 3"), essa guarda deu ZERO falhas — o ponto 3 tinha 54/47 palavras e o
 * ponto 5 tinha 43/43, ambos acima do limiar de 35. A contagem de palavras
 * mede a dimensão errada: o defeito real não é "pouco texto", é "poucas
 * frases" — o mesmo conteúdo pode ser uma única frase longa (muitas
 * palavras, zero desenvolvimento em frases distintas) ou três frases
 * curtas bem separadas. O critério 33 exige explicitamente um mínimo de
 * FRASES por ponto, não de palavras.
 *
 * Por isso a guarda conta frases, não palavras — com um cuidado técnico
 * específico: o próprio marcador do ponto ("3. ", "5. ") tem de ser
 * removido do início do texto antes de contar, senão o ponto final desse
 * marcador é contado como um falso terminador de frase e infla a
 * contagem em +1 sempre. Continua a ser uma heurística, não um parser de
 * português real — números decimais ("0.890") não geram falso positivo
 * porque a regra exige espaço a seguir ao ponto antes de aceitar como fim
 * de frase, e abreviaturas seguidas de maiúscula ("Prof. Silva") continuam
 * a ser o caso residual não coberto, tal como seria com qualquer heurística
 * de fronteira de frase em português corrido.
 *
 * Não reescreve nada — só um LLM escreve prosa nova, boa. Só GARANTE que a
 * falha, quando existe, entra sempre na lista de falhas que alimenta a
 * reescrita, com a contagem exacta de frases — mesmo que a crítica desta
 * chamada em particular a tenha deixado passar.
 */
function contarFrases(pontoComMarcador: string): number {
  const semMarcador = pontoComMarcador.replace(/^\s*\d+\.\s*/, "").trim();
  if (!semMarcador) return 0;
  const terminadores = semMarcador.match(/[.!?](?=\s+[A-ZÀ-ÖØ-Ý0-9"«]|\s*$)/g);
  return terminadores ? terminadores.length : 0;
}

/**
 * GUARDA DETERMINÍSTICA — PERGUNTA ESPECÍFICA SEM RESPOSTA DIRECTA
 * (critério 36) — o mesmo tipo de lacuna do critério 35: o critério 28
 * da crítica (RESPOSTA DIRECTA À PERGUNTA ESPECÍFICA) só era verificado
 * pelo julgamento do próprio LLM na 2ª chamada, nunca por código — apesar
 * de INSTRUCAO_PERGUNTA_ESPECIFICA (promptAdulto.ts) exigir, sempre que
 * existe pergunta específica declarada, que a secção "Leitura por opção"
 * abra com a frase-molde exacta "A pergunta [...] tem resposta directa:
 * [...]". Sem guarda determinística, nada garantia que essa frase
 * sobrevivesse a uma reescrita, e o cliente podia (como reportado
 * directamente pelo Rui, sobre o seu próprio relatório) ver a pergunta
 * que escreveu simplesmente ignorada, sem nenhum critério automático a
 * apanhar isso. Verifica só a PRESENÇA da frase-molde ("tem resposta
 * directa:") dentro da secção — nunca o conteúdo da resposta em si, para
 * nunca arriscar alterar qual opção o perfil sustenta.
 */
export function verificarRespostaPerguntaEspecifica(texto: string, perguntaEspecifica: string | null | undefined): string[] {
  if (!perguntaEspecifica || !perguntaEspecifica.trim()) return [];

  const inicioSeccao = texto.indexOf(`## ${SECCAO_TITULOS.leituraPorOpcao}`);
  if (inicioSeccao === -1) return []; // ausência da secção é falha de outro critério

  const buscaFimSeccao = texto.indexOf("\n## ", inicioSeccao + 1);
  const fimSeccao = buscaFimSeccao === -1 ? texto.length : buscaFimSeccao;
  const seccao = texto.slice(inicioSeccao, fimSeccao);

  if (seccao.includes("tem resposta directa:")) return [];

  return [
    `36. PERGUNTA ESPECÍFICA SEM RESPOSTA DIRECTA (guarda determinística): existe uma pergunta específica declarada ("${perguntaEspecifica.slice(0, 80)}"), mas a secção "${SECCAO_TITULOS.leituraPorOpcao}" não contém a frase-molde obrigatória "tem resposta directa:" (ver INSTRUCAO_PERGUNTA_ESPECIFICA). A pergunta da pessoa não pode ficar sem essa resposta directa, no formato exacto exigido, logo no início da secção.`,
  ];
}

export function verificarProfundidadeLeituraPorOpcao(texto: string): string[] {
  const falhasExtra: string[] = [];
  const MIN_FRASES_POR_PONTO = 3;
  // HISTÓRICO DO LIMIAR (ronda "Alexandra 7"): a primeira versão desta
  // guarda com contagem de frases deu 2 falsos positivos contra o texto
  // real de então (economia, pontos 1 e 2: 128 e 96 palavras em 2 frases
  // compostas, não marcados como falha pela crítica). Corrigido então com
  // um tecto de palavras (65) para só falhar quando havia poucas frases E
  // poucas palavras.
  //
  // REVERTIDO (ronda "Alexandra 8", root cause confirmada com dados reais
  // novos): a MESMA estrutura (2 frases densas, ~90-111 palavras) voltou a
  // aparecer — desta vez marcada como FALHA pela própria crítica LLM
  // ("gestão" ponto 2: ~90 palavras/2 frases; "economia" pontos 1 e 2:
  // ~111 e ~90 palavras/2 frases, todos com o tecto de 65 a bloqueá-los
  // silenciosamente). Ou seja, a mesma estrutura de texto foi considerada
  // aceitável numa ronda e falha noutra — confirma o que já estava
  // documentado nesta base de código (a crítica julga o mesmo tipo de
  // texto de forma inconsistente entre chamadas) e prova que um tecto de
  // palavras não separa fiavelmente "frase composta bem desenvolvida" de
  // "ponto insuficiente" — não existe esse sinal no texto. A instrução
  // original do critério 33 exige sempre "pelo menos 3-4 frases", nunca
  // menciona palavras — por isso a guarda volta a essa definição literal.
  // O custo de um falso positivo ocasional (um ponto de 2 frases genuinamente
  // bem desenvolvido a ganhar mais uma frase na reescrita) é baixo — a
  // secção já é suposta ser "a mais desenvolvida do relatório inteiro"; o
  // custo de um falso negativo (o defeito real a passar sem ser apanhado
  // por nenhuma das duas camadas) é o próprio bug que esta guarda existe
  // para eliminar.

  const inicioSeccao = texto.indexOf(`## ${SECCAO_TITULOS.leituraPorOpcao}`);
  if (inicioSeccao === -1) return falhasExtra;
  const buscaFim = texto.indexOf("\n## ", inicioSeccao + 1);
  const fimSeccao = buscaFim === -1 ? texto.length : buscaFim;
  const seccao = texto.slice(inicioSeccao, fimSeccao);

  const blocos = seccao.split(/\n(?=### )/).slice(1);
  for (const bloco of blocos) {
    const nomeOpcao = bloco.split("\n", 1)[0].replace(/^###\s*/, "").trim();
    const pontos = bloco.split(/\n(?=\d\.\s)/).filter((p) => /^\d\.\s/.test(p.trim()));
    for (const ponto of pontos) {
      const numeroMatch = ponto.match(/^(\d)\./);
      if (!numeroMatch) continue;
      const numero = Number(numeroMatch[1]);
      if (numero === 6) continue; // conclusão-molde de formato fixo, não sujeita ao mínimo de desenvolvimento dos pontos 1-5
      const frases = contarFrases(ponto);
      if (frases >= MIN_FRASES_POR_PONTO) continue;
      falhasExtra.push(
        `33. PROFUNDIDADE DA LEITURA POR OPÇÃO (guarda determinística, contagem automática): o ponto ${numero} do bloco "### ${nomeOpcao}" tem só ${frases} frase(s) — abaixo do mínimo de ${MIN_FRASES_POR_PONTO} frases reais exigido. Expande com conteúdo real e específico desta pessoa, nunca frases de enchimento.`,
      );
    }
  }
  return falhasExtra;
}

/**
 * Junta as falhas encontradas pela crítica LLM (`parseCritica`) com as que
 * uma guarda determinística tenha encontrado por conta própria (ver
 * `verificarProfundidadeLeituraPorOpcao`) — usada sempre que uma guarda
 * deste tipo corre a par da crítica, para nenhuma das duas fontes ficar
 * calada por a outra ter, nesta chamada em particular, dado o critério
 * como PASSA. Nunca duplica: se a crítica já falhou o critério 33 (ou
 * outro que uma guarda determinística venha a cobrir no futuro), as falhas
 * extra da guarda somam-se às da crítica em vez de as substituir — mais
 * detalhe accionável para a reescrita, nunca menos.
 */
export function combinarFalhasComGuardas(resultadoCritica: ResultadoCritica, falhasExtra: string[]): ResultadoCritica {
  if (!falhasExtra.length) return resultadoCritica;
  return {
    ...resultadoCritica,
    falhas: [...resultadoCritica.falhas, ...falhasExtra],
    todosPassaram: false,
  };
}

/**
 * GUARDAS DETERMINÍSTICAS — PALAVRA "CARTA" (critério 20) E PRIMEIRA
 * PESSOA DO PLURAL (critério 9) — mesma classe de bug que já motivou
 * reforço de prompt antes, para as duas regras (ver "PROIBIDO USAR A
 * PALAVRA 'CARTA'" e "PROIBIDO: primeira pessoa do plural" em
 * promptAdulto.ts/promptAdolescente.ts — as duas já documentadas no
 * próprio texto do prompt como tendo reincidido uma vez antes de esta
 * guarda existir: "carta" já tinha sido apanhado dentro de um bloco de
 * candidata fora da lista, e "nomeámos" já tinha sido apanhado antes de
 * "vimos"). Confirmado outra vez em produção real (ronda "Alexandra 8"):
 * "carta" reapareceu numa secção nova ("Quem é": "está na tua carta
 * ligado a Cancer", "numa mesma zona da tua carta") e "vimos" — já um
 * exemplo EXPLICITAMENTE banido no próprio texto da regra — escapou em
 * "como já vimos". Cada reforço textual só resolveu a localização onde
 * tinha sido apanhado da vez anterior, nunca o padrão geral — por isso
 * sai da responsabilidade do LLM, tal como as guardas acima.
 *
 * As duas são bans de palavra/frase exacta, sem nenhuma ambiguidade de
 * julgamento de conteúdo (ao contrário de "profundidade", que precisa de
 * uma heurística) — o tipo mais seguro de verificar em código: zero risco
 * de falso positivo por reformulação legítima, porque a própria regra do
 * prompt já as proíbe sem excepção, em qualquer contexto.
 */
const PADRAO_PALAVRA_CARTA = /\b(carta|mapa astral|mapa natal)\b/gi;

const VERBOS_PRIMEIRA_PESSOA_PLURAL_PROIBIDOS = [
  "vimos",
  "identificámos",
  "calculámos",
  "sabemos",
  "analisámos",
  "concluímos",
  "nomeámos",
  "referimos",
  "notámos",
  "observámos",
  "confirmámos",
  "verificámos",
  "apontámos",
  "mostrámos",
  "explicámos",
  "encontrámos",
  "detectámos",
  "reconhecemos",
  "percebemos",
  "entendemos",
  "afirmámos",
  "sugerimos",
  "indicámos",
  "registámos",
  "constatámos",
  "apurámos",
  "avaliámos",
  "comparámos",
  "testámos",
  "revelámos",
  "seguimos",
  "consideramos",
];
const PADRAO_PRIMEIRA_PESSOA_PLURAL = new RegExp(`\\b(${VERBOS_PRIMEIRA_PESSOA_PLURAL_PROIBIDOS.join("|")})\\b`, "gi");

function encontrarOcorrenciasUnicas(texto: string, padrao: RegExp): string[] {
  const encontradas = new Set<string>();
  const regexGlobal = new RegExp(padrao.source, padrao.flags.includes("g") ? padrao.flags : `${padrao.flags}g`);
  let m: RegExpExecArray | null;
  while ((m = regexGlobal.exec(texto))) {
    encontradas.add(m[0].toLowerCase());
    if (regexGlobal.lastIndex === m.index) regexGlobal.lastIndex++; // guarda contra match vazio (nunca deve acontecer aqui, mas evita loop infinito)
  }
  return Array.from(encontradas);
}

export function verificarPalavraCarta(texto: string): string[] {
  const encontradas = encontrarOcorrenciasUnicas(texto, PADRAO_PALAVRA_CARTA);
  if (!encontradas.length) return [];
  return [
    `20. PALAVRA "CARTA" (guarda determinística, contagem automática): o texto usa ${encontradas.map((e) => `"${e}"`).join(", ")} — proibido em todo o relatório sem excepção, usa sempre "perfil".`,
  ];
}

export function verificarPrimeiraPessoaPlural(texto: string): string[] {
  const encontradas = encontrarOcorrenciasUnicas(texto, PADRAO_PRIMEIRA_PESSOA_PLURAL);
  if (!encontradas.length) return [];
  return [
    `9. PRIMEIRA PESSOA PLURAL (guarda determinística, contagem automática): o texto usa ${encontradas.map((e) => `"${e}"`).join(", ")} — verbo(s) na 1ª pessoa do plural ("nós"), proibido; reescreve com "o perfil"/"os dados" como sujeito da frase.`,
  ];
}
