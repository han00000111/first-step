import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

import { prisma } from "@/lib/prisma";
import {
  computeInitialNextReminderAt,
  computeManualTriggerReminderAt,
  inferContextType,
  inferReminderStyle,
} from "@/lib/reminder-engine";
import {
  getContextLabel,
  getReminderStyleLabel,
  type ContextTypeValue,
} from "@/lib/task-options";
import { extractParsedAction } from "@/lib/task-parser";

export type TaskMutationInput = {
  content: string;
  dueAt: Date | null;
  contextType: ContextTypeValue;
};

export type TaskListItem = {
  id: string;
  content: string;
  parsedAction: string;
  contextType: ContextTypeValue;
  contextLabel: string;
  reminderStyleLabel: string;
  statusLabel: string;
  statusTone: "neutral" | "info" | "success" | "warning" | "danger";
  createdAtLabel: string;
  dueAtLabel: string | null;
  nextReminderAtLabel: string | null;
  dueAtInputValue: string;
  isArchived: boolean;
};

type LatestEvent = {
  eventType: "reminder_sent" | "accept" | "delay" | "reject";
};

function formatTaskTime(value: Date | null) {
  if (!value) {
    return null;
  }

  return format(value, "MM月dd日 HH:mm", {
    locale: zhCN,
  });
}

function toDateTimeLocalValue(value: Date | null) {
  if (!value) {
    return "";
  }

  return format(value, "yyyy-MM-dd'T'HH:mm");
}

function deriveTaskState(
  latestEvent: LatestEvent | null,
  nextReminderAt: Date | null,
) {
  if (latestEvent?.eventType === "accept") {
    return { label: "已接受", tone: "success" as const };
  }

  if (latestEvent?.eventType === "delay") {
    return { label: "已延后", tone: "warning" as const };
  }

  if (latestEvent?.eventType === "reject") {
    return { label: "已拒绝", tone: "danger" as const };
  }

  if (latestEvent?.eventType === "reminder_sent") {
    return { label: "已提醒", tone: "info" as const };
  }

  if (nextReminderAt && nextReminderAt.getTime() <= Date.now()) {
    return { label: "已提醒", tone: "info" as const };
  }

  return { label: "未提醒", tone: "neutral" as const };
}

function normalizeContent(content: string) {
  return content.replace(/\s+/g, " ").trim();
}

export function parseTaskMutationInput(raw: {
  content: FormDataEntryValue | null;
  dueAt: FormDataEntryValue | null;
  contextType: FormDataEntryValue | null;
}) {
  const content = normalizeContent(String(raw.content ?? ""));
  const dueAtRaw = String(raw.dueAt ?? "").trim();
  const contextType = inferContextType(raw.contextType ? String(raw.contextType) : null);
  const fieldErrors: Partial<Record<"content" | "dueAt", string>> = {};

  if (!content) {
    fieldErrors.content = "请先输入一句任务。";
  }

  let dueAt: Date | null = null;
  if (dueAtRaw) {
    const parsed = new Date(dueAtRaw);

    if (Number.isNaN(parsed.getTime())) {
      fieldErrors.dueAt = "最晚时间格式无法识别。";
    } else {
      dueAt = parsed;
    }
  }

  return {
    fieldErrors,
    values: {
      content,
      dueAt,
      contextType,
    } satisfies TaskMutationInput,
  };
}

export async function createTask(values: TaskMutationInput) {
  const createdAt = new Date();
  const parsedAction = extractParsedAction(values.content);
  const reminderStyle = inferReminderStyle(values.content, values.dueAt);
  const nextReminderAt = computeInitialNextReminderAt(values.dueAt, createdAt);

  return prisma.task.create({
    data: {
      content: values.content,
      parsedAction,
      dueAt: values.dueAt,
      contextType: values.contextType,
      reminderStyle,
      nextReminderAt,
    },
  });
}

export async function updateTask(taskId: string, values: TaskMutationInput) {
  const parsedAction = extractParsedAction(values.content);
  const reminderStyle = inferReminderStyle(values.content, values.dueAt);
  const nextReminderAt = computeInitialNextReminderAt(values.dueAt, new Date());

  return prisma.task.update({
    where: {
      id: taskId,
    },
    data: {
      content: values.content,
      parsedAction,
      dueAt: values.dueAt,
      contextType: values.contextType,
      reminderStyle,
      nextReminderAt,
    },
  });
}

export async function deleteTask(taskId: string) {
  return prisma.task.delete({
    where: {
      id: taskId,
    },
  });
}

export async function archiveTask(taskId: string) {
  return prisma.task.update({
    where: {
      id: taskId,
    },
    data: {
      status: "archived",
      archivedAt: new Date(),
      nextReminderAt: null,
    },
  });
}

export async function triggerManualReminder(taskId: string) {
  return prisma.task.update({
    where: {
      id: taskId,
    },
    data: {
      nextReminderAt: computeManualTriggerReminderAt(),
    },
  });
}

export async function getTaskBoardData() {
  const tasks = await prisma.task.findMany({
    include: {
      reminderEvents: {
        orderBy: {
          happenedAt: "desc",
        },
        select: {
          eventType: true,
        },
        take: 1,
      },
    },
    orderBy: [
      {
        status: "asc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  const mappedTasks = tasks.map((task) => {
    const latestEvent = task.reminderEvents[0] ?? null;
    const derivedState = deriveTaskState(latestEvent, task.nextReminderAt);

    return {
      id: task.id,
      content: task.content,
      parsedAction: task.parsedAction,
      contextType: task.contextType,
      contextLabel: getContextLabel(task.contextType),
      reminderStyleLabel: getReminderStyleLabel(task.reminderStyle),
      statusLabel: derivedState.label,
      statusTone: derivedState.tone,
      createdAtLabel: format(task.createdAt, "MM月dd日 HH:mm", {
        locale: zhCN,
      }),
      dueAtLabel: formatTaskTime(task.dueAt),
      nextReminderAtLabel: formatTaskTime(task.nextReminderAt),
      dueAtInputValue: toDateTimeLocalValue(task.dueAt),
      isArchived: task.status === "archived",
    } satisfies TaskListItem;
  });

  return {
    activeTasks: mappedTasks.filter((task) => !task.isArchived),
    archivedTasks: mappedTasks.filter((task) => task.isArchived),
  };
}

export async function getTaskHomeSummary() {
  const [activeCount, archivedCount, recentTasks] = await Promise.all([
    prisma.task.count({
      where: {
        status: "active",
      },
    }),
    prisma.task.count({
      where: {
        status: "archived",
      },
    }),
    prisma.task.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        content: true,
        parsedAction: true,
        nextReminderAt: true,
        contextType: true,
      },
    }),
  ]);

  return {
    activeCount,
    archivedCount,
    recentTasks: recentTasks.map((task) => ({
      id: task.id,
      content: task.content,
      parsedAction: task.parsedAction,
      contextLabel: getContextLabel(task.contextType),
      nextReminderAtLabel: formatTaskTime(task.nextReminderAt) ?? "待生成",
    })),
  };
}
