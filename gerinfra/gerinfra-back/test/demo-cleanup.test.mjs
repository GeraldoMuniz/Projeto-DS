import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { cleanDemoData } from '../prisma/clean-demo.mjs';

const databaseUrl = process.env.DEMO_TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'Defina DEMO_TEST_DATABASE_URL apontando para um PostgreSQL de teste dedicado e já migrado.',
  );
}
const backendDirectory = fileURLToPath(new URL('..', import.meta.url));
const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const legacyTicketIds = [4092, 4090, 4088, 4085, 4080];
const legacyPeriodicIds = [1, 2];
const legacyRequestIds = [1];
const legacyRequester = '00000000-0000-4000-8000-000000000002';

/** Each scenario owns only rows created after confirming the legacy IDs are free. */
async function scenario(run) {
  const owned = {
    tickets: new Set(),
    periodic: new Set(),
    requests: new Set(),
    tasks: new Set(),
    statuses: new Set(),
    priorities: new Set(),
  };
  async function remember(model, data, collection) {
    const item = await db[model].create({ data });
    owned[collection].add(item.id);
    return item;
  }
  const fixture = {
    async seed() {
      assert.equal(
        await db.ticket.count({ where: { id: { in: legacyTicketIds } } }),
        0,
        'IDs de chamados de exemplo já ocupados; teste não deve sobrescrevê-los.',
      );
      assert.equal(
        await db.periodicMaintenance.count({ where: { id: { in: legacyPeriodicIds } } }),
        0,
        'IDs de periódicas de exemplo já ocupados.',
      );
      assert.equal(
        await db.periodicRequest.count({ where: { id: { in: legacyRequestIds } } }),
        0,
        'ID da solicitação de exemplo já ocupado.',
      );
      for (const id of legacyTicketIds) owned.tickets.add(id);
      for (const id of legacyPeriodicIds) owned.periodic.add(id);
      for (const id of legacyRequestIds) owned.requests.add(id);
      const result = spawnSync(process.execPath, ['prisma/seed-demo.mjs'], {
        cwd: backendDirectory,
        env: { ...process.env, DATABASE_URL: databaseUrl },
        encoding: 'utf8',
      });
      assert.equal(result.status, 0, `Seed falhou: ${result.stderr || result.stdout}`);
    },
    ticket(fields = {}) {
      return remember(
        'ticket',
        {
          title: 'Chamado cadastrado manualmente',
          location: 'Sala de teste',
          type: 'ELETRICA',
          urgency: 'MODERADO',
          status: 'TRIAGEM',
          description: 'Registro que deve sobreviver à limpeza.',
          requesterId: legacyRequester,
          requesterName: 'Solicitante real',
          ...fields,
        },
        'tickets',
      );
    },
    periodic(fields = {}) {
      return remember(
        'periodicMaintenance',
        {
          title: 'Manutenção cadastrada manualmente',
          location: 'Sala de teste',
          date: new Date('2026-12-01'),
          team: 'ELETRICA',
          ...fields,
        },
        'periodic',
      );
    },
    remember,
  };
  try {
    await run(fixture);
  } finally {
    // Never truncate/reset the database: remove only fixture-owned primary keys.
    await db.ticket.deleteMany({ where: { id: { in: [...owned.tickets] } } });
    await db.periodicMaintenance.deleteMany({ where: { id: { in: [...owned.periodic] } } });
    await db.periodicRequest.deleteMany({ where: { id: { in: [...owned.requests] } } });
    await db.task.deleteMany({ where: { id: { in: [...owned.tasks] } } });
    await db.taskStatus.deleteMany({ where: { id: { in: [...owned.statuses] } } });
    await db.taskPriority.deleteMany({ where: { id: { in: [...owned.priorities] } } });
  }
}

test('Limpeza seletiva dos exemplos em PostgreSQL real', { timeout: 90000 }, async (t) => {
  try {
    await t.test('remove o seed legado e pode ser executada novamente sem alterações', async () => {
      await scenario(async (fixture) => {
        await fixture.seed();
        const result = await cleanDemoData(db);
        assert.deepEqual(result, {
          tickets: 5,
          periodic: 2,
          requests: 1,
          preserved: { tickets: 0, periodic: 0, requests: 0 },
        });
        assert.equal(await db.ticket.count({ where: { id: { in: legacyTicketIds } } }), 0);
        assert.equal(
          await db.ticketMessage.count({ where: { ticketId: { in: legacyTicketIds } } }),
          0,
        );
        assert.equal(
          await db.periodicMaintenance.count({ where: { id: { in: legacyPeriodicIds } } }),
          0,
        );
        assert.equal(await db.periodicRequest.count({ where: { id: 1 } }), 0);
        assert.deepEqual(await cleanDemoData(db), {
          tickets: 0,
          periodic: 0,
          requests: 0,
          preserved: { tickets: 0, periodic: 0, requests: 0 },
        });
      });
    });

    await t.test(
      'preserva registros manuais com mesmo solicitante/título e colisões de ID sem assinatura',
      async () => {
        await scenario(async (fixture) => {
          await fixture.seed();
          const manual = await fixture.ticket({ title: 'Vazamento teto laboratório' });
          await db.ticketMessage.create({
            data: {
              ticketId: manual.id,
              authorId: legacyRequester,
              sender: 'Usuário',
              text: 'Aberto manualmente.',
            },
          });
          await db.ticket.delete({ where: { id: 4092 } });
          const collision = await fixture.ticket({ id: 4092, title: 'Vazamento teto laboratório' });
          await db.periodicMaintenance.update({
            where: { id: 1 },
            data: { title: 'Revisão cadastrada pelo gestor' },
          });
          const result = await cleanDemoData(db);
          assert.equal(result.tickets, 4);
          assert.equal(result.periodic, 1);
          assert.ok(await db.ticket.findUnique({ where: { id: manual.id } }));
          assert.ok(await db.ticket.findUnique({ where: { id: collision.id } }));
          assert.equal(await db.ticketMessage.count({ where: { ticketId: manual.id } }), 1);
          assert.equal(
            (await db.periodicMaintenance.findUnique({ where: { id: 1 } })).title,
            'Revisão cadastrada pelo gestor',
          );
        });
      },
    );

    await t.test(
      'preserva periódicas editadas mesmo quando seus campos originais são mantidos',
      async () => {
        await scenario(async (fixture) => {
          await fixture.seed();
          await db.periodicMaintenance.update({ where: { id: 1 }, data: { version: 1 } });
          await db.periodicMaintenance.update({ where: { id: 2 }, data: { active: false } });
          const result = await cleanDemoData(db);
          assert.equal(result.periodic, 0);
          assert.equal(result.preserved.periodic, 2);
          assert.equal((await db.periodicMaintenance.findUnique({ where: { id: 1 } })).version, 1);
          assert.equal(
            (await db.periodicMaintenance.findUnique({ where: { id: 2 } })).active,
            false,
          );
        });
      },
    );

    await t.test(
      'não desvincula chamados reais de periódicas nem manutenções de solicitações aprovadas',
      async () => {
        await scenario(async (fixture) => {
          await fixture.seed();
          const generated = await fixture.ticket({
            periodicId: 1,
            scheduledDate: new Date('2026-10-15'),
          });
          await db.periodicRequest.update({ where: { id: 1 }, data: { status: 'APROVADO' } });
          const approved = await fixture.periodic({ requestId: 1 });
          const result = await cleanDemoData(db);
          assert.equal(result.periodic, 1);
          assert.equal(result.requests, 0);
          assert.equal(result.preserved.periodic, 1);
          assert.equal(result.preserved.requests, 1);
          assert.equal((await db.ticket.findUnique({ where: { id: generated.id } })).periodicId, 1);
          assert.equal(
            (await db.periodicMaintenance.findUnique({ where: { id: approved.id } })).requestId,
            1,
          );
          assert.equal(
            (await db.periodicRequest.findUnique({ where: { id: 1 } })).status,
            'APROVADO',
          );
        });
      },
    );

    await t.test('simula a limpeza sem alterar registros ou mensagens', async () => {
      await scenario(async (fixture) => {
        await fixture.seed();
        await fixture.ticket();
        const snapshot = async () => ({
          tickets: await db.ticket.findMany({ orderBy: { id: 'asc' } }),
          messages: await db.ticketMessage.findMany({ orderBy: { id: 'asc' } }),
          periodic: await db.periodicMaintenance.findMany({ orderBy: { id: 'asc' } }),
          requests: await db.periodicRequest.findMany({ orderBy: { id: 'asc' } }),
        });
        const before = await snapshot();
        const preview = await cleanDemoData(db, { dryRun: true });
        assert.equal(preview.tickets, 5);
        assert.equal(preview.periodic, 2);
        assert.equal(preview.requests, 1);
        assert.deepEqual(await snapshot(), before);
      });
    });

    await t.test(
      'limpa todos os chamados somente no modo explícito, com prévia e preservação dos demais cadastros',
      async () => {
        await scenario(async (fixture) => {
          assert.equal(
            await db.ticket.count(),
            0,
            'O cenário de limpeza global exige um banco de teste sem chamados anteriores.',
          );
          await fixture.seed();
          const marker = `todos-chamados-${Date.now()}`;
          const manualPeriodic = await fixture.periodic();
          const manualRequest = await fixture.remember(
            'periodicRequest',
            {
              title: 'Solicitação manual preservada',
              location: 'Sala de teste',
              date: new Date('2026-12-01'),
              team: 'ELETRICA',
              requesterId: marker,
            },
            'requests',
          );
          const status = await fixture.remember(
            'taskStatus',
            { code: `${marker}-status`, label: 'Status preservado' },
            'statuses',
          );
          const priority = await fixture.remember(
            'taskPriority',
            { code: `${marker}-priority`, label: 'Prioridade preservada' },
            'priorities',
          );
          const task = await fixture.remember(
            'task',
            { title: 'Tarefa preservada', statusId: status.id, priorityId: priority.id },
            'tasks',
          );
          const linked = await fixture.ticket({
            periodicId: 1,
            scheduledDate: new Date('2026-10-15'),
            requesterId: marker,
          });
          const manual = await fixture.ticket({
            periodicId: manualPeriodic.id,
            scheduledDate: new Date('2026-12-01'),
            requesterId: `${marker}-outro`,
          });
          await db.ticketMessage.create({
            data: {
              ticketId: manual.id,
              authorId: marker,
              sender: 'Pessoa',
              text: 'Mensagem manual.',
            },
          });
          const beforeMessages = await db.ticketMessage.count();
          const limitedPreview = await cleanDemoData(db, { dryRun: true });
          assert.equal(limitedPreview.tickets, 5);
          assert.equal(limitedPreview.periodic, 1);
          const preview = await cleanDemoData(db, { dryRun: true, allTickets: true });
          assert.equal(preview.tickets, 7);
          assert.equal(preview.periodic, 2);
          assert.equal(preview.requests, 1);
          assert.equal(await db.ticket.count(), 7);
          assert.equal(await db.ticketMessage.count(), beforeMessages);
          assert.equal((await db.ticket.findUnique({ where: { id: linked.id } })).periodicId, 1);
          assert.deepEqual(
            (await db.ticket.findMany({ select: { id: true }, orderBy: { id: 'asc' } })).map(
              ({ id }) => id,
            ),
            [...legacyTicketIds, linked.id, manual.id].sort((left, right) => left - right),
            'A limpeza global deve encontrar somente chamados criados por este cenário.',
          );
          const result = await cleanDemoData(db, { allTickets: true });
          assert.equal(result.tickets, preview.tickets);
          assert.equal(result.periodic, preview.periodic);
          assert.equal(result.requests, preview.requests);
          assert.equal(await db.ticket.count(), 0);
          assert.equal(await db.ticketMessage.count(), 0);
          assert.ok(await db.periodicMaintenance.findUnique({ where: { id: manualPeriodic.id } }));
          assert.ok(await db.periodicRequest.findUnique({ where: { id: manualRequest.id } }));
          assert.deepEqual(await db.task.findUnique({ where: { id: task.id } }), task);
          assert.deepEqual(await db.taskStatus.findUnique({ where: { id: status.id } }), status);
          assert.deepEqual(
            await db.taskPriority.findUnique({ where: { id: priority.id } }),
            priority,
          );
          const nextTicket = await fixture.ticket();
          const nextPeriodic = await fixture.periodic();
          const nextRequest = await fixture.remember(
            'periodicRequest',
            {
              title: 'Solicitação depois da limpeza',
              location: 'Sala de teste',
              date: new Date('2026-12-02'),
              team: 'ELETRICA',
              requesterId: marker,
            },
            'requests',
          );
          assert.ok(nextTicket.id > manual.id);
          assert.ok(nextPeriodic.id > manualPeriodic.id);
          assert.ok(nextRequest.id > manualRequest.id);
        });
      },
    );

    await t.test('mantém tarefas/lookups e não reinicia as sequências de IDs', async () => {
      await scenario(async (fixture) => {
        await fixture.seed();
        const marker = `demo-cleanup-${Date.now()}`;
        const status = await fixture.remember(
          'taskStatus',
          { code: `${marker}-status`, label: 'Status preservado' },
          'statuses',
        );
        const priority = await fixture.remember(
          'taskPriority',
          { code: `${marker}-priority`, label: 'Prioridade preservada' },
          'priorities',
        );
        const task = await fixture.remember(
          'task',
          { title: 'Tarefa preservada', statusId: status.id, priorityId: priority.id },
          'tasks',
        );
        const previousTicket = await fixture.ticket();
        const previousPeriodic = await fixture.periodic();
        const previousRequest = await fixture.remember(
          'periodicRequest',
          {
            title: 'Solicitação de teste',
            location: 'Sala de teste',
            date: new Date('2026-12-01'),
            team: 'ELETRICA',
            requesterId: marker,
          },
          'requests',
        );
        // Advance each sequence, then remove those fixture rows before cleanup.
        await db.ticket.delete({ where: { id: previousTicket.id } });
        await db.periodicMaintenance.delete({ where: { id: previousPeriodic.id } });
        await db.periodicRequest.delete({ where: { id: previousRequest.id } });
        await cleanDemoData(db);
        assert.deepEqual(await db.task.findUnique({ where: { id: task.id } }), task);
        assert.deepEqual(await db.taskStatus.findUnique({ where: { id: status.id } }), status);
        assert.deepEqual(
          await db.taskPriority.findUnique({ where: { id: priority.id } }),
          priority,
        );
        const nextTicket = await fixture.ticket();
        const nextPeriodic = await fixture.periodic();
        const nextRequest = await fixture.remember(
          'periodicRequest',
          {
            title: 'Outra solicitação',
            location: 'Sala de teste',
            date: new Date('2026-12-02'),
            team: 'ELETRICA',
            requesterId: marker,
          },
          'requests',
        );
        assert.ok(nextTicket.id > previousTicket.id);
        assert.ok(nextPeriodic.id > previousPeriodic.id);
        assert.ok(nextRequest.id > previousRequest.id);
      });
    });
  } finally {
    await db.$disconnect();
  }
});
