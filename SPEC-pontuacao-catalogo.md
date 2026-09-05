# COMO SE PONTUA O CATÁLOGO VOCACIONAL

*Corrigido a 19 de Agosto de 2026. Reenquadrado a 22 de Agosto de 2026.*

> **O que mudou no reenquadramento:** esta fórmula foi escrita para produzir "o topo" — um ranking de destinos a mostrar ao cliente. A `SPEC-vocacional.md`, de 20/08, acabou com isso: as opções vêm declaradas pela pessoa, o catálogo nunca escolhe. **A matemática abaixo continua válida e continua a ser usada — só muda o que se faz com o número.** Deixa de comparar destino contra destino para decidir um vencedor. Passa a medir, dentro da leitura de UMA opção declarada, o quanto essa opção específica é sustentada pela carta — e a servir de critério de convergência para a candidata única do ponto 2 da `SPEC-vocacional.md`. Onde este documento ainda disser "o topo" ou "top 20" abaixo, lê-se como material histórico do problema que a correcção resolveu, não como uso actual.

---

## O QUE ESTAVA ERRADO

**Corri o catálogo sobre dois mapas completamente diferentes e obtive sete dos dez destinos iguais.**

Topo dos dois: **medicina · direito · ciências militares · ciências do desporto.**

**Isso não é leitura. É o catálogo a dizer sempre o mesmo.** Três causas, todas de aritmética.

---

## CAUSA 1 · Destinos promíscuos ganham sempre

**Direito aparece em 21 fontes do catálogo. Medicina em 20. Contabilidade em 3.**

Qualquer carta com dois planetas fortes acerta em direito e medicina, **porque quase todas as fontes os nomeiam.** Contabilidade só ganha se as três fontes exactas dela estiverem fortes — o que é raro, e é precisamente o que a torna informativa.

### A correcção

**Cada destino é pesado pelo inverso da sua frequência no catálogo.**

```
raridade(destino) = log( total_de_fontes / nº_de_fontes_que_o_nomeiam )
```

Com 95 fontes distintas: **direito vale 1,51 · medicina 1,56 · contabilidade 3,46 · biblioteconomia 3,46.**

*Gravado em `catalogo-raridade.json`, calculado a partir do próprio catálogo. Recalcula-se sempre que o catálogo mudar.*

---

## CAUSA 2 · Listas longas diluíam-se mal

Uma fonte que lista quinze destinos não deve dar quinze vezes o peso de uma que lista dois.

### A correcção

**O peso de cada fonte distribui-se pelos destinos que ela nomeia.**

```
contributo = peso_da_fonte / nº_de_destinos_da_fonte × raridade(destino)
```

---

## CAUSA 3 · A pior — os pares disparavam sem ligação nenhuma

**O índice de combinações disparava sempre que a pessoa tinha os dois planetas fortes.** Nunca verificava se eles se ligam na carta.

**O par Júpiter+Marte injectava medicina, militares, desporto e engenharia em cartas onde Júpiter e Marte não se tocam.** Foi responsável, sozinho, por metade da sobreposição.

### A correcção

**Um par só entra se os dois planetas estiverem ligados na carta.** Três formas de ligação, e só estas:

| ligação | como se verifica |
|---|---|
| **mesma casa** | os dois ocupam a mesma casa |
| **olhar** | um vê o outro — sétima a partir de si para todos, mais 3 e 10 de Saturno, 4 e 8 de Marte, 5 e 9 de Júpiter |
| **troca** | cada um está no signo do outro |

**Sem ligação, o par não conta.** *Ter dois planetas fortes não é o mesmo que eles trabalharem juntos.*

---

## A FÓRMULA, INTEIRA

```
peso_planeta  = estado × ( SAV_da_casa_que_ocupa / 28,1 )
peso_mansão   = relevância × 1,5
peso_par      = 5 × ( média do SAV das duas casas / 28,1 )     [só se houver ligação]

contributo    = peso_fonte / nº_destinos_da_fonte × raridade(destino)
```

**O `SAV / 28,1` é o eixo do rendimento a entrar na conta.** Sem ele, a pontuação mede capacidade e ignora retorno — que é exactamente a distinção que o produto vende.

---

## O RESULTADO DA CORRECÇÃO

**Sobreposição entre as duas cartas: de 7 em 10 para 3 em 10.** E as três que restam justificam-se — ambas as cartas têm mesmo a troca Vénus–Saturno e o olhar Júpiter–Saturno.

| | antes | depois |
|---|---|---|
| **carta A** | medicina · direito · desporto · militares | arquitectura · artes do espectáculo · direito · restauro |
| **carta B** | direito · música · medicina · formação | música · história de arte · ourivesaria · restauro próprio |

---

## O QUE AINDA FALTA — e é o mais importante

**O Karakamsha não entra em nenhum cálculo, e é o indicador mais forte que existe ao nível da alma.** Isto já não é sobre diluir um top 20 — é sobre a leitura de cada opção declarada não o consultar de todo.

### O que é preciso acrescentar

- **Karakamsha:** casa onde o Atmakaraka cai no D-9 → campo. Peso alto, porque é uma medida única e não diluída.
- **5ª e 10ª a partir do Karakamsha** → o que se transmite, e a forma que isso toma.
- **Regente da casa 10 e a casa onde está** — já existe no índice inverso, mas não é usado.
- **SAV das casas relevantes, trocas de regência, arudhas** — o buraco registado na `SPEC-vocacional.md`. O termo `SAV_da_casa_que_ocupa / 28,1` acima já traz SAV para dentro da força de um planeta — mas isso não é o mesmo que consultar o `eixo_do_rendimento` (já existe em `catalogo-indice-inverso.json`, por usar) nem trocas de regência nem arudhas (sem ficheiro próprio ainda). Ver `ESTADO-catalogo-vocacional.md` para o detalhe.

**Enquanto isto não entrar, a leitura de uma opção responde bem à pergunta *para que é que tens jeito* e mal à pergunta *de onde te vem o dinheiro nesta opção*.**
