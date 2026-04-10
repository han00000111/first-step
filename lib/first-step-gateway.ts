import type {
  FirstStepDecompositionType,
  FirstStepFrictionSource,
  FirstStepGatewayCategory,
  FirstStepTaskType,
} from "@/lib/first-step-schema";
import type { ContextTypeValue } from "@/lib/task-options";

type FirstStepGatewayInput = {
  taskText: string;
  parsedAction: string;
  contextType: ContextTypeValue;
  dueAt: Date | null;
  now: Date;
  delayCount: number;
};

export type FirstStepGatewayDecision = {
  category: FirstStepGatewayCategory;
  taskType: FirstStepTaskType;
  shouldRecommend: boolean;
  reason: string | null;
  preferredFrictionSource: FirstStepFrictionSource | null;
  allowedDecompositionTypes: FirstStepDecompositionType[];
};

function containsAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function looksLikeScheduleEvent(taskText: string) {
  return containsAny(taskText, [
    /吃饭/,
    /聚餐/,
    /见面/,
    /赴约/,
    /约会/,
    /开会/,
    /会议/,
    /上课/,
    /活动/,
    /出席/,
    /参加/,
    /看展/,
    /看演出/,
    /看电影/,
    /面试/,
    /体检/,
    /复诊/,
    /值班/,
    /接人/,
  ]);
}

export function classifyTaskType(taskText: string): FirstStepTaskType {
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
      /申请/,
    ])
  ) {
    return "submit_send";
  }

  if (
    containsAny(taskText, [
      /修改/,
      /^改/,
      /润色/,
      /重写/,
      /补充/,
      /完善/,
      /创作/,
      /^写/,
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
      /确认一/,
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

  if (looksLikeScheduleEvent(taskText)) {
    return "schedule_event";
  }

  return "decision";
}

function hasPreparationMaterialGap(taskText: string) {
  return containsAny(taskText, [
    /打印/,
    /材料/,
    /证件/,
    /简历/,
    /作品集/,
    /文件/,
    /附件/,
    /带上/,
    /准备/,
    /充电/,
    /电脑/,
    /钥匙/,
  ]);
}

function hasPreparationInformationGap(taskText: string) {
  return containsAny(taskText, [
    /地址/,
    /地点/,
    /路线/,
    /导航/,
    /时间/,
    /几点/,
    /预约/,
    /电话/,
    /联系人/,
    /怎么去/,
    /营业时间/,
    /车票/,
    /入口/,
  ]);
}

function looksLikeFutureOnlyEvent(taskText: string) {
  return containsAny(taskText, [
    /明天/,
    /后天/,
    /今晚/,
    /晚上/,
    /下午/,
    /周一/,
    /周二/,
    /周三/,
    /周四/,
    /周五/,
    /周六/,
    /周日/,
    /周天/,
    /下周/,
    /周末/,
  ]);
}

export function evaluateFirstStepGateway(
  input: FirstStepGatewayInput,
): FirstStepGatewayDecision {
  const taskType = classifyTaskType(input.taskText);

  if (taskType !== "schedule_event") {
    return {
      category: "startup",
      taskType,
      shouldRecommend: true,
      reason: null,
      preferredFrictionSource: null,
      allowedDecompositionTypes: [],
    };
  }

  const hasMaterialGap = hasPreparationMaterialGap(input.taskText);
  const hasInformationGap = hasPreparationInformationGap(input.taskText);

  if (hasMaterialGap || hasInformationGap) {
    return {
      category: "event_with_preparation",
      taskType,
      shouldRecommend: true,
      reason: null,
      preferredFrictionSource: hasInformationGap
        ? "missing_information"
        : "missing_material",
      allowedDecompositionTypes: hasInformationGap
        ? ["confirm_information", "prepare_material", "open_entry"]
        : ["prepare_material", "confirm_information", "open_entry"],
    };
  }

  return {
    category: "schedule_event",
    taskType,
    shouldRecommend: false,
    reason: looksLikeFutureOnlyEvent(input.taskText)
      ? "这更像一个日程安排，当前不需要额外推荐动作。"
      : "这更像一个事件本身，先不用强行拆出推荐动作。",
    preferredFrictionSource: null,
    allowedDecompositionTypes: [],
  };
}
