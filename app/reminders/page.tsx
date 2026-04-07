import { AppShell } from "@/components/app-shell";
import { ReminderCenter } from "@/components/reminder-center";
import { getDueReminders } from "@/lib/reminder-service";

export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  const reminders = await getDueReminders();

  return (
    <AppShell
      eyebrow="提醒中心"
      title="把当前真正该提醒的任务，转换成更容易接受的启动动作。"
      description="这里会筛出已经到达提醒时机的任务。进入页面时会记录一次 reminder_sent，用户点击按钮后会立即写入 ReminderEvent 并更新下一次提醒时间。"
    >
      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-white/80 bg-white/90 p-5 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.22)]">
          <div className="text-sm text-zinc-500">当前应提醒</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
            {reminders.length}
          </div>
        </div>
        <div className="rounded-[24px] border border-white/80 bg-white/90 p-5 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.22)]">
          <div className="text-sm text-zinc-500">记录方式</div>
          <div className="mt-2 text-sm leading-6 text-zinc-700">
            进入页面记 `reminder_sent`，点击按钮记响应事件。
          </div>
        </div>
        <div className="rounded-[24px] border border-white/80 bg-white/90 p-5 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.22)]">
          <div className="text-sm text-zinc-500">当前规则</div>
          <div className="mt-2 text-sm leading-6 text-zinc-700">
            支持截止前候选提醒、自定义 1 到 60 分钟延后、以及“今天先放一下”。
          </div>
        </div>
      </section>

      <ReminderCenter reminders={reminders} />
    </AppShell>
  );
}
