-- Existing closures remain unclassified; their result and date cannot be inferred.
CREATE TYPE "TicketOutcome" AS ENUM ('SUCESSO', 'SEM_SUCESSO');

ALTER TABLE "tickets"
ADD COLUMN "outcome" "TicketOutcome",
ADD COLUMN "closedAt" TIMESTAMP(3);
