# 第一步 First Step

一个面向拖延型用户的低阻力启动提醒产品。

当前版本已经从“SQLite 演示快照”升级为“云数据库架构准备版”：

- 运行时改为标准 Postgres 连接
- Production / Preview / Local 三套环境分离
- `demo / preview / local` 三套 seed profile
- 保留稳定演示数据集的恢复能力

## 项目简介

“第一步”不做复杂计划管理，只聚焦一件事：让用户更容易开始。

它解决的不是“记不住任务”，而是“明知道该做，却很难启动”。

当前功能包含：

- 一句话快速录入任务
- 任务列表与轻量编辑
- 提醒中心与提醒响应
- 启动接受率、延后率、拒绝率看板
- Web/PWA 最小可用设备通知

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

### 2. 准备本地环境变量

复制 [.env.example](./.env.example) 为 `.env`，默认本地配置已经指向 Docker Postgres：

```bash
APP_ENV="local"
SEED_PROFILE="local"
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/first_step_local?schema=public"
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:5432/first_step_local?schema=public"
```

### 3. 启动本地数据库

```bash
npm run db:local:up
```

### 4. 初始化数据库

```bash
npm run db:migrate
npm run db:seed:local
```

### 5. 启动开发环境

```bash
npm run dev
```

### 6. 本地访问

[http://localhost:3000](http://localhost:3000)

## 数据环境策略

当前推荐的环境拆分如下：

- Local Development：本地 Postgres，只给开发使用
- Preview Deployment：独立测试数据库，只给预览和验收使用
- Production Deployment：稳定演示数据库，只给正式演示使用

这三套环境不共享数据库，避免：

- 测试任务污染正式演示数据
- Preview 写入影响 Production
- 本地实验数据进入线上

详细说明见：

- [docs/environment-strategy.md](./docs/environment-strategy.md)
- [docs/data-seeding.md](./docs/data-seeding.md)

## Seed 数据策略

当前支持三套 profile：

- `local`
- `preview`
- `demo`

常用命令：

```bash
npm run db:seed:local
npm run db:seed:preview
npm run db:seed:demo
```

其中：

- `demo` 用于稳定演示数据集
- `preview` 用于预览环境测试数据
- `local` 用于本地开发

## 部署与预览

部署说明见：

- [docs/deployment-guide.md](./docs/deployment-guide.md)

重点环境变量：

### Production

```bash
APP_ENV="production"
SEED_PROFILE="demo"
DATABASE_URL="<production pooled postgres url>"
DIRECT_URL="<production direct postgres url>"
```

### Preview

```bash
APP_ENV="preview"
SEED_PROFILE="preview"
DATABASE_URL="<preview pooled postgres url>"
DIRECT_URL="<preview direct postgres url>"
```

## 设备通知边界

当前设备通知仍然是 Web/PWA 最小可用方案，不是原生稳定闹钟。

如果你要继续升级通知能力，先看：

- [docs/notification-options.md](./docs/notification-options.md)

## 当前限制

- 云数据库连接串需要你在本地和平台手动配置
- Preview 与 Production 的数据库隔离需要在 Vercel 环境变量里完成
- 当前通知仍然没有接入完整 Web Push 服务端
- 不含登录注册、多人协作、原生 App、复杂 AI 排程
