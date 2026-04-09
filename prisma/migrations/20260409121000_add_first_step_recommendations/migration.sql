-- CreateEnum
CREATE TYPE "FirstStepRecommendationSource" AS ENUM ('llm', 'rule_fallback');

-- CreateEnum
CREATE TYPE "FirstStepRecommendationEventType" AS ENUM ('generated', 'shown', 'accepted', 'regenerated');

-- CreateTable
CREATE TABLE "FirstStepRecommendation" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "reminderStage" TEXT NOT NULL,
    "preferredTone" TEXT NOT NULL,
    "delayCount" INTEGER NOT NULL DEFAULT 0,
    "source" "FirstStepRecommendationSource" NOT NULL,
    "modelName" TEXT,
    "recommendedFirstStep" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "shouldShrinkTask" BOOLEAN NOT NULL DEFAULT false,
    "requestPayload" JSONB,
    "rawResponse" JSONB,
    "generationError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FirstStepRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FirstStepRecommendationEvent" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "eventType" "FirstStepRecommendationEventType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FirstStepRecommendationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FirstStepRecommendation_taskId_scheduledFor_createdAt_idx" ON "FirstStepRecommendation"("taskId", "scheduledFor", "createdAt");

-- CreateIndex
CREATE INDEX "FirstStepRecommendation_source_createdAt_idx" ON "FirstStepRecommendation"("source", "createdAt");

-- CreateIndex
CREATE INDEX "FirstStepRecommendationEvent_recommendationId_eventType_createdAt_idx" ON "FirstStepRecommendationEvent"("recommendationId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "FirstStepRecommendationEvent_taskId_eventType_createdAt_idx" ON "FirstStepRecommendationEvent"("taskId", "eventType", "createdAt");

-- AddForeignKey
ALTER TABLE "FirstStepRecommendation" ADD CONSTRAINT "FirstStepRecommendation_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirstStepRecommendationEvent" ADD CONSTRAINT "FirstStepRecommendationEvent_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "FirstStepRecommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirstStepRecommendationEvent" ADD CONSTRAINT "FirstStepRecommendationEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
