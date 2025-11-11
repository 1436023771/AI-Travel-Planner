# AI Travel Planner - 项目设计文档

## 项目概述

Web版AI旅行规划师，通过AI技术简化旅行规划过程，自动生成个性化旅行路线和建议，提供实时旅行辅助。

---

## 一、需求分析

### 1.1 核心功能

#### 1. 智能行程规划
- **语音/文字输入**: 支持自然语言描述旅行需求
- **输入要素**: 目的地、日期、预算、人数、偏好
- **AI生成**: 交通、住宿、景点、餐厅等完整路线
- **个性化**: 基于用户偏好定制化推荐

#### 2. 费用预算与管理
- **AI预算分析**: 智能估算各项开销
- **语音记账**: 支持语音录入费用
- **实时追踪**: 预算执行情况可视化
- **分类统计**: 交通、住宿、餐饮等分类

#### 3. 用户管理与数据存储
- **注册登录**: 账号体系
- **多计划管理**: 保存多份旅行计划
- **云端同步**: 跨设备数据同步
- **偏好记忆**: 记录用户旅行偏好

---

## 二、技术架构

### 2.1 技术栈

#### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI组件**: Ant Design
- **状态管理**: Zustand
- **地图组件**: @amap/amap-react
- **HTTP客户端**: Axios
- **语音识别**: 科大讯飞 WebAPI

#### 后端服务
- **BaaS平台**: Supabase
  - Authentication (用户认证)
  - PostgreSQL Database (数据存储)
  - Storage (文件存储)
  - Realtime (实时同步)

#### 第三方API
- **地图服务**: 高德地图 Web API
- **LLM服务**: 阿里百炼（通义千问）

### 2.2 系统架构图

```
┌─────────────────────────────────────────────┐
│           前端应用 (React SPA)                │
├─────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌───────────┐ │
│  │ 语音交互  │  │ 地图展示  │  │ 行程管理   │ │
│  └──────────┘  └──────────┘  └───────────┘ │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐ │
│  │ 用户认证  │  │ 预算管理  │  │ 数据同步   │ │
│  └──────────┘  └──────────┘  └───────────┘ │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│              API Gateway 层                  │
├─────────────────────────────────────────────┤
│  高德地图API │ 阿里百炼API                     │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│           Supabase 后端服务                   │
├─────────────────────────────────────────────┤
│  Auth │ PostgreSQL │ Storage │ Realtime     │
└─────────────────────────────────────────────┘
```

---

## 三、数据库设计

### 3.1 表结构

#### users (用户表)
```sql
- id: uuid (PK)
- email: string
- created_at: timestamp
- updated_at: timestamp
- preferences: jsonb (用户偏好)
```

#### travel_plans (旅行计划表)
```sql
- id: uuid (PK)
- user_id: uuid (FK -> users.id)
- title: string
- destination: string
- start_date: date
- end_date: date
- budget: numeric
- travelers: integer
- preferences: jsonb
- status: enum (draft, active, completed)
- created_at: timestamp
- updated_at: timestamp
```

#### itinerary_items (行程明细表)
```sql
- id: uuid (PK)
- plan_id: uuid (FK -> travel_plans.id)
- day: integer
- type: enum (transport, accommodation, attraction, restaurant)
- title: string
- description: text
- location: point (地理坐标)
- address: string
- time_start: time
- time_end: time
- estimated_cost: numeric
- booking_info: jsonb
- order_index: integer
```

#### expenses (费用记录表)
```sql
- id: uuid (PK)
- plan_id: uuid (FK -> travel_plans.id)
- itinerary_item_id: uuid (FK, nullable)
- category: enum (transport, accommodation, food, attraction, shopping, other)
- amount: numeric
- currency: string
- description: text
- date: date
- created_at: timestamp
```

#### user_preferences (用户偏好表)
```sql
- id: uuid (PK)
- user_id: uuid (FK -> users.id)
- preference_type: string
- preference_value: jsonb
- created_at: timestamp
```

---

## 四、核心功能设计

### 4.1 智能行程规划

#### 工作流程
1. **输入采集**: 语音/文字 → 科大讯飞API → 文本
2. **需求解析**: 文本 → LLM → 结构化需求
3. **路线生成**: 需求 → LLM + 地图API → 行程方案
4. **数据存储**: 行程方案 → Supabase
5. **地图展示**: 行程数据 → 高德地图可视化

#### Prompt 设计示例
```
你是一个专业的旅行规划助手。用户需求如下：
- 目的地：{destination}
- 日期：{start_date} 至 {end_date}
- 预算：{budget} 元
- 人数：{travelers} 人
- 偏好：{preferences}

请生成详细的旅行计划，包括：
1. 每日行程安排（景点、餐厅、交通）
2. 推荐住宿
3. 预算分配
4. 注意事项

返回JSON格式，包含以下字段：
- `status`: 计划状态（成功/失败）
- `data`: 计划数据，包含每日行程、住宿、交通、餐饮建议
- `error`: 错误信息（如有）
```

### 4.2 语音交互

#### 科大讯飞集成方案
```typescript
interface VoiceRecognitionService {
  startRecording(): Promise<void>;
  stopRecording(): Promise<string>; // 返回识别文本
  onResult(callback: (text: string) => void): void;
  onError(callback: (error: Error) => void): void;
}
```

#### 应用场景
- 行程需求输入
- 费用快速记录
- 语音搜索景点
- 语音导航

### 4.3 地图可视化

#### 功能点
- 路线标注与连线
- 景点/餐厅 Marker
- 实时导航
- 周边搜索
- 距离/时间估算

#### 高德地图集成
```typescript
interface MapService {
  initMap(container: HTMLElement): void;
  addMarker(location: Location, info: MarkerInfo): void;
  drawRoute(points: Location[]): void;
  searchNearby(location: Location, keyword: string): Promise<POI[]>;
  startNavigation(from: Location, to: Location): void;
}
```

### 4.4 预算管理

#### AI预算估算
- 基于历史数据训练
- 分类别预算（交通、住宿、餐饮等）
- 实时汇率转换
- 价格波动预警

#### 费用记录
- 语音录入："今天午餐花了120元"
- 拍照识别账单
- 手动输入
- 自动分类

---

## 五、用户界面设计

### 5.1 页面结构

```
/                    首页（介绍 + 快速开始）
/login               登录页
/register            注册页
/dashboard           用户仪表盘（所有计划）
/create              创建新计划
/plan/:id            计划详情
  ├─ overview        总览
  ├─ itinerary       行程
  ├─ map             地图
  ├─ budget          预算
  └─ settings        设置
```

### 5.2 主要界面

#### 创建计划页
- 语音输入按钮（显眼位置）
- 文字输入表单（备选）
- 实时识别结果显示
- 一键生成按钮

#### 行程详情页
- 左侧：时间轴行程列表
- 右侧：地图展示
- 顶部：日期切换、编辑工具
- 底部：预算概览

#### 地图页
- 全屏地图
- 可切换图层（交通/卫星/路况）
- 浮动行程卡片
- 导航按钮

---

## 六、开发计划

### 阶段一：基础搭建 (Week 1-2)
- [x] 项目初始化
- [x] Supabase配置
- [x] 路由与布局
- [x] 用户认证
- [x] 首页 API 配置界面

### 阶段二：核心功能 (Week 3-6)
- [x] 语音识别集成
- [x] LLM API集成
- [x] 行程生成逻辑
- [x] 地图展示
- [x] Dashboard 计划列表
- [x] 预算分析展示
- [x] 地图路线连线

### 阶段三：扩展功能 (Week 7-8)
- [x] 预算管理（费用记录）
- [x] 行程编辑功能
- [x] 分享功能（复制/导出/链接）
- [x] 数据同步优化

### 阶段四：优化上线 (Week 9-10)
- [ ] 性能优化
- [ ] 测试
- [ ] 部署
- [ ] 文档

---

## 七、风险与对策

### 技术风险
| 风险 | 影响 | 对策 |
|------|------|------|
| LLM API不稳定 | 高 | 多供应商备选，本地缓存 |
| 语音识别准确率低 | 中 | 提供文字输入备选 |
| 地图API限额 | 中 | 缓存机制，CDN加速 |
| 数据安全问题 | 高 | 加密传输，权限控制 |

### 进度风险
- MVP优先策略
- 每周进度评审
- 弹性需求调整

---

## 八、成功指标

### 功能指标
- 语音识别准确率 > 90%
- AI生成计划满意度 > 80%
- 页面加载时间 < 2s
- API响应时间 < 1s

### 业务指标
- 用户注册转化率 > 30%
- 计划生成成功率 > 95%
- 用户留存率（7日）> 40%

---

## 九、附录

### API密钥管理
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_BAICHUAN_ENDPOINT=
VITE_BAICHUAN_API_KEY=
VITE_BAICHUAN_MODEL=
VITE_AMAP_KEY=
```

### 参考资源
- [Supabase Documentation](https://supabase.com/docs)
- [高德地图API](https://lbs.amap.com/)
- [阿里云百炼](https://dashscope.aliyun.com/)
