# 环境与数据库策略

## 目标

这套策略只解决一件事：

> 让 `master`、`dev` 和本地开发各用各的数据库。

## 环境矩阵

| 环境 | 分支 | 数据库 | Seed Profile | 用途 |
| --- | --- | --- | --- | --- |
| local | 本地工作目录 | Local Postgres | local | 日常开发和调试 |
| preview | dev | Preview Postgres | preview | 预览部署、联调、验收 |
| production | master | Production Postgres | production | 正式演示 |

## 必需环境变量

- `APP_ENV`
- `SEED_PROFILE`
- `DATABASE_URL`
- `DIRECT_URL`

## 推荐配置

### Local

```bash
APP_ENV="local"
SEED_PROFILE="local"
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/first_step_local?schema=public"
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:5432/first_step_local?schema=public"
```

### Preview

```bash
APP_ENV="preview"
SEED_PROFILE="preview"
DATABASE_URL="<preview pooled postgres url>"
DIRECT_URL="<preview direct postgres url>"
```

### Production

```bash
APP_ENV="production"
SEED_PROFILE="production"
DATABASE_URL="<production pooled postgres url>"
DIRECT_URL="<production direct postgres url>"
```

## 关键原则

1. `master` 只连 Production 数据库
2. `dev` 只连 Preview 数据库
3. 本地开发不写线上库
4. `production` profile 复用 `demo` 数据集，但仍保留独立名字

## 为什么这样拆

这样做之后：

1. Preview 测试不会污染正式演示数据
2. Production 可以长期保持稳定演示集
3. 本地可以随时重置，不影响线上
