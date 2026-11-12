import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import type { Prisma, Ticket } from '@prisma/client';
import { AccessRole } from '@/common/auth/access-role.enum';
import type { CurrentUser } from '@/common/auth/current-user.interface';
import { TEAM_LABELS } from '@/common/domain/maintenance';
import type { TicketActionDto } from './dto/ticket.dto';

// DT-01: centraliza a validação de texto obrigatório sem alterar mensagens de erro.
function requireFeedback(text: string | undefined, message: string): void {
  if (!text?.trim()) throw new BadRequestException(message);
}

// DT-02: unifica os efeitos de conclusão para equipe e gestor.
function applyConclusion(
  data: Prisma.TicketUpdateManyMutationInput,
  dto: TicketActionDto,
): void {
  data.status = 'CONCLUIDO';
  data.feedback = dto.text;
  data.outcome = dto.outcome;
  data.closedAt = new Date();
}

export function ticketScope(user: CurrentUser): Prisma.TicketWhereInput {
  if (!user.userId) throw new ForbiddenException('Identidade ausente.');
  if (user.role === AccessRole.ADMIN) return {};
  if (user.role === AccessRole.TEAM && user.team) return { team: user.team };
  if (user.role === AccessRole.USER) return { requesterId: user.userId };
  throw new ForbiddenException('Perfil sem equipe configurada.');
}

export function ticketChange(ticket: Ticket, dto: TicketActionDto, user: CurrentUser) {
  if (ticket.version !== dto.version)
    throw new ConflictException('O chamado foi alterado. Recarregue e tente novamente.');
  if (ticket.status === 'CONCLUIDO') throw new ConflictException('Chamado já concluído.');
  const admin = user.role === AccessRole.ADMIN;
  const operator = user.role === AccessRole.TEAM && user.team === ticket.team;
  const data: Prisma.TicketUpdateManyMutationInput = { version: { increment: 1 } };
  let message = '';
  let audience: 'ALL' | 'REQUESTER' | 'TEAM' = 'ALL';
  switch (dto.action) {
    case 'ALLOCATE':
      if (!admin) throw new ForbiddenException('Somente o gestor pode alocar equipes.');
      if (!dto.team) throw new BadRequestException('Selecione a equipe.');
      data.team = dto.team;
      data.status = 'ACOMPANHAMENTO';
      data.returnReason = null;
      message = `Chamado alocado para a equipe de ${TEAM_LABELS[dto.team]}.`;
      break;
    case 'PROGRESS':
    case 'COMPLETE':
    case 'RETURN':
      if (!operator) throw new ForbiddenException('Ação restrita à equipe responsável.');
      if (!['ACOMPANHAMENTO', 'EM_ANALISE', 'EM_ANDAMENTO'].includes(ticket.status)) {
        throw new ConflictException('Aguarde a decisão do gestor para continuar o atendimento.');
      }
      if (dto.action === 'PROGRESS') {
        if (!dto.status) throw new BadRequestException('Informe o estado do atendimento.');
        data.status = dto.status;
        message =
          dto.status === 'EM_ANALISE' ? 'Atendimento em análise.' : 'Atendimento em andamento.';
      } else {
        requireFeedback(
          dto.text,
          dto.action === 'COMPLETE'
            ? 'Informe o feedback da solução.'
            : 'Informe o motivo do retorno.',
        );
        if (dto.action === 'COMPLETE') {
          if (!dto.outcome) throw new BadRequestException('Informe o resultado da conclusão.');
          applyConclusion(data, dto);
          message = `Chamado concluído ${dto.outcome === 'SUCESSO' ? 'com sucesso' : 'sem sucesso'}: ${dto.text}`;
        } else {
          data.status = 'RETORNADO';
          data.returnReason = dto.text;
          message = `Retorno enviado à gestão: ${dto.text}`;
        }
      }
      break;
    case 'CLOSE':
      if (!admin) throw new ForbiddenException('Somente o gestor pode fechar administrativamente.');
      if (ticket.status !== 'RETORNADO')
        throw new ConflictException('Fechamento administrativo exige um chamado retornado.');
      requireFeedback(dto.text, 'Informe o feedback do fechamento administrativo.');
      if (!dto.outcome) throw new BadRequestException('Informe o resultado da conclusão.');
      applyConclusion(data, dto);
      message = `Chamado fechado administrativamente ${dto.outcome === 'SUCESSO' ? 'com sucesso' : 'sem sucesso'}: ${dto.text}`;
      break;
    case 'MESSAGE':
      if (!admin && !operator)
        throw new ForbiddenException('Somente gestor e equipe podem enviar mensagens.');
      if (!dto.text || !dto.audience)
        throw new BadRequestException('Informe mensagem e destinatário.');
      if (operator && dto.audience !== 'REQUESTER')
        throw new ForbiddenException('Equipe pode enviar mensagens ao solicitante.');
      if (dto.audience === 'TEAM' && !ticket.team)
        throw new BadRequestException('Chamado sem equipe alocada.');
      audience = dto.audience;
      message = dto.text;
      break;
    case 'PRIORITY':
      if (!admin && !operator)
        throw new ForbiddenException('Sem permissão para alterar a prioridade.');
      if (!dto.urgency) throw new BadRequestException('Informe a prioridade.');
      data.urgency = dto.urgency;
      message = `Prioridade alterada para ${dto.urgency.toLowerCase()}.`;
      break;
  }
  return { data, message, audience };
}
