# Relatório de Comparação — Motor D-1 vs GABARITO (DEC-031)

Gerado por cálculo determinístico (sideral Lahiri, signos inteiros, Ascendente védico = Casa 1), comparado linha a linha contra `docs/GABARITO-Rui-Tabelas.md` e `docs/GABARITO-Alice-Tabelas.md`. Tabela completa gerada em [d1-table-generated.md](d1-table-generated.md); testes de regressão que fixam estes valores em [test/lifeReport.test.ts](test/lifeReport.test.ts).

## Resultado geral

**~160+ pontos de dados verificados (9 grahas × 2 pessoas × ~9 categorias). Concordância >95%.** Tudo o que não está listado em "Divergências" abaixo é concordância exata ou dentro de erro de arredondamento (≤4' de arco, esperado entre cálculo e trabalho manual).

Categorias com **concordância total** (0 divergências em qualquer um dos dois perfis):
- Posições siderais (signo + grau) — todas as 9 grahas, ambas pessoas
- Casas (whole-sign) — 100%
- Regências funcionais — 100%
- Nakshatra + pada + regente — 100%, incluindo os casos "regente de si próprio" (Marte/Dhanishta, Rahu/Ardra, Ketu/Mula)
- Bhava Madhya (distância + banda) — 100% das bandas, grau a ≤4'
- Conjunções — todas as confirmadas no gabarito batem exatamente (grau de distância incluído)
- **Karakas (Atmakaraka, Amatyakaraka, Karakamsha, Vargottama) — 100% exato nos dois perfis.** Esta é a técnica que o M-004 marca como "REGRA CRÍTICA" e é a que bate com perfeição total.
- Dignidade — 100% onde o gabarito a declara explicitamente
- Drishti recebido/emitido — mesmas grahas identificadas em ambos os lados, nos dois perfis

## Divergências e itens para decisão do fundador

### 1. Avastha Baladi em Aquário (padrão real, 3 ocorrências — precisa de decisão)

| Pessoa | Graha | Signo | Motor (regra literal M-004) | Gabarito |
|---|---|---|---|---|
| Rui | Sun | Aquarius | Bala | Mrita |
| Rui | Venus | Aquarius | Kumara | Vriddha |
| Alice | Mars | Aquarius | Bala | Mrita |

O motor aplica a regra do M-004 tal como está escrita (signos ímpares contam a partir de 0°; Aquário é ar, portanto ímpar). Isto bate perfeitamente para **todos os outros signos ímpares** presentes nos dois mapas (Gémeos, Leão, **Libra** — também um signo de ar, e bate normalmente —, Sagitário). Só Aquário diverge, e diverge sempre na mesma direção (como se fosse par/invertido), nos 3 casos onde aparece. Como Libra (outro signo de ar) segue a regra normal, a anomalia é especificamente do Aquário, não do elemento ar. **Não corrigi o motor** — está a implementar a regra literal do M-004. Preciso de uma decisão: Aquário tem uma exceção não escrita no M-004, ou o gabarito tem um lapso repetido?

### 2. Bug corrigido no cálculo do Ascendente (afeta também o Snapshot)

A fórmula do Ascendente estava a calcular o Descendente — erro de 180° (confirmado: Ascendente do Rui saía Aquário 12°31' em vez de Leão 12°30', mesmo grau, signo oposto). Corrigido em [ascendant.ts](../method-engine/src/astrology/ascendant.ts). Esta função é partilhada com a feature "Under Pressure" do Snapshot — por isso, apesar do Snapshot estar congelado (DEC-031), esta correção também muda o resultado dessa feature já em produção. Não fiz mais nenhuma alteração ao Snapshot; sinalizo isto para decisão sobre redeploy.

### 3. Drishti emitido para casas vazias não aparece na tabela (lacuna de formato, não de cálculo)

A minha tabela só lista um "hit" de drishti emitido quando outra graha ocupa a casa-alvo. O gabarito às vezes também anota o alvo mesmo quando a casa está vazia (ex: Júpiter do Rui, aspecto de 5ª casa → Libra/Casa 3, vazia). A função interna (`aspectedHouses()`) já calcula isto corretamente — é só uma escolha de exibição na tabela, fácil de estender se for útil.

### 4. Duas prováveis lacunas de documentação no gabarito (não são erros do motor)

- **Marte (Rui), "Drishti recebido"**: gabarito mostra "---" (vazio), mas a própria linha de Mercúrio do gabarito confirma que Mercúrio emite um aspecto de 7ª que aterra em Marte/Casa 12 — inconsistência interna no próprio documento. O motor é consistente (o que Mercúrio emite, Marte recebe, por definição).
- **Júpiter (Alice), "Dignidade"**: gabarito deixa em branco, mas as outras 4 grahas na mesma tabela (Sol, Mercúrio, Vénus, Marte) têm "amigo"/"neutro" preenchidos com a mesma regra clássica que dá Júpiter=Amigo em Escorpião. Parece omissão, não uma afirmação deliberada de "sem relação" (o que não existe nas 7 grahas clássicas).

### 5. Nuance de rótulo: aspecto de Júpiter ao Sol/Vénus (Rui)

Gabarito escreve "7º de Gémeos", mas o facto (Júpiter aspecta essa casa) só é possível pelo aspecto especial de 9ª de Júpiter a partir de Gémeos — 7ª de Gémeos seria Sagitário, não Aquário. O facto está certo dos dois lados; parece um lapso de rótulo no gabarito, não uma divergência de cálculo.

### 6. Notação Rahu/Ketu

Gabarito abrevia o aspecto mútuo Rahu↔Ketu como "(eixo)"; o motor escreve explicitamente "Ketu(7º)"/"Rahu(7º)". Mesmo facto, notação diferente — não é divergência.

## Precisão de grau (Alice)

O Ascendente da Alice bateu a 4' de arco (Touro 8°27' motor vs 8°23' gabarito, mesmo signo/nakshatra/regente); todas as outras posições bateram a 2-4'. Ligeiramente mais folga que o Rui (1'), provavelmente por coordenadas de Luanda aproximadas — não afeta nenhum signo, casa, regência, nakshatra ou karaka.
