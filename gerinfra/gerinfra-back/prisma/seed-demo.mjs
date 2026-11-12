import { PrismaClient } from '@prisma/client';
import {
  DEMO_MESSAGE,
  DEMO_PERIODIC,
  DEMO_REQUEST,
  DEMO_REQUESTER_ID,
  DEMO_TICKETS,
} from './demo-data.mjs';

try {
  process.loadEnvFile('.env');
} catch {
  /* environment provided externally */
}
const db = new PrismaClient();
try {
  await db.$transaction(async (tx) => {
    for (const sample of DEMO_TICKETS)
      await tx.ticket.upsert({
        where: { id: sample.id },
        update: {},
        create: {
          ...sample,
          requesterId: DEMO_REQUESTER_ID,
          requesterName: 'Solicitante de demonstração',
          messages: { create: DEMO_MESSAGE },
        },
      });
    for (const item of DEMO_PERIODIC)
      await tx.periodicMaintenance.upsert({
        where: { id: item.id },
        update: {},
        create: item,
      });
    await tx.periodicRequest.upsert({
      where: { id: DEMO_REQUEST.id },
      update: {},
      create: DEMO_REQUEST,
    });
    for (const table of ['tickets', 'periodic_maintenances', 'periodic_requests'])
      await tx.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1), true)`,
      );
  });
  console.log('Dados de demonstração disponíveis.');
} finally {
  await db.$disconnect();
}
