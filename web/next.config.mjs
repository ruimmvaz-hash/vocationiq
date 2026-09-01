/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@naveya/method-engine"],
  experimental: {
    serverComponentsExternalPackages: ["sweph"],
  },
};

export default nextConfig;
