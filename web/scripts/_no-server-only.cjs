// Preload usado só em scripts de teste locais (npx tsx --require) para
// poder importar módulos com `import "server-only"` fora do Next.js — o
// pacote "server-only" lança sempre um erro ao ser importado directamente
// por Node/tsx (foi desenhado para o bundler do Next.js apanhar o import e
// nunca chegar a correr em runtime). Stub inofensivo: intercepta só esse
// pedido específico e devolve um módulo vazio: nunca afecta nenhum outro
// require, nunca corre em produção (só é carregado por scripts locais).
const Module = require("module");
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad.apply(this, arguments);
};
