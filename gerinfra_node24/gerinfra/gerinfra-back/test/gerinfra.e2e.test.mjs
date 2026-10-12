import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { PrismaClient } from '@prisma/client';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';

// PostgreSQL must have the migrations applied. A JWKS fixture issues signed tokens;
// the real production AuthGuard/IdentitySource validates them (no auth bypass).
try {
  process.loadEnvFile('.env');
} catch {
  /* CI supplies environment directly. */
}
test('Gerinfra — integração HTTP com persistência, JWT/JWKS e RBAC', {
  timeout: 90000,
}, async (t) => {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'gerinfra-e2e', alg: 'RS256', use: 'sig' };
  const jwks = createServer((_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise((resolve) => jwks.listen(0, '127.0.0.1', resolve));
  const authority = `http://127.0.0.1:${jwks.address().port}/auth`;
  const issuer = `${authority}/realms/Local`;
  const marker = `e2e-${Date.now()}`;
  const apiPort = Number(process.env.E2E_PORT ?? 3101);
  const api = `http://127.0.0.1:${apiPort}/gerinfra/api/v1`;
  async function token(sub, roles, extras = {}) {
    return new SignJWT({ realm_access: { roles }, name: sub, ...extras })
      .setProtectedHeader({ alg: 'RS256', kid: 'gerinfra-e2e' })
      .setSubject(sub)
      .setIssuer(issuer)
      .setAudience('gerinfra-back')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);
  }
  const tokens = {
    user: await token(`${marker}-user`, ['sys_gerinfra-users']),
    other: await token(`${marker}-other`, ['sys_gerinfra-users']),
    manager: await token(`${marker}-manager`, ['sys_gerinfra-admin']),
    team: await token(`${marker}-electrician`, ['sys_gerinfra-team', 'sys_gerinfra-team-eletrica']),
    wrongTeam: await token(`${marker}-plumber`, [
      'sys_gerinfra-team',
      'sys_gerinfra-team-hidraulica',
    ]),
    noRole: await token(`${marker}-guest`, ['offline_access']),
  };
  let logs = '';
  const backend = spawn(process.execPath, ['dist/main.js'], {
    env: {
      ...process.env,
      PORT: String(apiPort),
      API_PREFIX: 'gerinfra/api',
      KEYCLOAK_AUTH_SERVER_URL: authority,
      KEYCLOAK_REALM: 'Local',
      KEYCLOAK_CLIENT_ID: 'gerinfra-back',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  backend.stdout.on('data', (chunk) => {
    logs += chunk;
  });
  backend.stderr.on('data', (chunk) => {
    logs += chunk;
  });
  const db = new PrismaClient();
  async function call(path, profile, method = 'GET', body) {
    const res = await fetch(api + path, {
      method,
      headers: {
        ...(profile ? { Authorization: `Bearer ${tokens[profile]}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: res.status, body: await res.json() };
  }
  let ticket, periodic, req;
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try {
        const response = await fetch(`http://127.0.0.1:${apiPort}/gerinfra/api/health`);
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {
        /* booting */
      }
      if (backend.exitCode !== null) break;
      await delay(100);
    }
    assert.ok(ready, `API não iniciou: ${logs}`);
    await t.test('nega acesso sem token, role desconhecida e token adulterado', async () => {
      assert.equal((await call('/tickets')).status, 401);
      assert.equal((await call('/tickets', 'noRole')).status, 403);
      const res = await fetch(`${api}/tickets`, {
        headers: { Authorization: `Bearer ${tokens.user.slice(0, -5)}wrong` },
      });
      assert.equal(res.status, 401);
    });
    await t.test('cria e valida chamado, separando os solicitantes', async () => {
      assert.equal(
        (
          await call('/tickets', 'user', 'POST', {
            location: '',
            type: 'ELETRICA',
            urgency: 'LEVE',
            description: '',
          })
        ).status,
        422,
      );
      const res = await call('/tickets', 'user', 'POST', {
        location: marker,
        type: 'ELETRICA',
        urgency: 'LEVE',
        description: 'Lâmpada apagada.',
      });
      assert.equal(res.status, 201);
      ticket = res.body.data;
      assert.equal(ticket.status, 'TRIAGEM');
      assert.equal((await call(`/tickets/${ticket.id}`, 'other')).status, 404);
      assert.equal((await call('/tickets', 'other')).body.data.items.length, 0);
      assert.equal(
        (
          await call(`/tickets/${ticket.id}/actions`, 'user', 'POST', {
            action: 'ALLOCATE',
            team: 'ELETRICA',
            version: 0,
          })
        ).status,
        403,
      );
    });
    await t.test('aloca equipe e impede acesso de outra especialidade', async () => {
      const result = await call(`/tickets/${ticket.id}/actions`, 'manager', 'POST', {
        action: 'ALLOCATE',
        team: 'ELETRICA',
        version: ticket.version,
      });
      assert.equal(result.status, 201);
      ticket = result.body.data;
      assert.equal((await call(`/tickets/${ticket.id}`, 'team')).status, 200);
      assert.equal((await call(`/tickets/${ticket.id}`, 'wrongTeam')).status, 404);
    });
    await t.test('não expõe mensagens internas da equipe ao solicitante', async () => {
      const result = await call(`/tickets/${ticket.id}/actions`, 'manager', 'POST', {
        action: 'MESSAGE',
        text: 'Instrução interna privada.',
        audience: 'TEAM',
        version: ticket.version,
      });
      ticket = result.body.data;
      const detail = (await call(`/tickets/${ticket.id}`, 'user')).body.data;
      assert.ok(!detail.messages.some((m) => m.text === 'Instrução interna privada.'));
    });
    await t.test('persiste progresso e rejeita alterações com versão antiga', async () => {
      const old = ticket.version;
      let result = await call(`/tickets/${ticket.id}/actions`, 'team', 'POST', {
        action: 'PROGRESS',
        status: 'EM_ANALISE',
        version: old,
      });
      assert.equal(result.status, 201);
      ticket = result.body.data;
      assert.equal(ticket.status, 'EM_ANALISE');
      assert.equal(
        (
          await call(`/tickets/${ticket.id}/actions`, 'team', 'POST', {
            action: 'PRIORITY',
            urgency: 'URGENTE',
            version: old,
          })
        ).status,
        409,
      );
      result = await call(`/tickets/${ticket.id}/actions`, 'team', 'POST', {
        action: 'PROGRESS',
        status: 'EM_ANDAMENTO',
        version: ticket.version,
      });
      ticket = result.body.data;
      assert.equal(ticket.status, 'EM_ANDAMENTO');
    });
    await t.test('retorna ao gestor, reencaminha e conclui com feedback obrigatório', async () => {
      let result = await call(`/tickets/${ticket.id}/actions`, 'team', 'POST', {
        action: 'RETURN',
        text: 'Necessário comprar material.',
        version: ticket.version,
      });
      ticket = result.body.data;
      assert.equal(ticket.status, 'RETORNADO');
      assert.equal(
        (
          await call(`/tickets/${ticket.id}/actions`, 'team', 'POST', {
            action: 'PROGRESS',
            status: 'EM_ANDAMENTO',
            version: ticket.version,
          })
        ).status,
        409,
      );
      result = await call(`/tickets/${ticket.id}/actions`, 'manager', 'POST', {
        action: 'ALLOCATE',
        team: 'ELETRICA',
        version: ticket.version,
      });
      ticket = result.body.data;
      assert.equal(
        (
          await call(`/tickets/${ticket.id}/actions`, 'team', 'POST', {
            action: 'COMPLETE',
            version: ticket.version,
          })
        ).status,
        400,
      );
      result = await call(`/tickets/${ticket.id}/actions`, 'team', 'POST', {
        action: 'COMPLETE',
        text: 'Lâmpada substituída.',
        version: ticket.version,
      });
      ticket = result.body.data;
      assert.equal(ticket.status, 'CONCLUIDO');
      assert.equal(ticket.feedback, 'Lâmpada substituída.');
      assert.equal((await call(`/tickets/${ticket.id}`, 'user')).body.data.status, 'CONCLUIDO');
    });
    await t.test('aprova solicitação uma única vez e aplica escopo às periódicas', async () => {
      let result = await call('/periodic/requests', 'team', 'POST', {
        title: 'Revisão de lâmpadas',
        location: marker,
        date: '2026-10-20',
      });
      assert.equal(result.status, 201);
      req = result.body.data;
      assert.equal((await call('/periodic', 'user')).status, 403);
      result = await call(`/periodic/requests/${req.id}/decision`, 'manager', 'POST', {
        decision: 'APROVADO',
      });
      assert.equal(result.status, 201);
      assert.equal(
        (
          await call(`/periodic/requests/${req.id}/decision`, 'manager', 'POST', {
            decision: 'APROVADO',
          })
        ).status,
        409,
      );
      const items = (await call('/periodic', 'team')).body.data.items;
      periodic = items.find((item) => item.location === marker);
      assert.ok(periodic);
      assert.ok(
        !(await call('/periodic', 'wrongTeam')).body.data.items.some(
          (item) => item.id === periodic.id,
        ),
      );
    });
    await t.test('gera ocorrência uma vez e preserva chamado após excluir periódica', async () => {
      let result = await call(`/periodic/${periodic.id}/generate`, 'manager', 'POST', {
        version: periodic.version,
      });
      assert.equal(result.status, 201);
      const generated = result.body.data;
      periodic = (await call('/periodic', 'manager')).body.data.items.find(
        (item) => item.id === periodic.id,
      );
      result = await call(`/periodic/${periodic.id}/generate`, 'manager', 'POST', {
        version: periodic.version,
      });
      assert.equal(result.status, 409);
      result = await call(`/periodic/${periodic.id}`, 'manager', 'DELETE', {
        version: periodic.version,
      });
      assert.equal(result.status, 200);
      assert.equal((await call(`/tickets/${generated.id}`, 'team')).status, 200);
    });
  } finally {
    const exited = new Promise((resolve) => backend.once('exit', resolve));
    backend.kill('SIGTERM');
    await exited;
    jwks.closeAllConnections();
    await new Promise((resolve) => jwks.close(resolve));
    await db.ticket.deleteMany({ where: { location: marker } });
    await db.periodicMaintenance.deleteMany({ where: { location: marker } });
    await db.periodicRequest.deleteMany({ where: { location: marker } });
    await db.$disconnect();
  }
});
