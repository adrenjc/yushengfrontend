# 环境变量配置说明

## 概述

本项目使用环境变量来配置不同环境下的API地址和其他设置。

## 环境变量列表

### NEXT_PUBLIC_API_URL

- **描述**: 后端API的基础地址
- **开发环境**: `http://localhost:8080`
- **生产环境**: `https://www.yssh.cc` (或你的后端实际部署地址)

### NEXT_PUBLIC_API_TIMEOUT

- **描述**: API请求超时时间（毫秒）
- **默认值**: `30000` (30秒)

## 配置方法

### 1. 开发环境

创建 `.env.local` 文件：

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_API_TIMEOUT=30000
```

### 2. 生产环境

创建 `.env.production` 文件：

```bash
NEXT_PUBLIC_API_URL=https://www.yssh.cc
NEXT_PUBLIC_API_TIMEOUT=30000
```

### 3. 部署平台环境变量

如果使用Vercel、Netlify等部署平台，请在平台控制台设置以下环境变量：

- `NEXT_PUBLIC_API_URL`: 你的后端API地址
- `NEXT_PUBLIC_API_TIMEOUT`: 30000

## 当前问题解决方案

如果你遇到404错误，请检查：

1. **后端服务是否正常运行**
   - 确保后端服务已启动
   - 确认后端运行在正确的端口和域名上

2. **环境变量配置**
   - 检查 `NEXT_PUBLIC_API_URL` 是否指向正确的后端地址
   - 确认后端API路径是否为 `/api/auth/login`

3. **反向代理配置**（如果使用）
   - 检查Nginx等反向代理是否正确配置了API路由
   - 确认前端和后端是否在同一域名下

## API路径说明

前端会自动构建完整的API URL：

- 基础URL: `NEXT_PUBLIC_API_URL`
- 完整路径: `{BASE_URL}/api{endpoint}`
- 示例: `https://www.yssh.cc/api/auth/login`

## 后端部署要求

后端服务需要：

1. 在指定域名的 `/api` 路径下响应请求
2. 支持CORS跨域请求（如果前后端不在同一域名）
3. 正确处理 `/api/auth/login` 和 `/api/auth/refresh` 路径
