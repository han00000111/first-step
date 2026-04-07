# 环境与数据库策略

## 目标

当前环境策略只解决一件事：

> 把正式演示、预览测试和本地开发彻底隔开。

## 环境矩阵

| 环境 | 用途 | 数据库 | seed profile | 说明 |
|---|---|---|---|---|
| local | 本地开发 | 本地 Postgres | local | 只给开发和调试使用 |
| preview | Vercel Preview | 独立测试 Postgres | preview | 用于预览和验收 |
| production | Vercel Production | 稳定演示 Postgres | demo | 用于正式演示 |

## 核心原则

1. 每个环境只连自己的数据库
2. Production 不接测试数据
3. Preview 不写正式演示数据
4. Local 只做开发，不影响线上

## 环境变量

### 必需变量

- `APP_ENV`
- `SEED_PROFILE`
- `DATABASE_URL`
- `DIRECT_URL`

### 变量含义

#### `APP_ENV`

用于标记当前环境：

- `local`
- `preview`
- `production`

#### `SEED_PROFILE`

用于确定当前执行的样本数据策略：

- `local`
- `preview`
- `demo`

#### `DATABASE_URL`

应用运行时使用的数据库连接串。

#### `DIRECT_URL`

Prisma 迁移时使用的直连数据库连接串。

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
SEED_PROFILE="demo"
DATABASE_URL="<production pooled postgres url>"
DIRECT_URL="<production direct postgres url>"
```

## 分支绑定建议

理想策略：

- `main` -> Production
- `dev` -> Preview

如果当前仓库暂时还是 `master`：

- `master` 暂时承担 `main` 的角色
- 后续单独做分支重命名即可

## 为什么这样拆

这样做之后：

1. 生产演示数据不会被开发测试污染
2. Preview 可以自由验证，不怕写脏正式数据
3. 本地开发可以重置数据，不影响线上
4. 后续做 Web Push、用户订阅、数据统计都会更稳
