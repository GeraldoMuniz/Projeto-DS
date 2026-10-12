import { ConflictException, ForbiddenException } from '@nestjs/common';
import type { Ticket } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { AccessRole } from '@/common/auth/access-role.enum';
import type { CurrentUser } from '@/common/auth/current-user.interface';
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
      ticketChange(ticket, { action: 'COMPLETE', version: 2, text: 'Lâmpada substituída.' }, team)
        .data.feedback,
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
    expect(ticketChange(returned, { action: 'CLOSE', version: 2 }, admin).data.status).toBe(
      'CONCLUIDO',
    );
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
});
