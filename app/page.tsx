import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BellDot,
  Clock3,
  Laptop,
  RotateCcw,
  Smartphone,
  Sparkles,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { DemoRuntimeError } from "@/components/demo-runtime-error";
import { TaskEntryForm } from "@/components/task-entry-form";
import { prismaSetupState } from "@/lib/prisma";
import { getTaskHomeSummary } from "@/lib/task-service";

export const dynamic = "force-dynamic";

const fallbackPrinciples = [
  "默认一句话录入，不要求先拆任务。",
  "提醒关注开始动作，不追着问完成率。",
  "优先在更容易接受的时机提醒，而不是反复催促。",
];

const demoSteps = [
  {
    title: "1. 录入一句任务",
    description: "先在首页输入一句话任务，验证最低录入成本。",
    href: "/",
    icon: Sparkles,
  },
  {
    title: "2. 去任务列表确认",
    description: "确认任务已入库，并能编辑、归档或手动触发提醒。",
    href: "/tasks",
    icon: Laptop,
  },
  {
    title: "3. 在提醒中心响应",
    description: "演示“先开始一点 / 稍后提醒我 / 今天先放一下”的闭环。",
    href: "/reminders",
    icon: BellDot,
  },
  {
    title: "4. 在看板看统计变化",
    description: "查看有效提醒、接受率、延后率和拒绝率的真实变化。",
    href: "/dashboard",
    icon: BarChart3,
  },
];

type HomeSummaryData = Awaited<ReturnType<typeof getTaskHomeSummary>>;

function HomeErrorState({ message }: { message: string }) {
  return (
    <AppShell
      eyebrow="低阻力启动提醒器"
      title="演示环境当前没有成功连上数据库。"
      description="页面没有直接白屏，是为了让你能在线定位数据库初始化问题。"
    >
      <DemoRuntimeError
        title="首页数据读取失败"
        message="通常是线上 SQLite demo 数据库没有在第一次 Prisma 查询前初始化完成，或者 DATABASE_URL 没有指向可用的 /tmp 路径。"
        details={[
          `当前 DATABASE_URL：${prismaSetupState.databaseUrl}`,
          `目标数据库路径：${prismaSetupState.targetPath ?? "未解析到 sqlite 路径"}`,
          `初始化状态：${prismaSetupState.setupError ?? "数据库快照复制步骤已执行"}`,
          `本次 Prisma 错误：${message}`,
        ]}
      />
    </AppShell>
  );
}

function HomeContent({ summary }: { summary: HomeSummaryData }) {
  return (
    <AppShell
      eyebrow="低阻力启动提醒器"
      title="把一句随手记下的任务，变成更容易开始的下一步。"
      description="首页只做一件事：让用户尽快把任务放进来。先记下来，再决定什么时候提醒更容易被接受。"
    >
      <section className="mx-auto max-w-3xl">
        <TaskEntryForm />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-white/80 bg-white/90 px-5 py-5 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.22)]">
              <div className="text-sm text-zinc-500">活跃任务</div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
                {summary.activeCount}
              </div>
            </div>
            <div className="rounded-[24px] border border-white/80 bg-white/90 px-5 py-5 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.22)]">
              <div className="text-sm text-zinc-500">已归档</div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
                {summary.archivedCount}
              </div>
            </div>
            <div className="rounded-[24px] border border-white/80 bg-white/90 px-5 py-5 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.22)]">
              <div className="text-sm text-zinc-500">录入原则</div>
              <div className="mt-2 text-sm leading-6 text-zinc-700">
                先把任务放进来，再决定下一步提醒怎么更顺。
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.24)]">
            <div className="text-sm font-medium text-zinc-600">场景预设</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 px-4 py-4">
                <Smartphone className="h-4 w-4 text-emerald-700" />
                <div>
                  <div className="text-sm font-medium text-zinc-900">手机</div>
                  <div className="text-xs text-zinc-500">回消息、查看信息、轻量处理</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-4">
                <Laptop className="h-4 w-4 text-sky-700" />
                <div>
                  <div className="text-sm font-medium text-zinc-900">电脑</div>
                  <div className="text-xs text-zinc-500">简历修改、写作、投递岗位</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-4">
                <Clock3 className="h-4 w-4 text-amber-700" />
                <div>
                  <div className="text-sm font-medium text-zinc-900">轻提醒</div>
                  <div className="text-xs text-zinc-500">先用站内提醒，不打断太狠</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbf8_100%)] p-6 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.24)]">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-600">
              <Sparkles className="h-4 w-4 text-emerald-700" />
              最近任务
            </div>
            <div className="mt-4 space-y-3">
              {summary.recentTasks.length > 0
                ? summary.recentTasks.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 text-zinc-700"
                    >
                      <div className="font-medium text-zinc-900">{item.content}</div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {item.parsedAction} · {item.contextLabel} · {item.nextReminderAtLabel}
                      </div>
                    </div>
                  ))
                : fallbackPrinciples.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 text-zinc-700"
                    >
                      {item}
                    </div>
                  ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.22)] sm:p-8">
          <div className="text-sm font-medium text-zinc-500">3 分钟演示路径</div>
          <div className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            按这个顺序演示就够了：录入一句任务，确认任务出现，在提醒中心做一次响应，
            最后去看板看统计变化。
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {demoSteps.map((step) => {
              const Icon = step.icon;

              return (
                <Link
                  key={step.title}
                  href={step.href}
                  className="group rounded-[24px] border border-zinc-200 bg-zinc-50/80 px-5 py-5 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
                      <Icon className="h-4 w-4" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-700" />
                  </div>
                  <div className="mt-4 text-base font-semibold tracking-tight text-zinc-900">
                    {step.title}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-zinc-600">
                    {step.description}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <aside className="rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,#f7fffb_0%,#eef9f2_100%)] p-6 text-zinc-900 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.22)]">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
            <RotateCcw className="h-4 w-4" />
            演示前重置
          </div>
          <div className="mt-4 text-sm leading-6 text-zinc-600">
            如果你想每次都从同一组演示数据开始，先执行一次种子命令。
          </div>
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-white px-4 py-4 font-mono text-sm text-zinc-900">
            npm run db:seed
          </div>
          <div className="mt-4 text-xs leading-5 text-zinc-500">
            这会重建本地演示任务、提醒事件和看板统计样本，适合现场重复演示。
          </div>
        </aside>
      </section>
    </AppShell>
  );
}

export default async function Home() {
  let summary: HomeSummaryData | null = null;
  let errorMessage: string | null = null;

  try {
    summary = await getTaskHomeSummary();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown database error";
  }

  if (!summary) {
    return <HomeErrorState message={errorMessage ?? "Unknown database error"} />;
  }

  return <HomeContent summary={summary} />;
}
