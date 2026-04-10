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

type RuleDecisionCandidate = RuleDecision & {
  candidateKey: string;
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

type RecommendationHistoryRecord = {
  id: string;
  recommendedFirstStep: string;
  decompositionType: string;
  createdAt: Date;
};

export type RegenerateFirstStepRecommendationResult = {
  status: "success" | "exhausted";
  recommendation: FirstStepRecommendationView | null;
  message: string;
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

function areStepsNearDuplicate(left: string, right: string) {
  const normalizedLeft = normalizeText(stripCommonLead(left));
  const normalizedRight = normalizeText(stripCommonLead(right));

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  if (normalizedLeft === normalizedRight) {
    return true;
  }

  return similarityScore(normalizedLeft, normalizedRight) >= 0.62;
}

function pushUniqueStep(target: string[], value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return;
  }

  if (target.some((item) => areStepsNearDuplicate(item, normalizedValue))) {
    return;
  }

  target.push(normalizedValue);
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

function buildCommunicationStepVariants(
  context: FirstStepRecommendationContext,
  decompositionType: FirstStepDecompositionType,
) {
  const steps: string[] = [];
  pushUniqueStep(steps, buildCommunicationStep(context, decompositionType));

  if (/打电话/.test(context.taskText)) {
    if (decompositionType === "open_entry") {
      pushUniqueStep(steps, "先把联系人页面和拨号界面打开");
      pushUniqueStep(steps, "先把要打的号码调出来停在眼前");
    } else if (decompositionType === "confirm_information") {
      pushUniqueStep(steps, "先确认对方明天方便接电话的大概时间");
      pushUniqueStep(steps, "先把这通电话最需要确认的一点写下来");
    } else if (decompositionType === "lower_psychological_barrier") {
      pushUniqueStep(steps, "先在备忘录里写一句开场白");
      pushUniqueStep(steps, "先只写下这通电话要说的两个关键词");
    } else if (decompositionType === "prepare_material") {
      pushUniqueStep(steps, "先把要提到的资料放到手边");
      pushUniqueStep(steps, "先把对方号码和要点放到同一个地方");
    } else if (decompositionType === "alternative_scene") {
      pushUniqueStep(steps, "先把号码和要点记到待会一眼能看到的地方");
      pushUniqueStep(steps, "先把这通电话放到明天打开手机就能看到的位置");
    } else {
      pushUniqueStep(steps, "先只写第一句准备怎么开口");
      pushUniqueStep(steps, "先列一个这通电话最关键的问题");
    }

    return steps;
  }

  if (/HR/.test(context.taskText) && /(消息|回复|回信)/.test(context.taskText)) {
    if (decompositionType === "open_entry") {
      pushUniqueStep(steps, "先把和 HR 的对话框切出来");
      pushUniqueStep(steps, "先看一眼上一条 HR 消息");
    } else if (decompositionType === "confirm_information") {
      pushUniqueStep(steps, "先圈出这条消息里最需要回应的一点");
      pushUniqueStep(steps, "先确认 HR 这次最在意的问题是什么");
    } else if (decompositionType === "prepare_material") {
      pushUniqueStep(steps, "先把岗位链接或附件打开在旁边");
      pushUniqueStep(steps, "先把回复里可能要提到的文件放到手边");
    } else if (decompositionType === "lower_psychological_barrier") {
      pushUniqueStep(steps, "先只写称呼和开头一句");
      pushUniqueStep(steps, "先把最想回的一句话打出来");
    } else if (decompositionType === "alternative_scene") {
      pushUniqueStep(steps, "先把要回的关键词记到备忘录里");
      pushUniqueStep(steps, "先把这段对话标成待回复放到最前面");
    } else {
      pushUniqueStep(steps, "先只写一句确认已收到");
      pushUniqueStep(steps, "先把第一句回复打出来");
    }

    return steps;
  }

  if (/邮件/.test(context.taskText)) {
    if (decompositionType === "open_entry") {
      pushUniqueStep(steps, "先把邮件草稿打开");
      pushUniqueStep(steps, "先把收件人和主题行露出来");
    } else if (decompositionType === "confirm_information") {
      pushUniqueStep(steps, "先确认这封邮件最需要说清的一点");
      pushUniqueStep(steps, "先圈出这封邮件必须回复的那一句");
    } else if (decompositionType === "prepare_material") {
      pushUniqueStep(steps, "先把要附上的文件放到旁边");
      pushUniqueStep(steps, "先把要引用的链接复制出来备用");
    } else if (decompositionType === "lower_psychological_barrier") {
      pushUniqueStep(steps, "先只写称呼和第一句");
      pushUniqueStep(steps, "先只补一个主题行");
    } else if (decompositionType === "alternative_scene") {
      pushUniqueStep(steps, "先把要发的关键词记在备忘录里");
      pushUniqueStep(steps, "先把这封邮件标成下一次打开邮箱先处理");
    } else {
      pushUniqueStep(steps, "先写一句邮件开头");
      pushUniqueStep(steps, "先只补一行最核心的信息");
    }
  }

  return steps;
}

function buildSubmitStepVariants(
  context: FirstStepRecommendationContext,
  decompositionType: FirstStepDecompositionType,
) {
  const steps: string[] = [];
  pushUniqueStep(steps, buildSubmitStep(context, decompositionType));

  if (/作品集/.test(context.taskText) && /HR/.test(context.taskText)) {
    if (decompositionType === "prepare_material") {
      pushUniqueStep(steps, "先把作品集链接复制出来备用");
      pushUniqueStep(steps, "先确认作品集链接能正常打开");
    } else if (decompositionType === "open_entry") {
      pushUniqueStep(steps, "先把邮件或聊天输入框打开");
      pushUniqueStep(steps, "先把发送入口停在输入框位置");
    } else if (decompositionType === "confirm_information") {
      pushUniqueStep(steps, "先确认收件人和称呼");
      pushUniqueStep(steps, "先确认这次发作品集要附哪一句说明");
    } else if (decompositionType === "lower_psychological_barrier") {
      pushUniqueStep(steps, "先只写标题和第一句");
      pushUniqueStep(steps, "先把链接贴进去，不急着一次写完");
    } else {
      pushUniqueStep(steps, "先写一句发送开头");
      pushUniqueStep(steps, "先把链接先贴进去");
    }

    return steps;
  }

  if (/简历/.test(context.taskText)) {
    if (decompositionType === "prepare_material") {
      pushUniqueStep(steps, "先确认这次要发的简历版本");
      pushUniqueStep(steps, "先把简历文件放到桌面或同一个窗口里");
    } else if (decompositionType === "open_entry") {
      pushUniqueStep(steps, "先把投递页打开到上传位置");
      pushUniqueStep(steps, "先把岗位投递入口打开");
    } else if (decompositionType === "confirm_information") {
      pushUniqueStep(steps, "先确认岗位名称和投递入口没错");
      pushUniqueStep(steps, "先看一眼这次投递是否还缺附件");
    } else if (decompositionType === "lower_psychological_barrier") {
      pushUniqueStep(steps, "先只处理上传简历这一项");
      pushUniqueStep(steps, "先只填一个必填项");
    } else {
      pushUniqueStep(steps, "先只上传简历文件");
      pushUniqueStep(steps, "先只填最上面的一个字段");
    }
  }

  return steps;
}

function buildEditStepVariants(
  context: FirstStepRecommendationContext,
  decompositionType: FirstStepDecompositionType,
) {
  const steps: string[] = [];
  pushUniqueStep(steps, buildEditStep(context, decompositionType));

  if (/简历/.test(context.taskText) && /第一段/.test(context.taskText)) {
    if (decompositionType === "open_entry") {
      pushUniqueStep(steps, "先把简历文件打开并停在第一段");
      pushUniqueStep(steps, "先把文档定位到第一段第一句");
    } else if (decompositionType === "confirm_information") {
      pushUniqueStep(steps, "先确定第一段最想突出的一点");
      pushUniqueStep(steps, "先确认第一段最需要改掉的那一句");
    } else if (decompositionType === "prepare_material") {
      pushUniqueStep(steps, "先把原稿和参考版本并排打开");
      pushUniqueStep(steps, "先把目标岗位 JD 打开在旁边");
    } else if (decompositionType === "lower_psychological_barrier") {
      pushUniqueStep(steps, "先把要改的那句标出来");
      pushUniqueStep(steps, "先只删掉第一段里一个多余词");
    } else if (decompositionType === "alternative_scene") {
      pushUniqueStep(steps, "先把第一段复制到备忘录里看一眼");
      pushUniqueStep(steps, "先把第一段里最想改的一句单独记下来");
    } else {
      pushUniqueStep(steps, "先只改第一段的第一句");
      pushUniqueStep(steps, "先改掉第一段里最别扭的一句话");
    }

    return steps;
  }

  if (decompositionType === "open_entry") {
    pushUniqueStep(steps, "先把文档切到要改的位置");
  } else if (decompositionType === "confirm_information") {
    pushUniqueStep(steps, "先确认这一段最想表达的重点");
    pushUniqueStep(steps, "先找出最需要改的那一句");
  } else if (decompositionType === "prepare_material") {
    pushUniqueStep(steps, "先把原稿和参考内容放到同一屏里");
    pushUniqueStep(steps, "先把需要对照的材料打开在旁边");
  } else if (decompositionType === "lower_psychological_barrier") {
    pushUniqueStep(steps, "先只标出一处最别扭的句子");
    pushUniqueStep(steps, "先只删一个明显多余的词");
  } else if (decompositionType === "alternative_scene") {
    pushUniqueStep(steps, "先把要改的那一段复制到便签里");
    pushUniqueStep(steps, "先记下一句你最想先动的句子");
  } else {
    pushUniqueStep(steps, "先只改一处最明显的表达");
    pushUniqueStep(steps, "先只改一小句");
  }

  return steps;
}

function buildConfirmStepVariants(
  context: FirstStepRecommendationContext,
  decompositionType: FirstStepDecompositionType,
) {
  const steps: string[] = [];
  pushUniqueStep(steps, buildConfirmStep(context));

  if (decompositionType === "open_entry") {
    pushUniqueStep(steps, "先把地图或搜索页面打开");
    pushUniqueStep(steps, "先把查询入口打开停在搜索框");
  } else if (decompositionType === "prepare_material") {
    pushUniqueStep(steps, "先把地址或名称复制出来备用");
    pushUniqueStep(steps, "先把要查的关键词整理成一行");
  } else if (decompositionType === "lower_psychological_barrier") {
    pushUniqueStep(steps, "先只确认最关键的一条信息");
    pushUniqueStep(steps, "先只查一个最影响后续的问题");
  } else if (decompositionType === "minimum_execute") {
    pushUniqueStep(steps, "先搜一个最关键的关键词");
    pushUniqueStep(steps, "先只查最需要确定的那一项");
  }

  return steps;
}

function buildOfflineStepVariants(
  context: FirstStepRecommendationContext,
  decompositionType: FirstStepDecompositionType,
) {
  const steps: string[] = [];
  pushUniqueStep(steps, buildOfflineStep(context, decompositionType));

  if (/打印/.test(context.taskText)) {
    if (decompositionType === "prepare_material") {
      pushUniqueStep(steps, "先把要打印的文件集中到一个文件夹");
      pushUniqueStep(steps, "先把最需要打印的那份文件单独放好");
    } else if (decompositionType === "confirm_information") {
      pushUniqueStep(steps, "先确认附近哪家店现在能打印");
      pushUniqueStep(steps, "先查一下最近打印点的营业时间");
    } else if (decompositionType === "alternative_scene") {
      pushUniqueStep(steps, "先把打印店地址存到地图里");
      pushUniqueStep(steps, "先把文件名和打印需求记成一行");
    } else if (decompositionType === "lower_psychological_barrier") {
      pushUniqueStep(steps, "先只准备最需要打印的一份");
      pushUniqueStep(steps, "先只检查一份文件是否能正常打开");
    } else {
      pushUniqueStep(steps, "先把最关键的一份文件单独找出来");
      pushUniqueStep(steps, "先只确认一份文件已经准备好");
    }

    return steps;
  }

  if (decompositionType === "prepare_material") {
    pushUniqueStep(steps, "先把要带的材料集中到一起");
    pushUniqueStep(steps, "先把最关键的一样材料放到包旁边");
  } else if (decompositionType === "confirm_information") {
    pushUniqueStep(steps, "先确认营业时间或办理地址");
    pushUniqueStep(steps, "先看一眼今天去办是否需要预约");
  } else if (decompositionType === "alternative_scene") {
    pushUniqueStep(steps, "先把路线或地址存到地图里");
    pushUniqueStep(steps, "先把出门前要做的事写成一行");
  } else if (decompositionType === "lower_psychological_barrier") {
    pushUniqueStep(steps, "先只准备一样最关键的材料");
    pushUniqueStep(steps, "先只确认一件必须带的东西");
  } else {
    pushUniqueStep(steps, "先写下一样出门前一定要带的东西");
    pushUniqueStep(steps, "先把最关键的一份材料单独放好");
  }

  return steps;
}

function buildOrganizeStepVariants(
  context: FirstStepRecommendationContext,
  decompositionType: FirstStepDecompositionType,
) {
  const steps: string[] = [];
  pushUniqueStep(steps, buildOrganizeStep(context));

  if (decompositionType === "open_entry") {
    pushUniqueStep(steps, "先拿一个空袋子或临时收纳盒放在旁边");
    pushUniqueStep(steps, "先只空出一小块可以放东西的位置");
  } else if (decompositionType === "lower_psychological_barrier") {
    pushUniqueStep(steps, "先只整理眼前这一小堆");
    pushUniqueStep(steps, "先给自己两分钟只收最显眼的东西");
  } else {
    pushUniqueStep(steps, "先只把最显眼的三样东西归到一起");
    pushUniqueStep(steps, "先只清出一小块可用位置");
  }

  return steps;
}

function buildDecisionStepVariants(
  context: FirstStepRecommendationContext,
  decompositionType: FirstStepDecompositionType,
) {
  const steps: string[] = [];
  pushUniqueStep(steps, buildDecisionStep(context));

  if (decompositionType === "open_entry") {
    pushUniqueStep(steps, "先把两个候选放到同一屏里");
    pushUniqueStep(steps, "先把最常犹豫的两个选项列出来");
  } else if (decompositionType === "confirm_information") {
    pushUniqueStep(steps, "先补查一个最影响选择的信息");
    pushUniqueStep(steps, "先确认最关键的一个判断条件");
  } else if (decompositionType === "lower_psychological_barrier") {
    pushUniqueStep(steps, "先只划掉一个明显不合适的选项");
    pushUniqueStep(steps, "先只做排除，不急着现在定下来");
  } else {
    pushUniqueStep(steps, "先删掉一个最不想选的选项");
    pushUniqueStep(steps, "先只留下两个候选");
  }

  return steps;
}

function buildStepVariantsForTaskType(
  context: FirstStepRecommendationContext,
  taskType: FirstStepTaskType,
  decompositionType: FirstStepDecompositionType,
) {
  if (taskType === "communication") {
    return buildCommunicationStepVariants(context, decompositionType);
  }

  if (taskType === "submit_send") {
    return buildSubmitStepVariants(context, decompositionType);
  }

  if (taskType === "edit_create") {
    return buildEditStepVariants(context, decompositionType);
  }

  if (taskType === "confirm_lookup") {
    return buildConfirmStepVariants(context, decompositionType);
  }

  if (taskType === "offline_execute") {
    return buildOfflineStepVariants(context, decompositionType);
  }

  if (taskType === "organize_household") {
    return buildOrganizeStepVariants(context, decompositionType);
  }

  return buildDecisionStepVariants(context, decompositionType);
}

function getCandidateDecompositionOrder(
  taskType: FirstStepTaskType,
  primaryDecompositionType: FirstStepDecompositionType,
  usedDecompositionTypes: Set<string>,
) {
  const baseOrder =
    taskType === "communication"
      ? [
          primaryDecompositionType,
          "open_entry",
          "minimum_execute",
          "lower_psychological_barrier",
          "confirm_information",
          "prepare_material",
          "alternative_scene",
        ]
      : taskType === "submit_send"
        ? [
            primaryDecompositionType,
            "prepare_material",
            "open_entry",
            "minimum_execute",
            "confirm_information",
            "lower_psychological_barrier",
            "alternative_scene",
          ]
        : taskType === "edit_create"
          ? [
              primaryDecompositionType,
              "open_entry",
              "minimum_execute",
              "confirm_information",
              "lower_psychological_barrier",
              "prepare_material",
              "alternative_scene",
            ]
          : taskType === "confirm_lookup"
            ? [
                primaryDecompositionType,
                "confirm_information",
                "open_entry",
                "minimum_execute",
                "lower_psychological_barrier",
                "prepare_material",
              ]
            : taskType === "offline_execute"
              ? [
                  primaryDecompositionType,
                  "prepare_material",
                  "confirm_information",
                  "alternative_scene",
                  "minimum_execute",
                  "lower_psychological_barrier",
                ]
              : taskType === "organize_household"
                ? [
                    primaryDecompositionType,
                    "minimum_execute",
                    "lower_psychological_barrier",
                    "open_entry",
                  ]
                : [
                    primaryDecompositionType,
                    "confirm_information",
                    "minimum_execute",
                    "lower_psychological_barrier",
                    "open_entry",
                  ];

  const uniqueOrder = Array.from(new Set(baseOrder));

  return [
    ...uniqueOrder.filter((item) => !usedDecompositionTypes.has(item)),
    ...uniqueOrder.filter((item) => usedDecompositionTypes.has(item)),
  ] as FirstStepDecompositionType[];
}

function deriveCandidateFrictionSource(
  primaryFrictionSource: FirstStepFrictionSource,
  decompositionType: FirstStepDecompositionType,
): FirstStepFrictionSource {
  if (decompositionType === "open_entry") {
    return "entry_not_open";
  }

  if (decompositionType === "prepare_material") {
    return "missing_material";
  }

  if (decompositionType === "confirm_information") {
    return "missing_information";
  }

  if (decompositionType === "alternative_scene") {
    return primaryFrictionSource === "current_time_unsuitable"
      ? "current_time_unsuitable"
      : "current_scene_unsuitable";
  }

  if (decompositionType === "lower_psychological_barrier") {
    return primaryFrictionSource === "repeated_delay"
      ? "repeated_delay"
      : "psychological_barrier";
  }

  return primaryFrictionSource === "repeated_delay"
    ? "repeated_delay"
    : "task_too_large";
}

function buildCandidateDecision(
  context: FirstStepRecommendationContext,
  taskType: FirstStepTaskType,
  primaryFrictionSource: FirstStepFrictionSource,
  decompositionType: FirstStepDecompositionType,
  step: string,
  candidateKey: string,
): RuleDecisionCandidate {
  const frictionSource = deriveCandidateFrictionSource(
    primaryFrictionSource,
    decompositionType,
  );

  return {
    candidateKey,
    taskType,
    can_do_now: true,
    friction_source: frictionSource,
    decomposition_type: decompositionType,
    recommended_first_step: step,
    why_this_step: buildWhyThisStep(frictionSource, decompositionType),
    is_smaller_than_original: true,
    confidence:
      decompositionType === deriveDecompositionType(primaryFrictionSource)
        ? 0.72
        : 0.64,
  };
}

function buildPrimaryRuleDecision(
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

function buildRuleCandidatePool(
  context: FirstStepRecommendationContext,
  options?: {
    excludedTexts?: string[];
    usedDecompositionTypes?: Set<string>;
  },
): RuleDecisionCandidate[] {
  const primaryDecision = buildPrimaryRuleDecision(context);
  const excludedTexts = options?.excludedTexts ?? [];
  const usedDecompositionTypes =
    options?.usedDecompositionTypes ?? new Set<string>();
  const decompositionOrder = getCandidateDecompositionOrder(
    primaryDecision.taskType,
    primaryDecision.decomposition_type,
    usedDecompositionTypes,
  );
  const candidates: RuleDecisionCandidate[] = [];

  for (const decompositionType of decompositionOrder) {
    const stepVariants = buildStepVariantsForTaskType(
      context,
      primaryDecision.taskType,
      decompositionType,
    );

    stepVariants.forEach((step, index) => {
      if (
        excludedTexts.some((item) => areStepsNearDuplicate(item, step)) ||
        candidates.some((item) =>
          areStepsNearDuplicate(item.recommended_first_step, step),
        )
      ) {
        return;
      }

      const candidate = buildCandidateDecision(
        context,
        primaryDecision.taskType,
        primaryDecision.friction_source,
        decompositionType,
        step,
        `${decompositionType}:${index}`,
      );
      const validationError = validateCandidateStep(
        candidate.recommended_first_step,
        context,
        candidate,
      );

      if (validationError) {
        return;
      }

      candidates.push(candidate);
    });
  }

  logFirstStepDebug("built recommendation candidate pool", {
    taskId: context.taskId,
    scheduledFor: context.scheduledFor.toISOString(),
    candidateCount: candidates.length,
    excludedCount: excludedTexts.length,
    usedDecompositionTypes: Array.from(usedDecompositionTypes),
  });

  if (candidates.length === 0) {
    return [
      {
        ...primaryDecision,
        candidateKey: "primary:0",
      },
    ];
  }

  return candidates;
}

function buildRuleDecision(
  context: FirstStepRecommendationContext,
): RuleDecision {
  return buildRuleCandidatePool(context)[0] ?? buildPrimaryRuleDecision(context);
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

async function getRecommendationHistoryForSlot(
  db: DbClient,
  context: FirstStepRecommendationContext,
) {
  return db.firstStepRecommendation.findMany({
    where: {
      taskId: context.taskId,
      scheduledFor: context.scheduledFor,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      recommendedFirstStep: true,
      decompositionType: true,
      createdAt: true,
    },
  }) as Promise<RecommendationHistoryRecord[]>;
}

function pickNextCandidate(
  context: FirstStepRecommendationContext,
  history: RecommendationHistoryRecord[],
  previousRecommendationId?: string | null,
) {
  const usedTexts = history.map((item) => item.recommendedFirstStep);
  const usedDecompositionTypes = new Set(
    history.map((item) => item.decompositionType),
  );
  const previousRecommendation = history.find(
    (item) => item.id === previousRecommendationId,
  );
  const excludedTexts = previousRecommendation
    ? [...usedTexts, previousRecommendation.recommendedFirstStep]
    : usedTexts;
  const candidatePool = buildRuleCandidatePool(context, {
    excludedTexts,
    usedDecompositionTypes,
  });
  const nextCandidate =
    candidatePool.find((candidate) =>
      !usedTexts.some((item) =>
        areStepsNearDuplicate(item, candidate.recommended_first_step),
      ),
    ) ?? null;

  logFirstStepDebug("picked next candidate for regenerate", {
    taskId: context.taskId,
    scheduledFor: context.scheduledFor.toISOString(),
    previousRecommendationId: previousRecommendationId ?? null,
    historyCount: history.length,
    candidatePoolSize: candidatePool.length,
    nextCandidateKey: nextCandidate?.candidateKey ?? null,
  });

  return nextCandidate;
}

async function createRecommendation(
  db: DbClient,
  context: FirstStepRecommendationContext,
  ruleDecision: RuleDecision,
  trigger: "initial" | "regenerate",
  previousRecommendationId?: string | null,
) {
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

  return createRecommendation(
    prisma,
    context,
    buildRuleDecision(context),
    "initial",
  );
}

export async function regenerateFirstStepRecommendation(
  context: FirstStepRecommendationContext,
  previousRecommendationId?: string | null,
) {
  const history = await getRecommendationHistoryForSlot(prisma, context);
  const nextCandidate = pickNextCandidate(
    context,
    history,
    previousRecommendationId,
  );

  if (!nextCandidate) {
    return {
      status: "exhausted" as const,
      recommendation: null,
      message: "暂时没有更合适的替代建议",
    };
  }

  const recommendation = await createRecommendation(
    prisma,
    context,
    nextCandidate,
    "regenerate",
    previousRecommendationId,
  );

  await markFirstStepRecommendationsShown([
    {
      recommendationId: recommendation.recommendationId,
      taskId: context.taskId,
    },
  ]);

  return {
    status: "success" as const,
    recommendation,
    message: "已切换到另一个建议",
  };
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
