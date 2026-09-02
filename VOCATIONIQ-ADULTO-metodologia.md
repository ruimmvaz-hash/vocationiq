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
- A leitura por opção declarada.

**Desalinhamento já resolvido:** o `IntakeForm.tsx` já mostra e envia `tipoMudanca`, `areasDestino`, `areasDestinoOutra` e `ideiaConcreta` correctamente.

---

## 1 · OPÇÕES DECLARADAS — a fonte muda consoante o que o formulário entregar

A `SPEC-vocacional.md` exige opções declaradas como input obrigatório. `areasDestino` é a lista de opções declaradas (até ~30 áreas concretas, em 7 categorias, mais "outra" e "ainda não sei"), e `tipoMudanca` diz a NATUREZA da mudança pedida — um eixo diferente e complementar, não um substituto de `areasDestino`.

### 1.1 · Caminho principal — quando `areasDestino` vem preenchido

Cada valor de `areasDestino` (excepto "outra"/"ainda-nao-sei") é uma opção declarada e segue directamente para a leitura em 4 partes (secção 2).

**NUNCA fazer correspondência literal ao slug de `AREAS_DESTINO` contra o nosso `catalogo-destinos.json`** — são dois vocabulários diferentes. Trata o valor de `areasDestino` como o NOME da opção e deriva a leitura de raiz a partir das tabelas técnicas — nunca por lookup de string.

Se `tipoMudanca` também vier preenchido, usa-o para calibrar a secção 4 de cada leitura — ex.: se `tipoMudanca` inclui "trabalhar-conta-propria" ou "abrir-negocio", a leitura tem de responder explicitamente se a carta sustenta trabalho a solo nessa opção.

### 1.2 · "Outra" e "ideiaConcreta"

Se `areasDestino` incluir "outra", o texto de `areasDestinoOutra` é a opção declarada. `ideiaConcreta`, quando vier preenchido, entra como contexto adicional — nunca como opção extra por si só.

### 1.3 · Plano de reserva — só quando `areasDestino` vier vazio ou só "ainda-nao-sei"

Extrai candidatas do texto livre (`paraOndeQuerIr`, `perguntaEspecifica`, `ideiaConcreta`). Se conseguires 2 ou mais candidatas distintas, seguem para a secção 2. Se não conseguires nenhuma clara, não bloqueies a geração — escreve o que a carta sustenta em geral (Eixo da Missão + Modo de Ganho) e resolve a resposta inteira pela candidata fora da lista (secção 3). A revisão humana fica para apanhar erros, não para completar dados em falta.

---

## 2 · A LEITURA, POR OPÇÃO

Para cada opção candidata, sempre as quatro partes:

1. **O que a carta sustenta** — camadas contadas, citando a `MissionAxis`, o `EarningMode` dominante, e a intersecção com os índices do catálogo quando a opção cruza com os planetas/mansões fortes da pessoa.

2. **O que lhe vai custar** — não o risco genérico da profissão; o custo que ESTA carta paga nesta escolha (ex.: planeta debilitado envolvido, casa fraca em SAV, exigência de parceria quando a pessoa tende a agir sozinha).

3. **O que esta escolha lhe vai pedir e ela não tem** — e se é coisa que se aprende ou coisa que não muda.

4. **Onde entra a matéria dela nesta opção** — nunca o sector como resposta, sempre a forma/função. Usa `Modo de Ganho` (2/6/10) para decidir se a matéria dela entra pela voz/consultoria, pela resolução directa de problemas, ou pela liderança/execução pública — nunca pelo nome do sector sozinho.

**Peso de cada camada:**
`peso_planeta = estado × (SAV_da_casa_que_ocupa / 28,1)`
aplicado a CADA planeta relevante isoladamente.

Tabela de `estado`:
- exaltado: 1,5
- próprio: 1,25
- amigo: 1,1
- neutro: 1,0
- inimigo: 0,85
- debilitado: 0,6

---

## 3 · A CANDIDATA FORA DA LISTA

No fim, no máximo uma opção que não estava declarada, derivada por convergência de pelo menos 4 camadas independentes (Eixo da Missão, Modo de Ganho, Montra de Mercado, SAV por casa, regência funcional, D10 angular). Se não houver 4 a convergir, o relatório diz isso e pára — "a tua carta não aponta a nada fora do que já pensaste" é resposta válida.

---

## 4 · REGRAS DE ESCRITA

Reaproveita sem alterações do motor bom da Naveya (M-008/M-009):
- Zero jargão astrológico visível
- Sujeito da frase = a pessoa
- Economia (regra 10)
- Zero fatalismo
- Horizonte de datas (regra 15)
- Nunca veredicto fechado ("deves ir para X" proibido)

**Diferença deliberada:** para o adulto em mudança de carreira, tom directo, sem gíria de coach, sem emojis. Tratamento por "você" implícito, como o Life Report adulto da Naveya.

**Proibição específica:** nunca o padrão genérico de coaching — "identifica 3 exemplos, embrulha num método, oferece o serviço" — sem a ligação explícita e citável a uma camada calculada. Cada frase de conselho tem de citar o facto técnico que a sustenta.

---

## 5 · ESTRUTURA DO RELATÓRIO

1. Abertura — nome, dados, situação declarada (nunca abrir sem quadro de dados).
2. O que a carta sustenta, em geral — Eixo da Missão + Modo de Ganho, traduzidos, sem ainda nomear as opções.
3. Uma leitura por opção (secção 2) — todas as candidatas, mesmo as fracas.
4. A candidata fora da lista, se existir (secção 3).
5. O plano — datas reais do relógio (Vimshottari + trânsitos lentos relevantes), um primeiro passo accionável esta semana, nunca um plano genérico de 90 dias sem ligação às datas calculadas.

---

## 6 · O QUE ESTE DOCUMENTO NÃO RESOLVE

- Não inclui o ramo jovem/universitário — só o ramo `trabalho-quero-mudar`. Os outros ramos ficam para spec separada.
