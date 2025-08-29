# 🚀 智能商品匹配系统部署指南

## 📋 环境配置解决方案

### 🎯 优雅的环境变量管理

我们采用了基于 `.env` 文件的环境变量管理方案，避免在脚本中硬编码环境变量。

#### 📁 环境文件结构

```
yushengfrontend/
├── .env.example.local          # 配置示例文件
├── .env.development.local      # 开发环境配置
├── .env.production.local       # 生产环境配置
└── scripts/setup-env.js        # 环境配置脚本
```

#### 🔧 环境变量配置

**开发环境** (`.env.development.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_API_TIMEOUT=30000
```

**生产环境** (`.env.production.local`)

```bash
NEXT_PUBLIC_API_URL=https://www.yssh.cc
NEXT_PUBLIC_API_TIMEOUT=30000
```

### 🛠️ 构建脚本

| 脚本                   | 环境        | 描述                 |
| ---------------------- | ----------- | -------------------- |
| `npm run dev`          | development | 开发环境启动         |
| `npm run build:static` | development | 静态构建（开发配置） |
| `npm run build:prod`   | production  | 生产环境构建         |
| `npm run setup-env`    | -           | 设置环境变量文件     |

## 🌐 部署步骤

### 1️⃣ 确保后端服务运行

```bash
cd yushengbackend
npm start
# 或使用 PM2
pm2 start ecosystem.config.js
```

### 2️⃣ 构建前端

```bash
cd yushengfrontend
npm run build:prod
```

### 3️⃣ 配置 nginx

确保 nginx 配置中的代理设置正确：

```nginx
upstream smart_match_backend {
    server 127.0.0.1:8080;
}

location /api/ {
    proxy_pass http://smart_match_backend;
    # ... 其他配置
}
```

### 4️⃣ 重启服务

```bash
nginx -s reload
```

## 🔍 故障排查

### 检查后端服务

```bash
# 检查8080端口
netstat -an | findstr :8080

# 检查健康状态
curl http://localhost:8080/health
```

### 检查 nginx 配置

```bash
# 测试配置语法
nginx -t

# 重新加载配置
nginx -s reload
```

### 测试 API 连接

```bash
# 测试健康检查
curl https://www.yssh.cc/health

# 测试API基础信息
curl https://www.yssh.cc/api

# 测试登录接口
curl -X POST https://www.yssh.cc/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## 🎯 最佳实践

### ✅ 推荐做法

- ✅ 使用 `.env` 文件管理环境变量
- ✅ 不同环境使用不同的配置文件
- ✅ 脚本只设置 `NODE_ENV`，具体配置交给 Next.js 处理
- ✅ 配置文件不提交到版本控制

### ❌ 避免做法

- ❌ 在 package.json 脚本中硬编码 URL
- ❌ 混合使用相对路径和绝对路径
- ❌ 将敏感配置提交到版本控制

## 🔒 安全注意事项

1. **环境变量文件安全**
   - `.env*.local` 文件已被 `.gitignore` 忽略
   - 生产环境密钥不要放在版本控制中

2. **API 安全**
   - 确保 CORS 配置正确
   - 使用 HTTPS 传输敏感数据
   - 定期更新 SSL 证书

3. **nginx 安全**
   - 隐藏 nginx 版本信息
   - 配置适当的安全头
   - 限制文件上传大小

## 📞 支持

如遇问题，请检查：

1. 后端服务是否运行在 8080 端口
2. nginx 配置是否正确
3. 环境变量是否正确设置
4. 防火墙和端口是否开放
