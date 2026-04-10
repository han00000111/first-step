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
import {
  convertReminderDelayValue,
  formatReminderDelayLabel,
  normalizeReminderDelayValue,
  toReminderDelayMinutes,
  type ReminderDelayUnit,
  useUiStore,
} from "@/stores/ui-store";

type ReminderCenterProps = {
  reminders: DueReminderItem[];
  highlightedTaskId?: string | null;
};

type ReminderCardProps = {
  reminder: DueReminderItem;
  highlighted: boolean;
  defaultDelayValue: number;
  defaultDelayUnit: ReminderDelayUnit;
  defaultDelayMinutes: number;
};

type DelayFieldGroupProps = {
  inputId: string;
  value: number;
  unit: ReminderDelayUnit;
  onValueChange: (value: number) => void;
  onUnitChange: (unit: ReminderDelayUnit) => void;
  compact?: boolean;
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

const delayUnitOptions: Array<{
  value: ReminderDelayUnit;
  label: string;
}> = [
  { value: "minutes", label: "分钟" },
  { value: "hours", label: "小时" },
];

function getDelayLimitText(unit: ReminderDelayUnit) {
  return unit === "minutes" ? "分钟模式 1 到 59" : "小时模式 1 到 24";
}

function getDelayInputBounds(unit: ReminderDelayUnit) {
  return unit === "minutes" ? { min: 1, max: 59 } : { min: 1, max: 24 };
}

function parseDelayInput(
  rawValue: string,
  unit: ReminderDelayUnit,
  fallbackValue: number,
) {
  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed)) {
    return normalizeReminderDelayValue(fallbackValue, unit);
  }

  return normalizeReminderDelayValue(parsed, unit);
}

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

function DelayFieldGroup({
  inputId,
  value,
  unit,
  onValueChange,
  onUnitChange,
  compact = false,
}: DelayFieldGroupProps) {
  const bounds = getDelayInputBounds(unit);

  return (
    <div
      className={cn(
        "grid gap-3",
        compact ? "grid-cols-[minmax(0,1fr)_112px]" : "grid-cols-1 sm:grid-cols-[minmax(0,1fr)_132px]",
      )}
    >
      <div className="rounded-[20px] border border-zinc-200 bg-white px-4 py-3">
        <label
          htmlFor={inputId}
          className="block text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500"
        >
          数值
        </label>
        <input
          id={inputId}
          type="number"
          inputMode="numeric"
          min={bounds.min}
          max={bounds.max}
          value={value}
          onChange={(event) =>
            onValueChange(parseDelayInput(event.target.value, unit, value))
          }
          className="mt-2 w-full bg-transparent text-base font-medium text-zinc-900 outline-none"
        />
      </div>

      <div className="rounded-[20px] border border-zinc-200 bg-white px-4 py-3">
        <label
          htmlFor={`${inputId}-unit`}
          className="block text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500"
        >
          单位
        </label>
        <select
          id={`${inputId}-unit`}
          value={unit}
          onChange={(event) =>
            onUnitChange(event.target.value as ReminderDelayUnit)
          }
          className="mt-2 w-full bg-transparent text-base font-medium text-zinc-900 outline-none"
        >
          {delayUnitOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ReminderDelaySettings({
  defaultDelayValue,
  defaultDelayUnit,
  setDefaultDelayValue,
  setDefaultDelayUnit,
}: {
  defaultDelayValue: number;
  defaultDelayUnit: ReminderDelayUnit;
  setDefaultDelayValue: (value: number) => void;
  setDefaultDelayUnit: (unit: ReminderDelayUnit) => void;
}) {
  return (
    <section className="rounded-[24px] border border-white/80 bg-white/92 p-4 shadow-[0_18px_48px_-30px_rgba(15,23,42,0.2)]">
      <div className="space-y-3">
        <div>
          <div className="text-sm font-medium text-zinc-800">默认稍后提醒</div>
          <div className="mt-1 text-sm leading-6 text-zinc-500">
            不单独修改任务时，系统就按这里的默认值处理。
          </div>
        </div>

        <DelayFieldGroup
          inputId="global-delay"
          value={defaultDelayValue}
          unit={defaultDelayUnit}
          onValueChange={setDefaultDelayValue}
          onUnitChange={setDefaultDelayUnit}
        />

        <div className="rounded-[18px] bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
          默认将在 {formatReminderDelayLabel(defaultDelayValue, defaultDelayUnit)} 提醒
        </div>

        <div className="text-xs leading-6 text-zinc-500">
          {getDelayLimitText(defaultDelayUnit)}，提交前会自动换算成分钟。
        </div>
      </div>
    </section>
  );
}

function ReminderCard({
  reminder,
  highlighted,
  defaultDelayValue,
  defaultDelayUnit,
  defaultDelayMinutes,
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
  const [isCustomDelayOpen, setIsCustomDelayOpen] = useState(false);
  const [customDelayValue, setCustomDelayValue] = useState(defaultDelayValue);
  const [customDelayUnit, setCustomDelayUnit] = useState(defaultDelayUnit);

  useEffect(() => {
    setCurrentRecommendation(initialRecommendation);
  }, [initialRecommendation]);

  useEffect(() => {
    if (switchState.recommendation) {
      setCurrentRecommendation(switchState.recommendation);
    }
  }, [switchState.recommendation]);

  useEffect(() => {
    if (isCustomDelayOpen) {
      return;
    }

    setCustomDelayValue(defaultDelayValue);
    setCustomDelayUnit(defaultDelayUnit);
  }, [defaultDelayUnit, defaultDelayValue, isCustomDelayOpen]);

  const showRecommendation =
    reminder.showRecommendation && currentRecommendation !== null;
  const canSwitchRecommendation =
    showRecommendation &&
    reminder.canSwitchRecommendation &&
    Boolean(currentRecommendation?.recommendationId) &&
    switchState.status !== "exhausted";
  const currentRecommendationId = currentRecommendation?.recommendationId ?? "";
  const customDelayMinutes = toReminderDelayMinutes(
    customDelayValue,
    customDelayUnit,
  );

  function toggleCustomDelay() {
    if (!isCustomDelayOpen) {
      setCustomDelayValue(defaultDelayValue);
      setCustomDelayUnit(defaultDelayUnit);
    }

    setIsCustomDelayOpen((current) => !current);
  }

  function handleCustomUnitChange(nextUnit: ReminderDelayUnit) {
    setCustomDelayValue((currentValue) =>
      convertReminderDelayValue(currentValue, customDelayUnit, nextUnit),
    );
    setCustomDelayUnit(nextUnit);
  }

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

          <section className="rounded-[24px] border border-zinc-200 bg-zinc-50/80 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-medium text-zinc-900">稍后提醒</div>
                <div className="mt-1 text-sm leading-6 text-zinc-500">
                  直接点击会按默认设置处理：{formatReminderDelayLabel(defaultDelayValue, defaultDelayUnit)}
                </div>
              </div>

              <div className="flex gap-2">
                <form action={respondToReminderAction}>
                  <input type="hidden" name="taskId" value={reminder.taskId} />
                  <input type="hidden" name="responseType" value="remind_later" />
                  <input
                    type="hidden"
                    name="messageShown"
                    value={reminder.messageShown}
                  />
                  <input
                    type="hidden"
                    name="scheduledForIso"
                    value={reminder.scheduledForIso}
                  />
                  <input
                    type="hidden"
                    name="delayMinutes"
                    value={String(defaultDelayMinutes)}
                  />
                  <input
                    type="hidden"
                    name="recommendationId"
                    value={currentRecommendationId}
                  />
                  <FormSubmitButton
                    pendingText="稍等..."
                    className="border border-zinc-200 bg-white px-4 py-3 text-zinc-700 hover:border-emerald-200 hover:bg-emerald-50"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Clock3 className="h-4 w-4" />
                      稍后提醒我
                    </span>
                  </FormSubmitButton>
                </form>

                <button
                  type="button"
                  onClick={toggleCustomDelay}
                  className="inline-flex min-h-11 items-center justify-center rounded-[18px] border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-100"
                >
                  {isCustomDelayOpen ? "收起自定义" : "自定义"}
                </button>
              </div>
            </div>

            {isCustomDelayOpen ? (
              <form
                action={respondToReminderAction}
                className="mt-4 space-y-3 rounded-[20px] border border-emerald-100 bg-white/90 p-4"
              >
                <input type="hidden" name="taskId" value={reminder.taskId} />
                <input type="hidden" name="responseType" value="remind_later" />
                <input
                  type="hidden"
                  name="messageShown"
                  value={reminder.messageShown}
                />
                <input
                  type="hidden"
                  name="scheduledForIso"
                  value={reminder.scheduledForIso}
                />
                <input
                  type="hidden"
                  name="delayMinutes"
                  value={String(customDelayMinutes)}
                />
                <input
                  type="hidden"
                  name="recommendationId"
                  value={currentRecommendationId}
                />

                <div>
                  <div className="text-sm font-medium text-zinc-900">
                    这一次单独设置
                  </div>
                  <div className="mt-1 text-xs leading-6 text-zinc-500">
                    只影响当前这条提醒，不会改掉全局默认值。
                  </div>
                </div>

                <DelayFieldGroup
                  inputId={`custom-delay-${reminder.taskId}`}
                  value={customDelayValue}
                  unit={customDelayUnit}
                  onValueChange={setCustomDelayValue}
                  onUnitChange={handleCustomUnitChange}
                  compact
                />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs leading-6 text-zinc-500">
                    本次将按 {formatReminderDelayLabel(customDelayValue, customDelayUnit)} 提醒。
                    {getDelayLimitText(customDelayUnit)}
                  </div>
                  <FormSubmitButton
                    pendingText="稍等..."
                    className="bg-emerald-600 px-4 py-3 text-white hover:bg-emerald-700"
                  >
                    按这个时间提醒
                  </FormSubmitButton>
                </div>
              </form>
            ) : null}
          </section>

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
  const defaultDelayValue = useUiStore((state) => state.reminderDelayValue);
  const defaultDelayUnit = useUiStore((state) => state.reminderDelayUnit);
  const setDefaultDelayValue = useUiStore(
    (state) => state.setReminderDelayValue,
  );
  const setDefaultDelayUnit = useUiStore((state) => state.setReminderDelayUnit);
  const defaultDelayMinutes = useUiStore((state) =>
    toReminderDelayMinutes(state.reminderDelayValue, state.reminderDelayUnit),
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
        <ReminderDelaySettings
          defaultDelayValue={defaultDelayValue}
          defaultDelayUnit={defaultDelayUnit}
          setDefaultDelayValue={setDefaultDelayValue}
          setDefaultDelayUnit={setDefaultDelayUnit}
        />

        <div className="rounded-[28px] border border-dashed border-zinc-300 bg-white/75 p-6 text-sm leading-7 text-zinc-500">
          当前没有到点提醒。你可以先去任务页手动触发，或者等下一次提醒时间到。
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ReminderDelaySettings
        defaultDelayValue={defaultDelayValue}
        defaultDelayUnit={defaultDelayUnit}
        setDefaultDelayValue={setDefaultDelayValue}
        setDefaultDelayUnit={setDefaultDelayUnit}
      />

      {reminders.map((reminder) => (
        <ReminderCard
          key={`${reminder.taskId}-${reminder.scheduledForIso}`}
          reminder={reminder}
          highlighted={highlightedTaskId === reminder.taskId}
          defaultDelayValue={defaultDelayValue}
          defaultDelayUnit={defaultDelayUnit}
          defaultDelayMinutes={defaultDelayMinutes}
        />
      ))}
    </div>
  );
}
