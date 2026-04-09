# 环境与数据库策略

## 目标

把数据库环境明确拆成 4 套：

- `local`
- `dev`
- `preview`
- `production`

这样本地开发、远程联调、预览测试、正式演示互不污染。

## 环境矩阵

| 环境 | 典型场景 | 数据库 | Seed Profile |
| --- | --- | --- | --- |
| `local` | 本机开发、离线调试 | Local Postgres | `local` |
| `dev` | 本地开发机连远程 Neon dev 库 | Dev Postgres | `dev` |
| `preview` | Vercel Preview | Preview Postgres | `preview` |
| `production` | Vercel Production | Production Postgres | `production` |

## 分支映射

- `master` -> `production`
- `dev` -> `preview`

注意：

- `APP_ENV=dev` 不是 Vercel Preview
- 它是给你本地开发时主动连远程 dev 库用的

## 关键原则

1. `local` 只给本机调试
2. `dev` 只给本地连远程开发库
3. `preview` 只给 Vercel Preview
4. `production` 只给正式环境
5. `production` profile 复用 `demo` 数据集，但仍保留独立名字

## 环境变量

### local

```bash
APP_ENV="local"
SEED_PROFILE="local"
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/first_step_local?schema=public"
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:5432/first_step_local?schema=public"
```

### dev

```bash
APP_ENV="dev"
SEED_PROFILE="dev"
DATABASE_URL="postgresql://USER:PASSWORD@DEV_POOLER_HOST/first_step_dev?sslmode=require&pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://USER:PASSWORD@DEV_DIRECT_HOST/first_step_dev?sslmode=require"
```

### preview

```bash
APP_ENV="preview"
SEED_PROFILE="preview"
DATABASE_URL="<preview pooled postgres url>"
DIRECT_URL="<preview direct postgres url>"
```

### production

```bash
APP_ENV="production"
SEED_PROFILE="production"
DATABASE_URL="<production pooled postgres url>"
DIRECT_URL="<production direct postgres url>"
```

## 当前是否还有 SQLite 逻辑

当前运行时已经不再依赖 SQLite。

剩下的只是文档里的迁移背景说明，用来解释为什么之前的 `/tmp` demo 快照方案被废弃。
