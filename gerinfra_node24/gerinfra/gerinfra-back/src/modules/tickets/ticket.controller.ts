import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessRole } from '@/common/auth/access-role.enum';
import type { CurrentUser } from '@/common/auth/current-user.interface';
import { GetCurrentUser } from '@/common/auth/decorators/current-user.decorator';
import { Roles } from '@/common/auth/decorators/roles.decorator';
import { ListQueryDto } from '@/common/domain/maintenance';
import { CreateTicketDto, TicketActionDto } from './dto/ticket.dto';
import { TicketService } from './ticket.service';

@ApiTags('Chamados')
@ApiBearerAuth()
@Controller({ path: 'tickets', version: '1' })
export class TicketController {
  constructor(private readonly service: TicketService) {}
  @Get()
  list(@Query() query: ListQueryDto, @GetCurrentUser() user: CurrentUser) {
    return this.service.list(query, user);
  }
  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number, @GetCurrentUser() user: CurrentUser) {
    return this.service.detail(id, user);
  }
  @Post()
  @Roles(AccessRole.USER)
  create(@Body() dto: CreateTicketDto, @GetCurrentUser() user: CurrentUser) {
    return this.service.create(dto, user);
  }
  @Post(':id/actions')
  @Roles(AccessRole.ADMIN, AccessRole.TEAM)
  action(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TicketActionDto,
    @GetCurrentUser() user: CurrentUser,
  ) {
    return this.service.action(id, dto, user);
  }
}
