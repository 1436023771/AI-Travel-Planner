# Supabase 配置指南

## 1. 创建 Supabase 项目

1. 访问 [https://supabase.com](https://supabase.com)
2. 点击 "Start your project" 注册/登录
3. 创建新项目（New Project）
4. 填写项目信息：
   - Name: ai-travel-planner
   - Database Password: (设置强密码并保存)
   - Region: 选择离你最近的区域（如 Southeast Asia (Singapore)）

## 2. 获取 API 密钥

1. 在项目仪表板，点击左侧 "Settings" -> "API"
2. 复制以下信息到 `.env.local`：
   - Project URL → `VITE_SUPABASE_URL`
   - anon/public key → `VITE_SUPABASE_ANON_KEY`

## 3. 创建数据库表

在 Supabase Dashboard，点击 "SQL Editor"，执行以下 SQL：

### 创建 users 扩展表
```sql
-- 用户偏好表
CREATE TABLE user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_type TEXT NOT NULL,
  preference_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, preference_type)
);

-- 启用 RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能访问自己的偏好
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);
```

### 创建旅行计划表
```sql
-- 旅行计划主表
CREATE TABLE travel_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget NUMERIC(10, 2),
  travelers INTEGER DEFAULT 1,
  preferences JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE travel_plans ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can view own plans"
  ON travel_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plans"
  ON travel_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plans"
  ON travel_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plans"
  ON travel_plans FOR DELETE
  USING (auth.uid() = user_id);
```

### 创建行程明细表
```sql
-- 行程明细表
CREATE TABLE itinerary_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES travel_plans(id) ON DELETE CASCADE,
  day INTEGER NOT NULL,
  type TEXT CHECK (type IN ('transport', 'accommodation', 'attraction', 'restaurant')),
  title TEXT NOT NULL,
  description TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  address TEXT,
  time_start TIME,
  time_end TIME,
  estimated_cost NUMERIC(10, 2),
  booking_info JSONB,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;

-- RLS 策略：通过 plan_id 关联用户
CREATE POLICY "Users can view items of own plans"
  ON itinerary_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM travel_plans
      WHERE travel_plans.id = itinerary_items.plan_id
      AND travel_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert items to own plans"
  ON itinerary_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM travel_plans
      WHERE travel_plans.id = itinerary_items.plan_id
      AND travel_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items of own plans"
  ON itinerary_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM travel_plans
      WHERE travel_plans.id = itinerary_items.plan_id
      AND travel_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items of own plans"
  ON itinerary_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM travel_plans
      WHERE travel_plans.id = itinerary_items.plan_id
      AND travel_plans.user_id = auth.uid()
    )
  );
```

### 创建费用记录表
```sql
-- 费用记录表
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES travel_plans(id) ON DELETE CASCADE,
  itinerary_item_id UUID REFERENCES itinerary_items(id) ON DELETE SET NULL,
  category TEXT CHECK (category IN ('transport', 'accommodation', 'food', 'attraction', 'shopping', 'other')),
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'CNY',
  description TEXT,
  expense_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can view expenses of own plans"
  ON expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM travel_plans
      WHERE travel_plans.id = expenses.plan_id
      AND travel_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert expenses to own plans"
  ON expenses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM travel_plans
      WHERE travel_plans.id = expenses.plan_id
      AND travel_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update expenses of own plans"
  ON expenses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM travel_plans
      WHERE travel_plans.id = expenses.plan_id
      AND travel_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete expenses of own plans"
  ON expenses FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM travel_plans
      WHERE travel_plans.id = expenses.plan_id
      AND travel_plans.user_id = auth.uid()
    )
  );
```

### 创建用户配置表

在 Supabase Dashboard 的 SQL Editor 中执行：

```sql
-- 用户 API 配置表（加密存储）
CREATE TABLE IF NOT EXISTS user_api_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  baichuan_endpoint TEXT,
  baichuan_key TEXT, -- 加密存储
  baichuan_model TEXT,
  amap_key TEXT, -- 加密存储
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE user_api_config ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Users can view own config" ON user_api_config;
DROP POLICY IF EXISTS "Users can insert own config" ON user_api_config;
DROP POLICY IF EXISTS "Users can update own config" ON user_api_config;
DROP POLICY IF EXISTS "Users can delete own config" ON user_api_config;

-- RLS 策略：用户只能访问自己的配置
CREATE POLICY "Users can view own config"
  ON user_api_config FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own config"
  ON user_api_config FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own config"
  ON user_api_config FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own config"
  ON user_api_config FOR DELETE
  USING (auth.uid() = user_id);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_api_config_user_id ON user_api_config(user_id);
```

### 创建索引以提升性能
```sql
-- 创建索引
CREATE INDEX idx_travel_plans_user_id ON travel_plans(user_id);
CREATE INDEX idx_itinerary_items_plan_id ON itinerary_items(plan_id);
CREATE INDEX idx_expenses_plan_id ON expenses(plan_id);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
```

## 4. 配置邮件认证

1. 在 Supabase Dashboard，点击 "Authentication" -> "Providers"
2. 确保 "Email" 已启用
3. 可选：配置自定义 SMTP（Settings -> Auth -> SMTP Settings）

## 5. 测试连接

运行项目后，尝试注册一个账号，检查 Supabase Dashboard 的 "Authentication" -> "Users" 中是否出现新用户。
