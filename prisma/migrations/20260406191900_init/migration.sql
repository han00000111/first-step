-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "parsedAction" TEXT NOT NULL,
    "dueAt" DATETIME,
    "contextType" TEXT NOT NULL DEFAULT 'unknown',
    "reminderStyle" TEXT NOT NULL DEFAULT 'minimal_action',
    "status" TEXT NOT NULL DEFAULT 'active',
    "nextReminderAt" DATETIME,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReminderEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "responseType" TEXT,
    "messageShown" TEXT NOT NULL,
    "scheduledFor" DATETIME,
    "happenedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delayMinutes" INTEGER,
    CONSTRAINT "ReminderEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Task_status_nextReminderAt_idx" ON "Task"("status", "nextReminderAt");

-- CreateIndex
CREATE INDEX "Task_dueAt_idx" ON "Task"("dueAt");

-- CreateIndex
CREATE INDEX "ReminderEvent_taskId_happenedAt_idx" ON "ReminderEvent"("taskId", "happenedAt");

-- CreateIndex
CREATE INDEX "ReminderEvent_eventType_happenedAt_idx" ON "ReminderEvent"("eventType", "happenedAt");
