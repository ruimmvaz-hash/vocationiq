# Estado do motor de cálculo — Life Report (M-004), sessão 2 (DEC-031)

Sessão de cálculo e validação apenas — sem prosa/redação. Resumo do que foi feito, o que está validado, e o que falta antes de o motor cobrir o M-004 por inteiro.

## 1. Correções aplicadas

- **Redeploy do Ascendente**: o commit com a correção do bug de 180° (Ascendente vs Descendente) foi feito na sessão anterior; nesta sessão fiz `git push` para `origin/master` (`2a782f3..2783ffc`), o que deve disparar o redeploy automático no Vercel (ligado ao GitHub). Não tenho a URL de produção guardada no repositório nem credenciais Vercel, por isso não consegui confirmar visualmente que o deploy terminou — pede para confirmares no teu dashboard Vercel, ou dá-me a URL e eu verifico no browser.
- **Avastha Baladi**: nenhuma alteração de lógica — o motor já estava certo. Atualizei o comentário em [avasthaBaladi.ts](src/lifeReport/avasthaBaladi.ts) com o texto que pediste. **Nota**: fui conferir os ficheiros `docs/GABARITO-Rui-Tabelas.md` e `docs/GABARITO-Alice-Tabelas.md` no repositório e ambos **ainda mostram os valores antigos** (Mrita/Vriddha) para as 3 entradas em Aquário — não encontrei uma versão corrigida de julho 2026. Se já corrigiste esses documentos noutro sítio, não se propagou para este repo; se ainda não corrigiste, o comentário no código já reflete a decisão, mas os `.md` ficam por atualizar (não os toquei, como combinado — são documentos teus).

## 2. Verificador estendido (dignidade, drishti recebido, Bhava Madhya)

Não existia nenhum `verificar_avastha.py` neste repositório (procurei no projeto inteiro — zero ficheiros `.py`). Construí o verificador em TypeScript, no mesmo motor ([verifyD1.ts](src/lifeReport/verifyD1.ts)), para não depender de uma segunda linguagem/ferramenta.

**Resultado: 42 pontos verificados (Rui: 21, Alice: 21) — 0 divergências reais.** As únicas 5 notas são "GABARITO em branco" (Rui não preenche dignidade Amigo/Neutro/Inimigo, só Exaltado/Debilitado/Domicílio — confirmado que não é erro de cálculo).

Caso específico que pediste: **Júpiter em Escorpião (Alice) = Amigo**, confirmado (Marte é amigo natural de Júpiter; Escorpião é signo de Marte) — a tabela clássica já dava isto certo.

**Achado relevante ao verificar "b) Drishti recebido preenchido para todos os pontos"**: encontrei um bug real de completude — a coluna "Drishti emitido" só mostrava um aspeto quando outro graha ocupava a casa-alvo; aspetos que aterram numa casa vazia ou no Ascendente (que o GABARITO também regista, ex. "5º→Libra/3", "4º→Touro/1 (Asc!)") desapareciam silenciosamente. Isto explicava a maioria das células vazias no mapa da Alice. Corrigido em [drishti.ts](src/lifeReport/drishti.ts) (nova função `emittedTargets`) e [format.ts](src/lifeReport/format.ts); reconfirmado exato contra o GABARITO nos 3 casos multi-aspeto de Marte/Júpiter/Saturno da Alice.

## 3. Camada Ocidental (C-OCI) — nova, implementada e validada

Construído de raiz: [western/](src/lifeReport/western/) — posições tropicais, casas Placidus (método do arco-semidiurno, iterativo), dignidade tropical (reaproveitando a mesma tabela clássica), grelha de aspetos com orbe exato e estado aplicativo/separativo, MC + regente, Casas 2/6/11 + regentes, Nodo Norte + conjunções ≤3°.

**Validação**: as 7 posições planetárias e as 7 casas Placidus batem exatamente (ou a 1-4' de arredondamento) para Rui E Alice — 14/14 combinações planeta+casa corretas. MC do Rui bate exato (Gémeos 2°23'). Dignidade tropical bate em 13/14 casos (Domicílio de Júpiter em Sagitário para a Alice, confirmado exato); o 14º (Lua exaltada em Touro, Rui) parece ser omissão do GABARITO ocidental — a mesma tabela védica do mesmo documento já tinha marcado corretamente "EXALTADA" para a mesma posição.

**Bug real encontrado e corrigido nos aspetos**: o cálculo de aplicativo/separativo usava uma diferença de 0,5 dias — para a Lua (que se move ~13°/dia) isto pode ultrapassar o ponto de aspeto exato e inverter a leitura. Corrigido para 1 minuto de diferença. Confirmado: Sol quadratura Lua (Rui) agora dá "A" como no GABARITO; antes da correção dava "S" (errado).

**Achado extra**: o motor encontrou pelo menos 3 aspetos reais (dentro do orbe do próprio M-004) que o GABARITO não lista — Sol conjunção Vénus (5°40', Rui), Vénus oposição Ascendente (4°39', Rui, quase exata), e duas quadraturas largas da Lua. Isto não é divergência de cálculo — é exatamente o problema que o M-004 identifica ("grelha completa é obrigatória") e que o cálculo automático resolve melhor do que o trabalho à mão.

**Fora do âmbito desta sessão** (não pedido explicitamente na tua lista numerada): Urano, Neptuno, Plutão, Quíron, Lilith — o M-004 pede-os no C-OCI-1 mas com regras de aspeto próprias (só ≤3° a planetas pessoais/ângulos); posso adicionar se quiseres.

## 4. Trânsitos de Saturno e Júpiter — implementado, snapshot atual apenas

[transits.ts](src/lifeReport/western/transits.ts): posição tropical atual, casa Placidus natal, aspetos duros (conjunção/quadratura/oposição, orbe 2°) a Sol/Lua/Mercúrio/Vénus/Marte/Ascendente/MC.

**Validado**: Saturno trânsito hoje (25/jul/2026) = Carneiro, Casa 8 do Rui — bate exatamente com a nota do teu GABARITO ("Saturno tropical: Carneiro (fev 2026→) = Casa 8 Placidus dele, cúspide Carneiro 0°16'"). Corretamente NÃO mostra oposição exata ao Nodo Norte agora (o GABARITO diz que as passagens exatas foram/serão ~mai 2026 e ~nov 2026 — julho fica no meio do loop retrógrado).

**Limitação clara**: só calculo a posição de HOJE. O M-004 (C-PRO-7.3/4, C-OCI-3) pede também as **datas exatas das passagens** (incluindo retrogradações) — isso precisa de uma varredura de datas (procurar quando o trânsito cruza o orbe ao longo de meses/anos), que não fiz esta sessão.

## 5. D-9 (Navamsa) — agora completo para todos os grahas

Antes só calculava D-9 para o Ascendente + AK/AmK (via `karakas.ts`). Estendido em [d9Table.ts](src/lifeReport/d9Table.ts) para os 9 grahas: signo D-9, casa D-9 (a partir do Ascendente D-9), dignidade no D-9, Vargottama.

**Validação: 9/9 factos do GABARITO do Rui batem exatamente** — Ascendente D-9 Caranguejo; Karakamsha (Mercúrio→Caranguejo, Casa 1); AmK (Vénus→Sagitário, Casa 6); Sol debilitado em Libra Casa 4; Lua em Capricórnio Casa 7; Marte Vargottama debilitado em Caranguejo; Saturno e Rahu ambos em Touro Casa 11 (conjunção confirmada).

## 6. O que falta para o motor de cálculo cobrir o M-004 por inteiro

Tudo isto está descrito no M-004 mas **não foi tocado nesta sessão** (fora do pedido, ou dependente de trabalho novo):

| Secção M-004 | O que é | Estado |
|---|---|---|
| C-PRO-2 | Eixo da riqueza — radiografia casas 2/3/5/6/9/10/11, Dhana Yogas, aflições | Não implementado — mas a maioria das peças (regências, drishti, dignidade, Bhava Madhya) já existe; falta só o combinador |
| C-PRO-5 | D-10 (Dashamsha) — mapa da carreira | Não implementado — precisa de uma nova função de varga (÷10, regra de signo inicial própria, análoga ao D-9) |
| C-PRO-6 | Tabela de setores vocacionais | Tabela estática já está no M-004; falta a lógica de "ranking dos 2-3 planetas mais fortes" |
| C-PRO-7.1 | Vimshottari Dasha — Mahadasha/Antardasha com datas | Não implementado — cálculo autónomo grande (balanço de Dasha ao nascimento + sequência de datas) |
| C-PRO-7.2 | Sade Sati — fase exata e datas | Não implementado |
| C-PRO-7.3/4 | Trânsito sideral de Saturno/Júpiter a partir da Lua e Ascendente, com datas das 3 passagens | Não implementado (só o snapshot tropical atual, ponto 4 acima) |
| C-PRO-7.5 | Retorno Solar | Não implementado |
| C-9 | Concentração de Grau | Não implementado |
| Parte D | Motor de sinastria (casal) | Não tocado — fora do âmbito |
| C-OCI-1 (parcial) | Urano/Neptuno/Plutão/Quíron/Lilith | Não implementado (ver secção 3) |

## 7. Testes

64 testes automatizados (`method-engine/test/*.test.ts`), todos a passar — incluindo 19 de regressão D-1/D-9, 11 de regressão Ocidental/Placidus, 2 de trânsitos, e os 32 pré-existentes (numerologia, arquétipos, sol, Vedic Snapshot). `tsc --noEmit` limpo.
