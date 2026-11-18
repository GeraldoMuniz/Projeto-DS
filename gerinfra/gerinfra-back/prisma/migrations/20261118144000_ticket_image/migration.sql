-- Armazenamento opcional das imagens fora das listagens de chamados.
CREATE TABLE "ticket_images" (
  "ticketId" INTEGER NOT NULL,
  "mimeType" VARCHAR(30) NOT NULL,
  "size" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  CONSTRAINT "ticket_images_pkey" PRIMARY KEY ("ticketId")
);

ALTER TABLE "ticket_images" ADD CONSTRAINT "ticket_images_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
