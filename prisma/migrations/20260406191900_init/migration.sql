-- CreateEnum
CREATE TYPE "ContextType" AS ENUM ('mobile', 'pc', 'offline', 'unknown');

-- CreateEnum
CREATE TYPE "ReminderStyle" AS ENUM ('gentle', 'minimal_action', 'ddl_push');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "ReminderEventType" AS ENUM ('reminder_sent', 'accept', 'delay', 'reject');

-- CreateEnum
CREATE TYPE "ReminderResponseType" AS ENUM ('now_start', 'remind_later', 'not_today');

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parsedAction" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "contextType" "ContextType" NOT NULL DEFAULT 'unknown',
    "reminderStyle" "ReminderStyle" NOT NULL DEFAULT 'minimal_action',
    "status" "TaskStatus" NOT NULL DEFAULT 'active',
    "nextReminderAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderEvent" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "eventType" "ReminderEventType" NOT NULL,
    "responseType" "ReminderResponseType",
    "messageShown" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3),
    "happenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delayMinutes" INTEGER,

    CONSTRAINT "ReminderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Task_status_nextReminderAt_idx" ON "Task"("status", "nextReminderAt");

-- CreateIndex
CREATE INDEX "Task_dueAt_idx" ON "Task"("dueAt");

-- CreateIndex
CREATE INDEX "ReminderEvent_taskId_happenedAt_idx" ON "ReminderEvent"("taskId", "happenedAt");

-- CreateIndex
CREATE INDEX "ReminderEvent_eventType_happenedAt_idx" ON "ReminderEvent"("eventType", "happenedAt");

-- AddForeignKey
ALTER TABLE "ReminderEvent" ADD CONSTRAINT "ReminderEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
