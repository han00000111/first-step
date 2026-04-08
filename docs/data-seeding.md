# Seed 数据策略

## 当前支持的 Profile

- `local`
- `preview`
- `demo`
- `production`

## 区别

### `local`

本地开发和调试使用：

```bash
npm run db:seed:local
```

### `preview`

`dev` 分支的 Preview 环境使用：

```bash
npm run db:seed:preview
```

### `demo`

稳定演示数据集：

```bash
npm run db:seed:demo
```

### `production`

`master` 对应的 Production 环境使用：

```bash
npm run db:seed:production
```

说明：

- `production` 不会生成一套新的数据
- 它会复用 `demo` 数据集
- 保留这个 profile 名称，是为了让 Production 配置更清楚

## 迁移与 Seed 命令

### Local

```bash
npm run db:generate
npm run db:migrate:dev
npm run db:seed:local
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

## 重置演示数据

Production 演示数据被污染时，可以执行：

```bash
npm run db:reset:production
```

这会重新写入稳定演示数据集。
