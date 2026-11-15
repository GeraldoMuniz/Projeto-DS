import { ConflictException, ForbiddenException } from '@nestjs/common';
import type { Ticket } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { AccessRole } from '@/common/auth/access-role.enum';
import type { CurrentUser } from '@/common/auth/current-user.interface';
import { TicketActionDto } from './dto/ticket.dto';
import { ticketChange, ticketScope } from './ticket.policy';

const user: CurrentUser = { userId: 'requester', role: AccessRole.USER };
const team: CurrentUser = { userId: 'electrician', role: AccessRole.TEAM, team: 'ELETRICA' };
const admin: CurrentUser = { userId: 'manager', role: AccessRole.ADMIN };
const ticket = {
  id: 1,
  version: 2,
  requesterId: 'requester',
  team: 'ELETRICA',
  status: 'ACOMPANHAMENTO',
} as Ticket;
describe('Isolamento de acesso', () => {
  it('restringe solicitante ao próprio identificador e equipe à sua especialidade', () => {
    expect(ticketScope(user)).toEqual({ requesterId: 'requester' });
    expect(ticketScope(team)).toEqual({ team: 'ELETRICA' });
    expect(ticketScope(admin)).toEqual({});
  });
  it('nega equipe sem especialidade e identidade sem identificador', () => {
    expect(() => ticketScope({ role: AccessRole.TEAM, userId: 'x' })).toThrow(ForbiddenException);
    expect(() => ticketScope({ role: AccessRole.ADMIN })).toThrow(ForbiddenException);
  });
  it('impede ações de uma equipe diferente e do solicitante', () => {
    expect(() =>
      ticketChange(
        ticket,
        { action: 'COMPLETE', version: 2, text: 'Feito' },
        { ...team, team: 'HIDRAULICA' },
      ),
    ).toThrow(ForbiddenException);
    expect(() =>
      ticketChange(ticket, { action: 'ALLOCATE', version: 2, team: 'ELETRICA' }, user),
    ).toThrow(ForbiddenException);
  });
});
describe('Ciclo de vida do chamado', () => {
  it('persiste análise e andamento como estados diferentes', () => {
    expect(
      ticketChange(ticket, { action: 'PROGRESS', version: 2, status: 'EM_ANALISE' }, team).data
        .status,
    ).toBe('EM_ANALISE');
    expect(
      ticketChange(ticket, { action: 'PROGRESS', version: 2, status: 'EM_ANDAMENTO' }, team).data
        .status,
    ).toBe('EM_ANDAMENTO');
  });
  it('exige feedback para concluir e justificativa para retornar', () => {
    expect(() => ticketChange(ticket, { action: 'COMPLETE', version: 2 }, team)).toThrow(
      'feedback',
    );
    expect(() => ticketChange(ticket, { action: 'RETURN', version: 2 }, team)).toThrow('motivo');
    expect(
      ticketChange(
        ticket,
        { action: 'COMPLETE', version: 2, text: 'Lâmpada substituída.', outcome: 'SUCESSO' },
        team,
      ).data.feedback,
    ).toBe('Lâmpada substituída.');
  });
  it('mantém retorno sob decisão do gestor e permite realocação', () => {
    const returned = { ...ticket, status: 'RETORNADO' } as Ticket;
    expect(() =>
      ticketChange(returned, { action: 'PROGRESS', version: 2, status: 'EM_ANDAMENTO' }, team),
    ).toThrow(ConflictException);
    expect(
      ticketChange(returned, { action: 'ALLOCATE', version: 2, team: 'HIDRAULICA' }, admin).data,
    ).toMatchObject({ team: 'HIDRAULICA', status: 'ACOMPANHAMENTO', returnReason: null });
    expect(
      ticketChange(
        returned,
        { action: 'CLOSE', version: 2, text: 'Compra não aprovada.', outcome: 'SEM_SUCESSO' },
        admin,
      ).data.status,
    ).toBe('CONCLUIDO');
  });
  it('bloqueia alterações com versão antiga e em registros concluídos', () => {
    expect(() =>
      ticketChange(ticket, { action: 'PRIORITY', version: 1, urgency: 'URGENTE' }, team),
    ).toThrow(ConflictException);
    expect(() =>
      ticketChange(
        { ...ticket, status: 'CONCLUIDO' },
        { action: 'MESSAGE', version: 2, text: 'Oi', audience: 'REQUESTER' },
        admin,
      ),
    ).toThrow(ConflictException);
  });
  it('limita os destinatários de mensagens da equipe', () => {
    expect(() =>
      ticketChange(ticket, { action: 'MESSAGE', version: 2, text: 'Oi', audience: 'TEAM' }, team),
    ).toThrow(ForbiddenException);
    expect(
      ticketChange(ticket, { action: 'MESSAGE', version: 2, text: 'Oi', audience: 'TEAM' }, admin)
        .audience,
    ).toBe('TEAM');
  });
  it.each([
    'SUCESSO',
    'SEM_SUCESSO',
  ] as const)('registra resultado %s e data da conclusão da equipe', (outcome) => {
    const before = Date.now();
    const change = ticketChange(
      ticket,
      { action: 'COMPLETE', version: 2, text: 'Resultado documentado.', outcome },
      team,
    );
    expect(change.data).toMatchObject({
      status: 'CONCLUIDO',
      outcome,
      feedback: 'Resultado documentado.',
      version: { increment: 1 },
    });
    expect(change.data.closedAt).toBeInstanceOf(Date);
    expect((change.data.closedAt as Date).getTime()).toBeGreaterThanOrEqual(before);
    expect(change.message).toContain(outcome === 'SUCESSO' ? 'com sucesso' : 'sem sucesso');
  });
  it('exige resultado explícito tanto na conclusão da equipe quanto no fechamento administrativo', () => {
    expect(() =>
      ticketChange(ticket, { action: 'COMPLETE', version: 2, text: 'Feito.' }, team),
    ).toThrow('resultado');
    expect(() =>
      ticketChange(
        { ...ticket, status: 'RETORNADO' },
        { action: 'CLOSE', version: 2, text: 'Encerrado.' },
        admin,
      ),
    ).toThrow('resultado');
  });
  it('exige justificativa e persiste a classificação no fechamento administrativo', () => {
    const returned = { ...ticket, status: 'RETORNADO' } as Ticket;
    expect(() =>
      ticketChange(returned, { action: 'CLOSE', version: 2, outcome: 'SEM_SUCESSO' }, admin),
    ).toThrow('feedback');
    const change = ticketChange(
      returned,
      { action: 'CLOSE', version: 2, text: 'Equipamento sem reparo.', outcome: 'SEM_SUCESSO' },
      admin,
    );
    expect(change.data).toMatchObject({
      status: 'CONCLUIDO',
      outcome: 'SEM_SUCESSO',
      feedback: 'Equipamento sem reparo.',
    });
    expect(change.data.closedAt).toBeInstanceOf(Date);
    expect(() =>
      ticketChange(
        returned,
        { action: 'CLOSE', version: 2, text: 'Sem reparo.', outcome: 'SEM_SUCESSO' },
        team,
      ),
    ).toThrow(ForbiddenException);
  });
  it('mantém chamados retornados em aberto sem atribuir resultado ou data de conclusão', () => {
    const change = ticketChange(
      ticket,
      { action: 'RETURN', version: 2, text: 'Aguardando peça.' },
      team,
    );
    expect(change.data.status).toBe('RETORNADO');
    expect(change.data).not.toHaveProperty('outcome');
    expect(change.data).not.toHaveProperty('closedAt');
  });
  it('rejeita valores de resultado desconhecidos no contrato HTTP', () => {
    expect(
      TicketActionDto.schema.safeParse({ action: 'COMPLETE', version: 2, outcome: 'DESCONHECIDO' })
        .success,
    ).toBe(false);
  });
});
