import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BellDot,
  Laptop,
  RotateCcw,
  Sparkles,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { DemoRuntimeError } from "@/components/demo-runtime-error";
import { TaskEntryForm } from "@/components/task-entry-form";
import { prismaSetupState } from "@/lib/prisma";
import { getTaskHomeSummary } from "@/lib/task-service";

export const dynamic = "force-dynamic";

const fallbackPrinciples = [
  "默认只用一句话录入，不要求先拆任务。",
  "提醒只服务“开始”，不追着问完成率。",
  "优先在更容易接受的时机出现，而不是重复催促。",
];

const demoSteps = [
  {
    title: "录入一句任务",
    description: "先快速创建一条任务，验证录入阻力足够低。",
    href: "/",
    icon: Sparkles,
  },
  {
    title: "去任务页确认",
    description: "确认任务已入库，并能编辑、归档或手动提醒。",
    href: "/tasks",
    icon: Laptop,
  },
  {
    title: "在提醒里响应",
    description: "演示“先开始一点 / 稍后提醒我 / 今天先放一下”。",
    href: "/reminders",
    icon: BellDot,
  },
  {
    title: "去看板看变化",
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
      title="演示环境当前没有成功连上数据。"
      description="页面不会直接白屏，是为了让你在线上也能快速定位演示数据库的初始化问题。"
    >
      <DemoRuntimeError
        title="首页数据读取失败"
        message="通常是线上 SQLite demo 数据库没有在第一次 Prisma 查询前准备好，或者 DATABASE_URL 没有指向可用的 /tmp 路径。"
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
      title="想到什么，先记一句。让开始更容易一点。"
      description="首页只做一件事：帮用户在最短时间里把任务放进来。先记下，再决定什么时候提醒更容易被接受。"
    >
      <section className="mx-auto max-w-3xl">
        <TaskEntryForm />
      </section>

      <section className="mx-auto mt-4 grid max-w-3xl grid-cols-2 gap-3">
        <div className="rounded-[22px] border border-white/80 bg-white/90 px-4 py-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.22)]">
          <div className="text-xs text-zinc-500">当前任务</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
            {summary.activeCount}
          </div>
        </div>
        <div className="rounded-[22px] border border-white/80 bg-white/90 px-4 py-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.22)]">
          <div className="text-xs text-zinc-500">已归档</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
            {summary.archivedCount}
          </div>
        </div>
        <div className="col-span-2 rounded-[22px] border border-emerald-100 bg-[linear-gradient(180deg,#fbfffd_0%,#f1faf4_100%)] px-4 py-4 text-sm leading-6 text-zinc-700 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.2)]">
          先把任务放进来，再决定提醒时机。目标不是监督完成，而是帮用户迈出第一步。
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <div className="rounded-[26px] border border-white/80 bg-white/92 p-5 shadow-[0_18px_48px_-30px_rgba(15,23,42,0.22)]">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
              <Sparkles className="h-4 w-4 text-emerald-700" />
              最近任务
            </div>
            <div className="mt-4 space-y-3">
              {summary.recentTasks.length > 0
                ? summary.recentTasks.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[20px] border border-zinc-200 bg-zinc-50/70 px-4 py-3"
                    >
                      <div className="text-sm font-medium leading-6 text-zinc-900">
                        {item.content}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-zinc-500">
                        {item.parsedAction} · {item.contextLabel} · {item.nextReminderAtLabel}
                      </div>
                    </div>
                  ))
                : fallbackPrinciples.map((item) => (
                    <div
                      key={item}
                      className="rounded-[20px] border border-zinc-200 bg-zinc-50/70 px-4 py-3 text-sm leading-6 text-zinc-700"
                    >
                      {item}
                    </div>
                  ))}
            </div>
          </div>

          <div className="rounded-[26px] border border-white/80 bg-white/92 p-5 shadow-[0_18px_48px_-30px_rgba(15,23,42,0.22)]">
            <div className="text-sm font-medium text-zinc-700">3 分钟演示路径</div>
            <div className="mt-2 text-sm leading-6 text-zinc-600">
              按这个顺序演示就够了：录入一条任务，确认任务出现，在提醒中心做一次响应，最后去看板看统计变化。
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {demoSteps.map((step) => {
                const Icon = step.icon;

                return (
                  <Link
                    key={step.title}
                    href={step.href}
                    className="group rounded-[22px] border border-zinc-200 bg-zinc-50/80 px-4 py-4 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white"
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
                    <div className="mt-1 text-sm leading-6 text-zinc-600">
                      {step.description}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[26px] border border-emerald-100 bg-[linear-gradient(180deg,#f8fffb_0%,#eef8f1_100%)] p-5 shadow-[0_18px_48px_-30px_rgba(15,23,42,0.22)]">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
              <RotateCcw className="h-4 w-4" />
              演示前重置
            </div>
            <div className="mt-3 text-sm leading-6 text-zinc-600">
              如果你想每次都从同一组演示数据开始，先执行一次种子命令。
            </div>
            <div className="mt-4 rounded-[18px] border border-emerald-100 bg-white px-4 py-4 font-mono text-sm text-zinc-900">
              npm run db:seed
            </div>
            <div className="mt-3 text-xs leading-5 text-zinc-500">
              这会重建演示任务、提醒事件和看板统计样本，适合现场重复演示。
            </div>
          </div>

          <div className="rounded-[26px] border border-white/80 bg-white/92 p-5 shadow-[0_18px_48px_-30px_rgba(15,23,42,0.22)]">
            <div className="text-sm font-medium text-zinc-700">首页重点</div>
            <div className="mt-3 text-sm leading-6 text-zinc-600">
              用户打开页面后，第一眼只需要知道一件事：先输入一句任务。其他说明都往后放。
            </div>
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
