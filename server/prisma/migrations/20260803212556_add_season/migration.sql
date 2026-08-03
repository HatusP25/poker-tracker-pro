-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "seasons_groupId_idx" ON "seasons"("groupId");

-- CreateIndex
CREATE INDEX "seasons_groupId_startDate_idx" ON "seasons"("groupId", "startDate");

-- AddForeignKey
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
