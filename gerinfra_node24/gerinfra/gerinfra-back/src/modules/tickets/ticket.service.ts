import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AccessRole } from '@/common/auth/access-role.enum';
import type { CurrentUser } from '@/common/auth/current-user.interface';
import { type ListQueryDto, pageResult, TEAM_LABELS } from '@/common/domain/maintenance';
import { PrismaService } from '@/database/prisma.service';
import type { CreateTicketDto, TicketActionDto } from './dto/ticket.dto';
import { ticketChange, ticketScope } from './ticket.policy';

@Injectable()
export class TicketService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListQueryDto, user: CurrentUser) {
    const where = ticketScope(user);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.ticket.count({ where }),
    ]);
    return pageResult(items, total, query);
  }

  async detail(id: number, user: CurrentUser) {
    const audience: Prisma.TicketMessageWhereInput =
      user.role === AccessRole.USER ? { audience: { in: ['ALL', 'REQUESTER'] } } : {};
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, ...ticketScope(user) },
      include: { messages: { where: audience, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } },
    });
    if (!ticket) throw new NotFoundException('Chamado não encontrado.');
    return ticket;
  }

  async create(dto: CreateTicketDto, user: CurrentUser) {
    ticketScope(user);
    return this.prisma.ticket.create({
      data: {
        ...dto,
        title: `${TEAM_LABELS[dto.type]} em ${dto.location}`.slice(0, 200),
        requesterId: user.userId as string,
        requesterName: (user.displayName ?? 'Solicitante').slice(0, 200),
        messages: {
          create: {
            authorId: user.userId as string,
            sender: 'Sistema',
            text: 'Chamado aberto e enviado à triagem da Gerinfra.',
          },
        },
      },
    });
  }

  async action(id: number, dto: TicketActionDto, user: CurrentUser) {
    await this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findFirst({ where: { id, ...ticketScope(user) } });
      if (!ticket) throw new NotFoundException('Chamado não encontrado.');
      const change = ticketChange(ticket, dto, user);
      const result = await tx.ticket.updateMany({
        where: { id, version: dto.version },
        data: change.data,
      });
      if (result.count !== 1)
        throw new ConflictException('O chamado foi alterado. Recarregue e tente novamente.');
      await tx.ticketMessage.create({
        data: {
          ticketId: id,
          authorId: user.userId as string,
          sender:
            user.role === AccessRole.ADMIN
              ? 'Gestor Gerinfra'
              : `Equipe ${TEAM_LABELS[user.team ?? '']}`,
          text: change.message,
          audience: change.audience,
        },
      });
    });
    return this.detail(id, user);
  }
}
