"use client";

import { useEffect, useMemo, useTransition } from "react";
import { BellRing, CalendarClock, CheckCircle2, Clock3, MoonStar } from "lucide-react";

import {
  markRemindersAsSentAction,
  respondToReminderAction,
} from "@/app/actions/reminder-actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import type { DueReminderItem } from "@/lib/reminder-service";

type ReminderCenterProps = {
  reminders: DueReminderItem[];
};

export function ReminderCenter({ reminders }: ReminderCenterProps) {
  const [, startTransition] = useTransition();
  const reminderPayload = useMemo(
    () =>
      reminders.map((reminder) => ({
        taskId: reminder.taskId,
        messageShown: reminder.messageShown,
        scheduledForIso: reminder.scheduledForIso,
      })),
    [reminders],
  );

  useEffect(() => {
    if (reminderPayload.length === 0) {
      return;
    }

    startTransition(() => {
      void markRemindersAsSentAction(reminderPayload);
    });
  }, [reminderPayload, startTransition]);

  if (reminders.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-zinc-300 bg-white/75 p-8 text-sm leading-7 text-zinc-500">
        当前没有需要立即提醒的任务。你可以在任务页手动触发提醒，或者等待下一次候选提醒时间到达。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reminders.map((reminder) => (
        <article
          key={`${reminder.taskId}-${reminder.scheduledForIso}`}
          className="rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdfb_100%)] p-6 shadow-[0_20px_56px_-32px_rgba(15,23,42,0.26)]"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">
                  <BellRing className="h-3.5 w-3.5" />
                  当前应提醒
                </span>
                <span className="rounded-full bg-zinc-100 px-3 py-1">
                  场景 {reminder.contextLabel}
                </span>
                <span className="rounded-full bg-zinc-100 px-3 py-1">
                  文案 {reminder.reminderStyleLabel}
                </span>
                <span className="rounded-full bg-zinc-100 px-3 py-1">
                  计划提醒 {reminder.scheduledForLabel}
                </span>
              </div>

              <h2 className="text-lg font-semibold text-zinc-900">{reminder.content}</h2>
              <div className="rounded-[24px] border border-emerald-100 bg-[linear-gradient(180deg,#f7fffb_0%,#ecfaf3_100%)] px-5 py-4 text-lg font-semibold leading-8 tracking-tight text-zinc-900">
                {reminder.messageShown}
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-zinc-500">
                <span className="rounded-full bg-zinc-100 px-3 py-1">
                  建议第一步 {reminder.parsedAction}
                </span>
                {reminder.dueAtLabel ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-rose-700">
                    <CalendarClock className="h-3.5 w-3.5" />
                    截止 {reminder.dueAtLabel}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:min-w-72">
              <form action={respondToReminderAction}>
                <input type="hidden" name="taskId" value={reminder.taskId} />
                <input type="hidden" name="responseType" value="now_start" />
                <input type="hidden" name="messageShown" value={reminder.messageShown} />
                <input
                  type="hidden"
                  name="scheduledForIso"
                  value={reminder.scheduledForIso}
                />
                <FormSubmitButton
                  pendingText="记录中…"
                  className="w-full bg-emerald-600 px-4 py-3 text-white hover:bg-emerald-700"
                >
                  <span className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    先开始一点
                  </span>
                </FormSubmitButton>
              </form>

              <form
                action={respondToReminderAction}
                className="rounded-[24px] border border-zinc-200 bg-zinc-50/80 p-3"
              >
                <input type="hidden" name="taskId" value={reminder.taskId} />
                <input type="hidden" name="responseType" value="remind_later" />
                <input type="hidden" name="messageShown" value={reminder.messageShown} />
                <input
                  type="hidden"
                  name="scheduledForIso"
                  value={reminder.scheduledForIso}
                />
                <label
                  htmlFor={`delay-${reminder.taskId}`}
                  className="mb-2 block text-xs font-medium text-zinc-600"
                >
                  过多久再提醒更合适
                </label>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <div className="flex items-center rounded-2xl border border-zinc-200 bg-white px-3">
                    <input
                      id={`delay-${reminder.taskId}`}
                      name="delayMinutes"
                      type="number"
                      min={1}
                      max={60}
                      defaultValue={10}
                      className="w-full bg-transparent py-3 text-sm text-zinc-900"
                    />
                    <span className="shrink-0 text-sm text-zinc-500">分钟后</span>
                  </div>
                  <FormSubmitButton
                    pendingText="稍等…"
                    className="h-full border border-zinc-200 bg-white px-4 py-3 text-zinc-700 hover:border-emerald-200 hover:bg-emerald-50"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Clock3 className="h-4 w-4" />
                      稍后提醒我
                    </span>
                  </FormSubmitButton>
                </div>
                <div className="mt-2 text-xs text-zinc-500">可设置 1 到 60 分钟。</div>
              </form>

              <form action={respondToReminderAction}>
                <input type="hidden" name="taskId" value={reminder.taskId} />
                <input type="hidden" name="responseType" value="not_today" />
                <input type="hidden" name="messageShown" value={reminder.messageShown} />
                <input
                  type="hidden"
                  name="scheduledForIso"
                  value={reminder.scheduledForIso}
                />
                <FormSubmitButton
                  pendingText="记录中…"
                  className="w-full border border-zinc-200 bg-white px-4 py-3 text-zinc-700 hover:border-amber-200 hover:bg-amber-50"
                >
                  <span className="inline-flex items-center gap-2">
                    <MoonStar className="h-4 w-4" />
                    今天先放一下
                  </span>
                </FormSubmitButton>
              </form>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
