# 「第一步」部署指南

## 目标

当前部署策略的目标不是“先把应用跑起来”，而是：

1. Production 保持稳定演示数据
2. Preview 有独立测试数据源
3. Local / Preview / Production 三套环境完全隔离

## 推荐数据库

推荐使用 Prisma 兼容度高、且支持分支/分环境的 Postgres 服务：

- Neon
- Supabase Postgres
- Railway Postgres

当前默认文档按 Neon 思路编排：

- `DATABASE_URL` 用连接池地址
- `DIRECT_URL` 用直连地址

## 环境变量配置

### Local

`.env` 里配置：

```bash
APP_ENV="local"
SEED_PROFILE="local"
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/first_step_local?schema=public"
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:5432/first_step_local?schema=public"
```

### Vercel Preview

在 Vercel 的 Preview 环境里配置：

```bash
APP_ENV="preview"
SEED_PROFILE="preview"
DATABASE_URL="<preview pooled postgres url>"
DIRECT_URL="<preview direct postgres url>"
```

### Vercel Production

在 Vercel 的 Production 环境里配置：

```bash
APP_ENV="production"
SEED_PROFILE="demo"
DATABASE_URL="<production pooled postgres url>"
DIRECT_URL="<production direct postgres url>"
```

## 分支与环境的对应关系

推荐策略：

- `main`：Production 数据库
- `dev`：Preview 数据库

当前仓库如果还没从 `master` 切到 `main`，先按这个原则执行：

- `master` 暂时承担 `main` 的角色
- `dev` 继续承担预览分支角色

重点不是分支名字本身，而是：

- Production Branch 只连 Production 数据库
- Preview Branch 只连 Preview 数据库

## 本地开发步骤

### 1. 启动本地 Postgres

```bash
npm run db:local:up
```

### 2. 执行迁移

```bash
npm run db:migrate
```

### 3. 注入本地样本

```bash
npm run db:seed:local
```

### 4. 启动应用

```bash
npm run dev
```

## Preview 环境初始化

当 Preview 数据库首次创建后，执行：

```bash
npm run db:migrate:deploy
npm run db:seed:preview
```

执行方式有两种：

1. 在本地 shell 临时切到 Preview 的 `DATABASE_URL` / `DIRECT_URL` 后执行
2. 在 CI / 平台任务里执行

## Production 环境初始化

当 Production 数据库首次创建后，执行：

```bash
npm run db:migrate:deploy
npm run db:seed:demo
```

Production 的 `demo` seed 代表稳定演示数据集。

如果演示环境被现场操作污染，也可以再次执行：

```bash
npm run db:reset:demo
```

## 为什么不再使用 SQLite 快照

旧方案的问题很明确：

1. SQLite 单文件不适合 Vercel 多实例运行
2. `/tmp` 不是长期持久存储
3. Preview 和 Production 很难稳定隔离
4. 后续 Web Push、用户订阅和长期在线数据都需要真正的云数据库

所以这次升级后：

- 运行时不再复制 `demo.db`
- 线上只依赖环境变量里的 Postgres 连接

## 验收方式

### Production 验收

1. 打开 Production 地址
2. 看到稳定演示数据
3. 在 Preview 环境新增任务，不会出现在 Production

### Preview 验收

1. push 到预览分支
2. Vercel 生成 Preview Deployment
3. Preview 数据可以自由测试
4. 不影响 Production 演示数据

## 回滚方式

如果数据库迁移或配置有问题：

1. 回滚应用代码
2. 恢复旧的 Production Deployment
3. 保留 Production 数据库不动

如果是 seed 被污染：

1. 保持代码不变
2. 重新执行 `npm run db:reset:demo`

## 相关文档

- [docs/environment-strategy.md](./environment-strategy.md)
- [docs/data-seeding.md](./data-seeding.md)
- [docs/notification-options.md](./notification-options.md)
