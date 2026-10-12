import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { TEAM_CODES, text } from '@/common/domain/maintenance';

export class CreateTicketDto extends createZodDto(
  z
    .object({
      location: text(200),
      type: z.enum(TEAM_CODES),
      urgency: z.enum(['URGENTE', 'MODERADO', 'LEVE']),
      description: text(),
    })
    .strict(),
) {}

export class TicketActionDto extends createZodDto(
  z
    .object({
      action: z.enum([
        'ALLOCATE',
        'PROGRESS',
        'COMPLETE',
        'RETURN',
        'MESSAGE',
        'CLOSE',
        'PRIORITY',
      ]),
      version: z.number().int().nonnegative(),
      team: z.enum(TEAM_CODES).optional(),
      status: z.enum(['EM_ANALISE', 'EM_ANDAMENTO']).optional(),
      text: text().optional(),
      urgency: z.enum(['URGENTE', 'MODERADO', 'LEVE']).optional(),
      audience: z.enum(['REQUESTER', 'TEAM']).optional(),
    })
    .strict(),
) {}
