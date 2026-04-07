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

function resolveProfileFromArgs() {
  const profileIndex = process.argv.findIndex((arg) => arg === "--profile");

  if (profileIndex >= 0) {
    const nextValue = process.argv[profileIndex + 1];

    if (nextValue === "demo" || nextValue === "preview" || nextValue === "local") {
      return nextValue satisfies SeedProfile;
    }

    throw new Error("Invalid --profile value. Use demo, preview or local.");
  }

  return resolveSeedProfile();
}

function buildScenario(profile: SeedProfile, now: Date) {
  const tomorrowMorning = setMinutes(setHours(addDays(now, 1), 9), 0);
  const prefix =
    profile === "demo" ? "" : profile === "preview" ? "Preview · " : "Local · ";

  const resumeTask: SeedTaskInput = {
    key: "resume",
    content: `${prefix}今晚改简历第一段`,
    parsedAction: "先打开简历文件",
    dueAt: addHours(now, 18),
    contextType: "pc",
    reminderStyle: "minimal_action",
    nextReminderAt: profile === "preview" ? subMinutes(now, 2) : null,
  };

  const hrReplyTask: SeedTaskInput = {
    key: "hr-reply",
    content: `${prefix}明天下午给 HR 回消息`,
    parsedAction: "先回一句消息",
    dueAt: addDays(now, 1),
    contextType: "mobile",
    reminderStyle: "gentle",
    nextReminderAt: addMinutes(now, profile === "local" ? 20 : 10),
  };

  const jobApplyTask: SeedTaskInput = {
    key: "job-apply",
    content: `${prefix}周四前投 3 个岗位`,
    parsedAction: "先看一个岗位 JD",
    dueAt: addHours(now, 6),
    contextType: "pc",
    reminderStyle: "ddl_push",
    nextReminderAt: profile === "preview" ? addMinutes(now, 30) : tomorrowMorning,
  };

  const studyTask: SeedTaskInput = {
    key: "study",
    content: `${prefix}学习 30 分钟算法题`,
    parsedAction: "先看 10 分钟资料",
    dueAt: null,
    contextType: "pc",
    reminderStyle: "minimal_action",
    nextReminderAt: subMinutes(now, 5),
  };

  const offlineTask: SeedTaskInput = {
    key: "offline",
    content: `${prefix}出门前打印材料`,
    parsedAction: "先把文件发到打印机",
    dueAt: addHours(now, 30),
    contextType: "offline",
    reminderStyle: "gentle",
    nextReminderAt: addHours(now, 2),
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
  const archivedSlot = subMinutes(now, 200);

  const tasks = [resumeTask, hrReplyTask, jobApplyTask, studyTask, offlineTask, archivedTask];

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
      delayMinutes: profile === "preview" ? 25 : 10,
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

  return { tasks, events };
}

async function main() {
  const profile = resolveProfileFromArgs();
  const now = new Date();
  const scenario = buildScenario(profile, now);

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
      `Tasks: ${scenario.tasks.length}`,
      `Reminder events: ${scenario.events.length}`,
      "Includes: 求职、学习、电脑、线下、不同提醒风格、接受/延后/拒绝样本",
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
