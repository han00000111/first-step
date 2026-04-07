import { AppShell } from "@/components/app-shell";
import { StatsCards } from "@/components/stats-cards";
import { getDashboardMetrics } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();

  const summaryItems = [
    {
      label: "有效提醒总次数",
      value: String(metrics.effectiveReminderCount),
      note: "以 reminder_sent 为准，只统计真实展示给用户的站内提醒。",
    },
    {
      label: "启动接受次数",
      value: String(metrics.acceptCount),
      note: `接受率 ${metrics.acceptanceRate}，定义为 accept / reminder_sent。`,
    },
    {
      label: "延后次数",
      value: String(metrics.delayCount),
      note: `延后率 ${metrics.delayRate}，定义为 delay / reminder_sent。`,
    },
    {
      label: "拒绝次数",
      value: String(metrics.rejectCount),
      note: `拒绝率 ${metrics.rejectRate}，定义为 reject / reminder_sent。`,
    },
  ];

  return (
    <AppShell
      eyebrow="统计看板"
      title="主指标不是完成率，而是用户愿不愿意开始。"
      description={`看板基于真实 ReminderEvent 聚合。${
        metrics.latestReminderAtLabel
          ? `最近一次有效提醒记录于 ${metrics.latestReminderAtLabel}。`
          : "当前还没有有效提醒数据。"
      }`}
    >
      <StatsCards items={summaryItems} />

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[24px] border border-zinc-200 bg-white p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.16)]">
          <div className="text-lg font-semibold text-zinc-900">提醒风格接受率对比</div>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            当前按任务的提醒风格聚合 reminder_sent，并统计该风格下的接受、延后、拒绝结果。
          </p>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200">
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
                    <td className="px-4 py-3 text-zinc-500">
                      {row.reminderCount} 次
                    </td>
                    <td className="px-4 py-3 text-zinc-800">
                      {row.acceptanceRate}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{row.delayRate}</td>
                    <td className="px-4 py-3 text-zinc-500">{row.rejectRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-[24px] border border-zinc-200 bg-white p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.16)]">
          <div className="text-lg font-semibold text-zinc-900">任务场景接受率对比</div>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            用场景来观察不同执行环境下，用户对提醒的接受程度是否存在明显差异。
          </p>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200">
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
                    <td className="px-4 py-3 text-zinc-500">
                      {row.reminderCount} 次
                    </td>
                    <td className="px-4 py-3 text-zinc-800">
                      {row.acceptanceRate}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{row.delayRate}</td>
                    <td className="px-4 py-3 text-zinc-500">{row.rejectRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
