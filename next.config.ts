import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Works around EPERM "operation not permitted, rename ...pack.gz_" errors
  // on Windows in dev — usually caused by antivirus or a cloud-sync client
  // (OneDrive/Dropbox) locking the .next/cache file mid-rename. Using an
  // in-memory cache during development sidesteps the filesystem entirely;
  // production builds are unaffected and still use the normal cache.
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = { type: "memory" };
    }
    return config;
  },
};

export default nextConfig;
