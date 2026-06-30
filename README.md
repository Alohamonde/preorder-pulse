# Preorder Pulse

Preorder Manager / Back in Stock 风格 Shopify App：**预售 Selling Plans**、**到货通知等候名单**、**inventory webhook 自动通知**。与 project1–5、giftdev2 刻意错位：使用 Selling Plans API + inventory webhook，不做购物车改写、不做 Discount Function、不做积分。

## 功能

| 模块 | 说明 |
|------|------|
| 预售规则 | 通过 `sellingPlanGroupCreate` 创建 PRE_ORDER 方案，支持定金比例与预计发货日 |
| 自动预售 | 可选：库存为 0 时自动创建预售规则（products/update webhook） |
| 到货通知 | 缺货变体展示邮箱订阅表单，补货后 inventory webhook 触发通知 |
| 店面扩展 | Theme blocks：预售按钮 + 到货通知表单 |
| KPI 仪表盘 | 活跃规则、等候名单、通知发送、预售订单归因 |

## 技术栈

- Remix + Polaris + Prisma + SQLite
- Selling Plans API（`category: PRE_ORDER`）
- Theme App Extension（`preorder-storefront`）
- Shop Metafield `$app:preorder_pulse` + App Proxy
- Webhooks：`inventory_levels/update`、`orders/paid`、`products/update`

## 快速开始

```bash
cd "C:\other projects\project6\preorder-pulse"
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run dev
```

## 店面启用

1. 主题编辑器 → 商品页 → 添加 **Preorder Button** 区块
2. 主题编辑器 → 商品页 → 添加 **Notify Me (Back in Stock)** 区块
3. App 后台 → 预售规则 → 搜索商品并创建预售方案
4. App 后台 → 设置 → 配置文案与自动预售开关

## 差异化矩阵

| 项目 | 定位 |
|------|------|
| project1 | 购前引流 |
| project2 | 购后 Upsell |
| project3 | 购物车凑单 |
| project4 | B2B 批发 |
| project5 | 会员积分 |
| giftdev2 | 购中阶梯赠品 |
| **Preorder Pulse** | **库存/履约 — 预售 + 到货通知** |

## 通知说明

开发阶段到货通知以 **控制台日志 + Prisma NotificationJob 记录** 模拟邮件发送。生产环境可接入 SendGrid、Klaviyo 等邮件服务。

## 项目结构

```text
app/routes/
  app._index.tsx                      # KPI 总览
  app.preorders.tsx                   # 预售规则 CRUD
  app.waitlist.tsx                    # 等候名单管理
  app.settings.tsx                    # 全局设置
  apps.preorder-pulse.config.tsx      # App Proxy 配置
  apps.preorder-pulse.subscribe.tsx   # 等候名单订阅
  apps.preorder-pulse.track.tsx       # 事件上报
  webhooks.inventory_levels.update.tsx
  webhooks.orders.paid.tsx
  webhooks.products.update.tsx
extensions/
  preorder-storefront/                # Theme App Extension
```
