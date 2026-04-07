"use server";

import { revalidatePath } from "next/cache";

import type { TaskActionState } from "@/app/actions/task-action-state";
import {
  archiveTask,
  createTask,
  deleteTask,
  parseTaskMutationInput,
  triggerManualReminder,
  updateTask,
} from "@/lib/task-service";

function revalidateTaskSurfaces() {
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/reminders");
  revalidatePath("/dashboard");
}

export async function createTaskAction(
  _prevState: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const parsed = parseTaskMutationInput({
    content: formData.get("content"),
    dueAt: formData.get("dueAt"),
    contextType: formData.get("contextType"),
  });

  if (Object.keys(parsed.fieldErrors).length > 0) {
    return {
      status: "error",
      message: "任务还没保存，请先修正表单。",
      fieldErrors: parsed.fieldErrors,
    };
  }

  await createTask(parsed.values);
  revalidateTaskSurfaces();

  return {
    status: "success",
    message: "任务已加入列表。",
  };
}

export async function updateTaskAction(
  taskId: string,
  _prevState: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const parsed = parseTaskMutationInput({
    content: formData.get("content"),
    dueAt: formData.get("dueAt"),
    contextType: formData.get("contextType"),
  });

  if (Object.keys(parsed.fieldErrors).length > 0) {
    return {
      status: "error",
      message: "更新失败，请检查输入内容。",
      fieldErrors: parsed.fieldErrors,
    };
  }

  await updateTask(taskId, parsed.values);
  revalidateTaskSurfaces();

  return {
    status: "success",
    message: "任务已更新。",
  };
}

export async function deleteTaskAction(taskId: string) {
  await deleteTask(taskId);
  revalidateTaskSurfaces();
}

export async function archiveTaskAction(taskId: string) {
  await archiveTask(taskId);
  revalidateTaskSurfaces();
}

export async function triggerTaskReminderAction(taskId: string) {
  await triggerManualReminder(taskId);
  revalidateTaskSurfaces();
}
