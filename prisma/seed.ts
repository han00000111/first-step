import { addDays, addHours, addMinutes, setHours, setMinutes, subMinutes } from "date-fns";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.reminderEvent.deleteMany();
  await prisma.task.deleteMany();

  const now = new Date();
  const tomorrowMorning = setMinutes(setHours(addDays(now, 1), 9), 0);

  const resumeTask = await prisma.task.create({
    data: {
      content: "今晚改简历第一段",
      parsedAction: "先打开简历文件",
      dueAt: addHours(now, 18),
      contextType: "pc",
      reminderStyle: "minimal_action",
      status: "active",
      nextReminderAt: null,
    },
  });

  const hrReplyTask = await prisma.task.create({
    data: {
      content: "明天下午给 HR 回消息",
      parsedAction: "先回一句消息",
      dueAt: addDays(now, 1),
      contextType: "mobile",
      reminderStyle: "gentle",
      status: "active",
      nextReminderAt: addMinutes(now, 10),
    },
  });

  const jobApplyTask = await prisma.task.create({
    data: {
      content: "周四前投 3 个岗位",
      parsedAction: "先看一个岗位 JD",
      dueAt: addHours(now, 6),
      contextType: "pc",
      reminderStyle: "ddl_push",
      status: "active",
      nextReminderAt: tomorrowMorning,
    },
  });

  const studyTask = await prisma.task.create({
    data: {
      content: "学习 30 分钟算法题",
      parsedAction: "先看 10 分钟资料",
      dueAt: null,
      contextType: "pc",
      reminderStyle: "minimal_action",
      status: "active",
      nextReminderAt: subMinutes(now, 5),
    },
  });

  const offlineTask = await prisma.task.create({
    data: {
      content: "出门前打印材料",
      parsedAction: "先把文件发到打印机",
      dueAt: addHours(now, 30),
      contextType: "offline",
      reminderStyle: "gentle",
      status: "active",
      nextReminderAt: addHours(now, 2),
    },
  });

  const archivedTask = await prisma.task.create({
    data: {
      content: "整理书桌 5 分钟",
      parsedAction: "先清掉桌面左边一小块",
      dueAt: null,
      contextType: "offline",
      reminderStyle: "minimal_action",
      status: "archived",
      archivedAt: subMinutes(now, 30),
      nextReminderAt: null,
    },
  });

  const resumeSlot = subMinutes(now, 90);
  const hrReplySlot = subMinutes(now, 35);
  const jobApplySlot = subMinutes(now, 20);

  await prisma.reminderEvent.createMany({
    data: [
      {
        taskId: resumeTask.id,
        eventType: "reminder_sent",
        messageShown: "先打开简历文件就行",
        scheduledFor: resumeSlot,
        happenedAt: resumeSlot,
      },
      {
        taskId: resumeTask.id,
        eventType: "accept",
        responseType: "now_start",
        messageShown: "先打开简历文件就行",
        scheduledFor: resumeSlot,
        happenedAt: addMinutes(resumeSlot, 1),
      },
      {
        taskId: hrReplyTask.id,
        eventType: "reminder_sent",
        messageShown: "先回一句消息也可以",
        scheduledFor: hrReplySlot,
        happenedAt: hrReplySlot,
      },
      {
        taskId: hrReplyTask.id,
        eventType: "delay",
        responseType: "remind_later",
        messageShown: "先回一句消息也可以",
        scheduledFor: hrReplySlot,
        happenedAt: addMinutes(hrReplySlot, 1),
        delayMinutes: 10,
      },
      {
        taskId: jobApplyTask.id,
        eventType: "reminder_sent",
        messageShown: "距离截止时间不多了，先开始第一步",
        scheduledFor: jobApplySlot,
        happenedAt: jobApplySlot,
      },
      {
        taskId: jobApplyTask.id,
        eventType: "reject",
        responseType: "not_today",
        messageShown: "距离截止时间不多了，先开始第一步",
        scheduledFor: jobApplySlot,
        happenedAt: addMinutes(jobApplySlot, 1),
      },
      {
        taskId: archivedTask.id,
        eventType: "reminder_sent",
        messageShown: "先清掉桌面左边一小块就行",
        scheduledFor: subMinutes(now, 200),
        happenedAt: subMinutes(now, 200),
      },
      {
        taskId: archivedTask.id,
        eventType: "accept",
        responseType: "now_start",
        messageShown: "先清掉桌面左边一小块就行",
        scheduledFor: subMinutes(now, 200),
        happenedAt: subMinutes(now, 199),
      },
    ],
  });

  console.log(
    [
      "Seed complete.",
      `Tasks: ${[resumeTask, hrReplyTask, jobApplyTask, studyTask, offlineTask, archivedTask].length}`,
      "Reminder events: 8",
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
