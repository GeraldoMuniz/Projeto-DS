import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AccessRole } from '@/common/auth/access-role.enum';
import type { CurrentUser } from '@/common/auth/current-user.interface';
import { GetCurrentUser } from '@/common/auth/decorators/current-user.decorator';
import { Roles } from '@/common/auth/decorators/roles.decorator';
import { ListQueryDto } from '@/common/domain/maintenance';
import { CreateTicketDto, TicketActionDto } from './dto/ticket.dto';
import { TicketService } from './ticket.service';
import { MAX_TICKET_IMAGE_SIZE, type TicketImageUpload } from './ticket-image';

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
  @UseInterceptors(FileInterceptor('imagem', { limits: { fileSize: MAX_TICKET_IMAGE_SIZE } }))
  create(@Body() dto: CreateTicketDto, @GetCurrentUser() user: CurrentUser, @UploadedFile() imagem?: TicketImageUpload) {
    return this.service.create(dto, user, imagem);
  }

  // Somente usuários autorizados a consultar o chamado podem acessar sua imagem.
  @Get(':id/imagem')
  async image(@Param('id', ParseIntPipe) id: number, @GetCurrentUser() user: CurrentUser, @Res() response: Response) {
    const imagem = await this.service.image(id, user);
    response.setHeader('Content-Type', imagem.mimeType);
    response.setHeader('Content-Length', imagem.data.length);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Disposition', 'inline');
    response.end(imagem.data);
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
