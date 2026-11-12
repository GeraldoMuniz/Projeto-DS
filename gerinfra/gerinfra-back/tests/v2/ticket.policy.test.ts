import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import type { Ticket } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { AccessRole } from '../../src/common/auth/access-role.enum';
import { TicketActionDto } from '../../src/modules/tickets/dto/ticket.dto';
import { ticketChange, ticketScope } from '../../src/modules/tickets/ticket.policy';

// Suíte v2: amplia a v1 com classes inválidas, transições e valores-limite.
// Nenhum teste depende de PostgreSQL: a regra de domínio é exercitada isoladamente.
const gestor = { userId: 'gestor', role: AccessRole.ADMIN };
const usuario = { userId: 'u1', role: AccessRole.USER };
const eletrica = { userId: 'e1', role: AccessRole.TEAM, team: 'ELETRICA' as const };
const hidraulica = { userId: 'h1', role: AccessRole.TEAM, team: 'HIDRAULICA' as const };
const base = {
  id: 5, version: 2, requesterId: 'u1', team: 'ELETRICA', status: 'ACOMPANHAMENTO',
} as Ticket;
const acao = (ticket: Ticket, dto: Parameters<typeof ticketChange>[1], perfil = eletrica) =>
  ticketChange(ticket, dto, perfil);

describe('US01 — controle de acesso', () => {
  it('CT01: usuário vê apenas registros próprios', () => {
    expect(ticketScope(usuario)).toEqual({ requesterId: 'u1' });
  });
  it('CT02: equipe vê a própria especialidade', () => {
    expect(ticketScope(eletrica)).toEqual({ team: 'ELETRICA' });
  });
  it('CT03: gestor vê todos os registros', () => {
    expect(ticketScope(gestor)).toEqual({});
  });
  it('CT04: ausência de identidade impede escopo', () => {
    expect(() => ticketScope({ role: AccessRole.ADMIN })).toThrow(ForbiddenException);
  });
  it('CT05: equipe sem especialidade é rejeitada', () => {
    expect(() => ticketScope({ userId: 'e1', role: AccessRole.TEAM })).toThrow(ForbiddenException);
  });
});

describe('US02 — alocação e realocação', () => {
  it('CT06: gestor aloca e reinicia acompanhamento', () => {
    expect(acao(base, { action: 'ALLOCATE', version: 2, team: 'ELETRICA' }, gestor).data)
      .toMatchObject({ team: 'ELETRICA', status: 'ACOMPANHAMENTO' });
  });
  it('CT07: solicitante não aloca', () => {
    expect(() => acao(base, { action: 'ALLOCATE', version: 2, team: 'ELETRICA' }, usuario))
      .toThrow(ForbiddenException);
  });
  it('CT08: equipe é campo obrigatório', () => {
    expect(() => acao(base, { action: 'ALLOCATE', version: 2 }, gestor))
      .toThrow(BadRequestException);
  });
  it('CT09: realocação zera o motivo anterior', () => {
    const retornado = { ...base, status: 'RETORNADO', returnReason: 'Peça' } as Ticket;
    expect(acao(retornado, { action: 'ALLOCATE', version: 2, team: 'HIDRAULICA' }, gestor).data)
      .toMatchObject({ team: 'HIDRAULICA', status: 'ACOMPANHAMENTO', returnReason: null });
  });
});

describe('US03 — andamento e proteção de transições', () => {
  it.each(['EM_ANALISE', 'EM_ANDAMENTO'] as const)(
    'CT10/11: equipe pode mudar para %s', (status) => {
      expect(acao(base, { action: 'PROGRESS', version: 2, status }).data.status).toBe(status);
    },
  );
  it('CT12: equipe diferente é rejeitada', () => {
    expect(() => acao(base, { action: 'PROGRESS', version: 2, status: 'EM_ANALISE' }, hidraulica))
      .toThrow(ForbiddenException);
  });
  it('CT13: retorno depende de gestor para prosseguir', () => {
    expect(() => acao({ ...base, status: 'RETORNADO' } as Ticket,
      { action: 'PROGRESS', version: 2, status: 'EM_ANDAMENTO' }))
      .toThrow(ConflictException);
  });
  it('progresso sem estado é rejeitado', () => {
    expect(() => acao(base, { action: 'PROGRESS', version: 2 })).toThrow(BadRequestException);
  });
});

describe('US04 — conclusão e limites do feedback', () => {
  it.each(['SUCESSO', 'SEM_SUCESSO'] as const)(
    'CT14/15: conclusão %s registra resultado, feedback e instante', (outcome) => {
      const antes = Date.now();
      const retorno = acao(base, { action: 'COMPLETE', version: 2, outcome, text: 'Finalizado' });
      expect(retorno.data).toMatchObject({
        status: 'CONCLUIDO', outcome, feedback: 'Finalizado', version: { increment: 1 },
      });
      expect(retorno.data.closedAt).toBeInstanceOf(Date);
      expect((retorno.data.closedAt as Date).getTime()).toBeGreaterThanOrEqual(antes);
    },
  );
  it.each([undefined, '   '])('CT16/17: feedback inválido %s é rejeitado', (text) => {
    expect(() => acao(base, { action: 'COMPLETE', version: 2, outcome: 'SUCESSO', text }))
      .toThrow(BadRequestException);
  });
  it('CT18: resultado é obrigatório', () => {
    expect(() => acao(base, { action: 'COMPLETE', version: 2, text: 'Finalizado' }))
      .toThrow(BadRequestException);
  });
  it('o DTO recusa resultado fora do enum', () => {
    expect(TicketActionDto.schema.safeParse({
      action: 'COMPLETE', version: 2, text: 'Finalizado', outcome: 'INCERTO',
    }).success).toBe(false);
  });
});

describe('US05 — retorno e fechamento', () => {
  it('CT20: retorno sem motivo é rejeitado', () => {
    expect(() => acao(base, { action: 'RETURN', version: 2 })).toThrow(BadRequestException);
  });
  it('CT21: retorno mantém aberto e sem data de conclusão', () => {
    const retorno = acao(base, { action: 'RETURN', version: 2, text: 'Falta peça' });
    expect(retorno.data).toMatchObject({ status: 'RETORNADO', returnReason: 'Falta peça' });
    expect(retorno.data).not.toHaveProperty('closedAt');
    expect(retorno.data).not.toHaveProperty('outcome');
  });
  it('CT22: gestor fecha retornado com feedback e resultado', () => {
    const retornado = { ...base, status: 'RETORNADO' } as Ticket;
    expect(acao(retornado,
      { action: 'CLOSE', version: 2, text: 'Não concluído', outcome: 'SEM_SUCESSO' }, gestor).data)
      .toMatchObject({ status: 'CONCLUIDO', outcome: 'SEM_SUCESSO' });
  });
  it('CT23: fechamento antes do retorno é inválido', () => {
    expect(() => acao(base,
      { action: 'CLOSE', version: 2, text: 'Pronto', outcome: 'SUCESSO' }, gestor))
      .toThrow(ConflictException);
  });
  it('CT24: equipe não pode fechar administrativamente', () => {
    expect(() => acao({ ...base, status: 'RETORNADO' } as Ticket,
      { action: 'CLOSE', version: 2, text: 'Pronto', outcome: 'SUCESSO' }))
      .toThrow(ForbiddenException);
  });
  it('fechamento administrativo precisa de texto e resultado', () => {
    const retornado = { ...base, status: 'RETORNADO' } as Ticket;
    expect(() => acao(retornado, { action: 'CLOSE', version: 2, outcome: 'SUCESSO' }, gestor))
      .toThrow(BadRequestException);
    expect(() => acao(retornado, { action: 'CLOSE', version: 2, text: 'Pronto' }, gestor))
      .toThrow(BadRequestException);
  });
});

describe('US06 — mensagens, prioridade, concorrência', () => {
  it('CT25: gestor escreve para a equipe', () => {
    expect(acao(base, { action: 'MESSAGE', version: 2, text: 'Inspecionar', audience: 'TEAM' }, gestor)
      .audience).toBe('TEAM');
  });
  it('CT26: técnico escreve ao solicitante', () => {
    expect(acao(base, { action: 'MESSAGE', version: 2, text: 'Atendimento', audience: 'REQUESTER' })
      .audience).toBe('REQUESTER');
  });
  it('CT27: técnico não escreve para equipe', () => {
    expect(() => acao(base, { action: 'MESSAGE', version: 2, text: 'Teste', audience: 'TEAM' }))
      .toThrow(ForbiddenException);
  });
  it('mensagem sem texto ou público é rejeitada', () => {
    expect(() => acao(base, { action: 'MESSAGE', version: 2, audience: 'REQUESTER' }, gestor))
      .toThrow(BadRequestException);
    expect(() => acao(base, { action: 'MESSAGE', version: 2, text: 'Aviso' }, gestor))
      .toThrow(BadRequestException);
  });
  it('gestor não envia TEAM se chamado não tiver equipe', () => {
    expect(() => acao({ ...base, team: null } as Ticket,
      { action: 'MESSAGE', version: 2, text: 'Aviso', audience: 'TEAM' }, gestor))
      .toThrow(BadRequestException);
  });
  it('solicitante não pode escrever mensagens administrativas', () => {
    expect(() => acao(base,
      { action: 'MESSAGE', version: 2, text: 'Aviso', audience: 'REQUESTER' }, usuario))
      .toThrow(ForbiddenException);
  });
  it('CT28: altera prioridade', () => {
    expect(acao(base, { action: 'PRIORITY', version: 2, urgency: 'URGENTE' }).data.urgency)
      .toBe('URGENTE');
  });
  it('CT29: prioridade ausente é rejeitada', () => {
    expect(() => acao(base, { action: 'PRIORITY', version: 2 }))
      .toThrow(BadRequestException);
  });
  it('CT30: versão 1 (abaixo do limite 2) é rejeitada', () => {
    expect(() => acao(base, { action: 'PRIORITY', version: 1, urgency: 'URGENTE' }))
      .toThrow(ConflictException);
  });
  it('CT31: versão 2 é aceita e incrementada', () => {
    expect(acao(base, { action: 'PRIORITY', version: 2, urgency: 'LEVE' }).data.version)
      .toEqual({ increment: 1 });
  });
  it('CT32: estado terminal impede qualquer alteração', () => {
    expect(() => acao({ ...base, status: 'CONCLUIDO' } as Ticket,
      { action: 'MESSAGE', version: 2, text: 'Aviso', audience: 'TEAM' }, gestor))
      .toThrow(ConflictException);
  });
});

describe('Valores-limite no contrato HTTP', () => {
  it.each([-1, 1.5])('versão inválida (%s)', (version) => {
    expect(TicketActionDto.schema.safeParse({ action: 'PRIORITY', version, urgency: 'LEVE' })
      .success).toBe(false);
  });
  it.each([0, 2])('versão inteira não negativa (%s)', (version) => {
    expect(TicketActionDto.schema.safeParse({ action: 'PRIORITY', version, urgency: 'LEVE' })
      .success).toBe(true);
  });
  it.each([0, 1, 5000, 5001])('comprimento de texto %s', (length) => {
    const resultado = TicketActionDto.schema.safeParse({
      action: 'MESSAGE', version: 2, audience: 'REQUESTER', text: 'a'.repeat(length),
    });
    expect(resultado.success).toBe(length >= 1 && length <= 5000);
  });
  it.each(['URGENTE', 'MODERADO', 'LEVE'])('urgência permitida %s', (urgency) => {
    expect(TicketActionDto.schema.safeParse({ action: 'PRIORITY', version: 2, urgency })
      .success).toBe(true);
  });
  it('urgência desconhecida não é aceita', () => {
    expect(TicketActionDto.schema.safeParse({
      action: 'PRIORITY', version: 2, urgency: 'CRITICA',
    }).success).toBe(false);
  });
});
