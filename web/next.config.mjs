/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@naveya/method-engine"],
  // `sweph` é um módulo nativo (N-API) — não pode ser empacotado pelo
  // webpack, tem de ser carregado em runtime.
  serverExternalPackages: ["sweph"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
