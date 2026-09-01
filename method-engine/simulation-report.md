# Relatório de Simulação — Método Naveya (M-002 v0.4, DEC-018)

Gerado a partir de **1000 perfis aleatórios** (datas de nascimento 1950–2010, nomes EN variados), usando o mecanismo revisto do M-002 §3 (v0.4): **Elemento vem sempre do signo solar** (sem votação); **Modalidade é decidida por votação ponderada** entre Sol (peso 4), Caminho de Vida (peso 3) e Número de Expressão (peso 2), com empate a favor do Sol.

---

## 1. Resultado principal — taxa de deslocamento

- **Arquétipo natural (igual ao signo solar sozinho):** 72.00% (720 perfis)
- **Arquétipo deslocado (Modalidade da numerologia sobrepôs-se ao Sol):** 28.00% (280 perfis)
- **Alvo do M-002 §3.2:** 25–30% de deslocamento
- **Resultado:** ✅ CUMPRIDO — o valor observado está dentro do intervalo-alvo.

> Para comparação: o mecanismo anterior (v0.3, voto independente em Elemento **e** Modalidade) dava 39.60% de deslocamento na mesma amostra — muito acima do alvo. Ao remover o voto do Elemento (agora sempre herdado do Sol) e manter apenas o voto de Modalidade, a taxa aproxima-se do intervalo 25–30% conforme diagnosticado no relatório anterior (§4.2: colisão isolada em Modalidade ≈ 28%).

---

## 2. Distribuição dos 12 Arquétipos

| # | Nome | Contagem | % |
|---|---|---|---|
| 1 | The Artisan | 137 | 13.70% |
| 2 | The Connector | 135 | 13.50% |
| 3 | The Explorer | 130 | 13.00% |
| 4 | The Visionary | 103 | 10.30% |
| 5 | The Analyst | 77 | 7.70% |
| 6 | The Navigator | 66 | 6.60% |
| 7 | The Alchemist | 65 | 6.50% |
| 8 | The Flamekeeper | 62 | 6.20% |
| 9 | The Strategist | 62 | 6.20% |
| 10 | The Trailblazer | 60 | 6.00% |
| 11 | The Architect | 53 | 5.30% |
| 12 | The Guardian | 50 | 5.00% |

**Limites do M-002:** nenhum arquétipo abaixo de 4% ou acima de 15%. Observado: mínimo 5.00%, máximo 13.70%. **Resultado: ✅ CUMPRIDO.**

---

## 3. Distribuição dos 12 Motores (Caminho de Vida)

| # | Nome | Contagem | % |
|---|---|---|---|
| 1 | Inspiration | 122 | 12.20% |
| 2 | Freedom | 114 | 11.40% |
| 3 | Achievement | 114 | 11.40% |
| 4 | Truth | 110 | 11.00% |
| 5 | Expression | 107 | 10.70% |
| 6 | Purpose | 103 | 10.30% |
| 7 | Autonomy | 102 | 10.20% |
| 8 | Structure | 85 | 8.50% |
| 9 | Service | 60 | 6.00% |
| 10 | Care | 40 | 4.00% |
| 11 | Legacy | 26 | 2.60% |
| 12 | Harmony | 17 | 1.70% |

_Nota: o M-002 não define limites de percentagem para os Motores (só para os Arquétipos), mas a distribuição é reportada para referência — os números mestre (11/22/33 → Inspiração/Legado/Serviço) são estruturalmente mais raros, o que é esperado da numerologia clássica. Os Motores não são afetados pela mudança de mecanismo do §3 (derivam diretamente do Caminho de Vida, sem votação)._

---

## 4. Robustez (múltiplas seeds)

Para confirmar que o resultado não é um acaso da amostra, a simulação foi repetida com seeds diferentes:

| Seed | Deslocamento | Arquétipos min–max % |
|---|---|---|
| 1 | 26.90% | 5.30–12.80% |
| 2 | 29.40% | 5.30–13.30% |
| 3 | 28.20% | 4.80–13.30% |
| 42 | 28.00% | 5.00–13.70% |
| 99 | 24.80% | 5.00–13.10% |

Intervalo observado entre seeds: deslocamento 24.80–29.40%; arquétipos 4.80–13.70%. Os limites de população por arquétipo (4–15%) mantêm-se cumpridos em todas as seeds testadas. O deslocamento fica ligeiramente fora do intervalo 25–30% em 1 de 5 seeds testadas (ex.: seed 99 → 24.80%); a amostra principal (seção 1, acima) está dentro do alvo, mas o valor exato é sensível à amostra — 25–30% deve ler-se como a zona esperada, não uma garantia exata em qualquer seed individual.

---

## 5. Metodologia

- Datas de nascimento: dia/mês/ano uniformemente aleatórios entre 1950–2010 (respeitando meses de 30/31 dias e anos bissextos).
- Nomes: combinação aleatória de listas de primeiros/últimos nomes maioritariamente EN (com alguns nomes acentuados para validar a normalização).
- Signo solar: longitude eclíptica geocêntrica aparente do Sol (astronomy-engine), avaliada ao meio-dia UTC da data — sem tabelas fixas de fronteiras.
- Gerador aleatório: PRNG determinístico (mulberry32) com seed fixa, para reprodutibilidade.
- Mecanismo (v0.4, DEC-018): Elemento = elemento do signo solar (sem voto). Modalidade = voto ponderado Sol(4)/Caminho de Vida(3)/Expressão(2), empate → Sol.
