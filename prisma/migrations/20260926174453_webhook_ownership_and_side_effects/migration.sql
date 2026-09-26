-- AlterTable
ALTER TABLE "WebhookEvent" ADD COLUMN     "processingToken" TEXT;

-- CreateTable
CREATE TABLE "WebhookSideEffect" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "effectType" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookSideEffect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebhookSideEffect_eventId_idx" ON "WebhookSideEffect"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookSideEffect_eventId_effectType_key" ON "WebhookSideEffect"("eventId", "effectType");
