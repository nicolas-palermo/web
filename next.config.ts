import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A WebGPU device cannot survive React's double-mount in development.
  reactStrictMode: false,
  turbopack: {
    rules: {
      "*.wgsl": {
        as: "*.js",
        loaders: ["@vgpu/wgsl/loader-webpack"],
      },
    },
  },
  webpack(config) {
    config.module ??= {};
    config.module.rules ??= [];
    config.module.rules.push({
      loader: "@vgpu/wgsl/loader-webpack",
      test: /\.wgsl$/u,
    });
    return config;
  },
};

export default nextConfig;
