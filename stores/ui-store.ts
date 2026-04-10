"use client";

import { create } from "zustand";

import type { ContextTypeValue } from "@/lib/task-options";

export type ReminderDelayUnit = "minutes" | "hours";

type UiStoreState = {
  preferredContext: ContextTypeValue;
  editingTaskId: string | null;
  reminderDelayValue: number;
  reminderDelayUnit: ReminderDelayUnit;
  setPreferredContext: (value: ContextTypeValue) => void;
  setEditingTaskId: (taskId: string | null) => void;
  setReminderDelayValue: (value: number) => void;
  setReminderDelayUnit: (unit: ReminderDelayUnit) => void;
};

function getDelayBounds(unit: ReminderDelayUnit) {
  return unit === "minutes" ? { min: 1, max: 59 } : { min: 1, max: 24 };
}

export function normalizeReminderDelayValue(
  value: number,
  unit: ReminderDelayUnit,
) {
  const { min, max } = getDelayBounds(unit);

  if (!Number.isFinite(value)) {
    return unit === "minutes" ? 30 : 1;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

export function toReminderDelayMinutes(
  value: number,
  unit: ReminderDelayUnit,
) {
  const normalizedValue = normalizeReminderDelayValue(value, unit);

  return unit === "hours" ? normalizedValue * 60 : normalizedValue;
}

export function convertReminderDelayValue(
  value: number,
  fromUnit: ReminderDelayUnit,
  toUnit: ReminderDelayUnit,
) {
  if (fromUnit === toUnit) {
    return normalizeReminderDelayValue(value, toUnit);
  }

  const currentMinutes = toReminderDelayMinutes(value, fromUnit);
  const nextValue =
    toUnit === "hours" ? Math.ceil(currentMinutes / 60) : currentMinutes;

  return normalizeReminderDelayValue(nextValue, toUnit);
}

export function formatReminderDelayLabel(
  value: number,
  unit: ReminderDelayUnit,
) {
  const normalizedValue = normalizeReminderDelayValue(value, unit);

  return unit === "hours"
    ? `${normalizedValue} 小时后`
    : `${normalizedValue} 分钟后`;
}

export const useUiStore = create<UiStoreState>((set) => ({
  preferredContext: "unknown",
  editingTaskId: null,
  reminderDelayValue: 30,
  reminderDelayUnit: "minutes",
  setPreferredContext: (value) => set({ preferredContext: value }),
  setEditingTaskId: (taskId) => set({ editingTaskId: taskId }),
  setReminderDelayValue: (value) =>
    set((state) => ({
      reminderDelayValue: normalizeReminderDelayValue(
        value,
        state.reminderDelayUnit,
      ),
    })),
  setReminderDelayUnit: (unit) =>
    set((state) => ({
      reminderDelayUnit: unit,
      reminderDelayValue: convertReminderDelayValue(
        state.reminderDelayValue,
        state.reminderDelayUnit,
        unit,
      ),
    })),
}));
