/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@faceless/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.solutip.com",
      },
    ],
  },
};

export default nextConfig;