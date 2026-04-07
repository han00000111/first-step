import { AppShell } from "@/components/app-shell";
import { ReminderCenter } from "@/components/reminder-center";
import { getDueReminders } from "@/lib/reminder-service";

export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  const reminders = await getDueReminders();

  return (
    <AppShell
      eyebrow="提醒中心"
      title="现在更容易开始的任务，会在这里出现。"
      description="这里只展示已经到达提醒时机的任务。进入页面会记录 reminder_sent，点击按钮后会立刻写入 ReminderEvent。"
    >
      <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="rounded-[22px] border border-white/80 bg-white/92 p-4 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.22)]">
          <div className="text-xs text-zinc-500">当前应提醒</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
            {reminders.length}
          </div>
        </div>
        <div className="rounded-[22px] border border-white/80 bg-white/92 p-4 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.22)]">
          <div className="text-xs text-zinc-500">记录方式</div>
          <div className="mt-2 text-sm leading-6 text-zinc-700">
            进入页面记一次 reminder_sent，点击按钮记响应事件。
          </div>
        </div>
        <div className="col-span-2 rounded-[22px] border border-white/80 bg-white/92 p-4 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.22)] md:col-span-1">
          <div className="text-xs text-zinc-500">当前规则</div>
          <div className="mt-2 text-sm leading-6 text-zinc-700">
            支持截止前候选提醒、自定义 1 到 60 分钟延后，以及“今天先放一下”。
          </div>
        </div>
      </section>

      <ReminderCenter reminders={reminders} />
    </AppShell>
  );
}
