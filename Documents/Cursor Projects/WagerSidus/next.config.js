/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
    NEXT_PUBLIC_DEEPSEEK_API_KEY: process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY,
    NEXT_PUBLIC_SIDUS_AI_API_KEY: process.env.NEXT_PUBLIC_SIDUS_AI_API_KEY,
    NEXT_PUBLIC_BNB_CHAIN_ID: process.env.NEXT_PUBLIC_BNB_CHAIN_ID,
    NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
    NEXT_PUBLIC_WAGER_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_WAGER_CONTRACT_ADDRESS,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  // Vercel deployment optimizations
  // Note: 'standalone' output is not needed for Vercel (it auto-detects Next.js)
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Webpack config to handle Uniswap V4 SDK compatibility issues
  webpack: (config, { isServer }) => {
    // Ignore problematic imports from Uniswap V4 SDK
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    // Externalize problematic packages during build
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;

