# 「第一步」部署指南

## 首次部署步骤

### 1. 本地准备项目

```bash
npm install
npm run db:migrate
npm run db:seed
npm run deploy:check
```

这一步会：

- 初始化本地数据库
- 生成一套稳定的演示数据
- 更新 `prisma/demo.db`
- 确认 `lint` 和 `build` 均通过

### 2. 推送到 GitHub

建议分支结构：

- `main`：稳定演示版
- `dev`：持续优化版

建议流程：

1. 把当前可演示状态提交到 `main`
2. 从 `main` 拉出 `dev`
3. 后续日常优化先进入 `dev`

### 3. 在 Vercel 导入 GitHub 仓库

在 Vercel 中：

1. 点击 `Add New... -> Project`
2. 选择 GitHub 仓库
3. Framework 识别为 Next.js 即可
4. Production Branch 设为 `main`

### 4. 配置环境变量

在 Vercel 项目中添加：

```bash
DATABASE_URL="file:/tmp/first-step-demo.db"
```

不要使用：

```bash
DATABASE_URL="file:./dev.db"
```

因为 Vercel 线上实例不能把项目目录当作可写数据库目录。  
演示版 SQLite 必须使用 `/tmp`。

### 5. 首次部署

- 触发 `main` 部署后，会得到一个 Production Deployment
- 这个生产地址就是稳定演示链接

## 如何拿到公开演示链接

### 稳定公开演示链接

- 使用 `main` 分支对应的 Production Deployment
- 这个地址适合对外展示

### 预览链接

- 每次 push 到 `dev`
- 或者从 `dev` 向 `main` 发起 PR
- Vercel 都会自动生成一个 Preview Deployment 链接

这个预览链接是公网可访问的，可以直接发给别人看，但不会影响 `main` 的稳定演示地址。

## 如何继续迭代而不影响稳定版

推荐工作流：

1. `main` 只保留稳定可演示版本
2. 日常开发在 `dev`
3. 每次 push `dev`，使用 Vercel Preview Deployment 看效果
4. 确认没问题后，再把 `dev` 合并回 `main`

这样能同时满足：

- `main` 有稳定公开链接
- `dev` 可以持续试验和预览

## GitHub + Vercel 的推荐使用方式

### 稳定演示版

- 演示时使用 `main` 对应的生产域名

### 持续优化版

- 开发时在 `dev`
- 每次 push 到 `dev` 都会生成新的预览链接
- 预览验收通过后，再合并到 `main`

## 本地 Vercel CLI 部署方式

如果你不想先走 GitHub，也可以先本地部署：

### 1. 安装 CLI

```bash
npm i -g vercel
```

### 2. 登录

```bash
vercel login
```

### 3. 本地预览部署

```bash
vercel
```

### 4. 发布到生产

```bash
vercel --prod
```

CLI 部署也要在 Vercel 项目里配置同样的环境变量：

```bash
DATABASE_URL="file:/tmp/first-step-demo.db"
```

## 如何回滚到上一个稳定版本

有两种简单方式：

### 方式 1：在 Vercel 控制台回滚

1. 打开项目的 Deployments 列表
2. 找到上一个稳定的 Production Deployment
3. Promote 或重新恢复该版本

### 方式 2：在 GitHub 回滚

1. 回退 `main` 上最近一次不稳定提交
2. 再次 push 到 `main`
3. Vercel 会自动重新部署稳定版本

## 当前部署方案的限制

这次为了保持项目最小改动、快速可部署，采用的是演示优先方案：

- 公网演示使用 `prisma/demo.db` 快照
- 运行时复制到 `/tmp` 供当前实例读写
- 如果你漏配了 `DATABASE_URL`，运行时代码会自动回退到 `file:/tmp/first-step-demo.db`
- 冷启动、扩容或不同实例之间不保证长期共享数据

这意味着：

- 适合公开演示
- 适合 Preview Deployment
- 适合继续迭代
- 不适合当作正式生产数据库方案

## 后续可升级方向

如果你后面要把它从“可演示”升级成“可长期在线使用”，下一步优先做：

1. 把 SQLite 演示快照换成真正的云数据库
2. 给 `main` 和 `dev` 配不同数据库
3. 保留 `main` 的稳定演示数据集
4. 把 Preview Deployment 接到独立测试数据源
