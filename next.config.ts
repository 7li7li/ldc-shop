import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.resolve(__dirname),
  // Keep the runtime behavior consistent with the current application source.
  cacheComponents: false,
  experimental: {
    // SQLite exports can be several megabytes. The default Server Action
    // request limit is too small for importing a normal shop backup.
    serverActions: {
      bodySizeLimit: '64mb',
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
    formats: ['image/avif', 'image/webp'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async rewrites() {
    return [
      {
        source: '/authcallback',
        destination: '/api/auth/callback/linuxdo',
      },
      {
        source: '/favicon.ico',
        destination: '/favicon',
      },
    ]
  },
};

export default nextConfig;
