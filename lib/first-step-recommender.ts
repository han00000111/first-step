import { Prisma, type FirstStepRecommendationSource } from "@prisma/client";

import {
  parseFirstStepModelExpressionOutput,
  type FirstStepDecompositionType,
  type FirstStepFrictionSource,
  type FirstStepModelExpressionOutput,
  type FirstStepRecommendationOutput,
  type FirstStepTaskType,
} from "@/lib/first-step-schema";
import { prisma } from "@/lib/prisma";
import type { ContextTypeValue } from "@/lib/task-options";

type DbClient = Prisma.TransactionClient | typeof prisma;

type ResponseHistoryItem = {
  eventType: "accept" | "delay" | "reject";
  responseType: "now_start" | "remind_later" | "not_today" | null;
  happenedAt: string;
  delayMinutes: number | null;
};

type RuleDecision = FirstStepRecommendationOutput & {
  taskType: FirstStepTaskType;
};

type ModelResult = {
  modelName: string | null;
  output: FirstStepModelExpressionOutput | null;
  rawResponse: unknown;
  generationError: string | null;
};

export type FirstStepRecommendationView = {
  recommendationId: string;
  canDoNow: boolean;
  frictionSource: string;
  decompositionType: string;
  recommendedFirstStep: string;
  whyThisStep: string;
  isSmallerThanOriginal: boolean;
  confidence: number;
  source: FirstStepRecommendationSource;
  modelName: string | null;
};

export type FirstStepRecommendationContext = {
  taskId: string;
  taskText: string;
  parsedAction: string;
  contextType: ContextTypeValue;
  dueAt: Date | null;
  now: Date;
  scheduledFor: Date;
  reminderStage: string;
  delayCount: number;
  userResponseHistory: ResponseHistoryItem[];
  preferredTone: string;
};

type RecommendationRecord = {
  id: string;
  canDoNow: boolean;
  frictionSource: string;
  decompositionType: string;
  recommendedFirstStep: string;
  whyThisStep: string;
  isSmallerThanOriginal: boolean;
  confidence: number;
  source: FirstStepRecommendationSource;
  modelName: string | null;
};

const MODEL_REQUEST_TIMEOUT_MS = 5000;

function logFirstStepDebug(message: string, payload?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  if (payload) {
    console.log(`[first-step] ${message}`, payload);
    return;
  }

  console.log(`[first-step] ${message}`);
}

function mapRecommendationRecord(
  record: RecommendationRecord,
): FirstStepRecommendationView {
  return {
    recommendationId: record.id,
    canDoNow: record.canDoNow,
    frictionSource: record.frictionSource,
    decompositionType: record.decompositionType,
    recommendedFirstStep: record.recommendedFirstStep,
    whyThisStep: record.whyThisStep,
    isSmallerThanOriginal: record.isSmallerThanOriginal,
    confidence: record.confidence,
    source: record.source,
    modelName: record.modelName,
  };
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown model error";
}

function normalizeText(value: string) {
  return value
    .replace(/[“”"'`’]/g, "")
    .replace(/[，。！？、；：,.!?;:\-\s]/g, "")
    .trim()
    .toLowerCase();
}

function stripCommonLead(text: string) {
  return text
    .trim()
    .replace(
      /^(现在先|先试着|先花\d+分钟|先用\d+分钟|先把|先去|先只|先|开始|先来)/,
      "",
    )
    .trim();
}

function buildBigrams(text: string) {
  if (text.length <= 1) {
    return new Set([text]);
  }

  const bigrams = new Set<string>();

  for (let index = 0; index < text.length - 1; index += 1) {
    bigrams.add(text.slice(index, index + 2));
  }

  return bigrams;
}

function similarityScore(left: string, right: string) {
  if (!left || !right) {
    return 0;
  }

  const leftBigrams = buildBigrams(left);
  const rightBigrams = buildBigrams(right);
  let overlap = 0;

  for (const item of leftBigrams) {
    if (rightBigrams.has(item)) {
      overlap += 1;
    }
  }

  return overlap / Math.max(leftBigrams.size, rightBigrams.size);
}

function looksLikeMultiStep(text: string) {
  return /(\n|然后|接着|再去|再把|之后|并且|同时|1\.|2\.|第一步|第二步)/.test(
    text,
  );
}

function isAbstractAction(text: string) {
  return /(处理一下|推进一下|开始做|行动起来|搞一搞|推进任务|处理任务|先弄一下)/.test(
    text,
  );
}

function containsAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function classifyTaskType(taskText: string): FirstStepTaskType {
  if (
    containsAny(taskText, [
      /回消息/,
      /回复/,
      /回信/,
      /发消息/,
      /发邮件/,
      /邮件/,
      /打电话/,
      /联系/,
      /沟通/,
      /发给.*HR/,
      /给.*HR/,
    ])
  ) {
    return "communication";
  }

  if (
    containsAny(taskText, [
      /提交/,
      /发送/,
      /投递/,
      /上传/,
      /投岗位/,
      /投简历/,
      /发作品集/,
      /报名/,
    ])
  ) {
    return "submit_send";
  }

  if (
    containsAny(taskText, [
      /修改/,
      /改/,
      /润色/,
      /重写/,
      /补充/,
      /完善/,
      /创作/,
      /写/,
      /整理成文/,
    ])
  ) {
    return "edit_create";
  }

  if (
    containsAny(taskText, [
      /确认/,
      /查询/,
      /查一下/,
      /核对/,
      /确认下/,
      /确认面试地点/,
      /确认时间/,
      /确认地址/,
      /查营业时间/,
    ])
  ) {
    return "confirm_lookup";
  }

  if (
    containsAny(taskText, [
      /打印/,
      /出门/,
      /办理/,
      /现场/,
      /带上/,
      /去一趟/,
      /跑一趟/,
      /线下/,
    ])
  ) {
    return "offline_execute";
  }

  if (
    containsAny(taskText, [
      /整理/,
      /收纳/,
      /归位/,
      /清理/,
      /收拾/,
      /桌面/,
      /房间/,
      /书桌/,
    ])
  ) {
    return "organize_household";
  }

  return "decision";
}

function hasFutureTimeExpression(taskText: string, now: Date) {
  if (containsAny(taskText, [/明天/, /后天/, /下周/, /改天/, /之后/, /周末/])) {
    return true;
  }

  const hour = now.getHours();

  if (/今晚/.test(taskText) && hour < 18) {
    return true;
  }

  if (/(下午|晚上)/.test(taskText) && hour < 12) {
    return true;
  }

  return false;
}

function isCurrentTimeUnsuitable(taskText: string, now: Date) {
  const hour = now.getHours();

  if (/打电话/.test(taskText) && (hour < 9 || hour >= 21)) {
    return true;
  }

  if (/(出门|办理|打印)/.test(taskText) && (hour < 8 || hour >= 20)) {
    return true;
  }

  return false;
}

function isCurrentSceneUnsuitable(
  taskType: FirstStepTaskType,
  contextType: ContextTypeValue,
) {
  if (contextType === "pc" && taskType !== "confirm_lookup") {
    return true;
  }

  if (contextType === "offline") {
    return true;
  }

  if (taskType === "offline_execute") {
    return true;
  }

  return false;
}

function isMissingMaterial(
  taskType: FirstStepTaskType,
  taskText: string,
) {
  if (
    containsAny(taskText, [
      /打印/,
      /材料/,
      /附件/,
      /文件/,
      /作品集/,
      /简历/,
      /证件/,
      /带上/,
    ])
  ) {
    return true;
  }

  return taskType === "offline_execute";
}

function isMissingInformation(
  taskType: FirstStepTaskType,
  taskText: string,
) {
  if (
    containsAny(taskText, [
      /确认/,
      /地址/,
      /地点/,
      /时间/,
      /路线/,
      /营业时间/,
      /联系人/,
      /电话/,
      /哪一个/,
      /哪个/,
    ])
  ) {
    return true;
  }

  return taskType === "confirm_lookup" || taskType === "decision";
}

function isEntryNotOpen(
  taskType: FirstStepTaskType,
  taskText: string,
) {
  if (containsAny(taskText, [/简历/, /文档/, /邮箱/, /微信/, /消息/, /作品集/, /链接/])) {
    return true;
  }

  return taskType === "edit_create" || taskType === "submit_send";
}

function isPsychologicalBarrier(
  taskType: FirstStepTaskType,
  taskText: string,
) {
  if (
    containsAny(taskText, [
      /打电话/,
      /HR/,
      /联系/,
      /发送/,
      /提交/,
      /发作品集/,
      /发邮件/,
    ])
  ) {
    return true;
  }

  return taskType === "communication" || taskType === "submit_send";
}

function isTaskTooLarge(taskText: string, parsedAction: string) {
  return (
    taskText.length >= 16 ||
    parsedAction.length >= 14 ||
    containsAny(taskText, [
      /\d+/,
      /全部/,
      /整理/,
      /完成/,
      /修改/,
      /完善/,
      /投/,
      /发送/,
      /处理/,
      /决定/,
    ])
  );
}

function deriveFrictionSource(
  context: FirstStepRecommendationContext,
  taskType: FirstStepTaskType,
) {
  if (context.delayCount >= 2) {
    return "repeated_delay" as const;
  }

  if (isCurrentTimeUnsuitable(context.taskText, context.now) || hasFutureTimeExpression(context.taskText, context.now)) {
    return "current_time_unsuitable" as const;
  }

  if (isCurrentSceneUnsuitable(taskType, context.contextType)) {
    return "current_scene_unsuitable" as const;
  }

  if (isMissingMaterial(taskType, context.taskText)) {
    return "missing_material" as const;
  }

  if (isMissingInformation(taskType, context.taskText)) {
    return "missing_information" as const;
  }

  if (isEntryNotOpen(taskType, context.taskText)) {
    return "entry_not_open" as const;
  }

  if (isTaskTooLarge(context.taskText, context.parsedAction)) {
    return "task_too_large" as const;
  }

  if (isPsychologicalBarrier(taskType, context.taskText)) {
    return "psychological_barrier" as const;
  }

  return "task_too_large" as const;
}

function deriveDecompositionType(
  frictionSource: FirstStepFrictionSource,
): FirstStepDecompositionType {
  if (frictionSource === "entry_not_open") {
    return "open_entry";
  }

  if (frictionSource === "missing_material") {
    return "prepare_material";
  }

  if (frictionSource === "missing_information") {
    return "confirm_information";
  }

  if (
    frictionSource === "current_scene_unsuitable" ||
    frictionSource === "current_time_unsuitable"
  ) {
    return "alternative_scene";
  }

  if (
    frictionSource === "psychological_barrier" ||
    frictionSource === "repeated_delay"
  ) {
    return "lower_psychological_barrier";
  }

  return "minimum_execute";
}

function deriveCanDoNow(
  frictionSource: FirstStepFrictionSource,
) {
  return !["current_scene_unsuitable", "current_time_unsuitable"].includes(
    frictionSource,
  );
}

function buildWhyThisStep(
  frictionSource: FirstStepFrictionSource,
  decompositionType: FirstStepDecompositionType,
) {
  if (frictionSource === "repeated_delay") {
    return "已经拖过几次，先缩到更轻的一步更容易开始";
  }

  if (decompositionType === "open_entry") {
    return "先把入口打开，后面更容易接上下一步";
  }

  if (decompositionType === "prepare_material") {
    return "先把材料备齐，后面更不容易卡住";
  }

  if (decompositionType === "confirm_information") {
    return "先确认一个关键信息，后面更容易继续";
  }

  if (decompositionType === "lower_psychological_barrier") {
    return "先做心理门槛更低的一步，更容易真正开始";
  }

  if (decompositionType === "alternative_scene") {
    return "现在不适合直接做主任务，先做替代动作更稳";
  }

  return "先缩成一小步，启动阻力会更低";
}

function buildCommunicationStep(
  context: FirstStepRecommendationContext,
  decompositionType: FirstStepDecompositionType,
) {
  if (/打电话/.test(context.taskText)) {
    if (decompositionType === "confirm_information") {
      return "先确认对方明天方便接电话的时间";
    }

    return "先写下这通电话要说的两点";
  }

  if (/HR/.test(context.taskText) && /(消息|回复|回)/.test(context.taskText)) {
    if (decompositionType === "open_entry") {
      return "先打开对话框看一眼上一条消息";
    }

    return "先把想回复的第一句打出来";
  }

  if (/邮件/.test(context.taskText)) {
    if (decompositionType === "open_entry") {
      return "先打开邮件草稿";
    }

    return "先写一句邮件开头";
  }

  return decompositionType === "open_entry"
    ? "先打开对话框"
    : "先写一句想发出去的话";
}

function buildSubmitStep(
  context: FirstStepRecommendationContext,
  decompositionType: FirstStepDecompositionType,
) {
  if (/作品集/.test(context.taskText) && /HR/.test(context.taskText)) {
    if (decompositionType === "prepare_material") {
      return "先把作品集链接复制出来备用";
    }

    if (decompositionType === "open_entry") {
      return "先打开邮件或聊天框";
    }

    return "先写一句发送开头";
  }

  if (/简历/.test(context.taskText)) {
    return decompositionType === "prepare_material"
      ? "先把简历文件放到一个窗口里"
      : "先打开投递页面";
  }

  return decompositionType === "prepare_material"
    ? "先把要发送的文件放到一起"
    : "先打开提交入口";
}

function buildEditStep(
  context: FirstStepRecommendationContext,
  decompositionType: FirstStepDecompositionType,
) {
  if (/简历/.test(context.taskText) && /第一段/.test(context.taskText)) {
    if (decompositionType === "open_entry") {
      return "先打开简历文件并定位到第一段";
    }

    return "先只改第一段第一句";
  }

  if (decompositionType === "open_entry") {
    return "先打开文档并定位到要改的位置";
  }

  return "先改一处最别扭的句子";
}

function buildConfirmStep(context: FirstStepRecommendationContext) {
  if (/(地址|地点|面试地点|路线)/.test(context.taskText)) {
    return "先把地址复制到地图里";
  }

  if (/(时间|几点|日期)/.test(context.taskText)) {
    return "先确认一个具体时间点";
  }

  return "先确认一个最关键的信息";
}

function buildOfflineStep(
  context: FirstStepRecommendationContext,
  decompositionType: FirstStepDecompositionType,
) {
  if (/打印/.test(context.taskText)) {
    return decompositionType === "prepare_material"
      ? "先把要打印的文件放到同一个文件夹"
      : "先确认附近哪里可以打印";
  }

  if (/(材料|证件|资料)/.test(context.taskText)) {
    return "先确认要带的材料是否齐全";
  }

  if (/(办理|窗口|营业时间)/.test(context.taskText)) {
    return "先查一下营业时间";
  }

  return "先把出门前要带的一样东西写下来";
}

function buildOrganizeStep(context: FirstStepRecommendationContext) {
  if (/桌面/.test(context.taskText)) {
    return "先把桌面上最显眼的 3 个文件移进一个临时文件夹";
  }

  return "先把最显眼的 3 样东西归到一起";
}

function buildDecisionStep(context: FirstStepRecommendationContext) {
  if (/(哪个|哪一个|选择|决定)/.test(context.taskText)) {
    return "先删掉一个你最不想选的选项";
  }

  return "先只留下两个候选";
}

function buildRuleDecision(
  context: FirstStepRecommendationContext,
): RuleDecision {
  const taskType = classifyTaskType(context.taskText);
  const frictionSource = deriveFrictionSource(context, taskType);
  const decompositionType = deriveDecompositionType(frictionSource);
  const canDoNow = deriveCanDoNow(frictionSource);

  const recommendedFirstStep =
    taskType === "communication"
      ? buildCommunicationStep(context, decompositionType)
      : taskType === "submit_send"
        ? buildSubmitStep(context, decompositionType)
        : taskType === "edit_create"
          ? buildEditStep(context, decompositionType)
          : taskType === "confirm_lookup"
            ? buildConfirmStep(context)
            : taskType === "offline_execute"
              ? buildOfflineStep(context, decompositionType)
              : taskType === "organize_household"
                ? buildOrganizeStep(context)
                : buildDecisionStep(context);

  return {
    taskType,
    can_do_now: canDoNow,
    friction_source: frictionSource,
    decomposition_type: decompositionType,
    recommended_first_step: recommendedFirstStep,
    why_this_step: buildWhyThisStep(frictionSource, decompositionType),
    is_smaller_than_original: true,
    confidence: canDoNow ? 0.72 : 0.66,
  };
}

function buildRequestPayload(
  context: FirstStepRecommendationContext,
  ruleDecision: RuleDecision,
) {
  return {
    task_text: context.taskText,
    context_type: context.contextType,
    due_at: context.dueAt?.toISOString() ?? null,
    now: context.now.toISOString(),
    reminder_stage: context.reminderStage,
    delay_count: context.delayCount,
    user_response_history: context.userResponseHistory,
    preferred_tone: context.preferredTone,
    rule_decision: {
      task_type: ruleDecision.taskType,
      can_do_now: ruleDecision.can_do_now,
      friction_source: ruleDecision.friction_source,
      decomposition_type: ruleDecision.decomposition_type,
      recommended_first_step: ruleDecision.recommended_first_step,
      why_this_step: ruleDecision.why_this_step,
    },
  };
}

function getModelConfig() {
  return {
    apiKey: process.env.OPENAI_API_KEY?.trim() ?? "",
    model: process.env.OPENAI_FIRST_STEP_MODEL?.trim() || "gpt-4o-mini",
  };
}

function extractTextFromResponse(response: unknown) {
  if (!response || typeof response !== "object") {
    return null;
  }

  if (
    "output_text" in response &&
    typeof response.output_text === "string" &&
    response.output_text.trim()
  ) {
    return response.output_text.trim();
  }

  if (!("output" in response) || !Array.isArray(response.output)) {
    return null;
  }

  for (const item of response.output) {
    if (
      !item ||
      typeof item !== "object" ||
      !("content" in item) ||
      !Array.isArray(item.content)
    ) {
      continue;
    }

    for (const content of item.content) {
      if (
        content &&
        typeof content === "object" &&
        "text" in content &&
        typeof content.text === "string" &&
        content.text.trim()
      ) {
        return content.text.trim();
      }
    }
  }

  return null;
}

function isBlockedByScene(
  taskText: string,
  decompositionType: FirstStepDecompositionType,
) {
  if (decompositionType !== "alternative_scene") {
    return false;
  }

  return containsAny(taskText, [
    /^打电话$/,
    /^打印材料$/,
    /^发作品集$/,
    /^发邮件$/,
  ]);
}

function validateCandidateStep(
  candidateStep: string,
  context: FirstStepRecommendationContext,
  ruleDecision: RuleDecision,
) {
  const candidate = normalizeText(stripCommonLead(candidateStep));
  const normalizedTask = normalizeText(stripCommonLead(context.taskText));
  const normalizedAction = normalizeText(stripCommonLead(context.parsedAction));

  if (!candidate) {
    return "missing candidate";
  }

  if (looksLikeMultiStep(candidateStep)) {
    return "candidate contains multiple steps";
  }

  if (isAbstractAction(candidateStep)) {
    return "candidate is too abstract";
  }

  if (candidate === normalizedTask || candidate === normalizedAction) {
    return "candidate repeats original task";
  }

  if (
    similarityScore(candidate, normalizedTask) >= 0.78 ||
    similarityScore(candidate, normalizedAction) >= 0.78
  ) {
    return "candidate is too similar to original";
  }

  if (
    /^(打电话|回消息|回复消息|发邮件|发作品集|打印材料|改简历|改简历第一段|确认面试地点)$/.test(
      candidateStep.trim(),
    )
  ) {
    return "candidate is direct restatement";
  }

  if (isBlockedByScene(candidateStep.trim(), ruleDecision.decomposition_type)) {
    return "candidate cannot be executed in current scene";
  }

  return null;
}

function callUsesRuleDecision(candidateStep: string, ruleStep: string) {
  const candidate = normalizeText(candidateStep);
  const rule = normalizeText(ruleStep);

  if (!candidate || !rule) {
    return false;
  }

  return similarityScore(candidate, rule) >= 0.18;
}

async function callExpressionModel(
  context: FirstStepRecommendationContext,
  ruleDecision: RuleDecision,
): Promise<ModelResult> {
  const { apiKey, model } = getModelConfig();

  if (!apiKey) {
    logFirstStepDebug("skip model call because OPENAI_API_KEY is missing", {
      taskId: context.taskId,
      scheduledFor: context.scheduledFor.toISOString(),
    });
    return {
      modelName: null,
      output: null,
      rawResponse: null,
      generationError: "OPENAI_API_KEY missing",
    };
  }

  try {
    logFirstStepDebug("sending expression model request", {
      taskId: context.taskId,
      scheduledFor: context.scheduledFor.toISOString(),
      model,
    });

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content:
              "你不是来决定做什么，你只负责把已经选好的第一步改写成更自然的一句话。必须保留原动作的实际含义，不允许扩大任务，不允许改成原任务本身，不允许输出多步，不允许抽象表达。输出必须是 JSON。",
          },
          {
            role: "user",
            content: JSON.stringify({
              rule_step: ruleDecision.recommended_first_step,
              rule_why: ruleDecision.why_this_step,
              task_text: context.taskText,
              constraints: [
                "只润色表达，不改动作类型",
                "必须保持 1 到 5 分钟可执行",
                "不能复述原任务",
                "不能输出多步",
                "不能抽象",
              ],
            }),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "first_step_expression",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: [
                "recommended_first_step",
                "why_this_step",
                "confidence",
              ],
              properties: {
                recommended_first_step: {
                  type: "string",
                  description: "对规则动作的自然改写，不能改变动作内容",
                },
                why_this_step: {
                  type: "string",
                  description: "一条很短的原因说明",
                },
                confidence: {
                  type: "number",
                  minimum: 0,
                  maximum: 1,
                },
              },
            },
          },
        },
      }),
      signal: AbortSignal.timeout(MODEL_REQUEST_TIMEOUT_MS),
    });
    const rawResponse = await response.json();

    if (!response.ok) {
      return {
        modelName: model,
        output: null,
        rawResponse,
        generationError: `OpenAI request failed with status ${response.status}`,
      };
    }

    const text = extractTextFromResponse(rawResponse);

    if (!text) {
      return {
        modelName: model,
        output: null,
        rawResponse,
        generationError: "OpenAI response missing output text",
      };
    }

    try {
      const parsed = JSON.parse(text);
      const output = parseFirstStepModelExpressionOutput(parsed);

      if (!output) {
        logFirstStepDebug("model output failed schema validation", {
          taskId: context.taskId,
          scheduledFor: context.scheduledFor.toISOString(),
          model,
        });

        return {
          modelName: model,
          output: null,
          rawResponse,
          generationError: "OpenAI response failed validation",
        };
      }

      const validationError = validateCandidateStep(
        output.recommended_first_step,
        context,
        ruleDecision,
      );

      if (validationError) {
        logFirstStepDebug("model output rejected by hard validation", {
          taskId: context.taskId,
          scheduledFor: context.scheduledFor.toISOString(),
          model,
          validationError,
        });

        return {
          modelName: model,
          output: null,
          rawResponse,
          generationError: `OpenAI expression rejected: ${validationError}`,
        };
      }

      if (
        !callUsesRuleDecision(
          output.recommended_first_step,
          ruleDecision.recommended_first_step,
        )
      ) {
        logFirstStepDebug("model output drifted away from rule decision", {
          taskId: context.taskId,
          scheduledFor: context.scheduledFor.toISOString(),
          model,
        });

        return {
          modelName: model,
          output: null,
          rawResponse,
          generationError: "OpenAI expression drifted away from rule step",
        };
      }

      logFirstStepDebug("model output accepted", {
        taskId: context.taskId,
        scheduledFor: context.scheduledFor.toISOString(),
        model,
      });

      return {
        modelName: model,
        output,
        rawResponse,
        generationError: null,
      };
    } catch {
      return {
        modelName: model,
        output: null,
        rawResponse,
        generationError: "OpenAI response was not valid JSON",
      };
    }
  } catch (error) {
    logFirstStepDebug("model request failed", {
      taskId: context.taskId,
      scheduledFor: context.scheduledFor.toISOString(),
      model,
      error: toErrorMessage(error),
    });

    return {
      modelName: model,
      output: null,
      rawResponse: null,
      generationError: `OpenAI request failed: ${toErrorMessage(error)}`,
    };
  }
}

async function createRecommendation(
  db: DbClient,
  context: FirstStepRecommendationContext,
  trigger: "initial" | "regenerate",
  previousRecommendationId?: string | null,
) {
  const ruleDecision = buildRuleDecision(context);
  const requestPayload = buildRequestPayload(context, ruleDecision);

  let llmResult: ModelResult;

  try {
    llmResult = await callExpressionModel(context, ruleDecision);
  } catch (error) {
    llmResult = {
      modelName: getModelConfig().model,
      output: null,
      rawResponse: null,
      generationError: `Model pipeline failed: ${toErrorMessage(error)}`,
    };
  }

  const resolvedOutput: FirstStepRecommendationOutput = {
    ...ruleDecision,
    recommended_first_step:
      llmResult.output?.recommended_first_step ??
      ruleDecision.recommended_first_step,
    why_this_step:
      llmResult.output?.why_this_step ?? ruleDecision.why_this_step,
    confidence: llmResult.output?.confidence ?? ruleDecision.confidence,
  };
  const source: FirstStepRecommendationSource = llmResult.output
    ? "llm"
    : "rule_fallback";

  logFirstStepDebug("resolved recommendation candidate", {
    taskId: context.taskId,
    scheduledFor: context.scheduledFor.toISOString(),
    trigger,
    previousRecommendationId: previousRecommendationId ?? null,
    source,
    hasModelOutput: Boolean(llmResult.output),
  });

  const recommendation = await db.firstStepRecommendation.create({
    data: {
      taskId: context.taskId,
      scheduledFor: context.scheduledFor,
      reminderStage: context.reminderStage,
      preferredTone: context.preferredTone,
      delayCount: context.delayCount,
      source,
      modelName: llmResult.modelName,
      canDoNow: resolvedOutput.can_do_now,
      frictionSource: resolvedOutput.friction_source,
      decompositionType: resolvedOutput.decomposition_type,
      recommendedFirstStep: resolvedOutput.recommended_first_step,
      whyThisStep: resolvedOutput.why_this_step,
      isSmallerThanOriginal: resolvedOutput.is_smaller_than_original,
      confidence: resolvedOutput.confidence,
      requestPayload,
      rawResponse: llmResult.rawResponse ?? requestPayload,
      generationError: llmResult.generationError,
    },
    select: {
      id: true,
      canDoNow: true,
      frictionSource: true,
      decompositionType: true,
      recommendedFirstStep: true,
      whyThisStep: true,
      isSmallerThanOriginal: true,
      confidence: true,
      source: true,
      modelName: true,
    },
  });

  await db.firstStepRecommendationEvent.create({
    data: {
      recommendationId: recommendation.id,
      taskId: context.taskId,
      eventType: "generated",
      metadata: {
        trigger,
        source,
        previousRecommendationId: previousRecommendationId ?? null,
        taskType: ruleDecision.taskType,
        frictionSource: resolvedOutput.friction_source,
        decompositionType: resolvedOutput.decomposition_type,
      },
    },
  });

  if (trigger === "regenerate") {
    await db.firstStepRecommendationEvent.create({
      data: {
        recommendationId: recommendation.id,
        taskId: context.taskId,
        eventType: "regenerated",
        metadata: {
          previousRecommendationId: previousRecommendationId ?? null,
        },
      },
    });
  }

  logFirstStepDebug("persisted recommendation", {
    taskId: context.taskId,
    scheduledFor: context.scheduledFor.toISOString(),
    trigger,
    recommendationId: recommendation.id,
    source: recommendation.source,
  });

  return mapRecommendationRecord(recommendation);
}

export async function getOrCreateFirstStepRecommendation(
  context: FirstStepRecommendationContext,
) {
  const existing = await prisma.firstStepRecommendation.findFirst({
    where: {
      taskId: context.taskId,
      scheduledFor: context.scheduledFor,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      canDoNow: true,
      frictionSource: true,
      decompositionType: true,
      recommendedFirstStep: true,
      whyThisStep: true,
      isSmallerThanOriginal: true,
      confidence: true,
      source: true,
      modelName: true,
    },
  });

  if (existing) {
    return mapRecommendationRecord(existing);
  }

  return createRecommendation(prisma, context, "initial");
}

export async function regenerateFirstStepRecommendation(
  context: FirstStepRecommendationContext,
  previousRecommendationId?: string | null,
) {
  return createRecommendation(
    prisma,
    context,
    "regenerate",
    previousRecommendationId,
  );
}

export async function markFirstStepRecommendationsShown(
  items: Array<{ recommendationId: string; taskId: string }>,
) {
  if (items.length === 0) {
    return 0;
  }

  return prisma.$transaction(async (tx) => {
    let createdCount = 0;

    for (const item of items) {
      const existing = await tx.firstStepRecommendationEvent.findFirst({
        where: {
          recommendationId: item.recommendationId,
          eventType: "shown",
        },
      });

      if (existing) {
        continue;
      }

      await tx.firstStepRecommendationEvent.create({
        data: {
          recommendationId: item.recommendationId,
          taskId: item.taskId,
          eventType: "shown",
        },
      });
      createdCount += 1;
    }

    return createdCount;
  });
}

export async function markFirstStepRecommendationAccepted(input: {
  recommendationId: string;
  taskId: string;
}) {
  return prisma.firstStepRecommendationEvent.upsert({
    where: {
      id: `${input.recommendationId}:accepted`,
    },
    update: {},
    create: {
      id: `${input.recommendationId}:accepted`,
      recommendationId: input.recommendationId,
      taskId: input.taskId,
      eventType: "accepted",
    },
  });
}

export function buildFallbackFirstStepRecommendationView(
  context: FirstStepRecommendationContext,
): FirstStepRecommendationView {
  const ruleDecision = buildRuleDecision(context);

  return {
    recommendationId: "",
    canDoNow: ruleDecision.can_do_now,
    frictionSource: ruleDecision.friction_source,
    decompositionType: ruleDecision.decomposition_type,
    recommendedFirstStep: ruleDecision.recommended_first_step,
    whyThisStep: ruleDecision.why_this_step,
    isSmallerThanOriginal: ruleDecision.is_smaller_than_original,
    confidence: ruleDecision.confidence,
    source: "rule_fallback",
    modelName: null,
  };
}
