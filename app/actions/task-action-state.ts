export type TaskActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Partial<Record<"content" | "dueAt", string>>;
};

export const initialTaskActionState: TaskActionState = {
  status: "idle",
  message: "",
};
