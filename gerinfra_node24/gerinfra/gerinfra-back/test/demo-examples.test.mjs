import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { cleanDemoData } from '../prisma/clean-demo.mjs';
import {
  EXAMPLE_AUTHOR_ID,
  EXAMPLE_REQUESTER_ID,
  EXAMPLE_TICKETS,
  exampleMessage,
} from '../prisma/example-data.mjs';
import { seedExamples } from '../prisma/seed-examples.mjs';

const databaseUrl = process.env.DEMO_TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'Defina DEMO_TEST_DATABASE_URL apontando para um PostgreSQL de teste dedicado e já migrado.',
  );
}
const backendDirectory = fileURLToPath(new URL('..', import.meta.url));
const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const fixedNow = new Date('2026-11-09T15:00:00Z');
const exampleWhere = {
  requesterId: EXAMPLE_REQUESTER_ID,
  messages: { some: { OR: EXAMPLE_TICKETS.map(({ key }) => exampleMessage(key)) } },
};

async function scenario(run) {
  const owned = { tickets: new Set(), periodic: new Set(), requests: new Set() };
  async function rememberExamples() {
    const rows = await db.ticket.findMany({ where: exampleWhere });
    for (const row of rows) owned.tickets.add(row.id);
    return rows;
  }
  const fixture = {
    async seed(options = {}) {
      try {
        return await seedExamples(db, { now: fixedNow, ...options });
      } finally {
        await rememberExamples();
      }
    },
    async examples() {
      return db.ticket.findMany({
        where: exampleWhere,
        include: { messages: true },
        orderBy: { id: 'asc' },
      });
    },
    async ticket(fields = {}) {
      const item = await db.ticket.create({
        data: {
          title: 'Chamado manual preservado',
          location: 'Sala de teste',
          type: 'ELETRICA',
          urgency: 'MODERADO',
          status: 'TRIAGEM',
          description: 'Cadastro manual para testar o seed.',
          requesterId: EXAMPLE_REQUESTER_ID,
          requesterName: 'Solicitante de teste',
          ...fields,
        },
      });
      owned.tickets.add(item.id);
      return item;
    },
    async seedLegacy() {
      const ids = [4092, 4090, 4088, 4085, 4080];
      assert.equal(await db.ticket.count({ where: { id: { in: ids } } }), 0);
      assert.equal(await db.periodicMaintenance.count({ where: { id: { in: [1, 2] } } }), 0);
      assert.equal(await db.periodicRequest.count({ where: { id: 1 } }), 0);
      for (const id of ids) owned.tickets.add(id);
      owned.periodic.add(1);
      owned.periodic.add(2);
      owned.requests.add(1);
      const result = spawnSync(process.execPath, ['prisma/seed-demo.mjs'], {
        cwd: backendDirectory,
        env: { ...process.env, DATABASE_URL: databaseUrl },
        encoding: 'utf8',
      });
      assert.equal(result.status, 0, `Seed legado falhou: ${result.stderr || result.stdout}`);
    },
  };
  try {
    await run(fixture);
  } finally {
    await db.ticket.deleteMany({ where: { id: { in: [...owned.tickets] } } });
    await db.periodicMaintenance.deleteMany({ where: { id: { in: [...owned.periodic] } } });
    await db.periodicRequest.deleteMany({ where: { id: { in: [...owned.requests] } } });
  }
}

test('Novos exemplos de manutenção em PostgreSQL real', { timeout: 120000 }, async (t) => {
  try {
    assert.equal(await db.ticket.count(), 0, 'Use um banco de teste inicialmente sem chamados.');
    assert.equal(await db.periodicMaintenance.count(), 0, 'Use um banco de teste sem periódicas.');
    assert.equal(await db.periodicRequest.count(), 0, 'Use um banco de teste sem solicitações.');

    await t.test(
      'cria nove chamados com todas as situações, resultados explícitos e datas coerentes',
      async () => {
        await scenario(async (fixture) => {
          assert.deepEqual(await fixture.seed(), { created: 9, existing: 0 });
          const rows = await fixture.examples();
          assert.equal(rows.length, 9);
          assert.equal(new Set(rows.map(({ id }) => id)).size, 9);
          const statuses = Object.fromEntries(
            [
              'TRIAGEM',
              'ACOMPANHAMENTO',
              'EM_ANALISE',
              'EM_ANDAMENTO',
              'RETORNADO',
              'CONCLUIDO',
            ].map((status) => [status, rows.filter((row) => row.status === status).length]),
          );
          assert.deepEqual(statuses, {
            TRIAGEM: 1,
            ACOMPANHAMENTO: 1,
            EM_ANALISE: 1,
            EM_ANDAMENTO: 1,
            RETORNADO: 1,
            CONCLUIDO: 4,
          });
          assert.equal(rows.filter((row) => row.outcome === 'SUCESSO').length, 2);
          assert.equal(rows.filter((row) => row.outcome === 'SEM_SUCESSO').length, 2);
          assert.deepEqual([...new Set(rows.map(({ team }) => team).filter(Boolean))].sort(), [
            'ELETRICA',
            'HIDRAULICA',
            'MOBILIARIO',
            'REFRIGERACAO',
            'TI_REDE',
          ]);
          for (const row of rows) {
            assert.ok(row.createdAt <= fixedNow);
            assert.equal(row.requesterId, EXAMPLE_REQUESTER_ID);
            if (row.status === 'CONCLUIDO') {
              assert.ok(row.closedAt >= row.createdAt && row.closedAt <= fixedNow);
              assert.ok(row.feedback?.trim());
            } else {
              assert.equal(row.closedAt, null);
              assert.equal(row.outcome, null);
            }
            if (row.status === 'RETORNADO') assert.ok(row.returnReason?.trim());
            if (row.status === 'TRIAGEM') assert.equal(row.team, null);
            const markers = row.messages.filter(({ authorId }) =>
              authorId.startsWith(`${EXAMPLE_AUTHOR_ID}:`),
            );
            assert.equal(markers.length, 1);
            assert.equal(markers[0].createdAt.toISOString(), row.createdAt.toISOString());
            assert.ok(
              EXAMPLE_TICKETS.some(({ key }) => {
                const marker = exampleMessage(key);
                return marker.authorId === markers[0].authorId && marker.text === markers[0].text;
              }),
            );
          }
        });
      },
    );

    await t.test(
      'não duplica nem redefine cadastros editados ao executar novamente em outro dia',
      async () => {
        await scenario(async (fixture) => {
          await fixture.seed();
          const first = (await fixture.examples())[0];
          const edited = await db.ticket.update({
            where: { id: first.id },
            data: { title: 'Título ajustado pelo gestor', version: 4, urgency: 'URGENTE' },
          });
          const before = await db.ticket.findMany({ orderBy: { id: 'asc' } });
          const beforeMessages = await db.ticketMessage.findMany({ orderBy: { id: 'asc' } });
          assert.deepEqual(await fixture.seed({ now: new Date('2026-11-15T15:00:00Z') }), {
            created: 0,
            existing: 9,
          });
          assert.deepEqual(await db.ticket.findUnique({ where: { id: edited.id } }), edited);
          assert.deepEqual(await db.ticket.findMany({ orderBy: { id: 'asc' } }), before);
          assert.deepEqual(
            await db.ticketMessage.findMany({ orderBy: { id: 'asc' } }),
            beforeMessages,
          );
        });
      },
    );

    await t.test(
      'preserva chamados manuais mesmo com título, solicitante ou texto semelhantes',
      async () => {
        await scenario(async (fixture) => {
          await fixture.seed();
          const first = (await fixture.examples())[0];
          const manual = await fixture.ticket({
            title: first.title,
            messages: {
              create: { ...exampleMessage(EXAMPLE_TICKETS[0].key), authorId: EXAMPLE_REQUESTER_ID },
            },
          });
          assert.deepEqual(await fixture.seed(), { created: 0, existing: 9 });
          const preview = await cleanDemoData(db, { dryRun: true });
          assert.equal(preview.tickets, 9);
          const removed = await cleanDemoData(db);
          assert.equal(removed.tickets, 9);
          assert.ok(await db.ticket.findUnique({ where: { id: manual.id } }));
          assert.equal(await db.ticketMessage.count({ where: { ticketId: manual.id } }), 1);
        });
      },
    );

    await t.test(
      'limpa exemplos novos e legados com prévia fiel, contagens não negativas e repetição segura',
      async () => {
        await scenario(async (fixture) => {
          await fixture.seedLegacy();
          await fixture.seed();
          const manual = await fixture.ticket();
          const snapshot = async () => ({
            tickets: await db.ticket.findMany({ orderBy: { id: 'asc' } }),
            messages: await db.ticketMessage.findMany({ orderBy: { id: 'asc' } }),
            periodic: await db.periodicMaintenance.findMany({ orderBy: { id: 'asc' } }),
            requests: await db.periodicRequest.findMany({ orderBy: { id: 'asc' } }),
          });
          const before = await snapshot();
          const preview = await cleanDemoData(db, { dryRun: true });
          assert.deepEqual(await snapshot(), before);
          assert.equal(preview.tickets, 14);
          assert.equal(preview.periodic, 2);
          assert.equal(preview.requests, 1);
          for (const count of Object.values(preview.preserved)) assert.ok(count >= 0);
          assert.deepEqual(await cleanDemoData(db), preview);
          assert.equal(await db.ticket.count(), 1);
          assert.ok(await db.ticket.findUnique({ where: { id: manual.id } }));
          assert.equal(
            await db.ticketMessage.count({
              where: { authorId: { startsWith: `${EXAMPLE_AUTHOR_ID}:` } },
            }),
            0,
          );
          const again = await cleanDemoData(db);
          assert.equal(again.tickets, 0);
          assert.equal(again.periodic, 0);
          assert.equal(again.requests, 0);
          for (const count of Object.values(again.preserved)) assert.ok(count >= 0);
        });
      },
    );

    await t.test('usa a sequência do banco e não reinicia IDs após a limpeza', async () => {
      await scenario(async (fixture) => {
        const manual = await fixture.ticket();
        await fixture.seed();
        const examples = await fixture.examples();
        assert.ok(examples.every(({ id }) => id > manual.id));
        const highest = Math.max(...examples.map(({ id }) => id));
        await cleanDemoData(db);
        const next = await fixture.ticket();
        assert.ok(next.id > highest);
        assert.ok(await db.ticket.findUnique({ where: { id: manual.id } }));
      });
    });

    await t.test('duas importações concorrentes não duplicam as chaves dos exemplos', async () => {
      await scenario(async (fixture) => {
        const results = await Promise.all([fixture.seed(), fixture.seed()]);
        assert.equal(
          results.reduce((sum, result) => sum + result.created, 0),
          9,
        );
        assert.equal(
          results.reduce((sum, result) => sum + result.existing, 0),
          9,
        );
        const rows = await fixture.examples();
        assert.equal(rows.length, 9);
        for (const { key } of EXAMPLE_TICKETS) {
          assert.equal(await db.ticketMessage.count({ where: exampleMessage(key) }), 1);
        }
      });
    });
  } finally {
    await db.$disconnect();
  }
});
