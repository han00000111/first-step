# 部署指南

## 当前环境分工

- `master` -> Vercel Production -> Production Postgres
- `dev` -> Vercel Preview -> Preview Postgres
- `APP_ENV=dev` -> 本地开发机 -> 远程 Neon dev 库

说明：

- `dev` 环境是给本地开发和智能推荐调试用的远程库
- `preview` 是给 Vercel Preview 用的独立测试库
- `production` 是正式演示库

## Vercel 环境变量

### Production

```bash
APP_ENV="production"
SEED_PROFILE="production"
DATABASE_URL="postgresql://USER:PASSWORD@PROD_POOLER_HOST/first_step_prod?sslmode=require&pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://USER:PASSWORD@PROD_DIRECT_HOST/first_step_prod?sslmode=require"
```

### Preview

```bash
APP_ENV="preview"
SEED_PROFILE="preview"
DATABASE_URL="postgresql://USER:PASSWORD@PREVIEW_POOLER_HOST/first_step_preview?sslmode=require&pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://USER:PASSWORD@PREVIEW_DIRECT_HOST/first_step_preview?sslmode=require"
```

## 本地连远程 dev 库

本地开发如果要直接连 Neon dev 库，使用：

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

## 迁移命令

### 本地 local / 本地 dev

```bash
npm run db:generate
npm run db:migrate:dev
```

### Preview / Production

```bash
npm run db:generate
npm run db:migrate
```

说明：

- `db:migrate:dev` 使用 `prisma migrate dev`
- `db:migrate` 使用 `prisma migrate deploy`

## Seed 命令

### 本地 local

```bash
npm run db:seed:local
```

### 本地 dev

```bash
npm run db:seed:dev
```

### Preview

```bash
npm run db:seed:preview
```

### Production

```bash
npm run db:seed:production
```

说明：

- `production` profile 复用稳定的 `demo` 数据集
- `preview` 使用独立测试数据
- `dev` 使用更适合开发调试的数据

## 首次初始化建议

### 本地 local

```bash
npm install
npm run db:local:up
npm run db:generate
npm run db:migrate:dev
npm run db:seed:local
npm run dev
```

### 本地 dev

```bash
npm install
npm run db:generate
npm run db:migrate:dev
npm run db:seed:dev
npm run dev
```

### Preview

```bash
npm run db:generate
npm run db:migrate
npm run db:seed:preview
```

### Production

```bash
npm run db:generate
npm run db:migrate
npm run db:seed:production
```

## 旧 SQLite 方案

旧的 SQLite `/tmp` 运行时方案已经不再用于当前部署。

如果你在文档历史里还能看到 SQLite 字样，那只是迁移背景说明，不是当前运行逻辑。
