/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Transpile local packages
  transpilePackages: ['@medical-reporting/lib', '@medical-reporting/ui'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb'
    }
  },
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'DENY'
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff'
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin'
        },
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self';"
        }
      ]
    }
  ],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false
      };
    }

    // Add webpack aliases for monorepo packages
    config.resolve.alias = {
      ...config.resolve.alias,
      '@medical-reporting/lib': require('path').resolve(__dirname, '../../packages/lib/src')
    };

    return config;
  }
};

module.exports = nextConfig;
