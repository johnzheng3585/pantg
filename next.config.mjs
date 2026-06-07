/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false
  },
  async rewrites() {
    const rawBase = process.env.CLOUDREVE_API_BASE || "https://api.pan.tg/api/v4";
    const origin = rawBase.replace(/\/api\/v4\/?$/, "").replace(/\/$/, "");

    return [
      {
        source: "/session/:path*",
        destination: `${origin}/session/:path*`
      },
      {
        source: "/api/v4/:path*",
        destination: `${origin}/api/v4/:path*`
      },
      {
        source: "/static/:path*",
        destination: `${origin}/static/:path*`
      }
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "**"
      },
      {
        protocol: "https",
        hostname: "**"
      }
    ]
  }
};

export default nextConfig;
