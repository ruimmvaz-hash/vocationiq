/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@naveya/method-engine"],
  experimental: {
    // `sweph` é um módulo nativo (N-API); `@sparticuz/chromium` empacota
    // um binário Chromium comprimido e `puppeteer-core` carrega-o em
    // runtime — nenhum dos três pode ser empacotado pelo webpack.
    //
    // CORRECÇÃO (confirmada nos logs reais da Vercel): "Unrecognized
    // key(s) in object: 'serverExternalPackages',
    // 'outputFileTracingIncludes'" — estas duas opções só existem como
    // chaves de topo a partir do Next.js 15 (a Naveya usa o 16.2.10); o
    // VocationIQ está preso ao Next 14.2.35 (^14.2.0 no package.json), e
    // em 14.x as mesmas opções só são válidas dentro de `experimental`,
    // com o nome antigo "serverComponentsExternalPackages" — confirmado
    // directamente em node_modules/next/dist/server/config-schema.js
    // (z.strictObject do "experimental" nas linhas ~208-283). As três
    // tentativas anteriores nunca chegaram a aplicar esta configuração —
    // era sempre rejeitada/ignorada por chave desconhecida no schema.
    serverComponentsExternalPackages: ["sweph", "puppeteer-core", "@sparticuz/chromium"],
    // method-engine/ephe/*.se1 e o binário do @sparticuz/chromium
    // (bin/*.br) são resolvidos em runtime (não via import/require
    // estático) — o output file tracing da Vercel não os detecta sozinho.
    // Os dois caminhos para o chromium (com e sem "../") cobrem as duas
    // hipóteses de onde a Vercel instala o pacote no build — incluir um
    // padrão que não existe não tem custo.
    outputFileTracingIncludes: {
      "/**": [
        "../method-engine/ephe/**",
        "../node_modules/@sparticuz/chromium/bin/**",
        "./node_modules/@sparticuz/chromium/bin/**",
      ],
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
