/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@naveya/method-engine"],
  // `sweph` é um módulo nativo (N-API); `@sparticuz/chromium` empacota um
  // binário Chromium comprimido e `puppeteer-core` carrega-o em runtime —
  // nenhum dos três pode ser empacotado pelo webpack.
  serverExternalPackages: ["sweph", "puppeteer-core", "@sparticuz/chromium"],
  // method-engine/ephe/*.se1 e o binário do @sparticuz/chromium (bin/*.br)
  // são resolvidos em runtime (não via import/require estático) — o
  // output file tracing da Vercel não os detecta sozinho e não os inclui
  // na função serverless sem isto. Réplica exacta de next.config.ts da
  // Naveya (mesma correcção, já validada lá em produção — ver DEPLOY.md).
  // Os dois caminhos para o binário do chromium (com e sem "../") cobrem
  // as duas hipóteses de onde a Vercel pode instalar o pacote no build
  // (raiz do monorepo com hoist vs. dentro de web/, com Root
  // Directory=web) — incluir um padrão que não existe não tem custo,
  // o Next.js só inclui o que encontrar.
  outputFileTracingIncludes: {
    "/**": [
      "../method-engine/ephe/**",
      "../node_modules/@sparticuz/chromium/bin/**",
      "./node_modules/@sparticuz/chromium/bin/**",
    ],
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
