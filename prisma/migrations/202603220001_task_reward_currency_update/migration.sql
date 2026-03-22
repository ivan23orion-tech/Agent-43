CREATE TYPE "TaskRewardCurrency" AS ENUM ('USDT', 'USDC');

ALTER TABLE "Task"
  ADD COLUMN "rewardAmount" INTEGER,
  ADD COLUMN "rewardCurrency" "TaskRewardCurrency";

CREATE TABLE IF NOT EXISTS "TaskRewardManualReview" (
  "taskId" INTEGER PRIMARY KEY,
  "reward" DOUBLE PRECISION,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskRewardManualReview_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "Task"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

UPDATE "Task"
SET
  "rewardAmount" = "reward"::INTEGER,
  "rewardCurrency" = 'USDT'::"TaskRewardCurrency"
WHERE
  "reward" IS NOT NULL
  AND "reward" > 0
  AND "reward" = FLOOR("reward");

INSERT INTO "TaskRewardManualReview" ("taskId", "reward", "reason")
SELECT
  "id",
  "reward",
  CASE
    WHEN "reward" <= 0 THEN 'Reward precisa ser positivo para tarefas pagas.'
    ELSE 'Reward antigo não é inteiro; revisar e definir currency manualmente.'
  END
FROM "Task"
WHERE
  "reward" IS NOT NULL
  AND ("reward" <= 0 OR "reward" <> FLOOR("reward"))
ON CONFLICT ("taskId") DO NOTHING;

ALTER TABLE "Task" DROP COLUMN "reward";
