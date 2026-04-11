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
    description: "演示“先开始一点 / 稍后提醒我 / 今天先放一放”。",
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
      title="当前环境还没成功连上数据库。"
    >
      <DemoRuntimeError
        title="首页数据读取失败"
        message="通常是当前环境的 Postgres 数据库没有连通，或者 DATABASE_URL / DIRECT_URL 还没有按环境正确配置。"
        details={[
          `当前 APP_ENV：${prismaSetupState.appEnvironment}`,
          `数据库类型：${prismaSetupState.databaseProvider}`,
          `当前数据库目标：${prismaSetupState.databaseUrlMasked}`,
          `环境提示：${prismaSetupState.setupError ?? "DATABASE_URL 已显式配置"}`,
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
    >
      <section className="mx-auto max-w-5xl xl:max-w-6xl">
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
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <div className="rounded-[26px] border border-white/80 bg-white/92 p-5 shadow-[0_18px_48px_-30px_rgba(15,23,42,0.22)]">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
              <Sparkles className="h-4 w-4 text-[#62786d]" />
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
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {demoSteps.map((step) => {
                const Icon = step.icon;

                return (
                  <Link
                    key={step.title}
                    href={step.href}
                    className="group rounded-[22px] border border-zinc-200 bg-zinc-50/80 px-4 py-4 transition hover:-translate-y-0.5 hover:border-[#d9e3dc] hover:bg-white"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#62786d] shadow-sm">
                        <Icon className="h-4 w-4" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-[#62786d]" />
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
          <div className="rounded-[26px] border border-[#d9e3dc] bg-[linear-gradient(180deg,#fafcf9_0%,#f1f4f1_100%)] p-5 shadow-[0_18px_48px_-30px_rgba(15,23,42,0.22)]">
            <div className="flex items-center gap-2 text-sm font-medium text-[#61766c]">
              <RotateCcw className="h-4 w-4" />
              演示前重置
            </div>
            <div className="mt-3 rounded-[18px] border border-[#d9e3dc] bg-white px-4 py-4 font-mono text-sm text-zinc-900">
              npm run db:reset:demo
            </div>
            <div className="mt-3 text-xs leading-5 text-zinc-500">
              这会把正式演示数据恢复到稳定样本集，适合现场重复演示。
            </div>
          </div>

          <div className="rounded-[26px] border border-white/80 bg-white/92 p-5 shadow-[0_18px_48px_-30px_rgba(15,23,42,0.22)]">
            <div className="text-sm font-medium text-zinc-700">首页重点</div>
            <div className="mt-3 text-sm leading-6 text-zinc-600">
              用户打开页面后，第一眼只需要知道一件事：先输入一句任务。
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
