# Preorder Pulse

预售与到货通知 Shopify App：**预售 Selling Plans**、**到货等候名单**、**inventory webhook 自动通知**。

独立产品：专注库存 / 履约侧。使用 Selling Plans API + inventory webhook；**不做购物车改写、不做 Discount Function、不做积分**。

![Shopify](https://img.shields.io/badge/Shopify-App-7AB55C?logo=shopify&logoColor=white)
![Remix](https://img.shields.io/badge/Remix-000?logo=remix&logoColor=white)

## 产品边界

| 覆盖 | 不覆盖 |
|------|--------|
| PRE_ORDER Selling Plan、缺货 Waitlist、补货通知、预售订单归因 | 促销弹窗、买赠、里程碑折扣、会员、B2B 价、内容/售后中台 |

与 [Conversion Pulse](https://github.com/Alohamonde/conversion-pulse)、[Loyalty Pulse](https://github.com/Alohamonde/loyalty-pulse)、[Wholesale Pulse](https://github.com/Alohamonde/wholesale-pulse)、[Commerce Ops](https://github.com/Alohamonde/commerce-ops) **互不隶属**；可同店可选搭配，无安装依赖。

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
git clone https://github.com/Alohamonde/preorder-pulse.git
cd preorder-pulse
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

## 可选搭配（无依赖）

- 有货时的转化漏斗 → [Conversion Pulse](https://github.com/Alohamonde/conversion-pulse)
- 会员复购 → [Loyalty Pulse](https://github.com/Alohamonde/loyalty-pulse)
- 批发 → [Wholesale Pulse](https://github.com/Alohamonde/wholesale-pulse)
- 售后闭环 → [Commerce Ops](https://github.com/Alohamonde/commerce-ops)

## License

MIT
