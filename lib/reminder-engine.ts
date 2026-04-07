import {
  addHours,
  addMinutes,
  differenceInHours,
  endOfDay,
  setHours,
  setMilliseconds,
  setMinutes,
  setSeconds,
  startOfTomorrow,
  subDays,
  subHours,
  subMinutes,
} from "date-fns";

import type { ContextTypeValue, ReminderStyleValue } from "@/lib/task-options";

function chooseFutureCandidate(candidates: Date[], baseTime: Date) {
  return candidates.find((candidate) => candidate.getTime() > baseTime.getTime()) ?? baseTime;
}

export function inferReminderStyle(
  content: string,
  dueAt: Date | null,
): ReminderStyleValue {
  if (dueAt) {
    const hoursToDeadline = differenceInHours(dueAt, new Date());

    if (hoursToDeadline <= 24) {
      return "ddl_push";
    }
  }

  if (/(消息|回复|联系|回信|沟通|发给)/.test(content)) {
    return "gentle";
  }

  return "minimal_action";
}

export function computeInitialNextReminderAt(dueAt: Date | null, baseTime = new Date()) {
  if (!dueAt) {
    return addHours(baseTime, 2);
  }

  if (dueAt.getTime() <= baseTime.getTime()) {
    return baseTime;
  }

  const candidates = [subDays(dueAt, 1), subHours(dueAt, 2), subMinutes(dueAt, 20)];
  return chooseFutureCandidate(candidates, baseTime);
}

export function computeManualTriggerReminderAt(baseTime = new Date()) {
  return baseTime;
}

export function computeDelayedReminderAt(baseTime = new Date(), minutes = 10) {
  return addMinutes(baseTime, minutes);
}

// “今天不做”只跳过当天，次日仍允许再次进入提醒候选。
export function computeNextReminderAfterNotToday(
  dueAt: Date | null,
  baseTime = new Date(),
) {
  const todayEnd = endOfDay(baseTime);

  if (!dueAt) {
    return setMilliseconds(
      setSeconds(setMinutes(setHours(startOfTomorrow(), 9), 0), 0),
      0,
    );
  }

  const candidates = [subDays(dueAt, 1), subHours(dueAt, 2), subMinutes(dueAt, 20)];
  return candidates.find((candidate) => candidate.getTime() > todayEnd.getTime()) ?? null;
}

export function inferContextType(rawValue: string | null): ContextTypeValue {
  if (rawValue === "mobile" || rawValue === "pc" || rawValue === "offline") {
    return rawValue;
  }

  return "unknown";
}
