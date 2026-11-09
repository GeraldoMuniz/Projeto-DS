import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PrismaClient } from '@prisma/client';
import {
  DEMO_MESSAGE,
  DEMO_PERIODIC,
  DEMO_REQUEST,
  DEMO_REQUESTER_ID,
  DEMO_TICKETS,
} from './demo-data.mjs';

// Não basta reconhecer o ID: a conta de demonstração também pode criar dados manuais.
const ticketWhere = {
  id: { in: DEMO_TICKETS.map(({ id }) => id) },
  requesterId: DEMO_REQUESTER_ID,
  messages: { some: DEMO_MESSAGE },
};
const periodicIdentity = {
  OR: DEMO_PERIODIC,
  version: 0,
  active: true,
  requestId: null,
};
const requestWhere = {
  ...DEMO_REQUEST,
  status: 'PENDENTE',
  maintenance: { is: null },
};

export async function cleanDemoData(db, { dryRun = false, allTickets = false } = {}) {
  return db.$transaction(
    async (tx) => {
      const selectedTickets = allTickets ? {} : ticketWhere;
      const tickets = allTickets
        ? []
        : await tx.ticket.findMany({
            where: ticketWhere,
            select: { id: true },
          });
      const ticketCount = allTickets ? await tx.ticket.count() : tickets.length;
      // Na prévia, simula a ausência dos chamados que seriam removidos.
      const periodicWhere = {
        ...periodicIdentity,
        ...(allTickets
          ? {}
          : {
              tickets: { none: { id: { notIn: tickets.map(({ id }) => id) } } },
            }),
      };
      const totals = {
        tickets: allTickets
          ? ticketCount
          : await tx.ticket.count({
              where: { id: { in: DEMO_TICKETS.map(({ id }) => id) } },
            }),
        periodic: await tx.periodicMaintenance.count({
          where: { id: { in: DEMO_PERIODIC.map(({ id }) => id) } },
        }),
        requests: await tx.periodicRequest.count({
          where: { id: DEMO_REQUEST.id },
        }),
      };
      let removed;
      if (dryRun) {
        removed = {
          tickets: ticketCount,
          periodic: await tx.periodicMaintenance.count({
            where: periodicWhere,
          }),
          requests: await tx.periodicRequest.count({ where: requestWhere }),
        };
      } else {
        // Os vínculos são verificados no DELETE para não desvincular dados preservados.
        // As mensagens dos chamados de exemplo são removidas pelo cascade existente.
        const ticketResult = await tx.ticket.deleteMany({
          where: selectedTickets,
        });
        const periodicResult = await tx.periodicMaintenance.deleteMany({
          where: { ...periodicIdentity, tickets: { none: {} } },
        });
        const requestResult = await tx.periodicRequest.deleteMany({
          where: requestWhere,
        });
        removed = {
          tickets: ticketResult.count,
          periodic: periodicResult.count,
          requests: requestResult.count,
        };
      }
      return {
        ...removed,
        preserved: Object.fromEntries(
          Object.entries(totals).map(([key, count]) => [key, count - removed[key]]),
        ),
      };
    },
    { isolationLevel: 'Serializable' },
  );
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => !['--dry-run', '--all-tickets'].includes(arg))) {
    throw new Error(
      'Uso: npm run chamados:limpar, chamados:conferir, demo:limpar ou demo:conferir',
    );
  }
  try {
    process.loadEnvFile('.env');
  } catch {
    /* Configuração fornecida pelo ambiente. */
  }
  const db = new PrismaClient();
  try {
    const dryRun = args.includes('--dry-run');
    const allTickets = args.includes('--all-tickets');
    const result = await cleanDemoData(db, { dryRun, allTickets });
    console.log(dryRun ? 'Prévia: nenhum dado foi alterado.' : 'Limpeza concluída.');
    if (allTickets)
      console.log(
        'Escopo: todos os chamados e suas mensagens, incluindo cadastros manuais, além dos exemplos antigos de periódicas e solicitações identificados.',
      );
    console.log(
      `${dryRun ? 'A remover' : 'Removidos'}: ${result.tickets} chamado(s), ${result.periodic} manutenção(ões) periódica(s), ${result.requests} solicitação(ões).`,
    );
    const preserved = Object.values(result.preserved).reduce((sum, count) => sum + count, 0);
    if (preserved) {
      console.log(
        `Preservados: ${preserved} registro(s) nos IDs dos exemplos por alterações, vínculos ou identificação insuficiente.`,
      );
    }
    console.log(
      allTickets
        ? 'Manutenções e solicitações manuais, usuários, tabelas de apoio e sequências de IDs foram mantidos.'
        : 'Cadastros manuais, usuários, tabelas de apoio e sequências de IDs foram mantidos.',
    );
  } finally {
    await db.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error('Não foi possível limpar os exemplos:', error.message);
    process.exitCode = 1;
  });
}
