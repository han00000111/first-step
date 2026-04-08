# 第一步 First Step

一个面向拖延型用户的低阻力启动提醒产品。

当前版本已经从 `SQLite + /tmp demo 快照` 升级为 `Postgres + 环境分库` 的部署准备版：

- `master` 对应 Production 数据源
- `dev` 对应 Preview 数据源
- 本地开发使用独立 Local 数据源
- `production` profile 复用稳定的 `demo` 演示数据集

## 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- Zustand
- date-fns
- Vercel

## 本地运行

### 1. 安装依赖

```bash
npm install
```

### 2. 准备环境变量

复制 [.env.example](./.env.example) 为 `.env`，本地默认配置为：

```bash
APP_ENV="local"
SEED_PROFILE="local"
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/first_step_local?schema=public"
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:5432/first_step_local?schema=public"
```

### 3. 启动本地 Postgres

```bash
npm run db:local:up
```

### 4. 初始化数据库

```bash
npm run db:generate
npm run db:migrate:dev
npm run db:seed:local
```

### 5. 启动项目

```bash
npm run dev
```

访问地址：

- [http://localhost:3000](http://localhost:3000)

## 数据库与环境策略

当前推荐拆分如下：

- Local：本地 Postgres，仅供开发调试
- Preview：Vercel Preview 对应的独立 Postgres
- Production：Vercel Production 对应的独立 Postgres

这三套环境不共用数据库。

### 分支与环境映射

- `master` -> Production
- `dev` -> Preview

### Production 环境变量

`master` 分支部署到 Vercel Production 时，建议配置：

```bash
APP_ENV="production"
SEED_PROFILE="production"
DATABASE_URL="postgresql://USER:PASSWORD@PROD_POOLER_HOST/first_step_prod?sslmode=require&pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://USER:PASSWORD@PROD_DIRECT_HOST/first_step_prod?sslmode=require"
```

说明：

- `DATABASE_URL` 给应用运行时使用，建议走连接池地址
- `DIRECT_URL` 给 Prisma 迁移使用，建议走直连地址

### Preview 环境变量

`dev` 分支部署到 Vercel Preview 时，建议配置：

```bash
APP_ENV="preview"
SEED_PROFILE="preview"
DATABASE_URL="postgresql://USER:PASSWORD@PREVIEW_POOLER_HOST/first_step_preview?sslmode=require&pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://USER:PASSWORD@PREVIEW_DIRECT_HOST/first_step_preview?sslmode=require"
```

## 迁移与 Seed 命令

### 本地开发

```bash
npm run db:generate
npm run db:migrate:dev
npm run db:seed:local
```

### Preview 环境

```bash
npm run db:generate
npm run db:migrate
npm run db:seed:preview
```

### Production 环境

```bash
npm run db:generate
npm run db:migrate
npm run db:seed:production
```

说明：

- `db:migrate` 现在是 `prisma migrate deploy`，用于 Preview / Production
- `db:migrate:dev` 保留给本地开发
- `production` profile 会复用 `demo` 数据集，但保留独立 profile 名称，便于平台配置和文档表达

## Seed Profile

当前支持四种 profile：

- `local`
- `preview`
- `demo`
- `production`

区别：

- `local`：本地开发和调试
- `preview`：预览环境测试数据
- `demo`：稳定演示数据集
- `production`：生产环境初始化使用，底层复用 `demo`

常用命令：

```bash
npm run db:seed:local
npm run db:seed:preview
npm run db:seed:demo
npm run db:seed:production
```

## 设备通知

当前版本已经接入 Web/PWA 方向的最小可用设备通知：

- 通知权限申请
- Service Worker 通知展示
- Push Subscription 入库
- 服务端 Web Push 发送
- 到点提醒推送后仍保留站内提醒记录

iPhone 上要生效，需要：

1. 使用 Safari 打开站点
2. 添加到主屏幕
3. 从主屏幕重新打开
4. 再开启设备通知权限

当前仍做不到原生闹钟级稳定提醒，详见：

- [docs/notification-options.md](./docs/notification-options.md)

## 部署与预览

部署说明见：

- [docs/deployment-guide.md](./docs/deployment-guide.md)

环境与数据策略见：

- [docs/environment-strategy.md](./docs/environment-strategy.md)
- [docs/data-seeding.md](./docs/data-seeding.md)

## 当前限制

- 生产和预览数据库需要你在平台手动配置
- Web Push 已接入，但仍不等于原生移动端通知
- `master` / `dev` 的环境隔离依赖 Vercel 中正确配置 `DATABASE_URL` 和 `DIRECT_URL`
