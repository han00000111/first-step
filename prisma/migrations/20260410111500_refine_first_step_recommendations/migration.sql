ALTER TABLE "FirstStepRecommendation"
ADD COLUMN     "canDoNow" BOOLEAN,
ADD COLUMN     "frictionSource" TEXT,
ADD COLUMN     "decompositionType" TEXT,
ADD COLUMN     "whyThisStep" TEXT,
ADD COLUMN     "isSmallerThanOriginal" BOOLEAN;

UPDATE "FirstStepRecommendation"
SET
  "canDoNow" = CASE
    WHEN "actionType" IN ('reply', 'open', 'review', 'submit') THEN TRUE
    ELSE FALSE
  END,
  "frictionSource" = CASE
    WHEN "actionType" = 'reply' THEN 'social_resistance'
    WHEN "shouldShrinkTask" = TRUE THEN 'task_too_large'
    WHEN "actionType" IN ('prepare', 'travel') THEN 'need_prepare'
    WHEN "actionType" = 'review' THEN 'need_confirm'
    ELSE 'activation_energy'
  END,
  "decompositionType" = CASE
    WHEN "actionType" = 'reply' THEN 'micro_reply'
    WHEN "actionType" = 'draft' THEN 'micro_edit'
    WHEN "actionType" IN ('prepare', 'travel') THEN 'prepare'
    WHEN "actionType" = 'review' THEN 'confirm'
    WHEN "actionType" = 'open' THEN 'enter'
    ELSE 'micro_execute'
  END,
  "whyThisStep" = COALESCE("reason", '先从更容易开始的一步进入'),
  "isSmallerThanOriginal" = COALESCE("shouldShrinkTask", TRUE);

ALTER TABLE "FirstStepRecommendation"
ALTER COLUMN "canDoNow" SET NOT NULL,
ALTER COLUMN "frictionSource" SET NOT NULL,
ALTER COLUMN "decompositionType" SET NOT NULL,
ALTER COLUMN "whyThisStep" SET NOT NULL,
ALTER COLUMN "isSmallerThanOriginal" SET NOT NULL;

ALTER TABLE "FirstStepRecommendation"
DROP COLUMN "actionType",
DROP COLUMN "estimatedMinutes",
DROP COLUMN "reason",
DROP COLUMN "shouldShrinkTask";
