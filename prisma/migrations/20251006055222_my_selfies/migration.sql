-- CreateTable
CREATE TABLE "selfies" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "emotion" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "storage_bucket" TEXT,
    "storage_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "selfies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "selfies_user_id_date_idx" ON "selfies"("user_id", "date");
