# Catálogo vocacional — o que precisas de saber antes de ligar isto ao motor do adulto

2 de Setembro / 5 de Setembro de 2026. Este pacote nunca esteve no GitHub — vivia só num computador local, sem git, sem ligação a repositório nenhum. É a primeira vez que sai de lá.

---

## 1 · O que está aqui dentro

- `catalogo-destinos.json` — o núcleo. 183 destinos vocacionais, cada um com um id universal ancorado em ISCED (a classificação internacional de áreas de formação — os mesmos códigos em Portugal, Brasil, Angola, Espanha). Só o nome muda por país; o id e a área nunca mudam.
- `catalogo-indice-planetas.json` — para cada um dos 9 planetas (karakas), a matéria-prima que representa e os destinos do catálogo que essa matéria-prima sustenta.
- `catalogo-indice-nakshatras.json` — o mesmo, por nakshatra (27).
- `catalogo-indice-combinacoes.json` — pares de planetas (32 de 36 pares possíveis já cobertos) e os destinos que essa combinação específica sustenta.
- `catalogo-indice-inverso.json` — o caminho contrário: dado um destino, que sinais da carta o sustentam. **Tem um campo chamado `eixo_do_rendimento`, já preenchido, nunca ligado a nada — ver ponto 4.**
- `catalogo-cursos.json` e `catalogo-sistema-PT.json` — a camada de vias formais de ensino em Portugal (secundário a mestrado). **Esta camada é especificamente pensada para jovens/estudantes — ver ponto 3.**
- `catalogo-raridade.json` — quão comum ou raro é cada destino, para calibrar tom (não tratar um destino raro como óbvio, nem um comum como extraordinário).
- `catalogo-temperamento-nakshatras.json` — já está copiado dentro do `method-engine/src/data/` da Naveya. É o único ficheiro deste pacote que já chegou a algum repositório.

Documentos que acompanham:
- `SPEC-vocacional.md` — a spec que manda hoje. Lê-a primeiro.
- `SPEC-espinha.md` — o método de convergência de camadas independentes (usado pela "candidata fora da lista").
- `SPEC-pontuacao-catalogo.md` — tem a fórmula de peso, mas **está desactualizada no resto** — ver ponto 2.
- `ESTADO-catalogo-vocacional.md` — auditoria de estado, 22 de Agosto, escrita antes deste pacote sair daqui. É a fonte de tudo o que está resumido abaixo.
- `VOCATIONIQ-ADULTO-metodologia.md` — a metodologia que já tens, para referência cruzada.

---

## 2 · O aviso mais importante: não uses este catálogo para produzir um ranking

Havia uma versão antiga do modelo em que o catálogo escolhia um "vencedor" — ordenava destinos por pontuação e apresentava um topo. Isso foi testado e rejeitado a 20 de Agosto, explicitamente: no mapa da Melina, esse mecanismo antigo devolveu *direito, ciência política, artes do espectáculo* como topo — "direito" venceu só por ser o mais nomeado por fontes populares, e nenhum dos três vinha de Saturno, que é a peça mais forte da carta dela. A partir daí, a regra mudou: **"o catálogo deixa de escolher. Passa a descrever."**

`SPEC-pontuacao-catalogo.md` e `CODE-7-catalogo.md` ainda descrevem o modelo antigo de ranking e nunca foram reescritos — não estão marcados como obsoletos no topo do ficheiro, o que é enganador. A fórmula de peso em si continua correcta e é a que já usas — `peso_planeta = estado × (SAV_da_casa_que_ocupa / 28,1)` — mas usa-a só para dizer com que força uma camada sustenta uma leitura, nunca para ordenar destinos e escolher um.

---

## 3 · O que é reutilizável tal como está, e o que precisa de adaptação para adultos

Reutilizável sem alterações: o núcleo (`catalogo-destinos.json`) e os quatro índices (planetas, nakshatras, combinações, inverso). Um destino é uma área de actividade ancorada em ISCED — isso não muda com a idade de quem pergunta.

Precisa de adaptação: `catalogo-cursos.json` e `catalogo-sistema-PT.json` são a camada de vias escolares — pensada para "que curso seguir", que é uma pergunta de jovem. Para o adulto em mudança de carreira, esta camada devia ser substituída por conteúdo de entrada no mercado — certificações, associações profissionais, distribuidores, entidades formadoras reais — o mesmo tipo de material que já construí à mão para o caso da Melina (CCP, IEFP, Cosmake, Academy Beauty School). O núcleo do destino não muda; só a "porta de entrada" concreta é diferente consoante quem pergunta já tem dez anos de experiência ou está a escolher o primeiro caminho.

---

## 4 · O gancho que falta, e que já existe pronto a usar

`catalogo-indice-inverso.json` tem um campo chamado `eixo_do_rendimento`, preenchido, e nunca ligado a código nenhum. É exactamente o que falta para ligar o Modo de Ganho (Artha Trikonas — casas 2/6/10) do `computeVocationIQAxes` a destinos concretos do catálogo. Sem este gancho, a "candidata fora da lista" fica presa no nível abstracto ("lideras publicamente") e nunca desce a um destino nomeado com precisão — foi exactamente essa falha que apareceu nos relatórios da Melina e da Nádia. Ligar este campo é o passo de maior alavancagem de todo este pacote.

---

## 5 · O que ainda não foi testado, sê realista sobre isto

Ninguém correu ainda um caso pelo modelo novo (o que descreve, não escolhe) de princípio a fim. `SPEC-espinha.md` — o método de "mínimo quatro camadas independentes convergem" — está escrito mas nunca foi testado especificamente no domínio vocacional; o exemplo que tem é genérico. Ligar isto ao motor do adulto é trabalho de integração novo, não é copiar ficheiros para dentro de uma pasta.

---

## 6 · Ordem sugerida de trabalho

1. Lê `SPEC-vocacional.md` e `ESTADO-catalogo-vocacional.md` primeiro — ignora `CODE-7-catalogo.md` e a parte de ranking de `SPEC-pontuacao-catalogo.md`.
2. Copia os ficheiros deste pacote para `method-engine/src/data/` no repositório `vocationiq` (é o único dos três com ligação real ao GitHub — `naveya-master` local não tem remoto nem commits).
3. Liga `eixo_do_rendimento` (`catalogo-indice-inverso.json`) ao `Modo de Ganho` do `computeVocationIQAxes` — é o fio que falta.
4. Substitui a camada de cursos por conteúdo de mercado de trabalho para o ramo adulto.
5. Testa um caso a sério pelo método novo antes de o pôr a gerar relatórios reais — nenhum destes ficheiros foi validado ponta a ponta ainda.
