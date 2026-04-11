"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  ChevronDown,
  Clock3,
  Laptop,
  MapPin,
  Sparkles,
  Smartphone,
} from "lucide-react";

import { createTaskAction } from "@/app/actions/task-actions";
import { initialTaskActionState } from "@/app/actions/task-action-state";
import { FormSubmitButton } from "@/components/form-submit-button";
import { contextOptions, type ContextTypeValue } from "@/lib/task-options";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

const quickContextOptions: {
  value: ContextTypeValue;
  label: string;
  icon: typeof Smartphone;
}[] = [
  { value: "mobile", label: "手机", icon: Smartphone },
  { value: "pc", label: "电脑", icon: Laptop },
  { value: "offline", label: "线下", icon: MapPin },
];

const quickExamples = [
  "明天下午给 HR 回消息",
  "今晚改简历第一段",
  "周四前投 3 个岗位",
];

export function TaskEntryForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const preferredContext = useUiStore((state) => state.preferredContext);
  const setPreferredContext = useUiStore((state) => state.setPreferredContext);
  const [state, formAction] = useActionState(
    createTaskAction,
    initialTaskActionState,
  );

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      setPreferredContext("unknown");
    }
  }, [setPreferredContext, state.status]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,#fffefe_0%,#fbfdf9_100%)] p-5 shadow-[0_26px_70px_-40px_rgba(15,23,42,0.32)] sm:p-7 lg:px-9 lg:py-8 xl:px-11 xl:py-10"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
        <Clock3 className="h-4 w-4" />
        快速录入
      </div>

      <div className="mt-4 space-y-2">
        <h2 className="text-[1.6rem] font-semibold tracking-tight text-zinc-900 sm:text-[1.9rem] lg:text-[2.15rem]">
          想到什么，就先记一句。
        </h2>
        <p className="max-w-xl text-sm leading-6 text-zinc-600 lg:max-w-2xl">
          不用先拆计划，也不用想完整流程。先把这件事放进来，剩下交给提醒时机。
        </p>
      </div>

      <label className="mt-5 block text-sm font-medium text-zinc-700">
        一句话任务
      </label>
      <textarea
        name="content"
        required
        className="mt-3 min-h-40 w-full resize-none rounded-[26px] border border-emerald-100 bg-[#fcfffd] px-5 py-5 text-base leading-7 text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition focus:border-emerald-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(167,243,208,0.45)] lg:min-h-[18rem] lg:px-6 lg:py-6 lg:text-[1.05rem] lg:leading-8 xl:min-h-[20rem]"
        placeholder={"明天下午给 HR 回消息\n今晚改简历第一段\n周四前投 3 个岗位"}
      />
      {state.fieldErrors?.content ? (
        <p className="mt-2 text-sm text-rose-600">{state.fieldErrors.content}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {quickExamples.map((example) => (
          <span
            key={example}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/70 px-3 py-1.5 text-xs text-emerald-900"
          >
            <Sparkles className="h-3 w-3 text-emerald-700" />
            {example}
          </span>
        ))}
      </div>

      <details className="group mt-5 rounded-[24px] border border-emerald-100/80 bg-[#f7faf6] p-4">
        <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium text-zinc-800">
          <div>
            <div>补充设置</div>
            <div className="mt-1 text-xs font-normal text-zinc-500">
              截止时间和任务场景都可选
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-zinc-400 transition group-open:rotate-180" />
        </summary>

        <div className="mt-4 grid gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">最晚时间</label>
            <input
              name="dueAt"
              type="datetime-local"
              className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 transition focus:border-emerald-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(167,243,208,0.35)]"
            />
            {state.fieldErrors?.dueAt ? (
              <p className="mt-2 text-sm text-rose-600">{state.fieldErrors.dueAt}</p>
            ) : (
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                不填也可以，系统会在更轻的时机先给一次提醒。
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">任务场景</label>
            <select
              name="contextType"
              value={preferredContext}
              onChange={(event) =>
                setPreferredContext(event.target.value as ContextTypeValue)
              }
              className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 transition focus:border-emerald-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(167,243,208,0.35)]"
            >
              {contextOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="mt-3 flex flex-wrap gap-2">
              {quickContextOptions.map((option) => {
                const Icon = option.icon;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPreferredContext(option.value)}
                    className={cn(
                      "inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition",
                      preferredContext === option.value
                        ? "border-emerald-200 bg-emerald-100 text-emerald-900"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-emerald-200 hover:bg-emerald-50/70",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </details>

      <div className="mt-5 flex flex-col gap-3">
        <div className="text-sm text-zinc-500">
          {state.message ? (
            <span
              className={cn(
                state.status === "error" ? "text-rose-600" : "text-emerald-700",
              )}
            >
              {state.message}
            </span>
          ) : (
            "默认只需要一句话，其他字段都可以以后再补。"
          )}
        </div>

        <FormSubmitButton
          pendingText="加入中..."
          className="w-full bg-emerald-600 px-5 py-3.5 text-base text-white shadow-[0_14px_30px_-18px_rgba(16,185,129,0.8)] hover:bg-emerald-700"
        >
          加入任务
        </FormSubmitButton>
      </div>
    </form>
  );
}
