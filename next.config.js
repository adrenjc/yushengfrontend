/** @type {import('next').NextConfig} */
const nextConfig = {
  // 静态导出配置
  output: "export",
  trailingSlash: true,
  skipTrailingSlashRedirect: true,

  // 图片优化配置（静态导出需要禁用默认图片优化）
  images: {
    unoptimized: true,
    domains: ["localhost", "127.0.0.1"],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8080",
        pathname: "/uploads/**",
      },
    ],
  },

  // 静态导出不支持 rewrites，将在 nginx 中配置代理
  // 开发环境配置，提高热重载稳定性
  ...(process.env.NODE_ENV === "development" && {
    onDemandEntries: {
      // 页面缓存时间
      maxInactiveAge: 25 * 1000,
      // 同时编译页面数
      pagesBufferLength: 2,
    },
  }),
  // 优化构建
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // 环境变量
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
}

module.exports = nextConfig
