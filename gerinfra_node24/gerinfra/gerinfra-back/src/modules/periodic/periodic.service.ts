import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AccessRole } from '@/common/auth/access-role.enum';
import type { CurrentUser } from '@/common/auth/current-user.interface';
import { type ListQueryDto, pageResult } from '@/common/domain/maintenance';
import { PrismaService } from '@/database/prisma.service';
import type {
  CreatePeriodicDto,
  CreatePeriodicRequestDto,
  DecidePeriodicRequestDto,
  UpdatePeriodicDto,
} from './dto/periodic.dto';

function staffScope(user: CurrentUser) {
  if (user.role === AccessRole.ADMIN) return {};
  if (user.role === AccessRole.TEAM && user.team) return { team: user.team };
  throw new ForbiddenException('Acesso restrito à gestão e às equipes.');
}
function requireAdmin(user: CurrentUser) {
  if (user.role !== AccessRole.ADMIN)
    throw new ForbiddenException('Somente o gestor pode realizar esta ação.');
}

@Injectable()
export class PeriodicService {
  constructor(private readonly prisma: PrismaService) {}
  private serialize<T extends { date: Date }>(item: T) {
    return { ...item, date: item.date.toISOString().slice(0, 10) };
  }

  async list(query: ListQueryDto, user: CurrentUser) {
    const where = { active: true, ...staffScope(user) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.periodicMaintenance.findMany({
        where,
        orderBy: [{ date: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.periodicMaintenance.count({ where }),
    ]);
    return pageResult(
      items.map((item) => this.serialize(item)),
      total,
      query,
    );
  }
  async create(dto: CreatePeriodicDto, user: CurrentUser) {
    requireAdmin(user);
    return this.serialize(
      await this.prisma.periodicMaintenance.create({ data: { ...dto, date: new Date(dto.date) } }),
    );
  }
  async update(id: number, dto: UpdatePeriodicDto, user: CurrentUser) {
    requireAdmin(user);
    return this.prisma.$transaction(async (tx) => {
      const { version, ...fields } = dto;
      const result = await tx.periodicMaintenance.updateMany({
        where: { id, active: true, version },
        data: { ...fields, date: new Date(dto.date), version: { increment: 1 } },
      });
      if (!result.count)
        throw new ConflictException('Manutenção alterada ou excluída. Recarregue a lista.');
      const item = await tx.periodicMaintenance.findUniqueOrThrow({ where: { id } });
      return this.serialize(item);
    });
  }
  async remove(id: number, version: number, user: CurrentUser) {
    requireAdmin(user);
    const result = await this.prisma.periodicMaintenance.updateMany({
      where: { id, version, active: true },
      data: { active: false, version: { increment: 1 } },
    });
    if (!result.count)
      throw new ConflictException('Manutenção alterada ou excluída. Recarregue a lista.');
    return { id };
  }
  async generate(id: number, version: number, user: CurrentUser) {
    requireAdmin(user);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const periodic = await tx.periodicMaintenance.findFirst({
          where: { id, active: true, version },
        });
        if (!periodic)
          throw new ConflictException('Manutenção alterada ou excluída. Recarregue a lista.');
        const existing = await tx.ticket.findUnique({
          where: { periodicId_scheduledDate: { periodicId: id, scheduledDate: periodic.date } },
        });
        if (existing)
          throw new ConflictException('Já existe um chamado para esta manutenção nesta data.');
        // Lock the version before creating the occurrence; concurrent edits/deletion cannot race it.
        const locked = await tx.periodicMaintenance.updateMany({
          where: { id, active: true, version },
          data: { version: { increment: 1 } },
        });
        if (!locked.count) throw new ConflictException('Manutenção alterada. Recarregue a lista.');
        return tx.ticket.create({
          data: {
            title: `[Periódica] ${periodic.title}`.slice(0, 200),
            location: periodic.location,
            type: periodic.team,
            team: periodic.team,
            urgency: 'MODERADO',
            status: periodic.team ? 'ACOMPANHAMENTO' : 'TRIAGEM',
            description: `Execução programada para ${periodic.date.toISOString().slice(0, 10)}.`,
            requesterId: user.userId as string,
            requesterName: 'Gerinfra — manutenção periódica',
            periodicId: id,
            scheduledDate: periodic.date,
            messages: {
              create: {
                authorId: user.userId as string,
                sender: 'Sistema',
                text: 'Chamado gerado a partir de manutenção periódica.',
              },
            },
          },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Já existe um chamado para esta manutenção nesta data.');
      }
      throw error;
    }
  }
  async requests(query: ListQueryDto, user: CurrentUser) {
    const where = staffScope(user);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.periodicRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.periodicRequest.count({ where }),
    ]);
    return pageResult(
      items.map((item) => this.serialize(item)),
      total,
      query,
    );
  }
  async request(dto: CreatePeriodicRequestDto, user: CurrentUser) {
    if (user.role !== AccessRole.TEAM || !user.team || !user.userId)
      throw new ForbiddenException('Ação restrita à equipe.');
    return this.serialize(
      await this.prisma.periodicRequest.create({
        data: { ...dto, date: new Date(dto.date), team: user.team, requesterId: user.userId },
      }),
    );
  }
  async decide(id: number, dto: DecidePeriodicRequestDto, user: CurrentUser) {
    requireAdmin(user);
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.periodicRequest.findUnique({ where: { id } });
      if (!request) throw new NotFoundException('Solicitação não encontrada.');
      const result = await tx.periodicRequest.updateMany({
        where: { id, status: 'PENDENTE' },
        data: { status: dto.decision },
      });
      if (!result.count) throw new ConflictException('Solicitação já decidida por um gestor.');
      if (dto.decision === 'APROVADO')
        await tx.periodicMaintenance.create({
          data: {
            title: request.title,
            location: request.location,
            date: request.date,
            team: request.team,
            requestId: id,
          },
        });
      return this.serialize({ ...request, status: dto.decision });
    });
  }
}
