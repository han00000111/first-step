import { AppShell } from "@/components/app-shell";
import { DemoRuntimeError } from "@/components/demo-runtime-error";
import { StatsCards } from "@/components/stats-cards";
import { getDashboardMetrics } from "@/lib/metrics";
import { prismaSetupState } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type DashboardMetricsData = Awaited<ReturnType<typeof getDashboardMetrics>>;
type BreakdownRow = DashboardMetricsData["styleRows"][number];
type PieSlice = {
  key: string;
  label: string;
  value: number;
  color: string;
};

function formatPercent(value: number, total: number) {
  if (total === 0) {
    return "0%";
  }

  const percentage = (value / total) * 100;
  return Number.isInteger(percentage)
    ? `${percentage.toFixed(0)}%`
    : `${percentage.toFixed(1)}%`;
}

function buildPieGradient(slices: PieSlice[]) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  if (total === 0) {
    return "conic-gradient(#dadce3 0deg 360deg)";
  }

  let current = 0;
  const segments = slices.map((slice) => {
    const start = current;
    current += (slice.value / total) * 360;

    return `${slice.color} ${start}deg ${current}deg`;
  });

  return `conic-gradient(${segments.join(", ")})`;
}

function PieChartCard({
  title,
  totalLabel,
  emptyText,
  slices,
}: {
  title: string;
  totalLabel: string;
  emptyText: string;
  slices: PieSlice[];
}) {
  const activeSlices = slices.filter((slice) => slice.value > 0);
  const total = activeSlices.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <div className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.16)] sm:p-6">
      <div className="text-sm font-medium text-zinc-900">{title}</div>

      {total === 0 ? (
        <div className="mt-4 rounded-[20px] border border-dashed border-zinc-300 bg-zinc-50/80 p-4 text-sm text-zinc-500">
          {emptyText}
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-[176px_minmax(0,1fr)] sm:items-center">
          <div className="relative mx-auto h-40 w-40">
            <div
              className="h-full w-full rounded-full"
              style={{ backgroundImage: buildPieGradient(activeSlices) }}
            />
            <div className="absolute inset-6 flex items-center justify-center rounded-full bg-white shadow-[0_12px_30px_-22px_rgba(15,23,42,0.25)]">
              <div className="text-center">
                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                  {totalLabel}
                </div>
                <div className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
                  {total}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {activeSlices.map((slice) => (
              <div
                key={slice.key}
                className="flex items-center justify-between gap-3 rounded-[18px] bg-zinc-50/80 px-3 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="text-sm font-medium text-zinc-800">
                    {slice.label}
                  </span>
                </div>
                <div className="text-right text-xs text-zinc-500">
                  <div>{formatPercent(slice.value, total)}</div>
                  <div className="mt-0.5">{slice.value} 次</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardErrorState({ message }: { message: string }) {
  return (
    <AppShell eyebrow="统计看板" title="看板当前没有成功连上数据库。">
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
      note: "分母只看 reminder_sent",
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

  const responseSlices: PieSlice[] = [
    { key: "accept", label: "接受", value: metrics.acceptCount, color: "#7FAE95" },
    { key: "delay", label: "延后", value: metrics.delayCount, color: "#D1AE6B" },
    { key: "reject", label: "拒绝", value: metrics.rejectCount, color: "#C98E97" },
  ];

  const styleColorMap: Record<string, string> = {
    gentle: "#91AFC7",
    minimal_action: "#7FAE95",
    ddl_push: "#D1AE6B",
    unknown: "#B4AEC7",
  };
  const styleFallbackColors = ["#91AFC7", "#7FAE95", "#D1AE6B", "#B4AEC7"];
  const styleSlices: PieSlice[] = metrics.styleRows.map((row, index) => ({
    key: row.key,
    label: row.label,
    value: row.reminderCount,
    color:
      styleColorMap[row.key] ??
      styleFallbackColors[index % styleFallbackColors.length],
  }));

  const contextColorMap: Record<string, string> = {
    unknown: "#B4AEC7",
    mobile: "#8FB5D6",
    pc: "#7FAE95",
    offline: "#D1AE6B",
  };
  const contextSlices: PieSlice[] = metrics.contextRows.map((row) => ({
    key: row.key,
    label: row.label,
    value: row.reminderCount,
    color: contextColorMap[row.key] ?? "#B4AEC7",
  }));

  return (
    <AppShell eyebrow="统计看板" title="重点不是做完多少，而是愿不愿意开始。">
      <StatsCards items={summaryItems} />

      <section className="mt-6 grid gap-4 xl:grid-cols-3">
        <PieChartCard
          title="提醒响应占比"
          totalLabel="总响应"
          emptyText="当前还没有响应事件可展示。"
          slices={responseSlices}
        />
        <PieChartCard
          title="提醒风格占比"
          totalLabel="总提醒"
          emptyText="当前还没有提醒风格统计。"
          slices={styleSlices}
        />
        <PieChartCard
          title="任务场景占比"
          totalLabel="总提醒"
          emptyText="当前还没有任务场景统计。"
          slices={contextSlices}
        />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.16)] sm:p-6">
          <div className="text-lg font-semibold text-zinc-900">提醒风格对比</div>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            图表看整体占比，表格保留具体提醒次数和接受、延后、拒绝率。
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
            图表看整体占比，表格保留具体提醒次数和接受、延后、拒绝率。
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
