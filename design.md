# AI Travel Planner 实现方案文档

## 项目概述
Web 版 AI 旅行规划师，通过语音交互和 AI 技术简化旅行规划流程，提供智能行程规划、费用管理和数据同步功能。

---

## 技术栈选型

### 前端框架
- **React 18** + **TypeScript**: 类型安全的现代化开发
- **Vite**: 快速的构建工具
- **Tailwind CSS**: 实用优先的样式框架
- **React Router**: 路由管理

### UI 组件库
- **Ant Design** 或 **shadcn/ui**: 提供丰富的组件支持

### 地图服务
- **高德地图 Web API**: 地理位置、路线规划、导航功能

### 语音服务
- **科大讯飞 Web Speech API**: 语音识别和合成

### AI 服务
- **OpenAI GPT-4** 或 **文心一言/通义千问**: 行程规划和预算分析

### 后端服务
- **Supabase**:
  - PostgreSQL 数据库
  - 用户认证 (Auth)
  - 实时数据同步
  - 文件存储

### 状态管理
- **Zustand** 或 **React Context**: 轻量级状态管理

---

## 数据库设计

### 表结构

#### 1. users (由 Supabase Auth 管理)
```sql
- id (uuid, primary key)
- email (text)
- created_at (timestamp)
- updated_at (timestamp)
```

#### 2. travel_plans (旅行计划表)
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- title (text)
- destination (text)
- start_date (date)
- end_date (date)
- budget (numeric)
- travelers_count (integer)
- preferences (jsonb) -- 旅行偏好
- itinerary (jsonb) -- AI生成的行程
- status (text) -- draft, confirmed, completed
- created_at (timestamp)
- updated_at (timestamp)
```

#### 3. expenses (费用记录表)
```sql
- id (uuid, primary key)
- plan_id (uuid, foreign key)
- category (text) -- 交通、住宿、餐饮、门票等
- amount (numeric)
- description (text)
- date (date)
- created_at (timestamp)
```

#### 4. user_preferences (用户偏好表)
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- language (text)
- default_currency (text)
- favorite_destinations (jsonb)
- travel_style (text) -- 休闲、冒险、文化等
```

---

## 系统架构

```
┌─────────────────────────────────────────────┐
│            React Frontend (Vite)            │
├─────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │  语音交互 │ │ 地图导航  │ │  行程展示   │ │
│  └──────────┘ └──────────┘ └─────────────┘ │
└─────────────────────────────────────────────┘
              ↓           ↓           ↓
┌─────────────────────────────────────────────┐
│              API Integration Layer          │
├─────────────────────────────────────────────┤
│  科大讯飞API  │  高德地图API  │  OpenAI API  │
└─────────────────────────────────────────────┘
              ↓           ↓           ↓
┌─────────────────────────────────────────────┐
│              Supabase Backend               │
├─────────────────────────────────────────────┤
│  Authentication │ PostgreSQL │ Realtime    │
└─────────────────────────────────────────────┘
```

---

## 实现步骤

### 第一阶段：项目初始化与基础架构 (Week 1)

#### 1.1 项目搭建
```bash
# 创建 Vite + React + TypeScript 项目
npm create vite@latest ai-travel-planner -- --template react-ts
cd ai-travel-planner
npm install
```

#### 1.2 安装核心依赖
```bash
npm install @supabase/supabase-js
npm install react-router-dom
npm install zustand
npm install antd @ant-design/icons
npm install axios
npm install dayjs
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

#### 1.3 项目目录结构
```
src/
├── components/          # 可复用组件
│   ├── Layout/         # 布局组件
│   ├── VoiceInput/     # 语音输入组件
│   ├── MapView/        # 地图组件
│   └── TravelPlan/     # 行程展示组件
├── pages/              # 页面组件
│   ├── Home/           # 首页
│   ├── Auth/           # 登录注册
│   ├── PlanCreate/     # 创建行程
│   ├── PlanDetail/     # 行程详情
│   └── Profile/        # 用户中心
├── services/           # API 服务
│   ├── supabase.ts     # Supabase 配置
│   ├── aiService.ts    # AI API 调用
│   ├── mapService.ts   # 地图 API
│   └── voiceService.ts # 语音 API
├── store/              # 状态管理
│   ├── authStore.ts    # 用户状态
│   └── planStore.ts    # 行程状态
├── types/              # TypeScript 类型定义
├── utils/              # 工具函数
└── App.tsx             # 应用入口
```

#### 1.4 配置 Supabase
```typescript
// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

### 第二阶段：用户认证系统 (Week 1-2)

#### 2.1 实现注册登录功能
- 使用 Supabase Auth 实现邮箱密码登录
- 支持第三方登录（Google/GitHub）
- 实现密码重置功能

#### 2.2 创建认证相关页面
- `/login` - 登录页面
- `/register` - 注册页面
- `/reset-password` - 密码重置

#### 2.3 实现路由守卫
```typescript
// 保护需要登录的路由
<PrivateRoute path="/plans" component={PlansPage} />
```

---

### 第三阶段：语音交互系统 (Week 2-3)

#### 3.1 集成科大讯飞语音识别
```typescript
// src/services/voiceService.ts
export class VoiceService {
  // 初始化科大讯飞 WebSocket 连接
  initIAT()
  
  // 开始语音识别
  startRecording()
  
  // 停止识别
  stopRecording()
  
  // 实时返回识别结果
  onResult(callback)
}
```

#### 3.2 创建语音输入组件
```typescript
// src/components/VoiceInput/VoiceInput.tsx
- 录音按钮 UI
- 实时显示识别文字
- 支持文字编辑
- 语音波形动画
```

#### 3.3 语音交互优化
- 添加语音反馈（TTS）
- 支持打断和重新录制
- 噪音处理和静音检测

---

### 第四阶段：AI 行程规划核心功能 (Week 3-4)

#### 4.1 设计 AI Prompt 模板
```typescript
// src/services/aiService.ts
const ITINERARY_PROMPT = `
你是一个专业的旅行规划师。根据以下信息生成详细的旅行行程：
- 目的地：{destination}
- 天数：{days}
- 预算：{budget}
- 人数：{travelers}
- 偏好：{preferences}

请以 JSON 格式返回行程，包括：
1. 每日详细安排（景点、交通、用餐）
2. 预计费用明细
3. 实用建议
`;
```

#### 4.2 实现 AI 行程生成
```typescript
export async function generateItinerary(input: TravelInput) {
  // 调用 OpenAI API
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" }
  })
  
  return parseItinerary(response.choices[0].message.content)
}
```

#### 4.3 行程数据结构
```typescript
interface Itinerary {
  days: Day[]
  budget: BudgetBreakdown
  tips: string[]
}

interface Day {
  date: string
  activities: Activity[]
  accommodation: Accommodation
  meals: Meal[]
  transportation: Transportation[]
}
```

---

### 第五阶段：地图集成与可视化 (Week 4-5)

#### 5.1 集成高德地图
```typescript
// src/services/mapService.ts
export class MapService {
  // 初始化地图
  initMap(container: HTMLElement)
  
  // 添加标记点（景点、酒店、餐厅）
  addMarkers(locations: Location[])
  
  // 绘制路线
  drawRoute(waypoints: Waypoint[])
  
  // 路线规划
  planRoute(start, end, mode: 'driving' | 'walking' | 'transit')
}
```

#### 5.2 创建地图组件
```typescript
// src/components/MapView/MapView.tsx
- 全屏地图展示
- 显示行程中的所有地点
- 点击标记显示详情
- 路线动画效果
- 支持街景查看
```

#### 5.3 地图交互功能
- 景点聚类显示
- 实时导航模拟
- 周边设施搜索（餐厅、ATM、厕所）

---

### 第六阶段：行程展示与编辑 (Week 5-6)

#### 6.1 行程列表页面
```typescript
// src/pages/Plans/PlansList.tsx
- 卡片式展示所有行程
- 支持筛选和搜索
- 显示行程状态（草稿/进行中/已完成）
- 快速操作（编辑/删除/分享）
```

#### 6.2 行程详情页面
```typescript
// src/pages/Plans/PlanDetail.tsx
- 时间轴展示每日行程
- 地图和文字双视图
- 天气预报集成
- 倒计时功能
```

#### 6.3 行程编辑功能
- 拖拽调整活动顺序
- 添加/删除/修改景点
- 更新时间和预算
- AI 重新优化行程

---

### 第七阶段：费用预算与管理 (Week 6-7)

#### 7.1 预算分析功能
```typescript
// src/services/budgetService.ts
- AI 生成预算明细
- 按类别统计（交通、住宿、餐饮、门票、购物）
- 预算警告和建议
```

#### 7.2 费用记录组件
```typescript
// src/components/Expenses/ExpenseTracker.tsx
- 支持语音输入费用
- 拍照记录小票
- 手动添加费用
- 分类和标签
```

#### 7.3 预算可视化
- 饼图显示费用占比
- 柱状图对比预算与实际
- 每日花费趋势图
- 超支提醒

---

### 第八阶段：数据同步与离线支持 (Week 7)

#### 8.1 实时数据同步
```typescript
// 使用 Supabase Realtime
supabase
  .channel('travel_plans')
  .on('postgres_changes', { 
    event: '*', 
    schema: 'public', 
    table: 'travel_plans' 
  }, handleChange)
  .subscribe()
```

#### 8.2 离线数据缓存
- 使用 IndexedDB 存储行程数据
- Service Worker 缓存静态资源
- 离线状态提示

#### 8.3 冲突解决
- 最后写入胜出策略
- 版本号管理

---

### 第九阶段：优化与完善 (Week 8)

#### 9.1 性能优化
- React.lazy 懒加载路由
- 虚拟滚动优化长列表
- 图片懒加载和压缩
- 防抖和节流

#### 9.2 用户体验优化
- 骨架屏加载状态
- 友好的错误提示
- 操作引导和帮助文档
- 响应式设计（移动端适配）

#### 9.3 安全性
- XSS 防护
- CSRF 保护
- 敏感数据加密
- API 密钥保护

---

## 关键技术实现细节

### 语音识别集成示例
```typescript
// src/hooks/useVoiceInput.ts
export function useVoiceInput() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  
  const startRecording = async () => {
    const ws = new WebSocket(XFYUN_WS_URL)
    // WebSocket 连接和数据处理
  }
  
  return { isRecording, transcript, startRecording, stopRecording }
}
```

### AI 行程生成示例
```typescript
// src/services/aiService.ts
export async function generateItinerary(input: TravelInput) {
  const prompt = buildPrompt(input)
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    })
  })
  
  const data = await response.json()
  return parseItineraryResponse(data)
}
```

### 地图标记和路线示例
```typescript
// src/components/MapView/MapView.tsx
useEffect(() => {
  const map = new AMap.Map('map-container', {
    zoom: 12,
    center: [lng, lat]
  })
  
  // 添加标记
  itinerary.days.forEach(day => {
    day.activities.forEach(activity => {
      new AMap.Marker({
        position: [activity.lng, activity.lat],
        title: activity.name,
        map: map
      })
    })
  })
  
  // 绘制路线
  const path = activities.map(a => [a.lng, a.lat])
  new AMap.Polyline({
    path: path,
    strokeColor: '#3b82f6',
    strokeWeight: 4,
    map: map
  })
}, [itinerary])
```

---

## 测试策略

### 单元测试
- React Testing Library 测试组件
- Jest 测试工具函数
- 覆盖率目标：80%+

### 集成测试
- 测试 API 调用流程
- 测试数据库操作
- 测试用户认证流程

### E2E 测试
- Playwright/Cypress 测试关键用户流程
- 测试语音输入功能
- 测试行程创建和编辑

---

## 部署方案

### 前端部署
- **Vercel** 或 **Netlify**: 自动化 CI/CD
- 环境变量配置
- CDN 加速

### 后端服务
- Supabase 云服务（免费层可用）
- 配置 RLS（Row Level Security）策略

### 监控和日志
- Sentry 错误监控
- Google Analytics 用户行为分析
- Supabase Dashboard 数据库监控

---

## 项目时间线

| 阶段 | 时间 | 主要任务 |
|------|------|----------|
| Phase 1 | Week 1 | 项目初始化、基础架构 |
| Phase 2 | Week 1-2 | 用户认证系统 |
| Phase 3 | Week 2-3 | 语音交互集成 |
| Phase 4 | Week 3-4 | AI 行程规划 |
| Phase 5 | Week 4-5 | 地图集成 |
| Phase 6 | Week 5-6 | 行程展示与编辑 |
| Phase 7 | Week 6-7 | 费用管理 |
| Phase 8 | Week 7 | 数据同步 |
| Phase 9 | Week 8 | 优化与测试 |

---

## 后续扩展功能

1. **社交功能**: 行程分享、好友推荐、旅行社区
2. **智能推荐**: 基于历史数据的个性化推荐
3. **实时协作**: 多人共同编辑行程
4. **旅行日记**: 照片、视频、游记记录
5. **紧急助手**: SOS 功能、使馆信息、医疗服务
6. **本地服务**: 翻译、货币兑换、天气提醒

---

## 注意事项

1. **API 密钥安全**: 所有 API 密钥存储在环境变量中，不提交到 Git
2. **成本控制**: 监控 AI API 调用次数，设置使用上限
3. **隐私保护**: 遵守 GDPR，提供数据导出和删除功能
4. **可访问性**: 支持键盘导航，提供 ARIA 标签
5. **国际化**: 预留多语言支持接口

---

这份文档提供了完整的实现路线图，可以根据实际开发进度进行调整。建议采用敏捷开发方式，每 1-2 周完成一个可用的功能模块。