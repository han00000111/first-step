import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Prisma } from "@prisma/client";

import {
  buildFallbackFirstStepRecommendationView,
  getOrCreateFirstStepRecommendation,
  markFirstStepRecommendationAccepted,
  markFirstStepRecommendationsShown,
  regenerateFirstStepRecommendation,
  type FirstStepRecommendationView,
} from "@/lib/first-step-recommender";
import {
  computeDelayedReminderAt,
  computeNextReminderAfterNotToday,
} from "@/lib/reminder-engine";
import { buildReminderMessage } from "@/lib/reminder-message";
import { prisma } from "@/lib/prisma";
import {
  getContextLabel,
  getReminderStyleLabel,
  type ContextTypeValue,
  type ReminderStyleValue,
} from "@/lib/task-options";

type ReminderPayload = {
  taskId: string;
  messageShown: string;
  scheduledForIso: string;
  recommendationId?: string;
};

type ReminderResponseValue = "now_start" | "remind_later" | "not_today";

type ReminderHistoryEvent = {
  eventType: "accept" | "delay" | "reject";
  responseType: "now_start" | "remind_later" | "not_today" | null;
  happenedAt: Date;
  delayMinutes: number | null;
};

type DueTaskRecord = {
  id: string;
  content: string;
  parsedAction: string;
  contextType: ContextTypeValue;
  reminderStyle: ReminderStyleValue;
  dueAt: Date | null;
  nextReminderAt: Date | null;
  reminderEvents: ReminderHistoryEvent[];
};

export type DueReminderItem = {
  taskId: string;
  content: string;
  contextLabel: string;
  reminderStyleLabel: string;
  messageShown: string;
  dueAtLabel: string | null;
  scheduledForIso: string;
  scheduledForLabel: string;
  recommendationId: string;
  canDoNow: boolean;
  frictionSource: string;
  decompositionType: string;
  recommendedFirstStep: string;
  recommendationWhy: string;
  isSmallerThanOriginal: boolean;
  recommendationConfidence: number;
  recommendationSource: "llm" | "rule_fallback";
};

function formatReminderTime(value: Date) {
  return format(value, "MM月d日 HH:mm", {
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

function derivePreferredTone(reminderStyle: ReminderStyleValue) {
  if (reminderStyle === "gentle") {
    return "gentle";
  }

  if (reminderStyle === "ddl_push") {
    return "deadline_focused";
  }

  return "minimal";
}

function logReminderServiceDebug(
  message: string,
  payload?: Record<string, unknown>,
) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  if (payload) {
    console.log(`[reminder-service] ${message}`, payload);
    return;
  }

  console.log(`[reminder-service] ${message}`);
}

function deriveReminderStage(
  dueAt: Date | null,
  scheduledFor: Date,
  delayCount: number,
) {
  if (delayCount > 0) {
    return "after_delay";
  }

  if (!dueAt) {
    return "light_touch";
  }

  const minutesToDeadline = Math.round(
    (dueAt.getTime() - scheduledFor.getTime()) / (1000 * 60),
  );

  if (minutesToDeadline <= 20) {
    return "twenty_minutes_before";
  }

  if (minutesToDeadline <= 120) {
    return "two_hours_before";
  }

  if (minutesToDeadline <= 1440) {
    return "day_before";
  }

  return "scheduled";
}

function mapResponseHistory(events: ReminderHistoryEvent[]) {
  return events.slice(0, 6).map((event) => ({
    eventType: event.eventType,
    responseType: event.responseType,
    happenedAt: event.happenedAt.toISOString(),
    delayMinutes: event.delayMinutes,
  }));
}

function buildRecommendationContext(
  task: Pick<
    DueTaskRecord,
    "id" | "content" | "parsedAction" | "contextType" | "dueAt" | "reminderStyle" | "reminderEvents"
  >,
  scheduledFor: Date,
  delayCount: number,
) {
  return {
    taskId: task.id,
    taskText: task.content,
    parsedAction: task.parsedAction,
    contextType: task.contextType,
    dueAt: task.dueAt,
    now: new Date(),
    scheduledFor,
    reminderStage: deriveReminderStage(task.dueAt, scheduledFor, delayCount),
    delayCount,
    userResponseHistory: mapResponseHistory(task.reminderEvents),
    preferredTone: derivePreferredTone(task.reminderStyle),
  };
}

async function getLatestRecommendationView(
  taskId: string,
  scheduledFor: Date,
): Promise<FirstStepRecommendationView | null> {
  const existing = await prisma.firstStepRecommendation.findFirst({
    where: {
      taskId,
      scheduledFor,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      canDoNow: true,
      frictionSource: true,
      decompositionType: true,
      recommendedFirstStep: true,
      whyThisStep: true,
      isSmallerThanOriginal: true,
      confidence: true,
      source: true,
      modelName: true,
    },
  });

  if (!existing) {
    return null;
  }

  return {
    recommendationId: existing.id,
    canDoNow: existing.canDoNow,
    frictionSource: existing.frictionSource,
    decompositionType: existing.decompositionType,
    recommendedFirstStep: existing.recommendedFirstStep,
    whyThisStep: existing.whyThisStep,
    isSmallerThanOriginal: existing.isSmallerThanOriginal,
    confidence: existing.confidence,
    source: existing.source,
    modelName: existing.modelName,
  };
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

async function getDueTasks(baseTime: Date) {
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
    select: {
      id: true,
      content: true,
      parsedAction: true,
      contextType: true,
      reminderStyle: true,
      dueAt: true,
      nextReminderAt: true,
      reminderEvents: {
        where: {
          eventType: {
            in: ["accept", "delay", "reject"],
          },
        },
        orderBy: {
          happenedAt: "desc",
        },
        take: 6,
        select: {
          eventType: true,
          responseType: true,
          happenedAt: true,
          delayMinutes: true,
        },
      },
    },
  });

  if (tasks.length === 0) {
    return {
      tasks: [] as DueTaskRecord[],
      delayCountMap: new Map<string, number>(),
    };
  }

  const delayCounts = await prisma.reminderEvent.groupBy({
    by: ["taskId"],
    where: {
      taskId: {
        in: tasks.map((task) => task.id),
      },
      eventType: "delay",
    },
    _count: {
      _all: true,
    },
  });

  return {
    tasks: tasks as DueTaskRecord[],
    delayCountMap: new Map(
      delayCounts.map((entry) => [entry.taskId, entry._count._all]),
    ),
  };
}

async function buildDueReminderItem(
  task: DueTaskRecord,
  delayCount: number,
  now: Date,
) {
  const scheduledFor = task.nextReminderAt!;
  const recommendationContext = {
    taskId: task.id,
    taskText: task.content,
    parsedAction: task.parsedAction,
    contextType: task.contextType,
    dueAt: task.dueAt,
    now,
    scheduledFor,
    reminderStage: deriveReminderStage(task.dueAt, scheduledFor, delayCount),
    delayCount,
    userResponseHistory: mapResponseHistory(task.reminderEvents),
    preferredTone: derivePreferredTone(task.reminderStyle),
  };
  let recommendation;

  try {
    recommendation = await getOrCreateFirstStepRecommendation(
      recommendationContext,
    );
  } catch {
    recommendation = buildFallbackFirstStepRecommendationView(
      recommendationContext,
    );
  }

  return {
    taskId: task.id,
    content: task.content,
    contextLabel: getContextLabel(task.contextType),
    reminderStyleLabel: getReminderStyleLabel(task.reminderStyle),
    messageShown: buildReminderMessage({
      content: task.content,
      parsedAction: task.parsedAction,
      reminderStyle: task.reminderStyle,
      dueAt: task.dueAt,
    }),
    dueAtLabel: task.dueAt ? formatReminderTime(task.dueAt) : null,
    scheduledForIso: scheduledFor.toISOString(),
    scheduledForLabel: formatReminderTime(scheduledFor),
    recommendationId: recommendation.recommendationId,
    canDoNow: recommendation.canDoNow,
    frictionSource: recommendation.frictionSource,
    decompositionType: recommendation.decompositionType,
    recommendedFirstStep: recommendation.recommendedFirstStep,
    recommendationWhy: recommendation.whyThisStep,
    isSmallerThanOriginal: recommendation.isSmallerThanOriginal,
    recommendationConfidence: recommendation.confidence,
    recommendationSource: recommendation.source,
  } satisfies DueReminderItem;
}

export async function getDueReminders(baseTime = new Date()) {
  const { tasks, delayCountMap } = await getDueTasks(baseTime);
  const reminders: DueReminderItem[] = [];

  for (const task of tasks) {
    reminders.push(
      await buildDueReminderItem(
        task,
        delayCountMap.get(task.id) ?? 0,
        baseTime,
      ),
    );
  }

  return reminders;
}

export async function getUnsentDueReminders(baseTime = new Date()) {
  const { tasks, delayCountMap } = await getDueTasks(baseTime);

  if (tasks.length === 0) {
    return [];
  }

  const existingSentEvents = await prisma.reminderEvent.findMany({
    where: {
      eventType: "reminder_sent",
      OR: tasks.map((task) => ({
        taskId: task.id,
        scheduledFor: task.nextReminderAt!,
      })),
    },
    select: {
      taskId: true,
      scheduledFor: true,
    },
  });

  const sentSlots = new Set(
    existingSentEvents.map(
      (event) => `${event.taskId}:${event.scheduledFor?.toISOString()}`,
    ),
  );

  const unsentTasks = tasks.filter(
    (task) => !sentSlots.has(`${task.id}:${task.nextReminderAt?.toISOString()}`),
  );
  const reminders: DueReminderItem[] = [];

  for (const task of unsentTasks) {
    reminders.push(
      await buildDueReminderItem(
        task,
        delayCountMap.get(task.id) ?? 0,
        baseTime,
      ),
    );
  }

  return reminders;
}

export async function markRemindersAsSent(reminders: ReminderPayload[]) {
  if (reminders.length === 0) {
    return 0;
  }

  const createdCount = await prisma.$transaction(async (tx) => {
    let count = 0;

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
        count += 1;
      }
    }

    return count;
  });

  await markFirstStepRecommendationsShown(
    reminders
      .filter(
        (
          reminder,
        ): reminder is ReminderPayload & { recommendationId: string } =>
          Boolean(reminder.recommendationId),
      )
      .map((reminder) => ({
        recommendationId: reminder.recommendationId,
        taskId: reminder.taskId,
      })),
  );

  return createdCount;
}

export async function regenerateReminderFirstStep(input: {
  taskId: string;
  scheduledForIso: string;
  previousRecommendationId?: string | null;
}) {
  const scheduledFor = toScheduledForDate(input.scheduledForIso);
  const task = await prisma.task.findUnique({
    where: {
      id: input.taskId,
    },
    select: {
      id: true,
      content: true,
      parsedAction: true,
      contextType: true,
      reminderStyle: true,
      dueAt: true,
      reminderEvents: {
        where: {
          eventType: {
            in: ["accept", "delay", "reject"],
          },
        },
        orderBy: {
          happenedAt: "desc",
        },
        take: 6,
        select: {
          eventType: true,
          responseType: true,
          happenedAt: true,
          delayMinutes: true,
        },
      },
    },
  });

  if (!task) {
    return null;
  }

  const delayCount = await prisma.reminderEvent.count({
    where: {
      taskId: task.id,
      eventType: "delay",
    },
  });

  const recommendationContext = buildRecommendationContext(
    {
      ...task,
      reminderEvents: task.reminderEvents as ReminderHistoryEvent[],
    },
    scheduledFor,
    delayCount,
  );
  const existingRecommendation = await getLatestRecommendationView(
    task.id,
    scheduledFor,
  );

  logReminderServiceDebug("entered regenerateReminderFirstStep", {
    taskId: task.id,
    scheduledForIso: input.scheduledForIso,
    previousRecommendationId: input.previousRecommendationId ?? null,
    existingRecommendationId: existingRecommendation?.recommendationId ?? null,
  });

  try {
    const regeneratedRecommendation = await regenerateFirstStepRecommendation(
      recommendationContext,
      input.previousRecommendationId,
    );

    logReminderServiceDebug("regenerateReminderFirstStep succeeded", {
      taskId: task.id,
      scheduledForIso: input.scheduledForIso,
      recommendationId: regeneratedRecommendation.recommendationId,
      source: regeneratedRecommendation.source,
    });

    return regeneratedRecommendation;
  } catch (error) {
    logReminderServiceDebug("regenerateReminderFirstStep fell back", {
      taskId: task.id,
      scheduledForIso: input.scheduledForIso,
      previousRecommendationId: input.previousRecommendationId ?? null,
      existingRecommendationId: existingRecommendation?.recommendationId ?? null,
      error: error instanceof Error ? error.message : "unknown error",
    });

    if (existingRecommendation) {
      return existingRecommendation;
    }

    return buildFallbackFirstStepRecommendationView(recommendationContext);
  }
}

export async function respondToReminder(input: {
  taskId: string;
  responseType: ReminderResponseValue;
  messageShown: string;
  scheduledForIso: string;
  delayMinutes: number;
  recommendationId?: string;
}) {
  const result = await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: {
        id: input.taskId,
      },
    });

    if (!task || task.status !== "active") {
      return null;
    }

    const scheduledFor = toScheduledForDate(input.scheduledForIso);
    const resolvedDelayMinutes = Math.min(
      1440,
      Math.max(1, input.delayMinutes || 30),
    );
    const responseMeta =
      input.responseType === "remind_later"
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

  if (
    result &&
    input.responseType === "now_start" &&
    input.recommendationId
  ) {
    await markFirstStepRecommendationAccepted({
      recommendationId: input.recommendationId,
      taskId: input.taskId,
    });
  }

  return result;
}
