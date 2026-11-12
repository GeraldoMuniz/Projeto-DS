import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const TEAM_CODES = [
  'ELETRICA',
  'HIDRAULICA',
  'REFRIGERACAO',
  'TI_REDE',
  'MOBILIARIO',
] as const;
export const TEAM_LABELS: Record<string, string> = {
  ELETRICA: 'Elétrica',
  HIDRAULICA: 'Hidráulica',
  REFRIGERACAO: 'Refrigeração',
  TI_REDE: 'TI / Rede',
  MOBILIARIO: 'Mobiliário',
};
export const text = (max = 5000) => z.string().trim().min(1, 'Campo obrigatório.').max(max);
export const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use AAAA-MM-DD.')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Data inválida.');
export class ListQueryDto extends createZodDto(
  z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(100),
  }),
) {}
export function pageResult<T>(items: T[], total: number, query: ListQueryDto) {
  return {
    items,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}
