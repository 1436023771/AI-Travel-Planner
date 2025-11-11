# AI Travel Planner - 智能旅行规划助手

Web 版 AI 旅行规划师 - 基于 AI 技术的智能旅行规划平台

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd AI-Travel-Planner
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env.local` 并填写必要的 API 密钥：

```bash
cp .env.example .env.local
```

需要配置的环境变量：
- Supabase URL 和 Key
- 高德地图 API Key
- 科大讯飞 API 凭证
- OpenAI API Key

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 项目结构

详见 [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)

## 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI 组件**: Ant Design
- **状态管理**: Zustand
- **路由**: React Router v6
- **后端服务**: Supabase
- **地图服务**: 高德地图
- **语音识别**: 科大讯飞
- **AI 服务**: OpenAI GPT-4

## Docker 部署

### 方式一：使用 Docker Compose（推荐）

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

访问：http://localhost:3000

### 方式二：手动构建和运行

#### 1. 构建镜像

```bash
# 使用脚本构建
chmod +x scripts/build-docker.sh
./scripts/build-docker.sh

# 或手动构建
docker build -t ai-travel-planner:latest .
```

#### 2. 运行容器

```bash
# 使用脚本运行
chmod +x scripts/run-docker.sh
./scripts/run-docker.sh

# 或手动运行
docker run -d \
  --name ai-travel-planner-app \
  -p 3000:80 \
  --restart unless-stopped \
  ai-travel-planner:latest
```

#### 3. 管理容器

```bash
# 查看日志
docker logs -f ai-travel-planner-app

# 停止容器
docker stop ai-travel-planner-app

# 重启容器
docker restart ai-travel-planner-app

# 删除容器
docker rm -f ai-travel-planner-app
```

### 生产环境部署

#### 1. 配置环境变量

编辑 `.env.production` 文件，填写生产环境的 Supabase 配置：

```bash
VITE_SUPABASE_URL=https://your-production-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
```

#### 2. 构建生产镜像

```bash
docker build \
  --build-arg NODE_ENV=production \
  -t ai-travel-planner:prod \
  .
```

#### 3. 推送到镜像仓库（可选）

```bash
# Docker Hub
docker tag ai-travel-planner:latest your-username/ai-travel-planner:latest
docker push your-username/ai-travel-planner:latest

# 阿里云容器镜像服务
docker tag ai-travel-planner:latest registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner:latest
docker push registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner:latest
```

### 健康检查

容器启动后，可以通过以下方式检查健康状态：

```bash
# HTTP 健康检查
curl http://localhost:3000/health

# Docker 健康检查
docker inspect --format='{{.State.Health.Status}}' ai-travel-planner-app
```

### 资源配置

默认配置：
- CPU: 无限制
- 内存: 无限制
- 端口: 80 (容器内) → 3000 (主机)

如需限制资源，运行时添加参数：

```bash
docker run -d \
  --name ai-travel-planner-app \
  -p 3000:80 \
  --memory="512m" \
  --cpus="1.0" \
  ai-travel-planner:latest
```

## 开发进度

### ✅ 阶段一：基础搭建 (已完成)
- [x] 项目初始化
- [x] Supabase 配置
- [x] 路由与布局
- [x] 用户认证系统

### 🚧 阶段二：核心功能 (进行中)
- [ ] 语音识别集成
- [ ] LLM API 集成
- [ ] 行程生成逻辑
- [ ] 地图展示

### 📋 阶段三：扩展功能
- [ ] 预算管理
- [ ] 数据同步
- [ ] 编辑功能
- [ ] 分享功能

### 📋 阶段四：优化上线
- [ ] 性能优化
- [ ] 测试
- [ ] 部署
- [ ] 文档

## 主要功能

1. **智能行程规划**: 通过语音或文字输入旅行需求，AI 自动生成个性化路线
2. **费用预算管理**: AI 智能预算分析，支持语音记账
3. **用户管理**: 注册登录、云端同步、多设备访问

## 配置管理

### 环境变量迁移

项目现已支持将 API 密钥安全地存储在 Supabase 云端：

1. **首次登录自动迁移**：如果 `.env.local` 中配置了百炼和高德地图 Key，系统会在首次登录后自动迁移到 Supabase
2. **云端配置优先**：优先使用 Supabase 中的配置，环境变量作为默认值
3. **跨设备同步**：配置保存在云端，支持跨设备访问

### 配置优先级

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT
