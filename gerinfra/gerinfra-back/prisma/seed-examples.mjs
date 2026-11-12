import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { EXAMPLE_REQUESTER_ID, EXAMPLE_TICKETS, exampleMessage } from './example-data.mjs';

const DAY_MS = 24 * 60 * 60 * 1000;

export async function seedExamples(db, { now = new Date() } = {}) {
  const timestamp = new Date(now).getTime();
  if (!Number.isFinite(timestamp)) throw new Error('Data de referência inválida.');
  const relativeDate = (daysAgo) => new Date(timestamp - daysAgo * DAY_MS);

  // O isolamento impede duplicatas entre importações concorrentes dos mesmos marcadores.
  // Conflitos de serialização são repetidos com uma nova transação e um novo snapshot.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(
        async (tx) => {
          let created = 0;
          let existing = 0;
          for (const sample of EXAMPLE_TICKETS) {
            const { key, createdDaysAgo, closedDaysAgo, ...fields } = sample;
            const marker = exampleMessage(key);
            const found = await tx.ticket.findFirst({
              where: { requesterId: EXAMPLE_REQUESTER_ID, messages: { some: marker } },
              select: { id: true },
            });
            if (found) {
              existing += 1;
              continue;
            }

            const createdAt = relativeDate(createdDaysAgo);
            const closed = fields.status === 'CONCLUIDO';
            const closedAt = closed ? relativeDate(closedDaysAgo) : null;
            if (
              createdAt.getTime() > timestamp ||
              (closed &&
                (!Number.isFinite(closedAt.getTime()) ||
                  closedAt < createdAt ||
                  closedAt.getTime() > timestamp))
            ) {
              throw new Error(`Datas inconsistentes no exemplo: ${key}.`);
            }
            await tx.ticket.create({
              data: {
                feedback: null,
                returnReason: null,
                outcome: null,
                ...fields,
                createdAt,
                closedAt,
                requesterId: EXAMPLE_REQUESTER_ID,
                requesterName: 'Solicitante de exemplos de manutenção',
                messages: { create: { ...marker, createdAt } },
              },
            });
            created += 1;
          }
          return { created, existing };
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (error) {
      if (error.code !== 'P2034' || attempt === 2) throw error;
    }
  }
}

async function main() {
  if (process.argv.length > 2) throw new Error('Uso: npm run seed:novos');
  try {
    process.loadEnvFile('.env');
  } catch {
    /* Configuração fornecida pelo ambiente. */
  }
  const db = new PrismaClient();
  try {
    const result = await seedExamples(db);
    console.log(
      `Novos exemplos de manutenção: ${result.created} criado(s), ${result.existing} já existente(s).`,
    );
    console.log(
      'Os chamados existentes foram preservados. Recarregue a página para atualizar os gráficos.',
    );
  } finally {
    await db.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error('Não foi possível carregar os novos exemplos:', error.message);
    process.exitCode = 1;
  });
}
