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
    <article className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
            {task.content}
          </h2>
          <p className="text-sm leading-6 text-zinc-500">
            推荐的第一步：{task.parsedAction}
          </p>
          <div className="flex flex-wrap gap-2 text-sm text-zinc-500">
            <span className="rounded-full bg-zinc-100 px-3 py-1">
              创建于 {task.createdAtLabel}
            </span>
            <span className="rounded-full bg-zinc-100 px-3 py-1">
              最晚时间 {task.dueAtLabel ?? "未设置"}
            </span>
            <span className="rounded-full bg-zinc-100 px-3 py-1">
              场景 {task.contextLabel}
            </span>
            <span className="rounded-full bg-zinc-100 px-3 py-1">
              文案 {task.reminderStyleLabel}
            </span>
            <span
              className={cn(
                "rounded-full px-3 py-1",
                statusToneClassName[task.statusTone],
              )}
            >
              状态 {task.statusLabel}
            </span>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-800">
              下次提醒 {task.nextReminderAtLabel ?? "待生成"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {!task.isArchived ? (
            <button
              type="button"
              onClick={() => setEditingTaskId(isEditing ? null : task.id)}
              className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400"
            >
              {isEditing ? "收起编辑" : "编辑"}
            </button>
          ) : null}

          {!task.isArchived ? (
            <form action={triggerTaskReminderAction.bind(null, task.id)}>
              <FormSubmitButton
                pendingText="处理中…"
                className="border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
              >
                手动触发提醒
              </FormSubmitButton>
            </form>
          ) : null}

          {!task.isArchived ? (
            <form action={archiveTaskAction.bind(null, task.id)}>
              <FormSubmitButton
                pendingText="归档中…"
                className="border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
              >
                归档
              </FormSubmitButton>
            </form>
          ) : null}

          <form action={deleteTaskAction.bind(null, task.id)}>
            <FormSubmitButton
              pendingText="删除中…"
              className="border border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300"
            >
              删除
            </FormSubmitButton>
          </form>
        </div>
      </div>

      {isEditing ? (
        <form
          action={formAction}
          className="mt-6 rounded-[24px] border border-zinc-200 bg-zinc-50 p-5"
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px_180px]">
            <div>
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

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-zinc-500">
              {state.message || "修改任务后，系统会重新计算 parsedAction 和下一次提醒时间。"}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEditingTaskId(null)}
                className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700"
              >
                取消
              </button>
              <FormSubmitButton
                pendingText="保存中…"
                className="bg-zinc-900 text-white"
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
