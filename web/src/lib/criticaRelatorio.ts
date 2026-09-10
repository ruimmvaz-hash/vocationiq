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
     planetária sem incluir "(avastha)" e o nome técnico entre
     parênteses: FALHA — reescrita obrigatória.

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

 24. EXPLICAÇÃO COMPLETA DOS GRÁFICOS (correcção do especialista,
     pós-PDF real): confirma que existem os 4 blocos
     "EXPLICAÇÃO_GRÁFICO:" — peso, competencias, vida, ganho — em
     qualquer ponto do rascunho. Para cada um:
     (a) tem um parágrafo de abertura antes da primeira linha
         "LINHA_GRÁFICO:" (o que o gráfico é, de onde vêm os números,
         como ler a escala)?
     (b) tem o número exacto de linhas "LINHA_GRÁFICO:" — 7 para peso
         (Sol/Lua/Marte/Mercúrio/Júpiter/Vénus/Saturno), 6 para
         competencias, 8 para vida, 3 para ganho — nenhuma categoria
         pode faltar?
     (c) cada linha tem as DUAS camadas (o que a categoria significa em
         geral + o que o valor específico desta pessoa significa,
         citando o número real), nunca só uma frase genérica que serviria
         para qualquer pessoa?
     (d) para "ganho": a linha da casa dominante nomeia explicitamente o
         rótulo do gráfico (ex.: "Liderando publicamente") e, se os
         dados técnicos de "Modo de Ganho" trouxerem a nuance de "casa de
         bastidores", a linha resolve de frente a aparente contradição
         entre o rótulo do gráfico e essa nuance — nunca a deixa por
         esclarecer?
     Se falhar (a), (b) ou (c) para qualquer um dos 4: FALHA — bloco em
     falta ou incompleto, reescrita obrigatória. Se falhar (d): FALHA —
     a barra dominante fica a contradizer o texto, exactamente o problema
     que esta correcção existe para resolver.

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
     Se falhar (a) ou (b): FALHA — reescrita obrigatória da abertura da
     secção afectada. Se falhar (c): cita o nome exacto da candidata que
     contradiz sem explicação — FALHA, reescrita dessa candidata.

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
     planetária sem incluir "(avastha)" e o nome técnico entre
     parênteses: FALHA — reescrita obrigatória.

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

 24. EXPLICAÇÃO COMPLETA DOS GRÁFICOS (correcção do especialista,
     pós-PDF real): confirma que existem os 4 blocos
     "EXPLICAÇÃO_GRÁFICO:" — peso, competencias, vida, ganho — em
     qualquer ponto do rascunho. Para cada um:
     (a) tem um parágrafo de abertura antes da primeira linha
         "LINHA_GRÁFICO:" (o que o gráfico é, de onde vêm os números,
         como ler a escala)?
     (b) tem o número exacto de linhas "LINHA_GRÁFICO:" — 7 para peso
         (Sol/Lua/Marte/Mercúrio/Júpiter/Vénus/Saturno), 6 para
         competencias, 8 para vida, 3 para ganho — nenhuma categoria
         pode faltar?
     (c) cada linha tem as DUAS camadas (o que a categoria significa em
         geral + o que o valor específico desta pessoa significa,
         citando o número real), nunca só uma frase genérica que serviria
         para qualquer pessoa?
     (d) para "ganho": a linha da casa dominante nomeia explicitamente o
         rótulo do gráfico (ex.: "Liderando publicamente") e, se os
         dados técnicos de "Modo de Ganho" trouxerem a nuance de "casa de
         bastidores", a linha resolve de frente a aparente contradição
         entre o rótulo do gráfico e essa nuance — nunca a deixa por
         esclarecer?
     Se falhar (a), (b) ou (c) para qualquer um dos 4: FALHA — bloco em
     falta ou incompleto, reescrita obrigatória. Se falhar (d): FALHA —
     a barra dominante fica a contradizer o texto, exactamente o problema
     que esta correcção existe para resolver.

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
     Se falhar (a) ou (b): FALHA — reescrita obrigatória da abertura da
     secção afectada. Se falhar (c): cita o nome exacto da candidata que
     contradiz sem explicação — FALHA, reescrita dessa candidata.

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
}

export interface ResultadoCritica {
  criterios: CriterioCritica[];
  falhas: string[];
  /** `null` quando a resposta não seguiu o formato pedido em nenhuma linha — nunca se assume "passou tudo" nesse caso, mas também não se força uma reescrita sobre dados não interpretáveis (ver storage.ts/route.ts: crítica não parseável fica registada, sem reescrita automática). */
  todosPassaram: boolean | null;
}

const REGEX_LINHA_CRITERIO = /^\s*(\d{1,2})\.\s*([^:]+):\s*(PASSA|FALHA)\b\s*(?:[-–—]\s*(.*))?$/gim;

/** Extrai os até 12 critérios "N. NOME: PASSA|FALHA — detalhe" da resposta da crítica. Nunca lança erro em formato inesperado — devolve o que conseguir parsear. */
export function parseCritica(textoCritica: string): ResultadoCritica {
  const criterios: CriterioCritica[] = [];
  let match: RegExpExecArray | null;
  REGEX_LINHA_CRITERIO.lastIndex = 0;
  while ((match = REGEX_LINHA_CRITERIO.exec(textoCritica))) {
    criterios.push({
      numero: Number(match[1]),
      nome: match[2].trim(),
      passa: match[3].toUpperCase() === "PASSA",
      detalhe: (match[4] ?? "").trim(),
    });
  }
  const falhas = criterios.filter((c) => !c.passa).map((c) => `${c.numero}. ${c.nome}${c.detalhe ? `: ${c.detalhe}` : ""}`);
  return { criterios, falhas, todosPassaram: criterios.length ? falhas.length === 0 : null };
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
const INSTRUCAO_REESCRITA = `Reescreve este relatório corrigindo APENAS as falhas identificadas abaixo.
Não alteres o que está correcto.
Mantém todos os marcadores machine-readable (FRASE_ABERTURA:, IDENTIDADE:, DOM:, LIMITAÇÃO:, SÍNTESE:, INSIGHT:, FORÇA:, SELECÇÃO_CANDIDATAS:, GRUPO:, CANDIDATA:, PRIMEIRO PASSO:) e todos os cabeçalhos "## " das 6 secções, incluindo "## Quem é".
Se alguma falha for de APRESENTAÇÃO DAS CANDIDATAS (força REAPRESENTAÇÃO DA POOL COMPLETA): volta à secção "Candidatas do catálogo" (e "Grupos de candidatas") no prompt técnico (A, abaixo) e apresenta TODAS as candidatas da pool completa que ligam com clareza a um dom já nomeado em "Quem é" — sem tecto de 3, agrupando as de convergência de base quase idêntica sob um único bloco "GRUPO:" em vez de repetir a mesma explicação por candidata; nunca inventes uma ligação para uma candidata que não a tenha, nem omitas uma que a tenha só porque já há outras.`;

export function construirPromptReescrita(promptTecnico: string, rascunhoOriginal: string, falhas: string[]): string {
  return `${INSTRUCAO_REESCRITA}\nFalhas a corrigir:\n${falhas.map((f) => `- ${f}`).join("\n")}\n\n=== A) PROMPT TÉCNICO ORIGINAL ===\n${promptTecnico}\n\n=== B) RELATÓRIO ORIGINAL ===\n${rascunhoOriginal}`;
}
