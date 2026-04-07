# 第一步

面向拖延型用户的低阻力启动提醒器 MVP。

这个项目不解决“任务记不住”的问题，而是解决“明知道该做，但就是很难开始”的问题。它把一句随手记下的任务，在更容易被接受的时机，转成一个更容易执行的“下一步提醒”。

## 项目简介

- 目标用户：有拖延倾向、不喜欢复杂待办软件的人
- 核心目标：降低启动阻力，而不是监督任务完成
- MVP 范围：任务录入、任务列表、站内提醒、提醒响应埋点、统计看板

## 技术栈

- Next.js 16 App Router
- TypeScript
- Tailwind CSS 4
- Prisma + SQLite
- Zustand
- date-fns

## 本地运行步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据库

```bash
npm run db:migrate
```

### 3. 导入演示数据

```bash
npm run db:seed
```

说明：

- 这会重置本地开发数据库 `prisma/dev.db`
- 同时更新部署演示用数据库快照 `prisma/demo.db`

### 4. 启动开发环境

```bash
npm run dev
```

## 本地访问地址

- 开发环境：[http://localhost:3000](http://localhost:3000)

## 环境变量

复制 [`.env.example`](./.env.example) 为 `.env`，本地默认值如下：

```bash
DATABASE_URL="file:./dev.db"
```

## 数据库初始化方式

- 本地开发使用 Prisma + SQLite
- 本地数据库文件：`prisma/dev.db`
- 公网演示部署使用 `prisma/demo.db` 作为只读快照源，运行时复制到 `/tmp` 供当前实例读写

## Seed 数据使用方式

```bash
npm run db:seed
```

这组数据会包含：

- 求职任务
- 学习任务
- 手机 / 电脑 / 线下场景
- `gentle / minimal_action / ddl_push` 三种提醒风格
- 接受 / 延后 / 拒绝三种提醒响应
- 至少一条当前应提醒任务，方便直接验证提醒中心

## 页面说明

- `/`
  - 首页 / 快速录入页
  - 支持一句话任务录入、可选最晚时间、可选任务场景
  - 首页内置 3 分钟演示路径提示
- `/tasks`
  - 任务列表页
  - 支持编辑、删除、手动触发提醒、归档
- `/reminders`
  - 提醒中心页
  - 展示当前应提醒任务
  - 支持“先开始一点 / 稍后提醒我 / 今天先放一下”
  - 支持自定义 1 到 60 分钟延后提醒
- `/dashboard`
  - 数据看板页
  - 展示有效提醒总次数、接受 / 延后 / 拒绝次数与比率
  - 支持按提醒风格、按任务场景对比

## 核心指标定义

- 有效提醒：`ReminderEvent.eventType = reminder_sent`
- 启动接受：`ReminderEvent.eventType = accept`
- 延后：`ReminderEvent.eventType = delay`
- 拒绝：`ReminderEvent.eventType = reject`
- 启动接受率 = `accept / reminder_sent`
- 延后率 = `delay / reminder_sent`
- 拒绝率 = `reject / reminder_sent`

看板中的统计数据全部基于真实 `ReminderEvent` 聚合计算，不是写死假数据。

## 3 分钟演示路径

### 路径 A：最快演示方式

1. 执行 `npm run db:seed`
2. 打开首页，看一眼产品定位和演示路径
3. 进入 `/reminders`，对一条待提醒任务点击一次“先开始一点”或“稍后提醒我”
4. 进入 `/dashboard`，观察统计数字变化

### 路径 B：完整闭环方式

1. 在 `/` 新建一条任务，例如“今晚把简历第一段改掉”
2. 去 `/tasks` 确认任务已创建
3. 在任务列表点击“手动触发提醒”
4. 去 `/reminders` 对该任务做一次响应
5. 去 `/dashboard` 查看统计变化

## 测试用示例数据说明

下面 3 条是最适合演示的 seed 任务：

- `学习 30 分钟算法题`
  - 适合演示：当前应提醒任务、提醒中心响应、看板数字立刻变化
- `明天下午给 HR 回消息`
  - 适合演示：手机场景、轻提醒文案、延后提醒逻辑
- `周四前投 3 个岗位`
  - 适合演示：DDL 压力型文案、拒绝提醒样本、截止前提醒策略

## 常用脚本

```bash
npm run dev
npm run build
npm run lint
npm run db:migrate
npm run db:push
npm run db:seed
npm run db:prepare-demo
npm run db:studio
npm run deploy:check
```

## 部署与预览

推荐使用：

- `main` 分支：稳定演示版
- `dev` 分支：持续优化版
- GitHub + Vercel Preview Deployment：预览迭代，不影响稳定版

### 部署模式

#### 1. 稳定演示版

- 把 `main` 设为 Vercel Production Branch
- 生产域名始终指向 `main`
- 对外演示优先使用生产域名

#### 2. 持续优化版

- 在 `dev` 分支开发
- 每次 push 到 `dev`，Vercel 都会生成一个 Preview Deployment
- 预览链接不会影响 `main` 对外演示地址

### Vercel 环境变量

在 Vercel 项目中至少配置：

```bash
DATABASE_URL="file:/tmp/first-step-demo.db"
```

### 说明

- 这是一个可部署的最小可行方案
- `prisma/demo.db` 会随项目一起部署
- 运行时会把它复制到 `/tmp`，供当前实例读写
- 这样可以拿到公网演示链接和 Preview Deployment
- 但数据不是长期持久化的，实例冷启动后可能回到快照状态

更完整的部署流程见 [docs/deployment-guide.md](./docs/deployment-guide.md)。

## 当前 MVP 限制说明

- 单用户、本地运行思路优先，不做登录注册和多人协作
- 提醒是站内模拟提醒，不是真系统级推送
- `parsedAction` 是轻规则提取，不做复杂 NLP
- 看板分组按任务当前属性聚合，不保留历史快照
- 不追踪任务最终完成率，只追踪是否愿意开始
- Vercel 部署是“演示可用优先”的降级方案，数据不保证长期持久化

## 已实现功能

- 极简任务录入
- 任务列表、编辑、删除、归档
- 手动触发提醒
- 规则版提醒引擎
- 站内提醒中心
- 提醒响应按钮与 `ReminderEvent` 写入
- 启动接受率、延后率、拒绝率统计
- 基础演示 seed 数据
- `docs/demo-guide.md`
- `docs/product-decisions.md`
- `docs/deployment-guide.md`

## 未实现功能

- 登录注册
- 多人协作
- 系统级通知
- 微信接入 / 第三方账号接入
- AI 自动排程
- 复杂 NLP
- 原生 App
- 任务完成追踪
- 真正的云端持久数据库

## 相关文档

- 演示说明：[docs/demo-guide.md](./docs/demo-guide.md)
- 产品决策：[docs/product-decisions.md](./docs/product-decisions.md)
- 部署说明：[docs/deployment-guide.md](./docs/deployment-guide.md)
