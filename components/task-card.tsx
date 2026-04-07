"use client";

import { useActionState, useEffect } from "react";

import {
  archiveTaskAction,
  deleteTaskAction,
  triggerTaskReminderAction,
  updateTaskAction,
} from "@/app/actions/task-actions";
import { initialTaskActionState } from "@/app/actions/task-action-state";
import { FormSubmitButton } from "@/components/form-submit-button";
import { contextOptions } from "@/lib/task-options";
import type { TaskListItem } from "@/lib/task-service";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

const statusToneClassName: Record<TaskListItem["statusTone"], string> = {
  neutral: "bg-zinc-100 text-zinc-700",
  info: "bg-sky-50 text-sky-800",
  success: "bg-emerald-50 text-emerald-800",
  warning: "bg-amber-50 text-amber-800",
  danger: "bg-rose-50 text-rose-800",
};

type TaskCardProps = {
  task: TaskListItem;
};

export function TaskCard({ task }: TaskCardProps) {
  const editingTaskId = useUiStore((state) => state.editingTaskId);
  const setEditingTaskId = useUiStore((state) => state.setEditingTaskId);
  const [state, formAction] = useActionState(
    updateTaskAction.bind(null, task.id),
    initialTaskActionState,
  );
  const isEditing = editingTaskId === task.id;

  useEffect(() => {
    if (state.status === "success") {
      setEditingTaskId(null);
    }
  }, [setEditingTaskId, state.status]);

  return (
    <article className="rounded-[28px] border border-white/80 bg-white/95 p-5 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.18)] sm:p-6">
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span
              className={cn(
                "rounded-full px-3 py-1 font-medium",
                statusToneClassName[task.statusTone],
              )}
            >
              {task.statusLabel}
            </span>
            <span className="rounded-full bg-zinc-100 px-3 py-1">
              场景 {task.contextLabel}
            </span>
            <span className="rounded-full bg-zinc-100 px-3 py-1">
              文案 {task.reminderStyleLabel}
            </span>
          </div>

          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
            {task.content}
          </h2>

          <div className="rounded-[22px] border border-emerald-100 bg-[linear-gradient(180deg,#f8fffb_0%,#eef9f2_100%)] px-4 py-4">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">
              推荐的第一步
            </div>
            <div className="mt-2 text-base font-medium leading-7 text-zinc-900">
              {task.parsedAction}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 rounded-[22px] bg-zinc-50/85 p-4 text-sm">
            <div>
              <dt className="text-zinc-500">下次提醒</dt>
              <dd className="mt-1 font-medium text-zinc-900">
                {task.nextReminderAtLabel ?? "待生成"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">最晚时间</dt>
              <dd className="mt-1 font-medium text-zinc-900">
                {task.dueAtLabel ?? "未设置"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">创建时间</dt>
              <dd className="mt-1 font-medium text-zinc-900">{task.createdAtLabel}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">当前状态</dt>
              <dd className="mt-1 font-medium text-zinc-900">{task.statusLabel}</dd>
            </div>
          </dl>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {!task.isArchived ? (
            <button
              type="button"
              onClick={() => setEditingTaskId(isEditing ? null : task.id)}
              className="min-h-11 rounded-[18px] border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-400"
            >
              {isEditing ? "收起编辑" : "编辑任务"}
            </button>
          ) : null}

          {!task.isArchived ? (
            <form
              className="col-span-2 sm:col-span-1"
              action={triggerTaskReminderAction.bind(null, task.id)}
            >
              <FormSubmitButton
                pendingText="处理中..."
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
              >
                手动触发提醒
              </FormSubmitButton>
            </form>
          ) : null}

          {!task.isArchived ? (
            <form className="col-span-1" action={archiveTaskAction.bind(null, task.id)}>
              <FormSubmitButton
                pendingText="归档中..."
                className="w-full border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
              >
                归档
              </FormSubmitButton>
            </form>
          ) : null}

          <form
            className={cn(
              "col-span-2 sm:col-span-1",
              task.isArchived ? "sm:w-full" : undefined,
            )}
            action={deleteTaskAction.bind(null, task.id)}
          >
            <FormSubmitButton
              pendingText="删除中..."
              className="w-full border border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300"
            >
              删除
            </FormSubmitButton>
          </form>
        </div>
      </div>

      {isEditing ? (
        <form
          action={formAction}
          className="mt-5 rounded-[24px] border border-amber-100 bg-amber-50/60 p-4 sm:p-5"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-700">任务文本</label>
              <textarea
                name="content"
                defaultValue={task.content}
                className="mt-2 min-h-28 w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 text-zinc-900 outline-none transition focus:border-amber-300"
              />
              {state.fieldErrors?.content ? (
                <p className="mt-2 text-sm text-rose-600">{state.fieldErrors.content}</p>
              ) : null}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">最晚时间</label>
              <input
                name="dueAt"
                type="datetime-local"
                defaultValue={task.dueAtInputValue}
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-amber-300"
              />
              {state.fieldErrors?.dueAt ? (
                <p className="mt-2 text-sm text-rose-600">{state.fieldErrors.dueAt}</p>
              ) : null}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">任务场景</label>
              <select
                name="contextType"
                defaultValue={task.contextType}
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-amber-300"
              >
                {contextOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <div className="text-sm text-zinc-500">
              {state.message || "保存后，系统会重新计算推荐的第一步和下一次提醒时间。"}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditingTaskId(null)}
                className="min-h-11 rounded-[18px] border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700"
              >
                取消
              </button>
              <FormSubmitButton
                pendingText="保存中..."
                className="w-full bg-zinc-900 text-white"
              >
                保存修改
              </FormSubmitButton>
            </div>
          </div>
        </form>
      ) : null}
    </article>
  );
}
