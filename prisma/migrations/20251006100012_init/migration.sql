/*
  Warnings:

  - You are about to drop the column `createdAt` on the `music_logs` table. All the data in the column will be lost.
  - You are about to drop the column `mood` on the `music_logs` table. All the data in the column will be lost.
  - You are about to drop the column `trackTitle` on the `music_logs` table. All the data in the column will be lost.
  - You are about to drop the column `trackUrl` on the `music_logs` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `music_logs` table. All the data in the column will be lost.
  - You are about to drop the `selfies` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `emotion` to the `music_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `song_id` to the `music_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `song_title` to the `music_logs` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."music_logs_userId_createdAt_idx";

-- AlterTable
ALTER TABLE "music_logs" DROP COLUMN "createdAt",
DROP COLUMN "mood",
DROP COLUMN "trackTitle",
DROP COLUMN "trackUrl",
DROP COLUMN "userId",
ADD COLUMN     "emotion" TEXT NOT NULL,
ADD COLUMN     "played_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "song_id" TEXT NOT NULL,
ADD COLUMN     "song_title" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."selfies";

-- CreateTable
CREATE TABLE "face_emotion_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "imageUrl" TEXT,
    "apiResponse" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "face_emotion_logs_pkey" PRIMARY KEY ("id")
);
