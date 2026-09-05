# Estado do catálogo vocacional — 22 de Agosto de 2026

## (a) Versão que manda hoje

**`SPEC-vocacional.md`** (20/08). Diz sem ambiguidade: **"o catálogo deixa de escolher. Passa a descrever."** As opções que a pessoa já tem em cima da mesa passam a ser input obrigatório — sem elas, o gerador pára. Cada opção declarada recebe uma leitura em quatro partes (o que a carta sustenta / o que custa / o que pede e falta / onde entra a matéria da pessoa). No máximo uma sugestão extra fora da lista, nunca um ranking, derivada pelo método de `SPEC-espinha.md` (convergência de mínimo quatro camadas).

Justificação registada: no mapa da Melina, o catálogo antigo devolveu *direito · ciência política · artes do espectáculo* — "direito" venceu por ser nomeado por 9 de 9 fontes (popularidade, não carta), e nenhum dos três vinha de Saturno, a peça mais forte da carta dela.

## (b) O que está desactualizado e ainda não foi corrigido

**`CODE-7-catalogo.md`** e **`SPEC-pontuacao-catalogo.md`** (19/08 — um dia antes da decisão) **ainda descrevem o modelo antigo** e não foram reescritos. Continuam a apresentar uma fórmula de pontuação cujo objectivo é produzir um "topo" — exactamente o mecanismo que a `SPEC-vocacional.md` rejeita. Nenhum dos dois está marcado como supersedido no topo, ao contrário do que se fez com outros ficheiros obsoletos.

No scratchpad, confirmados como supersedidos (por data e por conteúdo, alguns já auto-marcados): `MODELO-PROSPERIDADE-vocacional.md` (auto-marcado), `SPEC-catalogo-vocacional.md` (auto-marcado, parcial), `CATALOGO-VOCACIONAL.md`, `MODELO-JOVEM-vocacional.md` (assenta em "derivação às cegas", o oposto do princípio novo), `PACOTE-COMPLETO-catalogo-vocacional.md`, `PROTOCOLO-DERIVACAO.md` (processo abandonado, lições de conteúdo ainda aproveitáveis).

## (c) Cobertura de dados — sólida

183 destinos, integridade referencial perfeita entre os três ficheiros principais. Três vias cobertas: 88 ensino superior formal, 57 técnicas/profissionais, 38 fora do sistema formal. 9 planetas com todos os campos preenchidos. 27 nakshatras, cobertura completa nos dois ficheiros que as usam. 32 de 36 pares possíveis entre planetas. Sistema educativo português completo (secundário a mestrado, QNQ 3–7). **Não há índice vazio nem via por cobrir.** Ressalva: profundidade de conteúdo verificada só por amostragem — vale a pena confirmar campo a campo antes de produção.

## (d) O buraco da medida de retorno — continua aberto

Confirmado pelo próprio `SPEC-vocacional.md`, na secção final: *"o catálogo continua a não consumir as medidas de retorno. SAV das casas, troca de regências, arudhas — nada disso entra na pontuação, e é de lá que sai a conclusão do relatório adulto. Fica registado, é o próximo buraco depois deste."*

Detalhe importante: `SPEC-pontuacao-catalogo.md` já tinha introduzido um termo de SAV na fórmula, mas é só o SAV da casa onde o planeta cai — não é o mesmo que o campo `eixo_do_rendimento` que **já existe, pronto e por usar**, em `catalogo-indice-inverso.json`. O dado está na base; não está ligado a nada.

## (e) O que falta, documento a documento

1. **Reescrever `CODE-7-catalogo.md`** — deixar de descrever os ficheiros como mecanismo de ranking; explicar como servem a leitura por opção (ponto 1) e como fonte de camadas para a espinha (ponto 2).
2. **Reescrever `SPEC-pontuacao-catalogo.md`** — a fórmula só faz sentido como material de leitura, não como gerador de lista. Se ficar como está, alguém volta a produzir um ranking escondido dentro do "o que a carta sustenta".
3. **Ligar as medidas de retorno** (SAV, `eixo_do_rendimento` já existente, trocas de regência, arudhas) à leitura vocacional. Não há ficheiro de arudhas — teria de se criar.
4. **Marcar formalmente como supersedidos**: `CATALOGO-VOCACIONAL.md`, `MODELO-JOVEM-vocacional.md`, `PACOTE-COMPLETO-catalogo-vocacional.md`.
5. **Correr pelo menos um caso pelo modelo novo.** `VALIDACAO-01/02` e `GABARITO-Alexandra` testam o modelo antigo (derivação cega, sem opções declaradas) e produzem exactamente o tipo de lista ordenada que a spec nova proíbe. O modelo actual ainda não tem validação própria.
6. **A recolha do formulário não pede ainda** o campo que a `SPEC-vocacional.md` exige — "as opções em cima da mesa" (2 a 4, texto livre) e "qual parece mais provável hoje". Sem isto no `CODE-2-mapa-de-entradas.md`, o bloco vocacional não tem de onde partir. **É bloqueio de recolha, não só de spec.**
7. **`SPEC-espinha.md` está pronta mas não testada no domínio vocacional** — o exemplo que tem é genérico. Ninguém confirmou ainda que "quatro camadas independentes" produz um candidato razoável quando aplicado especificamente a escolha de curso/profissão.
