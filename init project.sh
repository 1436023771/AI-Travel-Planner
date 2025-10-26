#!/bin/bash
# filepath: /Users/yuhanli/schoolwork/codes/AI-Travel-Planner/init-project.sh

echo "🚀 开始初始化 AI Travel Planner 项目..."

# 1. 创建 Vite + React + TypeScript 项目
npm create vite@latest . -- --template react-ts

# 2. 安装核心依赖
echo "📦 安装核心依赖..."
npm install

# 3. 安装项目依赖
echo "📦 安装项目特定依赖..."
npm install @supabase/supabase-js
npm install antd
npm install zustand
npm install react-router-dom
npm install axios
npm install @amap/amap-jsapi-loader

# 4. 安装开发依赖
npm install -D @types/node
npm install -D sass

echo "✅ 项目初始化完成！"
echo "📝 下一步："
echo "   1. 复制 .env.example 为 .env.local"
echo "   2. 填写 Supabase 和其他 API 密钥"
echo "   3. 运行 npm run dev 启动开发服务器"