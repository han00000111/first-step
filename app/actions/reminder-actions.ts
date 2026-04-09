"use server";

import { revalidatePath } from "next/cache";

import {
  markRemindersAsSent,
  regenerateReminderFirstStep,
  respondToReminder,
} from "@/lib/reminder-service";

type ReminderSentPayload = {
  taskId: string;
  messageShown: string;
  scheduledForIso: string;
  recommendationId?: string;
};

function logReminderActionDebug(message: string, payload?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  if (payload) {
    console.log(`[reminder-action] ${message}`, payload);
    return;
  }

  console.log(`[reminder-action] ${message}`);
}

function revalidateReminderSurfaces() {
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/reminders");
  revalidatePath("/dashboard");
}

export async function markRemindersAsSentAction(reminders: ReminderSentPayload[]) {
  await markRemindersAsSent(reminders);
}

export async function regenerateReminderFirstStepAction(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");
  const scheduledForIso = String(formData.get("scheduledForIso") ?? "");
  const previousRecommendationId = String(
    formData.get("recommendationId") ?? "",
  );

  if (!taskId || !scheduledForIso) {
    return;
  }

  logReminderActionDebug("entered regenerateReminderFirstStepAction", {
    taskId,
    scheduledForIso,
    previousRecommendationId: previousRecommendationId || null,
  });

  try {
    await regenerateReminderFirstStep({
      taskId,
      scheduledForIso,
      previousRecommendationId: previousRecommendationId || null,
    });
  } catch (error) {
    logReminderActionDebug("regenerateReminderFirstStepAction failed", {
      taskId,
      scheduledForIso,
      previousRecommendationId: previousRecommendationId || null,
      error: error instanceof Error ? error.message : "unknown error",
    });
  } finally {
    revalidateReminderSurfaces();
  }
}

export async function respondToReminderAction(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");
  const responseType = String(formData.get("responseType") ?? "");
  const messageShown = String(formData.get("messageShown") ?? "");
  const scheduledForIso = String(formData.get("scheduledForIso") ?? "");
  const recommendationId = String(formData.get("recommendationId") ?? "");
  const parsedDelayMinutes = Number(formData.get("delayMinutes") ?? "30");
  const delayMinutes = Number.isFinite(parsedDelayMinutes)
    ? Math.min(1440, Math.max(1, Math.round(parsedDelayMinutes)))
    : 30;

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
    recommendationId: recommendationId || undefined,
  });

  revalidateReminderSurfaces();
}
