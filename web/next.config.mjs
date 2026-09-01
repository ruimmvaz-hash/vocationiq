/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@naveya/method-engine"],
  experimental: {
    serverComponentsExternalPackages: ["sweph"],
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
