# 第一步 First Step

一个面向拖延型用户的低阻力启动提醒产品。

当前版本已经从“SQLite 演示快照”升级为“云数据库架构准备版”：

- 运行时改为标准 Postgres 连接
- Production / Preview / Local 三套环境分离
- `demo / preview / local / production` 四套 seed profile
- 保留稳定演示数据集的恢复能力

## 项目简介

“第一步”不做复杂计划管理，只聚焦一件事：让用户更容易开始。

它解决的不是“记不住任务”，而是“明知道该做，却很难启动”。

当前功能包含：

- 一句话快速录入任务
- 任务列表与轻量编辑
- 提醒中心与提醒响应
- 启动接受率、延后率、拒绝率看板
- Web/PWA 最小可用设备通知与 Web Push

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
VAPID_SUBJECT="mailto:you@example.com"
VAPID_PUBLIC_KEY="<your web push public key>"
VAPID_PRIVATE_KEY="<your web push private key>"
NEXT_PUBLIC_VAPID_PUBLIC_KEY="<same as VAPID_PUBLIC_KEY>"
```

如果还没有 VAPID 密钥，可以先执行：

```bash
npm run push:vapid
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

当前支持四套 profile：

- `local`
- `preview`
- `demo`
- `production`

常用命令：

```bash
npm run db:seed:local
npm run db:seed:preview
npm run db:seed:demo
npm run db:seed:production
```

其中：

- `demo` 用于稳定演示数据集
- `preview` 用于预览环境测试数据
- `local` 用于本地开发
- `production` 用于生产环境初始化，底层复用 `demo` 数据集，但保留独立 profile 名称，避免生产环境继续写成 `demo`

## 部署与预览

部署说明见：

- [docs/deployment-guide.md](./docs/deployment-guide.md)

重点环境变量：

### Production

```bash
APP_ENV="production"
SEED_PROFILE="production"
DATABASE_URL="<production pooled postgres url>"
DIRECT_URL="<production direct postgres url>"
VAPID_SUBJECT="mailto:you@example.com"
VAPID_PUBLIC_KEY="<production web push public key>"
VAPID_PRIVATE_KEY="<production web push private key>"
NEXT_PUBLIC_VAPID_PUBLIC_KEY="<same as VAPID_PUBLIC_KEY>"
```

### Preview

```bash
APP_ENV="preview"
SEED_PROFILE="preview"
DATABASE_URL="<preview pooled postgres url>"
DIRECT_URL="<preview direct postgres url>"
VAPID_SUBJECT="mailto:you@example.com"
VAPID_PUBLIC_KEY="<preview web push public key>"
VAPID_PRIVATE_KEY="<preview web push private key>"
NEXT_PUBLIC_VAPID_PUBLIC_KEY="<same as VAPID_PUBLIC_KEY>"
```

## Web/PWA 设备通知

当前版本已经接入：

- 通知权限申请与状态检测
- Service Worker 通知展示
- Push Subscription 入库
- 服务端 Web Push 发送
- 到点提醒推送后仍保留站内提醒记录
- iPhone / Safari / PWA 使用前提提示

当前验证方式：

1. 开启设备提醒
2. 点击“发送测试提醒”
3. 再点击“同步到点提醒”验证真实到点推送链路

### iPhone 使用前提

- 需要 iOS / iPadOS 16.4 及以上
- 需要先用 Safari 打开站点
- 需要“添加到主屏幕”
- 需要从主屏幕启动这个 Web App 后，再开启通知权限

### 当前做不到的事

- 不能像原生闹钟那样保证每一次都准点响铃
- Preview 和本地环境不会天然拥有稳定的后台定时调度
- 仍然受浏览器、电量策略、系统通知策略影响

### 自动到点推送的当前策略

- 线上通过 [vercel.json](./vercel.json) 的 cron 调度 `/api/push/dispatch-due`
- 本地开发时，可以用页面里的“同步到点提醒”手动验证
- 站内提醒中心仍然保留，保证事件和统计口径一致

如果你要继续升级通知能力，先看：

- [docs/notification-options.md](./docs/notification-options.md)

## 当前限制

- 云数据库连接串需要你在本地和平台手动配置
- Preview 与 Production 的数据库隔离需要在 Vercel 环境变量里完成
- Web Push 已接入，但仍不是原生稳定铃声提醒
- iPhone 需要主屏幕 PWA 形态才能启用 Web Push
- Preview / Local 默认更适合验证测试推送和手动同步，稳定自动调度以 Production 为主
- 不含登录注册、多人协作、原生 App、复杂 AI 排程
