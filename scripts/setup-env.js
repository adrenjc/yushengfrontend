/**
 * 环境变量设置脚本
 * 根据当前环境自动创建相应的环境变量文件
 */

const fs = require("fs")
const path = require("path")

const envFiles = {
  // 开发环境配置
  development: `# 开发环境配置
NEXT_PUBLIC_APP_NAME=智能商品匹配系统
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_API_TIMEOUT=30000
`,

  // 生产环境配置
  production: `# 生产环境配置
NEXT_PUBLIC_APP_NAME=智能商品匹配系统
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_API_URL=https://www.yssh.cc
NEXT_PUBLIC_API_TIMEOUT=30000
`,

  // 通用配置
  common: `# 通用环境变量配置示例
# 复制此文件为 .env.local 并根据需要修改

# 应用基本信息
NEXT_PUBLIC_APP_NAME=智能商品匹配系统
NEXT_PUBLIC_APP_VERSION=1.0.0

# API配置
# 开发环境: http://localhost:8080
# 生产环境: https://www.yssh.cc
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_API_TIMEOUT=30000

# 其他配置
# NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
# NEXT_PUBLIC_GA_ID=your-ga-id
`,
}

function createEnvFile(env) {
  const envPath = path.join(
    __dirname,
    "..",
    `.env.${env === "common" ? "example" : env}.local`
  )
  const content = envFiles[env]

  try {
    fs.writeFileSync(envPath, content, "utf8")
    console.log(`✅ 创建环境文件: ${envPath}`)
  } catch (error) {
    console.error(`❌ 创建环境文件失败: ${envPath}`, error.message)
  }
}

function setupEnvironment() {
  console.log("🚀 开始设置环境变量...")

  // 创建示例配置文件
  createEnvFile("common")

  // 创建开发环境配置
  createEnvFile("development")

  // 创建生产环境配置
  createEnvFile("production")

  console.log(`
📝 环境变量设置完成！

文件说明：
- .env.example.local - 配置示例文件
- .env.development.local - 开发环境配置
- .env.production.local - 生产环境配置

使用方法：
- 开发环境：npm run dev（自动使用 .env.development.local）
- 生产构建：npm run build:prod（自动使用 .env.production.local）

注意：
- 这些文件已被 .gitignore 忽略，不会提交到版本控制
- 部署时需要手动设置相应的环境变量
`)
}

// 如果直接运行此脚本
if (require.main === module) {
  setupEnvironment()
}

module.exports = { setupEnvironment }
