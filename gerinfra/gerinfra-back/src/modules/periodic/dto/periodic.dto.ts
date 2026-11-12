import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { calendarDate, TEAM_CODES, text } from '@/common/domain/maintenance';

const fields = {
  title: text(200),
  location: text(200),
  date: calendarDate,
  team: z.enum(TEAM_CODES).nullable(),
};
export class CreatePeriodicDto extends createZodDto(z.object(fields).strict()) {}
export class UpdatePeriodicDto extends createZodDto(
  z.object({ ...fields, version: z.number().int().nonnegative() }).strict(),
) {}
export class CreatePeriodicRequestDto extends createZodDto(
  z.object({ title: text(200), location: text(200), date: calendarDate }).strict(),
) {}
export class DecidePeriodicRequestDto extends createZodDto(
  z.object({ decision: z.enum(['APROVADO', 'REJEITADO']) }).strict(),
) {}
export class VersionDto extends createZodDto(
  z.object({ version: z.number().int().nonnegative() }).strict(),
) {}
