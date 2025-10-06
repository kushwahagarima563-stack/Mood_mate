-- CreateTable
CREATE TABLE "music_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "weather" TEXT NOT NULL,
    "trackTitle" TEXT NOT NULL,
    "trackUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "music_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "music_logs_userId_createdAt_idx" ON "music_logs"("userId", "createdAt");
