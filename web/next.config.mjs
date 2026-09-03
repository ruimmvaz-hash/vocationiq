/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@naveya/method-engine"],
  // sweph/puppeteer-core/@sparticuz/chromium não podem ser empacotados
  // pelo webpack (binários nativos / resolvidos em runtime).
  serverExternalPackages: ["sweph", "puppeteer-core", "@sparticuz/chromium"],
  // @sparticuz/chromium resolve o caminho do binário Chromium (bin/*.br)
  // via dirname(fileURLToPath(import.meta.url)) em runtime — o output
  // file tracing da Vercel não consegue seguir isso estaticamente e, por
  // omissão, não inclui esses ficheiros na função serverless. É essa a
  // causa confirmada do erro "The input directory does not exist" na
  // primeira tentativa de geração automática de PDF (mesma correcção já
  // usada em produção pela Naveya, ver next.config.ts de lá). Os
  // ficheiros ephe/*.se1 do method-engine não precisam desta entrada —
  // já funcionam sem ela (acedidos de forma estaticamente traçável).
  outputFileTracingIncludes: {
    "/**": ["../node_modules/@sparticuz/chromium/bin/**"],
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
