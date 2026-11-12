-- CreateEnum
CREATE TYPE "MaintenanceTeam" AS ENUM ('ELETRICA', 'HIDRAULICA', 'REFRIGERACAO', 'TI_REDE', 'MOBILIARIO');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('TRIAGEM', 'ACOMPANHAMENTO', 'EM_ANALISE', 'EM_ANDAMENTO', 'CONCLUIDO', 'RETORNADO');

-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('URGENTE', 'MODERADO', 'LEVE');

-- CreateEnum
CREATE TYPE "MessageAudience" AS ENUM ('ALL', 'REQUESTER', 'TEAM');

-- CreateEnum
CREATE TYPE "PeriodicRequestStatus" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- CreateTable
CREATE TABLE "tickets" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "location" VARCHAR(200) NOT NULL,
    "type" "MaintenanceTeam",
    "urgency" "Urgency" NOT NULL DEFAULT 'MODERADO',
    "status" "TicketStatus" NOT NULL DEFAULT 'TRIAGEM',
    "description" VARCHAR(5000) NOT NULL,
    "team" "MaintenanceTeam",
    "requesterId" TEXT NOT NULL,
    "requesterName" VARCHAR(200) NOT NULL,
    "feedback" VARCHAR(5000),
    "returnReason" VARCHAR(5000),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "periodicId" INTEGER,
    "scheduledDate" DATE,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_messages" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" TEXT NOT NULL,
    "sender" VARCHAR(200) NOT NULL,
    "text" VARCHAR(5000) NOT NULL,
    "audience" "MessageAudience" NOT NULL DEFAULT 'ALL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periodic_maintenances" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "location" VARCHAR(200) NOT NULL,
    "date" DATE NOT NULL,
    "team" "MaintenanceTeam",
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requestId" INTEGER,

    CONSTRAINT "periodic_maintenances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periodic_requests" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "location" VARCHAR(200) NOT NULL,
    "date" DATE NOT NULL,
    "team" "MaintenanceTeam" NOT NULL,
    "requesterId" TEXT NOT NULL,
    "status" "PeriodicRequestStatus" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "periodic_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tickets_requesterId_createdAt_idx" ON "tickets"("requesterId", "createdAt");

-- CreateIndex
CREATE INDEX "tickets_team_status_idx" ON "tickets"("team", "status");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_periodicId_scheduledDate_key" ON "tickets"("periodicId", "scheduledDate");

-- CreateIndex
CREATE INDEX "ticket_messages_ticketId_createdAt_idx" ON "ticket_messages"("ticketId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "periodic_maintenances_requestId_key" ON "periodic_maintenances"("requestId");

-- CreateIndex
CREATE INDEX "periodic_maintenances_team_active_idx" ON "periodic_maintenances"("team", "active");

-- CreateIndex
CREATE INDEX "periodic_requests_team_status_idx" ON "periodic_requests"("team", "status");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_periodicId_fkey" FOREIGN KEY ("periodicId") REFERENCES "periodic_maintenances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodic_maintenances" ADD CONSTRAINT "periodic_maintenances_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "periodic_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

