import { differenceInHours } from "date-fns";

import type { ReminderStyleValue } from "@/lib/task-options";

type ReminderMessageInput = {
  content: string;
  parsedAction: string;
  reminderStyle: ReminderStyleValue;
  dueAt: Date | null;
};

function asMinimalAction(parsedAction: string) {
  const normalized = parsedAction.trim().replace(/[。！!？?]$/, "");

  if (!normalized) {
    return "先只做第一步";
  }

  if (normalized.endsWith("就行") || normalized.endsWith("也可以")) {
    return normalized;
  }

  if (normalized.startsWith("先")) {
    return `${normalized}就行`;
  }

  return `先${normalized}就行`;
}

export function buildReminderMessage({
  content,
  parsedAction,
  reminderStyle,
  dueAt,
}: ReminderMessageInput) {
  if (reminderStyle === "gentle") {
    if (/(消息|回复|联系|沟通|回信)/.test(content)) {
      return "先回一句消息也可以";
    }

    return "现在不一定做完，先碰一下也行";
  }

  if (reminderStyle === "ddl_push") {
    if (dueAt && differenceInHours(dueAt, new Date()) <= 4) {
      return "距离截止时间不多了，先开始第一步";
    }

    return "先处理最小部分，避免最后堆积";
  }

  return asMinimalAction(parsedAction);
}
