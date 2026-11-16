import { describe, expect, it } from 'vitest';
import { AccessRole } from '../../src/common/auth/access-role.enum';
import { ticketChange, ticketScope } from '../../src/modules/tickets/ticket.policy';
import type { Ticket } from '@prisma/client';

// Suíte v1: versão inicial gerada pela LLM, preservada para comparação.
// Contexto: US01 a US06, regras de chamado e código de ticket.policy.ts.
const gestor = { userId: 'gestor', role: AccessRole.ADMIN };
const solicitante = { userId: 'solicitante', role: AccessRole.USER };
const equipe = { userId: 'tecnico', role: AccessRole.TEAM, team: 'ELETRICA' as const };
const chamado = {
  id: 1,
  version: 2,
  team: 'ELETRICA',
  requesterId: 'solicitante',
  status: 'ACOMPANHAMENTO',
} as Ticket;

describe('Sprint 3 — versão 1 gerada por LLM', () => {
  // US01: partições por tipo de perfil.
  it('limita o solicitante aos seus chamados', () => {
    expect(ticketScope(solicitante)).toEqual({ requesterId: 'solicitante' });
  });
  it('limita a equipe à sua especialidade', () => {
    expect(ticketScope(equipe)).toEqual({ team: 'ELETRICA' });
  });
  it('permite que o gestor consulte todos os chamados', () => {
    expect(ticketScope(gestor)).toEqual({});
  });
  // US02: partição válida de alocação.
  it('aloca o chamado para a equipe escolhida', () => {
    const resultado = ticketChange(
      chamado, { action: 'ALLOCATE', version: 2, team: 'ELETRICA' }, gestor,
    );
    expect(resultado.data.status).toBe('ACOMPANHAMENTO');
    expect(resultado.data.team).toBe('ELETRICA');
  });
  // US03: um estado válido de progresso.
  it('registra a passagem para análise', () => {
    expect(ticketChange(
      chamado, { action: 'PROGRESS', version: 2, status: 'EM_ANALISE' }, equipe,
    ).data.status).toBe('EM_ANALISE');
  });
  // US04: uma partição válida de resultado.
  it('conclui um chamado com sucesso e feedback', () => {
    const resultado = ticketChange(
      chamado, { action: 'COMPLETE', version: 2, text: 'Resolvido', outcome: 'SUCESSO' }, equipe,
    );
    expect(resultado.data.status).toBe('CONCLUIDO');
    expect(resultado.data.outcome).toBe('SUCESSO');
    expect(resultado.data.feedback).toBe('Resolvido');
  });
  it('impede conclusão sem feedback', () => {
    expect(() => ticketChange(
      chamado, { action: 'COMPLETE', version: 2, outcome: 'SUCESSO' }, equipe,
    )).toThrow('feedback');
  });
  // US05: retorno e fechamento.
  it('retorna o chamado à gestão', () => {
    expect(ticketChange(
      chamado, { action: 'RETURN', version: 2, text: 'Falta peça' }, equipe,
    ).data.status).toBe('RETORNADO');
  });
  it('permite fechar administrativamente um chamado retornado', () => {
    const retornado = { ...chamado, status: 'RETORNADO' } as Ticket;
    expect(ticketChange(
      retornado,
      { action: 'CLOSE', version: 2, text: 'Encerrado', outcome: 'SEM_SUCESSO' },
      gestor,
    ).data.status).toBe('CONCLUIDO');
  });
  // US06: autorização de mensagem, prioridade e versão.
  it('registra mensagem do gestor para a equipe', () => {
    expect(ticketChange(
      chamado, { action: 'MESSAGE', version: 2, text: 'Verificar', audience: 'TEAM' }, gestor,
    ).audience).toBe('TEAM');
  });
  it('altera prioridade', () => {
    expect(ticketChange(
      chamado, { action: 'PRIORITY', version: 2, urgency: 'URGENTE' }, equipe,
    ).data.urgency).toBe('URGENTE');
  });
  it('rejeita versão antiga', () => {
    expect(() => ticketChange(
      chamado, { action: 'PRIORITY', version: 1, urgency: 'URGENTE' }, equipe,
    )).toThrow();
  });
});
