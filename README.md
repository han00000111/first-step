# 第一步 First Step

一个面向拖延型用户的低阻力启动提醒产品。

当前版本已经从早期的 SQLite 演示方案升级到 Postgres 多环境方案，支持：

- `local`：本机或 Docker Postgres
- `dev`：本地开发直连远程 Neon dev 库
- `preview`：Vercel Preview 独立测试库
- `production`：Vercel Production 稳定演示库

## 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- Zustand
- date-fns
- Web Push / PWA

## 环境和数据库

### 环境矩阵

| 环境 | 用途 | 数据库 | Seed Profile | 迁移命令 |
| --- | --- | --- | --- | --- |
| `local` | 本机开发、离线调试 | Local Postgres | `local` | `npm run db:migrate:dev` |
| `dev` | 本地开发、智能推荐联调 | 远程 Neon dev 库 | `dev` | `npm run db:migrate:dev` |
| `preview` | Vercel Preview | Preview Postgres | `preview` | `npm run db:migrate` |
| `production` | Vercel Production | Production Postgres | `production` | `npm run db:migrate` |

### 分支与环境映射

- `master` -> `production`
- `dev` -> `preview`
- `APP_ENV=dev` 只用于本地开发时连接远程 dev 库，不直接对应 Vercel 分支

## 本地运行

### 方案 A：本地 local 库

1. 安装依赖

```bash
npm install
```

2. 使用 `.env.example` 中的 local 配置

```bash
APP_ENV="local"
SEED_PROFILE="local"
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/first_step_local?schema=public"
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:5432/first_step_local?schema=public"
```

3. 启动本地 Postgres

```bash
npm run db:local:up
```

4. 初始化数据库

```bash
npm run db:generate
npm run db:migrate:dev
npm run db:seed:local
```

5. 启动项目

```bash
npm run dev
```

访问地址：

- [http://localhost:3000](http://localhost:3000)

### 方案 B：本地直连远程 Neon dev 库

把 `.env` 改成：

```bash
APP_ENV="dev"
SEED_PROFILE="dev"
DATABASE_URL="postgresql://USER:PASSWORD@DEV_POOLER_HOST/first_step_dev?sslmode=require&pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://USER:PASSWORD@DEV_DIRECT_HOST/first_step_dev?sslmode=require"
```

如果要调智能推荐，再补：

```bash
OPENAI_API_KEY="你的 OpenAI Key"
OPENAI_FIRST_STEP_MODEL="gpt-4o-mini"
```

然后执行：

```bash
npm run db:generate
npm run db:migrate:dev
npm run db:seed:dev
npm run dev
```

## Preview 与 Production

### Preview

Vercel Preview 环境建议配置：

```bash
APP_ENV="preview"
SEED_PROFILE="preview"
DATABASE_URL="postgresql://USER:PASSWORD@PREVIEW_POOLER_HOST/first_step_preview?sslmode=require&pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://USER:PASSWORD@PREVIEW_DIRECT_HOST/first_step_preview?sslmode=require"
```

初始化命令：

```bash
npm run db:generate
npm run db:migrate
npm run db:seed:preview
```

### Production

Vercel Production 环境建议配置：

```bash
APP_ENV="production"
SEED_PROFILE="production"
DATABASE_URL="postgresql://USER:PASSWORD@PROD_POOLER_HOST/first_step_prod?sslmode=require&pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://USER:PASSWORD@PROD_DIRECT_HOST/first_step_prod?sslmode=require"
```

初始化命令：

```bash
npm run db:generate
npm run db:migrate
npm run db:seed:production
```

说明：

- `production` profile 复用稳定的 `demo` 数据集
- `preview` 使用独立测试数据
- `dev` 使用独立开发调试数据

## Seed Profile

当前支持：

- `local`
- `dev`
- `preview`
- `demo`
- `production`

区别：

- `local`：本地最轻量的开发数据
- `dev`：本地连远程 Neon dev 库时的调试数据，适合提醒和智能推荐联调
- `preview`：预览环境测试数据
- `demo`：稳定演示数据集
- `production`：生产环境初始化用，底层复用 `demo`

常用命令：

```bash
npm run db:seed:local
npm run db:seed:dev
npm run db:seed:preview
npm run db:seed:demo
npm run db:seed:production
```

## 迁移脚本

- 本地开发和 `dev` 远程开发库：

```bash
npm run db:migrate:dev
```

- Preview 和 Production：

```bash
npm run db:migrate
```

说明：

- `db:migrate:dev` = `prisma migrate dev`
- `db:migrate` = `prisma migrate deploy`

## 设备通知

当前已经支持 Web/PWA 版本的最小可用设备通知：

- 通知权限申请
- Service Worker 展示通知
- Push Subscription 入库
- 服务端 Web Push 发送

iPhone 上要生效，需要：

1. 用 Safari 打开站点
2. 添加到主屏幕
3. 从主屏幕重新打开
4. 再授权通知

当前还不是原生闹钟级提醒。Preview 和本地环境建议继续用页面里的“同步到点提醒”手动验证。

## 旧 SQLite 说明

旧的 SQLite `/tmp` 运行时逻辑已经迁走。当前正式代码路径只使用 Postgres。

仓库里仍然可能保留少量“为什么不再使用 SQLite”的历史说明，但不再参与运行。

## 更多说明

- [docs/deployment-guide.md](./docs/deployment-guide.md)
- [docs/environment-strategy.md](./docs/environment-strategy.md)
- [docs/data-seeding.md](./docs/data-seeding.md)
