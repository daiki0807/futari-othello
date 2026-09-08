import type { NextConfig } from 'next';

const githubPages = process.env.GITHUB_PAGES === 'true';
const nextConfig: NextConfig = githubPages
  ? { output: 'export', assetPrefix: '/futari-othello', trailingSlash: true }
  : {};

export default nextConfig;
