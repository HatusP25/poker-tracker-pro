-- CreateTable
CREATE TABLE "rebuy_events" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rebuy_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rebuy_events_sessionId_idx" ON "rebuy_events"("sessionId");

-- CreateIndex
CREATE INDEX "rebuy_events_playerId_idx" ON "rebuy_events"("playerId");

-- AddForeignKey
ALTER TABLE "rebuy_events" ADD CONSTRAINT "rebuy_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rebuy_events" ADD CONSTRAINT "rebuy_events_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
