# AI Travel Planner

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

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT
