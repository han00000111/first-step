"use client";

import { create } from "zustand";

import type { ContextTypeValue } from "@/lib/task-options";

type UiStoreState = {
  preferredContext: ContextTypeValue;
  editingTaskId: string | null;
  setPreferredContext: (value: ContextTypeValue) => void;
  setEditingTaskId: (taskId: string | null) => void;
};

export const useUiStore = create<UiStoreState>((set) => ({
  preferredContext: "unknown",
  editingTaskId: null,
  setPreferredContext: (value) => set({ preferredContext: value }),
  setEditingTaskId: (taskId) => set({ editingTaskId: taskId }),
}));
