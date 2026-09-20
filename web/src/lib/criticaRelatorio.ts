import { SECCAO_TITULOS } from "@naveya/method-engine";

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
     TODOS presentes, cada um como o seu próprio parágrafo com pelo
     menos 3 frases — nunca um resumo de 1-2 frases a seguir ao
     cabeçalho, nunca um ponto ausente, nunca um ponto reduzido a uma
     única frase-conclusão. Lista, para cada opção, quantos dos 6
     pontos encontraste e quantas frases tinha o mais curto deles.
     Se QUALQUER opção declarada tiver menos de 6 pontos numerados, ou
     algum desses pontos tiver menos de 3 frases: FALHA — reescrita
     obrigatória dessa opção (e de qualquer outra na mesma condição),
     expandindo cada ponto em falta ou raso para o mesmo nível de
     desenvolvimento já exigido no prompt técnico — nunca aceitar a
     versão resumida só porque tecnicamente cobre o tema.

 Para cada critério:
 PASSA ou FALHA — e se falha, exactamente o que está errado.
 Formato:
 1. TOM: PASSA
 2. REPETIÇÃO: FALHA — [detalhe]`;

export function construirPromptCritica(promptTecnico: string, rascunho: string): string {
  return `${INSTRUCAO_CRITICA}\n\n=== A) PROMPT TÉCNICO ENVIADO ===\n${promptTecnico}\n\n=== B) RASCUNHO GERADO ===\n${rascunho}`;
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
     TODOS presentes, cada um como o seu próprio parágrafo com pelo
     menos 3 frases — nunca um resumo de 1-2 frases a seguir ao
     cabeçalho, nunca um ponto ausente, nunca um ponto reduzido a uma
     única frase-conclusão. Lista, para cada opção, quantos dos 6
     pontos encontraste e quantas frases tinha o mais curto deles.
     Se QUALQUER opção declarada tiver menos de 6 pontos numerados, ou
     algum desses pontos tiver menos de 3 frases: FALHA — reescrita
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

 Para cada critério:
 PASSA ou FALHA — e se falha, exactamente o que está errado.
 Formato:
 1. TOM: PASSA
 2. REPETIÇÃO: FALHA — [detalhe]`;

export function construirPromptCriticaAdolescente(promptTecnico: string, rascunho: string): string {
  return `${INSTRUCAO_CRITICA_ADOLESCENTE}\n\n=== A) PROMPT TÉCNICO ENVIADO ===\n${promptTecnico}\n\n=== B) RASCUNHO GERADO ===\n${rascunho}`;
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

const REGEX_LINHA_CRITERIO = /^\s*(\d{1,2})\.\s*([^:]+):\s*(PASSA|FALHA)\b\s*(?:[-–—]\s*(.*))?$/gim;

/** Total de critérios definidos em cada instrução de crítica (ver INSTRUCAO_CRITICA / INSTRUCAO_CRITICA_ADOLESCENTE) — usados por `parseCritica` para detectar cortes silenciosos. Actualizar sempre que um critério novo for acrescentado (auditoria de erros, Set 2026: 8192 tokens tinham ficado dimensionados para 23, quando já existiam 33/34 — exactamente o tipo de desfasamento que este total serve para apanhar). */
export const TOTAL_CRITERIOS_ADULTO = 33;
export const TOTAL_CRITERIOS_ADOLESCENTE = 34;

/**
 * Extrai os critérios "N. NOME: PASSA|FALHA — detalhe" da resposta da crítica. Nunca lança erro em formato inesperado — devolve o que conseguir parsear.
 *
 * AUDITORIA (correcção do especialista, ronda "auditoria de erros") — bug real encontrado: um critério que nunca aparece na resposta (porque a chamada foi cortada por `max_tokens`, ou o modelo simplesmente o saltou) ficava fora de `falhas` como se tivesse passado — nunca disparava reescrita. `totalEsperado` faz o oposto: qualquer número de 1 a `totalEsperado` que não tenha uma linha correspondente na resposta entra em `criteriosEmFalta` e é tratado como FALHA forçada (nunca como "não avaliado"). Passar `undefined` mantém o comportamento antigo (sem verificação de completude) — usado só onde o total de critérios não é conhecido à partida.
 */
export function parseCritica(textoCritica: string, totalEsperado?: number): ResultadoCritica {
  const criterios: CriterioCritica[] = [];
  let match: RegExpExecArray | null;
  // CORRECAO (ronda "regeneracao Alexandra 7", bug real confirmado por teste
  // isolado): a critica costuma escrever a linha de resumo como
  // "N. NOME: **FALHA** -- detalhe" (negrito so no veredicto quando e FALHA,
  // nunca em PASSA -- enfase natural do LLM no que precisa de accao). A regex
  // abaixo exige "PASSA"/"FALHA" logo a seguir aos dois pontos, sem nada pelo
  // meio -- "**" antes do veredicto quebra o match. Resultado real observado:
  // TODAS as linhas FALHA da seccao de resumo falhavam o parse (por causa do
  // negrito), entravam em `criteriosEmFalta` com o detalhe generico "Nao
  // avaliado nesta chamada... possivelmente truncada" em vez do motivo real
  // e especifico escrito pela propria critica -- e essa versao generica, sem
  // nenhuma accao concreta, e o que ia parar a `falhas` e alimentar o prompt
  // de reescrita. O resultado PASSA/FALHA final calhava a estar certo (uma
  // falha "perdida" ainda conta como falha forcada), mas a reescrita nunca
  // recebia o motivo verdadeiro -- so um aviso generico de "pode estar
  // truncado". Corrigido removendo toda a marcacao de negrito markdown ("**"
  // e "__") do texto ANTES de aplicar a regex -- nao muda nada semanticamente,
  // so a formatacao visual que a propria critica acrescenta.
  const textoLimpo = textoCritica.replace(/(\*\*|__)/g, "");
  REGEX_LINHA_CRITERIO.lastIndex = 0;
  while ((match = REGEX_LINHA_CRITERIO.exec(textoLimpo))) {
    criterios.push({
      numero: Number(match[1]),
      nome: match[2].trim(),
      passa: match[3].toUpperCase() === "PASSA",
      detalhe: (match[4] ?? "").trim(),
    });
  }

  const criteriosEmFalta: number[] = [];
  if (totalEsperado && criterios.length > 0) {
    const numerosPresentes = new Set(criterios.map((c) => c.numero));
    for (let n = 1; n <= totalEsperado; n++) {
      if (!numerosPresentes.has(n)) {
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

export function construirPromptReescrita(promptTecnico: string, rascunhoOriginal: string, falhas: string[]): string {
  return `${INSTRUCAO_REESCRITA}\nFalhas a corrigir:\n${falhas.map((f) => `- ${f}`).join("\n")}\n\n=== A) PROMPT TÉCNICO ORIGINAL ===\n${promptTecnico}\n\n=== B) RELATÓRIO ORIGINAL ===\n${rascunhoOriginal}`;
}
