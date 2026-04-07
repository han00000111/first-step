export const contextOptions = [
  { value: "unknown", label: "未指定" },
  { value: "mobile", label: "手机" },
  { value: "pc", label: "电脑" },
  { value: "offline", label: "线下" },
] as const;

export const reminderStyleOptions = [
  { value: "gentle", label: "轻柔提醒" },
  { value: "minimal_action", label: "最小行动" },
  { value: "ddl_push", label: "截止推进" },
] as const;

export type ContextTypeValue = (typeof contextOptions)[number]["value"];
export type ReminderStyleValue = (typeof reminderStyleOptions)[number]["value"];

export function getContextLabel(value: ContextTypeValue) {
  return contextOptions.find((option) => option.value === value)?.label ?? "未指定";
}

export function getReminderStyleLabel(value: ReminderStyleValue) {
  return (
    reminderStyleOptions.find((option) => option.value === value)?.label ?? "最小行动"
  );
}
