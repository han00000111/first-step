# Seed 数据策略

## 当前支持的 profile

- `local`
- `dev`
- `preview`
- `demo`
- `production`

## 各 profile 的用途

### `local`

本地最轻量的数据集，适合常规开发调试。

```bash
npm run db:seed:local
```

### `dev`

给本地开发连远程 Neon dev 库时使用，适合：

- 智能推荐调试
- 提醒阶段调试
- 延后次数和响应历史调试

```bash
npm run db:seed:dev
```

### `preview`

给 Vercel Preview 使用的测试数据。

```bash
npm run db:seed:preview
```

### `demo`

稳定演示数据集。

```bash
npm run db:seed:demo
```

### `production`

给正式环境初始化使用。

```bash
npm run db:seed:production
```

说明：

- `production` 不会单独造一套新数据
- 它复用 `demo` 数据集
- 保留 `production` 这个名字，是为了平台配置更清楚

## 迁移与 seed 组合

### local

```bash
npm run db:generate
npm run db:migrate:dev
npm run db:seed:local
```

### dev

```bash
npm run db:generate
npm run db:migrate:dev
npm run db:seed:dev
```

### preview

```bash
npm run db:generate
npm run db:migrate
npm run db:seed:preview
```

### production

```bash
npm run db:generate
npm run db:migrate
npm run db:seed:production
```

## 重置命令

```bash
npm run db:reset:dev
npm run db:reset:production
```

## 当前 dev 数据集特点

`dev` 数据集会比 `local` 更适合联调：

- 有更长、更复杂的任务文本
- 有多次延后历史
- 有适合智能推荐调试的任务内容
- 有电脑、手机、线下三种场景
