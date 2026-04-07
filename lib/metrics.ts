import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

import { prisma } from "@/lib/prisma";
import {
  contextOptions,
  getContextLabel,
  getReminderStyleLabel,
  reminderStyleOptions,
  type ContextTypeValue,
  type ReminderStyleValue,
} from "@/lib/task-options";

type ResponseEventType = "accept" | "delay" | "reject";

type MetricGroupRow = {
  key: string;
  label: string;
  reminderCount: number;
  acceptCount: number;
  delayCount: number;
  rejectCount: number;
  acceptanceRate: string;
  delayRate: string;
  rejectRate: string;
};

export type DashboardMetrics = {
  effectiveReminderCount: number;
  acceptCount: number;
  delayCount: number;
  rejectCount: number;
  acceptanceRate: string;
  delayRate: string;
  rejectRate: string;
  styleRows: MetricGroupRow[];
  contextRows: MetricGroupRow[];
  latestReminderAtLabel: string | null;
};

function buildSlotKey(taskId: string, scheduledFor: Date | null) {
  return `${taskId}__${scheduledFor?.toISOString() ?? "no-schedule"}`;
}

function formatRate(numerator: number, denominator: number) {
  if (denominator === 0) {
    return "0%";
  }

  const percentage = (numerator / denominator) * 100;
  const rounded = Number.isInteger(percentage) ? percentage.toFixed(0) : percentage.toFixed(1);

  return `${rounded}%`;
}

function createEmptyAccumulator() {
  return {
    reminderCount: 0,
    acceptCount: 0,
    delayCount: 0,
    rejectCount: 0,
  };
}

function finalizeGroupRows(
  order: { key: string; label: string }[],
  metricsMap: Map<string, ReturnType<typeof createEmptyAccumulator>>,
) {
  return order.map((item) => {
    const metric = metricsMap.get(item.key) ?? createEmptyAccumulator();

    return {
      key: item.key,
      label: item.label,
      reminderCount: metric.reminderCount,
      acceptCount: metric.acceptCount,
      delayCount: metric.delayCount,
      rejectCount: metric.rejectCount,
      acceptanceRate: formatRate(metric.acceptCount, metric.reminderCount),
      delayRate: formatRate(metric.delayCount, metric.reminderCount),
      rejectRate: formatRate(metric.rejectCount, metric.reminderCount),
    } satisfies MetricGroupRow;
  });
}

function incrementGroup(
  metricsMap: Map<string, ReturnType<typeof createEmptyAccumulator>>,
  key: string,
  responseType: ResponseEventType | null,
) {
  const current = metricsMap.get(key) ?? createEmptyAccumulator();
  current.reminderCount += 1;

  if (responseType === "accept") {
    current.acceptCount += 1;
  }

  if (responseType === "delay") {
    current.delayCount += 1;
  }

  if (responseType === "reject") {
    current.rejectCount += 1;
  }

  metricsMap.set(key, current);
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [reminderSentEvents, responseEvents] = await Promise.all([
    prisma.reminderEvent.findMany({
      where: {
        eventType: "reminder_sent",
      },
      orderBy: {
        happenedAt: "desc",
      },
      select: {
        taskId: true,
        scheduledFor: true,
        happenedAt: true,
        task: {
          select: {
            reminderStyle: true,
            contextType: true,
          },
        },
      },
    }),
    prisma.reminderEvent.findMany({
      where: {
        eventType: {
          in: ["accept", "delay", "reject"],
        },
      },
      select: {
        taskId: true,
        scheduledFor: true,
        eventType: true,
      },
    }),
  ]);

  const responseBySlot = new Map<string, ResponseEventType>();
  for (const event of responseEvents) {
    responseBySlot.set(
      buildSlotKey(event.taskId, event.scheduledFor),
      event.eventType as ResponseEventType,
    );
  }

  const styleMetrics = new Map<string, ReturnType<typeof createEmptyAccumulator>>();
  const contextMetrics = new Map<string, ReturnType<typeof createEmptyAccumulator>>();

  for (const event of reminderSentEvents) {
    const slotKey = buildSlotKey(event.taskId, event.scheduledFor);
    const responseType = responseBySlot.get(slotKey) ?? null;
    incrementGroup(styleMetrics, event.task.reminderStyle, responseType);
    incrementGroup(contextMetrics, event.task.contextType, responseType);
  }

  const effectiveReminderCount = reminderSentEvents.length;
  const acceptCount = responseEvents.filter((event) => event.eventType === "accept").length;
  const delayCount = responseEvents.filter((event) => event.eventType === "delay").length;
  const rejectCount = responseEvents.filter((event) => event.eventType === "reject").length;

  const styleOrder = reminderStyleOptions.map((option) => ({
    key: option.value,
    label: getReminderStyleLabel(option.value as ReminderStyleValue),
  }));

  const contextOrder = contextOptions
    .filter(
      (option) =>
        option.value !== "unknown" || (contextMetrics.get("unknown")?.reminderCount ?? 0) > 0,
    )
    .map((option) => ({
      key: option.value,
      label: getContextLabel(option.value as ContextTypeValue),
    }));

  return {
    effectiveReminderCount,
    acceptCount,
    delayCount,
    rejectCount,
    acceptanceRate: formatRate(acceptCount, effectiveReminderCount),
    delayRate: formatRate(delayCount, effectiveReminderCount),
    rejectRate: formatRate(rejectCount, effectiveReminderCount),
    styleRows: finalizeGroupRows(styleOrder, styleMetrics),
    contextRows: finalizeGroupRows(contextOrder, contextMetrics),
    latestReminderAtLabel: reminderSentEvents[0]?.happenedAt
      ? format(reminderSentEvents[0].happenedAt, "MM月dd日 HH:mm", {
          locale: zhCN,
        })
      : null,
  };
}
