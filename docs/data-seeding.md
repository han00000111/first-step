# 数据种子策略

## 目标

这套 seed 不是为了“生成一些测试数据”而已，而是为了明确区分四种用途：

1. 本地开发数据
2. Preview 测试数据
3. Production 演示数据

## 当前支持的 profile

### `local`

用途：

- 本地开发
- 日常调试

命令：

```bash
npm run db:seed:local
```

### `preview`

用途：

- Preview Deployment
- 测试验证
- 功能联调

命令：

```bash
npm run db:seed:preview
```

### `demo`

用途：

- Production 稳定演示数据
- 现场演示前恢复数据

命令：

```bash
npm run db:seed:demo
```

### `production`

用途：

- Production 环境初始化
- 在生产环境中显式声明“使用稳定演示数据”

命令：

```bash
npm run db:seed:production
```

说明：

- `production` 不会生成另一套新数据
- 它会复用 `demo` 数据集
- 保留这个 profile 名称，是为了让生产环境配置更直观

重置演示数据：

```bash
npm run db:reset:demo
```

## 数据内容设计

四套 profile 都保留同一类场景：

- 求职任务
- 学习任务
- 电脑端任务
- 线下任务
- 不同提醒风格
- 接受 / 延后 / 拒绝样本

区别在于用途：

- `demo` 保持稳定演示内容
- `production` 在生产环境里复用 `demo` 数据集
- `preview` 更适合测试和验收
- `local` 更适合开发调试

## 执行逻辑

当前 seed 会：

1. 清空 `ReminderEvent`
2. 清空 `Task`
3. 按 profile 写入对应数据

也就是说，seed 本身就是一次“重建样本数据”。

## 推荐使用方式

### 本地开发

```bash
npm run db:migrate
npm run db:seed:local
```

### Preview 环境

```bash
npm run db:migrate:deploy
npm run db:seed:preview
```

### Production 演示环境

```bash
npm run db:migrate:deploy
npm run db:seed:production
```

## 注意

不要把 `preview` seed 打进 Production。  
也不要让 Preview 直接连 Production 数据库。

否则数据库虽然分了环境，数据仍然会混。
