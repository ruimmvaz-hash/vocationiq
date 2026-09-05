# VOCATIONIQ ADULTO — metodologia de geração (ramo "trabalho-quero-mudar")

2 de Setembro de 2026. Para o repositório `ruimmvaz-hash/vocationiq` — não existe ainda motor de redacção neste repositório; este documento e o módulo de referência que o acompanha (`webWiring/promptAdulto.ts`) são o ponto de partida proposto.

---

## 0 · O QUE JÁ EXISTE E O QUE FALTA

**Já existe, sem alterações necessárias:**
- `method-engine` — cópia exacta do motor da Naveya. `computeVocationIQAxes(d1)` já devolve Eixo da Missão (Atmakaraka+Karakamsha), Amatyakaraka, Modo de Ganho (Artha Trikonas 2/6/10), Montra de Mercado (Arudha Lagna + casa 11 a partir dela), regentes angulares do D10, stelliums D1/D10.
- `web/src/lib/validation.ts` — já validado e à espera de uso, ramo `trabalho-quero-mudar`: `areaTrabalhoActual`, `anosExperiencia` (obrigatórios), `oQueNaoFunciona`, `tipoMudanca` (multi-escolha), `areasDestino` (multi-escolha, 7 categorias), `areasDestinoOutra`, `ideiaConcreta`, `paraOndeQuerIr` (opcionais); passo 3: `contextoAdicional`, `perguntaEspecifica`.
- O fluxo de revisão humana antes da entrega (48h) — `app/revisao/`.

**Não existe, é o que este documento define:**
- A rota que liga intake → tabelas técnicas → texto do relatório.
- A leitura por opção declarada (catálogo desta semana: `SPEC-vocacional.md`, `CODE-7-catalogo.md`, `SPEC-pontuacao-catalogo.md`, os `catalogo-*.json`).

**Desalinhamento a corrigir antes de ligar isto a produção (não é deste documento, é do `IntakeForm.tsx`):** o ecrã que a pessoa preenche ainda não mostra nem envia `tipoMudanca`, `areasDestino`, `areasDestinoOutra` nem `ideiaConcreta` — só o validador os aceita. Enquanto o formulário não for actualizado, ninguém consegue declarar opções pela via fechada, e este documento cai automaticamente no plano de reserva da secção 1.3.

---

## 1 · OPÇÕES DECLARADAS — a fonte muda consoante o que o formulário entregar

A `SPEC-vocacional.md` exige opções declaradas como input obrigatório. **Isso já existe no validador**, não precisa de ser inventado: `areasDestino` é a lista de opções declaradas (até ~30 áreas concretas, em 7 categorias, mais "outra" e "ainda não sei"), e `tipoMudanca` diz a NATUREZA da mudança pedida (mudar de área, evoluir na mesma, ir para conta própria, voltar a estudar, mais significado, sair de ambiente tóxico, etc.) — um eixo diferente e complementar, não um substituto de `areasDestino`.

### 1.1 · Caminho principal — quando `areasDestino` vem preenchido

Cada valor de `areasDestino` (excepto "outra"/"ainda-nao-sei", tratados à parte) é uma opção declarada e segue directamente para a leitura em 4 partes (secção 2). **Nunca faças correspondência literal ao slug de `AREAS_DESTINO` (ex.: "consultoria", "programacao") contra o nosso `catalogo-destinos.json`** — são dois vocabulários diferentes, um voltado para quem preenche o formulário, outro derivado da carta. Trata o valor de `areasDestino` como o NOME da opção (o que aparece no relatório) e deriva a leitura de raiz a partir das tabelas técnicas, tal como fizemos no teste cego desta semana — nunca por lookup de string.

Se `tipoMudanca` também vier preenchido, usa-o para calibrar a secção 4 de cada leitura ("onde entra a matéria dela nesta opção") — ex.: se `tipoMudanca` inclui "trabalhar-conta-propria" ou "abrir-negocio", a leitura tem de responder explicitamente se a carta sustenta trabalho a solo nessa opção (ver Modo de Ganho — casas 2/6/10 — e se o regente dos ganhos está em casa de parceria, como já vimos no teu próprio mapa).

### 1.2 · "Outra" e "ideiaConcreta"

Se `areasDestino` incluir "outra", o texto de `areasDestinoOutra` é a opção declarada (é campo obrigatório nesse caso, o validador já impõe isso). `ideiaConcreta`, quando vier preenchido, entra como contexto adicional a cruzar com as opções — nunca como opção extra por si só.

### 1.3 · Plano de reserva — só quando `areasDestino` vier vazio ou só "ainda-nao-sei"

Enquanto o `IntakeForm.tsx` não estiver actualizado (ver nota na secção 0), ou para quem genuinamente marcar só "ainda não sei": extrai candidatas do texto livre (`paraOndeQuerIr`, `perguntaEspecifica`, `ideiaConcreta`). Se conseguires 2 ou mais candidatas distintas, seguem para a secção 2 na mesma. Se não conseguires nenhuma clara, não bloqueies a geração — o sistema tem de ser autónomo, não depender de alguém a preencher o que falta: escreve o que a carta sustenta em geral (Eixo da Missão + Modo de Ganho) e resolve a resposta inteira pela candidata fora da lista (secção 3), que não depende de nenhuma opção declarada para existir. A revisão humana antes da entrega fica para apanhar erros, não para completar dados em falta.

---

## 2 · A LEITURA, POR OPÇÃO — reaproveita SPEC-vocacional.md §1 tal e qual

Para cada opção candidata (extraída ou declarada), sempre as quatro partes:

1. **O que a carta sustenta** — camadas contadas, citando a `MissionAxis`, o `EarningMode` dominante, e a intersecção com os índices do catálogo (`catalogo-indice-planetas.json`, `-nakshatras.json`, `-combinacoes.json`) quando a opção cruza com os planetas/mansões fortes da pessoa.
2. **O que lhe vai custar** — não o risco genérico da profissão; o custo que ESTA carta paga nesta escolha (ex.: planeta debilitado envolvido, casa fraca em SAV, exigência de parceria quando a pessoa tende a agir sozinha).
3. **O que esta escolha lhe vai pedir e ela não tem** — e se é coisa que se aprende ou coisa que não muda.
4. **Onde entra a matéria dela nesta opção** — a peça mais importante e a que falha mais facilmente (ver a falha registada no motor da Naveya, `RUNQ2`/regra 25 de `CASOS-VIOLADORES.md`): nunca o sector como resposta, sempre a forma/função. Usa `Modo de Ganho` (2/6/10) para decidir se a matéria dela entra pela voz/consultoria, pela resolução directa de problemas, ou pela liderança/execução pública — nunca pelo nome do sector sozinho.

**Peso de cada camada** — usa `SPEC-pontuacao-catalogo.md`, com as duas correcções já fechadas nesta semana:
- `peso_planeta = estado × (SAV_da_casa_que_ocupa / 28,1)` aplicado a CADA planeta relevante isoladamente, nunca só ao par.
- Tabela de `estado`: exaltado 1,5 · próprio 1,25 · amigo 1,1 · neutro 1,0 · inimigo 0,85 · debilitado 0,6 (dignidade clássica — já disponível em `dignidade`/`Panchadha Maitri` no `method-engine`, não precisa de recálculo, só de mapear os rótulos existentes para estes números).

---

## 3 · A CANDIDATA FORA DA LISTA — SPEC-espinha.md, sem alterações

No fim, no máximo uma opção que não estava declarada, derivada por convergência de pelo menos 4 camadas independentes (Eixo da Missão, Modo de Ganho, Montra de Mercado, SAV por casa, regência funcional, D10 angular — as mesmas fontes já calculadas por `computeVocationIQAxes`, nunca uma quinta fonte nova). Se não houver 4 a convergir, o relatório diz isso e pára — "a tua carta não aponta a nada fora do que já pensaste" é resposta válida.

---

## 4 · REGRAS DE ESCRITA — herdadas do M-008/M-009 da Naveya, com uma diferença

Reaproveita sem alterações: zero jargão astrológico visível (mesma lista de termos proibidos), regra do sujeito = a pessoa, economia (regra 10), zero fatalismo, HORIZONTE de datas (regra 15), nunca veredicto fechado ("deves ir para X" proibido).

**Diferença deliberada:** o VocationIQ jovem trata por "tu", tom de mentor cool. Para o adulto em mudança de carreira, o tom certo é mais próximo do Naveya adulto — directo, sem gíria de coach, sem emojis 🥇🥈🥉 (esses ficam só para o produto jovem). Trate por "você" implícito, como o Life Report adulto da Naveya.

**Proibição específica deste produto, aprendida com o teste da semana passada:** nunca o padrão genérico de coaching de carreira — "identifica 3 exemplos, embrulha num método, oferece o serviço" — sem a ligação explícita e citável a uma camada calculada. Cada frase de conselho tem de citar, mesmo que traduzido, o facto técnico que a sustenta (ver critério 25 do `CASOS-VIOLADORES.md` da Naveya: nunca afirmar mais do que os factos citados sustentam).

---

## 5 · ESTRUTURA DO RELATÓRIO

1. Abertura — nome, dados, situação declarada (respeita o critério D da Naveya: nunca abrir sem quadro de dados).
2. O que a carta sustenta, em geral — Eixo da Missão + Modo de Ganho, traduzidos, sem ainda nomear as opções.
3. Uma leitura por opção (secção 2 deste documento) — todas as candidatas extraídas/declaradas, mesmo as fracas.
4. A candidata fora da lista, se existir (secção 3).
5. O plano — datas reais do relógio (Vimshottari + trânsitos lentos relevantes), um primeiro passo accionável esta semana, nunca um plano genérico de 90 dias sem ligação às datas calculadas.

---

## 6 · O QUE ESTE DOCUMENTO NÃO RESOLVE

- Não decide se o campo de opções declaradas deve ser acrescentado ao formulário — fica registado como recomendação (secção 1.4), decisão do Code/Alice.
- Não inclui o ramo jovem/universitário deste produto — só o ramo `trabalho-quero-mudar`, por ser a prioridade desta semana. Os outros ramos (estudante, universitário) reaproveitam mais directamente o que já existe no motor da Naveya para jovens, com ajustes menores — spec separada quando for a vez.
