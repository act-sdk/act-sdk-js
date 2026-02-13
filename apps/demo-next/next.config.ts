import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@act-sdk/core', '@act-sdk/react'],
};

export default nextConfig;
