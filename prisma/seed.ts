import { addDays, addHours, addMinutes, setHours, setMinutes, subMinutes } from "date-fns";
import { PrismaClient } from "@prisma/client";

import { resolveSeedProfile, type SeedProfile } from "../lib/environment";

const prisma = new PrismaClient();

type SeedTaskInput = {
  key: string;
  content: string;
  parsedAction: string;
  dueAt: Date | null;
  contextType: "mobile" | "pc" | "offline" | "unknown";
  reminderStyle: "gentle" | "minimal_action" | "ddl_push";
  nextReminderAt: Date | null;
  status?: "active" | "archived";
  archivedAt?: Date | null;
};

type SeedEventInput = {
  taskKey: string;
  eventType: "reminder_sent" | "accept" | "delay" | "reject";
  responseType?: "now_start" | "remind_later" | "not_today";
  messageShown: string;
  scheduledFor: Date;
  happenedAt: Date;
  delayMinutes?: number | null;
};

type DatasetProfile = "local" | "dev" | "preview" | "demo";

function resolveProfileFromArgs() {
  const profileIndex = process.argv.findIndex((arg) => arg === "--profile");

  if (profileIndex >= 0) {
    const nextValue = process.argv[profileIndex + 1];

    if (
      nextValue === "demo" ||
      nextValue === "preview" ||
      nextValue === "local" ||
      nextValue === "production" ||
      nextValue === "dev"
    ) {
      return nextValue satisfies SeedProfile;
    }

    throw new Error(
      "Invalid --profile value. Use demo, dev, preview, local or production.",
    );
  }

  return resolveSeedProfile();
}

function resolveDatasetProfile(profile: SeedProfile): DatasetProfile {
  if (profile === "production") {
    return "demo";
  }

  return profile;
}

function getDatasetPrefix(datasetProfile: DatasetProfile) {
  if (datasetProfile === "demo") {
    return "";
  }

  if (datasetProfile === "preview") {
    return "Preview 路 ";
  }

  if (datasetProfile === "dev") {
    return "Dev 路 ";
  }

  return "Local 路 ";
}

function buildScenario(profile: SeedProfile, now: Date) {
  const datasetProfile = resolveDatasetProfile(profile);
  const prefix = getDatasetPrefix(datasetProfile);
  const tomorrowMorning = setMinutes(setHours(addDays(now, 1), 9), 0);
  const dueSoonOffset =
    datasetProfile === "dev" ? 4 : datasetProfile === "preview" ? 6 : 18;

  const resumeTask: SeedTaskInput = {
    key: "resume",
    content:
      datasetProfile === "dev"
        ? `${prefix}今晚把简历开头改成更适合产品岗位的版本`
        : `${prefix}今晚改简历第一段`,
    parsedAction:
      datasetProfile === "dev" ? "先打开简历并只改标题下第一段" : "先打开简历文件",
    dueAt: addHours(now, dueSoonOffset),
    contextType: "pc",
    reminderStyle: "minimal_action",
    nextReminderAt:
      datasetProfile === "dev"
        ? subMinutes(now, 3)
        : datasetProfile === "preview"
          ? subMinutes(now, 2)
          : null,
  };

  const hrReplyTask: SeedTaskInput = {
    key: "hr-reply",
    content:
      datasetProfile === "dev"
        ? `${prefix}明天上午前给 HR 回一封确认面试时间的邮件`
        : `${prefix}明天下午给 HR 回消息`,
    parsedAction:
      datasetProfile === "dev" ? "先写一句确认时间的回复" : "先回一句消息",
    dueAt: addDays(now, 1),
    contextType: "mobile",
    reminderStyle: "gentle",
    nextReminderAt:
      datasetProfile === "dev" ? subMinutes(now, 1) : addMinutes(now, 10),
  };

  const jobApplyTask: SeedTaskInput = {
    key: "job-apply",
    content:
      datasetProfile === "dev"
        ? `${prefix}周四前投 3 个岗位，并把每个岗位的简历标题都调一下`
        : `${prefix}周四前投 3 个岗位`,
    parsedAction:
      datasetProfile === "dev" ? "先打开第一个岗位的 JD" : "先看一个岗位 JD",
    dueAt: addHours(now, datasetProfile === "dev" ? 5 : 6),
    contextType: "pc",
    reminderStyle: "ddl_push",
    nextReminderAt:
      datasetProfile === "preview" ? addMinutes(now, 30) : tomorrowMorning,
  };

  const studyTask: SeedTaskInput = {
    key: "study",
    content:
      datasetProfile === "dev"
        ? `${prefix}把机器学习笔记整理成 3 个明天能复习的小节`
        : `${prefix}学习 30 分钟算法题`,
    parsedAction:
      datasetProfile === "dev" ? "先列出 3 个小节标题" : "先看 10 分钟资料",
    dueAt: null,
    contextType: "pc",
    reminderStyle: "minimal_action",
    nextReminderAt: subMinutes(now, datasetProfile === "dev" ? 8 : 5),
  };

  const offlineTask: SeedTaskInput = {
    key: "offline",
    content:
      datasetProfile === "dev"
        ? `${prefix}明早出门前把面试材料和充电器都放进包里`
        : `${prefix}出门前打印材料`,
    parsedAction:
      datasetProfile === "dev" ? "先把材料放进包里" : "先把文件发到打印店",
    dueAt: addHours(now, 30),
    contextType: "offline",
    reminderStyle: "gentle",
    nextReminderAt:
      datasetProfile === "dev" ? subMinutes(now, 12) : addHours(now, 2),
  };

  const archivedTask: SeedTaskInput = {
    key: "archived",
    content: `${prefix}整理书桌 5 分钟`,
    parsedAction: "先清掉桌面左边一小块",
    dueAt: null,
    contextType: "offline",
    reminderStyle: "minimal_action",
    nextReminderAt: null,
    status: "archived",
    archivedAt: subMinutes(now, 30),
  };

  const resumeSlot = subMinutes(now, 90);
  const hrReplySlot = subMinutes(now, 35);
  const jobApplySlot = subMinutes(now, 20);
  const studySlot = subMinutes(now, 15);
  const offlineSlot = subMinutes(now, 12);
  const archivedSlot = subMinutes(now, 200);

  const tasks = [
    resumeTask,
    hrReplyTask,
    jobApplyTask,
    studyTask,
    offlineTask,
    archivedTask,
  ];

  const events: SeedEventInput[] = [
    {
      taskKey: "resume",
      eventType: "reminder_sent",
      messageShown: "先打开简历文件就行",
      scheduledFor: resumeSlot,
      happenedAt: resumeSlot,
    },
    {
      taskKey: "resume",
      eventType: "accept",
      responseType: "now_start",
      messageShown: "先打开简历文件就行",
      scheduledFor: resumeSlot,
      happenedAt: addMinutes(resumeSlot, 1),
    },
    {
      taskKey: "hr-reply",
      eventType: "reminder_sent",
      messageShown: "先回一句消息也可以",
      scheduledFor: hrReplySlot,
      happenedAt: hrReplySlot,
    },
    {
      taskKey: "hr-reply",
      eventType: "delay",
      responseType: "remind_later",
      messageShown: "先回一句消息也可以",
      scheduledFor: hrReplySlot,
      happenedAt: addMinutes(hrReplySlot, 1),
      delayMinutes: datasetProfile === "preview" ? 25 : datasetProfile === "dev" ? 40 : 10,
    },
    {
      taskKey: "job-apply",
      eventType: "reminder_sent",
      messageShown: "距离截止时间不多了，先开始第一步",
      scheduledFor: jobApplySlot,
      happenedAt: jobApplySlot,
    },
    {
      taskKey: "job-apply",
      eventType: "reject",
      responseType: "not_today",
      messageShown: "距离截止时间不多了，先开始第一步",
      scheduledFor: jobApplySlot,
      happenedAt: addMinutes(jobApplySlot, 1),
    },
    {
      taskKey: "archived",
      eventType: "reminder_sent",
      messageShown: "先清掉桌面左边一小块就行",
      scheduledFor: archivedSlot,
      happenedAt: archivedSlot,
    },
    {
      taskKey: "archived",
      eventType: "accept",
      responseType: "now_start",
      messageShown: "先清掉桌面左边一小块就行",
      scheduledFor: archivedSlot,
      happenedAt: addMinutes(archivedSlot, 1),
    },
  ];

  if (datasetProfile === "dev") {
    events.push(
      {
        taskKey: "study",
        eventType: "reminder_sent",
        messageShown: "先只做第一步",
        scheduledFor: studySlot,
        happenedAt: studySlot,
      },
      {
        taskKey: "study",
        eventType: "delay",
        responseType: "remind_later",
        messageShown: "先只做第一步",
        scheduledFor: studySlot,
        happenedAt: addMinutes(studySlot, 1),
        delayMinutes: 30,
      },
      {
        taskKey: "study",
        eventType: "delay",
        responseType: "remind_later",
        messageShown: "先只做第一步",
        scheduledFor: addMinutes(studySlot, 30),
        happenedAt: addMinutes(studySlot, 31),
        delayMinutes: 45,
      },
      {
        taskKey: "offline",
        eventType: "reminder_sent",
        messageShown: "现在不一定做完，先碰一下也行",
        scheduledFor: offlineSlot,
        happenedAt: offlineSlot,
      },
    );
  }

  return { tasks, events, datasetProfile };
}

async function main() {
  const profile = resolveProfileFromArgs();
  const now = new Date();
  const scenario = buildScenario(profile, now);

  await prisma.firstStepRecommendationEvent.deleteMany();
  await prisma.firstStepRecommendation.deleteMany();
  await prisma.devicePushSubscription.deleteMany();
  await prisma.reminderEvent.deleteMany();
  await prisma.task.deleteMany();

  const createdTasks = new Map<string, string>();

  for (const task of scenario.tasks) {
    const created = await prisma.task.create({
      data: {
        content: task.content,
        parsedAction: task.parsedAction,
        dueAt: task.dueAt,
        contextType: task.contextType,
        reminderStyle: task.reminderStyle,
        status: task.status ?? "active",
        nextReminderAt: task.nextReminderAt,
        archivedAt: task.archivedAt ?? null,
      },
    });

    createdTasks.set(task.key, created.id);
  }

  await prisma.reminderEvent.createMany({
    data: scenario.events.map((event) => ({
      taskId: createdTasks.get(event.taskKey)!,
      eventType: event.eventType,
      responseType: event.responseType,
      messageShown: event.messageShown,
      scheduledFor: event.scheduledFor,
      happenedAt: event.happenedAt,
      delayMinutes: event.delayMinutes ?? null,
    })),
  });

  console.log(
    [
      `Seed complete for profile: ${profile}`,
      `Dataset used: ${scenario.datasetProfile}`,
      `Tasks: ${scenario.tasks.length}`,
      `Reminder events: ${scenario.events.length}`,
      "Includes: 求职、学习、电脑、线下、不同提醒风格，以及接受 / 延后 / 拒绝样本。",
    ].join("\n"),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
