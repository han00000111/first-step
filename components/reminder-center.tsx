"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  BellRing,
  CheckCircle2,
  Clock3,
  MoonStar,
  Sparkles,
} from "lucide-react";

import {
  markRemindersAsSentAction,
  regenerateReminderFirstStepAction,
  respondToReminderAction,
} from "@/app/actions/reminder-actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import type {
  DueReminderItem,
  ReminderRecommendationActionState,
  ReminderRecommendationViewModel,
} from "@/lib/reminder-service";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

type ReminderCenterProps = {
  reminders: DueReminderItem[];
  highlightedTaskId?: string | null;
};

type ReminderCardProps = {
  reminder: DueReminderItem;
  highlighted: boolean;
  reminderDelayMinutes: number;
};

const frictionLabelMap: Record<string, string> = {
  task_too_large: "任务过大",
  current_scene_unsuitable: "当前场景不适合",
  current_time_unsuitable: "当前时间不适合",
  missing_material: "缺少材料",
  missing_information: "缺少信息",
  entry_not_open: "入口未打开",
  psychological_barrier: "心理门槛高",
  repeated_delay: "已经多次延后",
};

const decompositionLabelMap: Record<string, string> = {
  open_entry: "打开入口动作",
  prepare_material: "准备材料动作",
  confirm_information: "信息确认动作",
  minimum_execute: "最小执行动作",
  lower_psychological_barrier: "降低心理门槛动作",
  alternative_scene: "场景替代动作",
};

const initialRecommendationActionState: ReminderRecommendationActionState = {
  status: "idle",
  message: "",
  recommendation: null,
};

function toRecommendationViewModel(
  reminder: DueReminderItem,
): ReminderRecommendationViewModel | null {
  if (!reminder.showRecommendation) {
    return null;
  }

  return {
    recommendationId: reminder.recommendationId,
    canDoNow: reminder.canDoNow,
    frictionSource: reminder.frictionSource,
    decompositionType: reminder.decompositionType,
    recommendedFirstStep: reminder.recommendedFirstStep,
    recommendationWhy: reminder.recommendationWhy,
    isSmallerThanOriginal: reminder.isSmallerThanOriginal,
    recommendationConfidence: reminder.recommendationConfidence,
    recommendationSource: reminder.recommendationSource,
  };
}

function ReminderCard({
  reminder,
  highlighted,
  reminderDelayMinutes,
}: ReminderCardProps) {
  const [switchState, switchAction] = useActionState(
    regenerateReminderFirstStepAction,
    initialRecommendationActionState,
  );
  const initialRecommendation = useMemo(
    () => toRecommendationViewModel(reminder),
    [reminder],
  );
  const [currentRecommendation, setCurrentRecommendation] = useState(
    initialRecommendation,
  );

  useEffect(() => {
    setCurrentRecommendation(initialRecommendation);
  }, [initialRecommendation]);

  useEffect(() => {
    if (switchState.recommendation) {
      setCurrentRecommendation(switchState.recommendation);
    }
  }, [switchState.recommendation]);

  const showRecommendation =
    reminder.showRecommendation && currentRecommendation !== null;
  const canSwitchRecommendation =
    showRecommendation &&
    reminder.canSwitchRecommendation &&
    Boolean(currentRecommendation?.recommendationId) &&
    switchState.status !== "exhausted";
  const currentRecommendationId = currentRecommendation?.recommendationId ?? "";

  return (
    <article
      id={`reminder-${reminder.taskId}`}
      className={cn(
        "rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdfb_100%)] p-5 shadow-[0_20px_56px_-32px_rgba(15,23,42,0.24)] transition sm:p-6",
        highlighted
          ? "border-emerald-300 shadow-[0_24px_60px_-34px_rgba(16,185,129,0.42)] ring-2 ring-emerald-100"
          : "",
      )}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          {highlighted ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-900">
              来自通知
            </span>
          ) : null}
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-800">
            <BellRing className="h-3.5 w-3.5" />
            当前应提醒
          </span>
          <span className="rounded-full bg-zinc-100 px-3 py-1">
            场景 {reminder.contextLabel}
          </span>
          <span className="rounded-full bg-zinc-100 px-3 py-1">
            计划提醒 {reminder.scheduledForLabel}
          </span>
        </div>

        <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
          {reminder.content}
        </h2>

        <div className="rounded-[24px] border border-emerald-100 bg-[linear-gradient(180deg,#f7fffb_0%,#ecfaf3_100%)] px-5 py-4 text-lg font-semibold leading-8 tracking-tight text-zinc-900">
          {reminder.messageShown}
        </div>

        {showRecommendation && currentRecommendation ? (
          <section className="rounded-[22px] bg-zinc-50/80 p-4 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-zinc-500">推荐的第一步</div>
                <div className="mt-1 text-base font-semibold text-zinc-900">
                  {currentRecommendation.recommendedFirstStep ||
                    "先做一个更容易开始的小动作"}
                </div>
              </div>

              {canSwitchRecommendation ? (
                <form action={switchAction}>
                  <input type="hidden" name="taskId" value={reminder.taskId} />
                  <input
                    type="hidden"
                    name="scheduledForIso"
                    value={reminder.scheduledForIso}
                  />
                  <input
                    type="hidden"
                    name="recommendationId"
                    value={currentRecommendationId}
                  />
                  <FormSubmitButton
                    pendingText="切换中..."
                    className="shrink-0 border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 hover:border-emerald-200 hover:bg-emerald-50"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      换一个
                    </span>
                  </FormSubmitButton>
                </form>
              ) : null}
            </div>

            {switchState.status !== "idle" ? (
              <div
                aria-live="polite"
                className={cn(
                  "mt-3 rounded-2xl px-3 py-2 text-xs leading-6",
                  switchState.status === "success"
                    ? "bg-emerald-50 text-emerald-700"
                    : switchState.status === "exhausted"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-zinc-100 text-zinc-600",
                )}
              >
                {switchState.message}
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span className="rounded-full bg-white px-2.5 py-1">
                {currentRecommendation.canDoNow ? "现在可以先做" : "先做前置动作"}
              </span>
              <span className="rounded-full bg-white px-2.5 py-1">
                阻力{" "}
                {frictionLabelMap[currentRecommendation.frictionSource] ??
                  currentRecommendation.frictionSource}
              </span>
              <span className="rounded-full bg-white px-2.5 py-1">
                拆解{" "}
                {decompositionLabelMap[currentRecommendation.decompositionType] ??
                  currentRecommendation.decompositionType}
              </span>
              <span className="rounded-full bg-white px-2.5 py-1">
                {reminder.reminderStyleLabel}
              </span>
            </div>

            <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">为什么先做这一步</dt>
                <dd className="mt-1 font-medium text-zinc-900">
                  {currentRecommendation.recommendationWhy ||
                    "先把启动门槛降下来，再继续往下做。"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">截止时间</dt>
                <dd className="mt-1 font-medium text-zinc-900">
                  {reminder.dueAtLabel ?? "未设置"}
                </dd>
              </div>
            </dl>

            <div className="mt-3 text-xs text-zinc-500">
              {currentRecommendation.isSmallerThanOriginal
                ? "这一步已经比原任务更小，更适合先开始。"
                : "当前建议还不够小。"}
            </div>
          </section>
        ) : null}

        <div className="grid gap-3">
          <form action={respondToReminderAction}>
            <input type="hidden" name="taskId" value={reminder.taskId} />
            <input type="hidden" name="responseType" value="now_start" />
            <input type="hidden" name="messageShown" value={reminder.messageShown} />
            <input
              type="hidden"
              name="scheduledForIso"
              value={reminder.scheduledForIso}
            />
            <input
              type="hidden"
              name="recommendationId"
              value={currentRecommendationId}
            />
            <FormSubmitButton
              pendingText="记录中..."
              className="w-full bg-emerald-600 px-4 py-3.5 text-white shadow-[0_14px_30px_-18px_rgba(16,185,129,0.8)] hover:bg-emerald-700"
            >
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                先开始一点
              </span>
            </FormSubmitButton>
          </form>

          <form
            action={respondToReminderAction}
            className="rounded-[24px] border border-zinc-200 bg-zinc-50/80 p-4"
          >
            <input type="hidden" name="taskId" value={reminder.taskId} />
            <input type="hidden" name="responseType" value="remind_later" />
            <input type="hidden" name="messageShown" value={reminder.messageShown} />
            <input
              type="hidden"
              name="scheduledForIso"
              value={reminder.scheduledForIso}
            />
            <input
              type="hidden"
              name="delayMinutes"
              value={String(reminderDelayMinutes)}
            />
            <input
              type="hidden"
              name="recommendationId"
              value={currentRecommendationId}
            />
            <label
              htmlFor={`delay-${reminder.taskId}`}
              className="block text-sm font-medium text-zinc-700"
            >
              过多久再提醒更合适？
            </label>
            <div
              id={`delay-${reminder.taskId}`}
              className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3"
            >
              <div>
                <div className="text-sm font-medium text-zinc-900">
                  当前设为 {reminderDelayMinutes} 分钟后
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  你可以在页头把这个值改成 24 小时内的任意分钟数。
                </div>
              </div>
              <FormSubmitButton
                pendingText="稍等..."
                className="shrink-0 border border-zinc-200 bg-white px-4 py-3 text-zinc-700 hover:border-emerald-200 hover:bg-emerald-50"
              >
                <span className="inline-flex items-center gap-2">
                  <Clock3 className="h-4 w-4" />
                  稍后提醒我
                </span>
              </FormSubmitButton>
            </div>
          </form>

          <form action={respondToReminderAction}>
            <input type="hidden" name="taskId" value={reminder.taskId} />
            <input type="hidden" name="responseType" value="not_today" />
            <input type="hidden" name="messageShown" value={reminder.messageShown} />
            <input
              type="hidden"
              name="scheduledForIso"
              value={reminder.scheduledForIso}
            />
            <input
              type="hidden"
              name="recommendationId"
              value={currentRecommendationId}
            />
            <FormSubmitButton
              pendingText="记录中..."
              className="w-full border border-zinc-200 bg-white px-4 py-3 text-zinc-700 hover:border-amber-200 hover:bg-amber-50"
            >
              <span className="inline-flex items-center gap-2">
                <MoonStar className="h-4 w-4" />
                今天先放一放
              </span>
            </FormSubmitButton>
          </form>
        </div>
      </div>
    </article>
  );
}

export function ReminderCenter({
  reminders,
  highlightedTaskId = null,
}: ReminderCenterProps) {
  const [, startTransition] = useTransition();
  const reminderDelayMinutes = useUiStore((state) => state.reminderDelayMinutes);
  const setReminderDelayMinutes = useUiStore(
    (state) => state.setReminderDelayMinutes,
  );
  const reminderPayload = useMemo(
    () =>
      reminders.map((reminder) => ({
        taskId: reminder.taskId,
        messageShown: reminder.messageShown,
        scheduledForIso: reminder.scheduledForIso,
        recommendationId: reminder.recommendationId,
      })),
    [reminders],
  );

  useEffect(() => {
    if (reminderPayload.length === 0) {
      return;
    }

    startTransition(() => {
      void markRemindersAsSentAction(reminderPayload);
    });
  }, [reminderPayload, startTransition]);

  useEffect(() => {
    if (!highlightedTaskId) {
      return;
    }

    const element = document.getElementById(`reminder-${highlightedTaskId}`);

    if (!element) {
      return;
    }

    window.setTimeout(() => {
      element.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    }, 120);
  }, [highlightedTaskId]);

  if (reminders.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-[24px] border border-white/80 bg-white/92 p-4 shadow-[0_18px_48px_-30px_rgba(15,23,42,0.2)]">
          <div className="text-sm font-medium text-zinc-800">稍后提醒设置</div>
          <div className="mt-2 text-sm leading-6 text-zinc-500">
            当前统一按这个时长延后提醒，范围 1 分钟到 24 小时。
          </div>
          <div className="mt-3 flex items-center gap-3 rounded-[20px] border border-zinc-200 bg-zinc-50/80 px-4 py-3">
            <input
              value={reminderDelayMinutes}
              onChange={(event) =>
                setReminderDelayMinutes(Number(event.target.value || 30))
              }
              type="number"
              min={1}
              max={1440}
              className="w-full bg-transparent text-sm text-zinc-900"
            />
            <span className="shrink-0 text-sm text-zinc-500">分钟后</span>
          </div>
        </div>

        <div className="rounded-[28px] border border-dashed border-zinc-300 bg-white/75 p-6 text-sm leading-7 text-zinc-500">
          当前没有到点提醒。你可以先去任务页手动触发，或者等下一次提醒时间到。
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[24px] border border-white/80 bg-white/92 p-4 shadow-[0_18px_48px_-30px_rgba(15,23,42,0.2)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium text-zinc-800">稍后提醒设置</div>
            <div className="mt-1 text-sm leading-6 text-zinc-500">
              当前页所有“稍后提醒我”都会使用这个时长，范围 1 分钟到 24 小时。
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-[20px] border border-zinc-200 bg-zinc-50/80 px-4 py-3 sm:min-w-56">
            <input
              value={reminderDelayMinutes}
              onChange={(event) =>
                setReminderDelayMinutes(Number(event.target.value || 30))
              }
              type="number"
              min={1}
              max={1440}
              className="w-full bg-transparent text-sm text-zinc-900"
            />
            <span className="shrink-0 text-sm text-zinc-500">分钟后</span>
          </div>
        </div>
      </section>

      {reminders.map((reminder) => (
        <ReminderCard
          key={`${reminder.taskId}-${reminder.scheduledForIso}`}
          reminder={reminder}
          highlighted={highlightedTaskId === reminder.taskId}
          reminderDelayMinutes={reminderDelayMinutes}
        />
      ))}
    </div>
  );
}
