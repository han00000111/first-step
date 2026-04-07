import { AppShell } from "@/components/app-shell";
import { DemoRuntimeError } from "@/components/demo-runtime-error";
import { StatsCards } from "@/components/stats-cards";
import { getDashboardMetrics } from "@/lib/metrics";
import { prismaSetupState } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type DashboardMetricsData = Awaited<ReturnType<typeof getDashboardMetrics>>;
type BreakdownRow = DashboardMetricsData["styleRows"][number];

function DashboardErrorState({ message }: { message: string }) {
  return (
    <AppShell
      eyebrow="统计看板"
      title="看板当前没有成功连上数据库。"
      description="这里不会直接白屏，方便你在线上确认是否是环境变量或数据库连接配置出了问题。"
    >
      <DemoRuntimeError
        title="看板数据读取失败"
        message="通常是当前环境的 Postgres 数据库没有连通，导致 ReminderEvent 聚合查询无法执行。"
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

function BreakdownCardList({
  rows,
  emptyText,
}: {
  rows: BreakdownRow[];
  emptyText: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[20px] border border-dashed border-zinc-300 bg-zinc-50/80 p-4 text-sm text-zinc-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-3 md:hidden">
      {rows.map((row) => (
        <div
          key={row.key}
          className="rounded-[20px] border border-zinc-200 bg-zinc-50/80 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-zinc-900">{row.label}</div>
            <div className="rounded-full bg-white px-3 py-1 text-xs text-zinc-500">
              {row.reminderCount} 次
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-2xl bg-white px-2 py-3">
              <div className="text-zinc-500">接受率</div>
              <div className="mt-1 font-semibold text-zinc-900">{row.acceptanceRate}</div>
            </div>
            <div className="rounded-2xl bg-white px-2 py-3">
              <div className="text-zinc-500">延后率</div>
              <div className="mt-1 font-semibold text-zinc-900">{row.delayRate}</div>
            </div>
            <div className="rounded-2xl bg-white px-2 py-3">
              <div className="text-zinc-500">拒绝率</div>
              <div className="mt-1 font-semibold text-zinc-900">{row.rejectRate}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DashboardContent({ metrics }: { metrics: DashboardMetricsData }) {
  const summaryItems = [
    {
      label: "有效提醒",
      value: String(metrics.effectiveReminderCount),
      note: "分母只看 reminder_sent。",
    },
    {
      label: "启动接受",
      value: String(metrics.acceptCount),
      note: `接受率 ${metrics.acceptanceRate}`,
    },
    {
      label: "延后次数",
      value: String(metrics.delayCount),
      note: `延后率 ${metrics.delayRate}`,
    },
    {
      label: "拒绝次数",
      value: String(metrics.rejectCount),
      note: `拒绝率 ${metrics.rejectRate}`,
    },
  ];

  return (
    <AppShell
      eyebrow="统计看板"
      title="重点不是做完多少，而是愿不愿意开始。"
      description={
        metrics.latestReminderAtLabel
          ? `看板基于真实 ReminderEvent 聚合。最近一次有效提醒记录于 ${metrics.latestReminderAtLabel}。`
          : "看板基于真实 ReminderEvent 聚合。当前还没有有效提醒数据。"
      }
    >
      <StatsCards items={summaryItems} />

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.16)] sm:p-6">
          <div className="text-lg font-semibold text-zinc-900">提醒风格对比</div>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            看不同提醒风格下，用户更容易接受、延后还是拒绝。
          </p>

          <div className="mt-4">
            <BreakdownCardList
              rows={metrics.styleRows}
              emptyText="当前还没有提醒风格统计。"
            />

            <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-zinc-200 md:block">
              <table className="min-w-[680px] w-full text-left text-sm">
                <thead className="bg-zinc-50 text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">提醒风格</th>
                    <th className="px-4 py-3 font-medium">提醒次数</th>
                    <th className="px-4 py-3 font-medium">接受率</th>
                    <th className="px-4 py-3 font-medium">延后率</th>
                    <th className="px-4 py-3 font-medium">拒绝率</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.styleRows.map((row) => (
                    <tr key={row.key} className="border-t border-zinc-200">
                      <td className="px-4 py-3 text-zinc-800">{row.label}</td>
                      <td className="px-4 py-3 text-zinc-500">{row.reminderCount} 次</td>
                      <td className="px-4 py-3 text-zinc-800">{row.acceptanceRate}</td>
                      <td className="px-4 py-3 text-zinc-500">{row.delayRate}</td>
                      <td className="px-4 py-3 text-zinc-500">{row.rejectRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.16)] sm:p-6">
          <div className="text-lg font-semibold text-zinc-900">任务场景对比</div>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            看手机、电脑、线下这些场景里，提醒更容易被接受还是被推迟。
          </p>

          <div className="mt-4">
            <BreakdownCardList
              rows={metrics.contextRows}
              emptyText="当前还没有任务场景统计。"
            />

            <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-zinc-200 md:block">
              <table className="min-w-[680px] w-full text-left text-sm">
                <thead className="bg-zinc-50 text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">任务场景</th>
                    <th className="px-4 py-3 font-medium">提醒次数</th>
                    <th className="px-4 py-3 font-medium">接受率</th>
                    <th className="px-4 py-3 font-medium">延后率</th>
                    <th className="px-4 py-3 font-medium">拒绝率</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.contextRows.map((row) => (
                    <tr key={row.key} className="border-t border-zinc-200">
                      <td className="px-4 py-3 text-zinc-800">{row.label}</td>
                      <td className="px-4 py-3 text-zinc-500">{row.reminderCount} 次</td>
                      <td className="px-4 py-3 text-zinc-800">{row.acceptanceRate}</td>
                      <td className="px-4 py-3 text-zinc-500">{row.delayRate}</td>
                      <td className="px-4 py-3 text-zinc-500">{row.rejectRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

export default async function DashboardPage() {
  let metrics: DashboardMetricsData | null = null;
  let errorMessage: string | null = null;

  try {
    metrics = await getDashboardMetrics();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown database error";
  }

  if (!metrics) {
    return <DashboardErrorState message={errorMessage ?? "Unknown database error"} />;
  }

  return <DashboardContent metrics={metrics} />;
}
