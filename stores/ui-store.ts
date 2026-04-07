"use client";

import { create } from "zustand";

import type { ContextTypeValue } from "@/lib/task-options";

type UiStoreState = {
  preferredContext: ContextTypeValue;
  editingTaskId: string | null;
  reminderDelayMinutes: number;
  setPreferredContext: (value: ContextTypeValue) => void;
  setEditingTaskId: (taskId: string | null) => void;
  setReminderDelayMinutes: (value: number) => void;
};

export const useUiStore = create<UiStoreState>((set) => ({
  preferredContext: "unknown",
  editingTaskId: null,
  reminderDelayMinutes: 30,
  setPreferredContext: (value) => set({ preferredContext: value }),
  setEditingTaskId: (taskId) => set({ editingTaskId: taskId }),
  setReminderDelayMinutes: (value) =>
    set({
      reminderDelayMinutes: Math.min(1440, Math.max(1, Math.round(value || 30))),
    }),
}));
