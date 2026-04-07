import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Prisma } from "@prisma/client";

import {
  computeDelayedReminderAt,
  computeNextReminderAfterNotToday,
} from "@/lib/reminder-engine";
import { buildReminderMessage } from "@/lib/reminder-message";
import { prisma } from "@/lib/prisma";
import {
  getContextLabel,
  getReminderStyleLabel,
  type ReminderStyleValue,
} from "@/lib/task-options";

type ReminderPayload = {
  taskId: string;
  messageShown: string;
  scheduledForIso: string;
};

type ReminderResponseValue = "now_start" | "remind_later" | "not_today";

export type DueReminderItem = {
  taskId: string;
  content: string;
  parsedAction: string;
  contextLabel: string;
  reminderStyleLabel: string;
  messageShown: string;
  dueAtLabel: string | null;
  scheduledForIso: string;
  scheduledForLabel: string;
};

function formatReminderTime(value: Date) {
  return format(value, "MM月dd日 HH:mm", {
    locale: zhCN,
  });
}

function toScheduledForDate(isoValue: string) {
  const parsed = new Date(isoValue);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid scheduledFor value.");
  }

  return parsed;
}

function sameReminderSlot(left: Date | null, right: Date) {
  return !!left && left.getTime() === right.getTime();
}

async function ensureReminderSentEvent(
  tx: Prisma.TransactionClient,
  payload: ReminderPayload,
) {
  const scheduledFor = toScheduledForDate(payload.scheduledForIso);
  const existing = await tx.reminderEvent.findFirst({
    where: {
      taskId: payload.taskId,
      eventType: "reminder_sent",
      scheduledFor,
    },
  });

  if (existing) {
    return existing;
  }

  return tx.reminderEvent.create({
    data: {
      taskId: payload.taskId,
      eventType: "reminder_sent",
      messageShown: payload.messageShown,
      scheduledFor,
    },
  });
}

function resolveReminderResponse(responseType: ReminderResponseValue) {
  if (responseType === "now_start") {
    return {
      eventType: "accept" as const,
      delayMinutes: null,
    };
  }

  if (responseType === "remind_later") {
    return {
      eventType: "delay" as const,
      delayMinutes: 10,
    };
  }

  return {
    eventType: "reject" as const,
    delayMinutes: null,
  };
}

function computeNextReminderAfterResponse(
  dueAt: Date | null,
  responseType: ReminderResponseValue,
  delayMinutes: number,
  baseTime = new Date(),
) {
  if (responseType === "now_start") {
    return null;
  }

  if (responseType === "remind_later") {
    return computeDelayedReminderAt(baseTime, delayMinutes);
  }

  return computeNextReminderAfterNotToday(dueAt, baseTime);
}

export async function getDueReminders(baseTime = new Date()) {
  const tasks = await prisma.task.findMany({
    where: {
      status: "active",
      nextReminderAt: {
        not: null,
        lte: baseTime,
      },
    },
    orderBy: [
      {
        nextReminderAt: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
  });

  return tasks.map((task) => {
    const messageShown = buildReminderMessage({
      content: task.content,
      parsedAction: task.parsedAction,
      reminderStyle: task.reminderStyle as ReminderStyleValue,
      dueAt: task.dueAt,
    });

    return {
      taskId: task.id,
      content: task.content,
      parsedAction: task.parsedAction,
      contextLabel: getContextLabel(task.contextType),
      reminderStyleLabel: getReminderStyleLabel(task.reminderStyle),
      messageShown,
      dueAtLabel: task.dueAt ? formatReminderTime(task.dueAt) : null,
      scheduledForIso: task.nextReminderAt!.toISOString(),
      scheduledForLabel: formatReminderTime(task.nextReminderAt!),
    } satisfies DueReminderItem;
  });
}

// “有效提醒”以实际展示为准，因此这里做幂等写入，避免刷新页面时重复计数。
export async function markRemindersAsSent(reminders: ReminderPayload[]) {
  if (reminders.length === 0) {
    return 0;
  }

  return prisma.$transaction(async (tx) => {
    let createdCount = 0;

    for (const reminder of reminders) {
      const existing = await tx.reminderEvent.findFirst({
        where: {
          taskId: reminder.taskId,
          eventType: "reminder_sent",
          scheduledFor: toScheduledForDate(reminder.scheduledForIso),
        },
      });

      if (!existing) {
        await ensureReminderSentEvent(tx, reminder);
        createdCount += 1;
      }
    }

    return createdCount;
  });
}

export async function respondToReminder(input: {
  taskId: string;
  responseType: ReminderResponseValue;
  messageShown: string;
  scheduledForIso: string;
  delayMinutes: number;
}) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: {
        id: input.taskId,
      },
    });

    if (!task || task.status !== "active") {
      return null;
    }

    const scheduledFor = toScheduledForDate(input.scheduledForIso);
    const resolvedDelayMinutes = Math.min(60, Math.max(1, input.delayMinutes || 10));
    const responseMeta = input.responseType === "remind_later"
      ? {
          eventType: "delay" as const,
          delayMinutes: resolvedDelayMinutes,
        }
      : resolveReminderResponse(input.responseType);
    const existingResponse = await tx.reminderEvent.findFirst({
      where: {
        taskId: input.taskId,
        scheduledFor,
        eventType: {
          in: ["accept", "delay", "reject"],
        },
      },
    });

    if (existingResponse) {
      return existingResponse;
    }

    await ensureReminderSentEvent(tx, {
      taskId: input.taskId,
      messageShown: input.messageShown,
      scheduledForIso: input.scheduledForIso,
    });

    const happenedAt = new Date();
    const nextReminderAt = computeNextReminderAfterResponse(
      task.dueAt,
      input.responseType,
      resolvedDelayMinutes,
      happenedAt,
    );

    await tx.reminderEvent.create({
      data: {
        taskId: input.taskId,
        eventType: responseMeta.eventType,
        responseType: input.responseType,
        messageShown: input.messageShown,
        scheduledFor,
        happenedAt,
        delayMinutes: responseMeta.delayMinutes,
      },
    });

    await tx.task.update({
      where: {
        id: input.taskId,
      },
      data: {
        nextReminderAt,
      },
    });

    return {
      taskId: input.taskId,
      nextReminderAt,
      sameSlot: sameReminderSlot(task.nextReminderAt, scheduledFor),
    };
  });
}
