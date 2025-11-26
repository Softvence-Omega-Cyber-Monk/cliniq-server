-- CreateTable
CREATE TABLE "support_messages" (
    "id" TEXT NOT NULL,
    "supportId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "attachments" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "support_messages_supportId_idx" ON "support_messages"("supportId");

-- CreateIndex
CREATE INDEX "support_messages_senderType_idx" ON "support_messages"("senderType");

-- CreateIndex
CREATE INDEX "support_messages_createdAt_idx" ON "support_messages"("createdAt");

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_supportId_fkey" FOREIGN KEY ("supportId") REFERENCES "supports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
