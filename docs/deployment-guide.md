# 部署指南

## 目标

当前部署策略的目标是：

1. `master` 使用独立 Production Postgres
2. `dev` 使用独立 Preview Postgres
3. 不再依赖 SQLite 或 `/tmp` demo 快照

## 分支与环境映射

- `master` -> Vercel Production
- `dev` -> Vercel Preview

## Vercel 环境变量

### Production

在 Vercel 的 Production 环境中配置：

```bash
APP_ENV="production"
SEED_PROFILE="production"
DATABASE_URL="postgresql://USER:PASSWORD@PROD_POOLER_HOST/first_step_prod?sslmode=require&pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://USER:PASSWORD@PROD_DIRECT_HOST/first_step_prod?sslmode=require"
VAPID_SUBJECT="mailto:you@example.com"
VAPID_PUBLIC_KEY="<production web push public key>"
VAPID_PRIVATE_KEY="<production web push private key>"
NEXT_PUBLIC_VAPID_PUBLIC_KEY="<same as VAPID_PUBLIC_KEY>"
```

### Preview

在 Vercel 的 Preview 环境中配置：

```bash
APP_ENV="preview"
SEED_PROFILE="preview"
DATABASE_URL="postgresql://USER:PASSWORD@PREVIEW_POOLER_HOST/first_step_preview?sslmode=require&pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://USER:PASSWORD@PREVIEW_DIRECT_HOST/first_step_preview?sslmode=require"
VAPID_SUBJECT="mailto:you@example.com"
VAPID_PUBLIC_KEY="<preview web push public key>"
VAPID_PRIVATE_KEY="<preview web push private key>"
NEXT_PUBLIC_VAPID_PUBLIC_KEY="<same as VAPID_PUBLIC_KEY>"
```

说明：

- `DATABASE_URL` 给应用运行时使用
- `DIRECT_URL` 给 Prisma 迁移使用
- Production 和 Preview 必须是两套不同的数据库

## 本地开发

### 1. 启动本地 Postgres

```bash
npm run db:local:up
```

### 2. 执行本地迁移

```bash
npm run db:generate
npm run db:migrate:dev
```

### 3. 注入本地数据

```bash
npm run db:seed:local
```

## Preview 初始化

首次创建 Preview 数据库后，执行：

```bash
npm run db:generate
npm run db:migrate
npm run db:seed:preview
```

这套命令应该在连接到 Preview 数据库的环境中执行。

## Production 初始化

首次创建 Production 数据库后，执行：

```bash
npm run db:generate
npm run db:migrate
npm run db:seed:production
```

说明：

- `production` profile 会复用 `demo` 数据集
- 这样 Production 仍然使用稳定演示数据，但环境配置仍然明确写成 `production`

如果 Production 演示数据被现场操作污染，可以执行：

```bash
npm run db:reset:production
```

## 为什么不再使用 SQLite 快照

旧方案的问题是：

1. SQLite 单文件不适合 Vercel 多实例环境
2. `/tmp` 不是长期持久化存储
3. Preview 和 Production 很难稳定隔离
4. Web Push 订阅和长期在线数据都需要真正的云数据库

所以现在的正式部署前提是：

- 线上只连 Postgres
- 不再复制 `demo.db`
- 不再依赖 `file:/tmp/...`

## 设备通知说明

当前线上设备通知依赖：

1. 正确的 Production / Preview Postgres
2. Web Push 环境变量
3. [vercel.json](../vercel.json) 中的 cron 调度

Production 会自动调度：

```bash
/api/push/dispatch-due
```

Preview 更适合手动验证推送链路，不适合作为稳定自动提醒环境。

## 回滚方式

如果这次 Postgres 升级出现问题：

1. 先回滚应用代码
2. 恢复上一个稳定 Deployment
3. 保留数据库，单独检查连接串和迁移状态

如果只是演示数据被写脏：

```bash
npm run db:reset:production
```
