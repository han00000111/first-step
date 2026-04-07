"use server";

import { revalidatePath } from "next/cache";

import {
  markRemindersAsSent,
  respondToReminder,
} from "@/lib/reminder-service";

type ReminderSentPayload = {
  taskId: string;
  messageShown: string;
  scheduledForIso: string;
};

function revalidateReminderSurfaces() {
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/reminders");
  revalidatePath("/dashboard");
}

export async function markRemindersAsSentAction(reminders: ReminderSentPayload[]) {
  await markRemindersAsSent(reminders);
}

export async function respondToReminderAction(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");
  const responseType = String(formData.get("responseType") ?? "");
  const messageShown = String(formData.get("messageShown") ?? "");
  const scheduledForIso = String(formData.get("scheduledForIso") ?? "");
  const parsedDelayMinutes = Number(formData.get("delayMinutes") ?? "10");
  const delayMinutes = Number.isFinite(parsedDelayMinutes)
    ? Math.min(60, Math.max(1, Math.round(parsedDelayMinutes)))
    : 10;

  if (
    !taskId ||
    !messageShown ||
    !scheduledForIso ||
    !["now_start", "remind_later", "not_today"].includes(responseType)
  ) {
    return;
  }

  await respondToReminder({
    taskId,
    responseType: responseType as "now_start" | "remind_later" | "not_today",
    messageShown,
    scheduledForIso,
    delayMinutes,
  });

  revalidateReminderSurfaces();
}
