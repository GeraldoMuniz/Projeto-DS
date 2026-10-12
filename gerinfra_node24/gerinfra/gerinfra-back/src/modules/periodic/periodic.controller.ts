import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessRole } from '@/common/auth/access-role.enum';
import type { CurrentUser } from '@/common/auth/current-user.interface';
import { GetCurrentUser } from '@/common/auth/decorators/current-user.decorator';
import { Roles } from '@/common/auth/decorators/roles.decorator';
import { ListQueryDto } from '@/common/domain/maintenance';
import {
  CreatePeriodicDto,
  CreatePeriodicRequestDto,
  DecidePeriodicRequestDto,
  UpdatePeriodicDto,
  VersionDto,
} from './dto/periodic.dto';
import { PeriodicService } from './periodic.service';
@ApiTags('Manutenções periódicas')
@ApiBearerAuth()
@Roles(AccessRole.ADMIN, AccessRole.TEAM)
@Controller({ path: 'periodic', version: '1' })
export class PeriodicController {
  constructor(private readonly service: PeriodicService) {}
  @Get()
  list(@Query() query: ListQueryDto, @GetCurrentUser() user: CurrentUser) {
    return this.service.list(query, user);
  }
  @Post()
  @Roles(AccessRole.ADMIN)
  create(@Body() dto: CreatePeriodicDto, @GetCurrentUser() user: CurrentUser) {
    return this.service.create(dto, user);
  }
  @Get('requests')
  requests(@Query() query: ListQueryDto, @GetCurrentUser() user: CurrentUser) {
    return this.service.requests(query, user);
  }
  @Post('requests')
  @Roles(AccessRole.TEAM)
  request(@Body() dto: CreatePeriodicRequestDto, @GetCurrentUser() user: CurrentUser) {
    return this.service.request(dto, user);
  }
  @Post('requests/:id/decision')
  @Roles(AccessRole.ADMIN)
  decide(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DecidePeriodicRequestDto,
    @GetCurrentUser() user: CurrentUser,
  ) {
    return this.service.decide(id, dto, user);
  }
  @Patch(':id')
  @Roles(AccessRole.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePeriodicDto,
    @GetCurrentUser() user: CurrentUser,
  ) {
    return this.service.update(id, dto, user);
  }
  @Delete(':id')
  @Roles(AccessRole.ADMIN)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: VersionDto,
    @GetCurrentUser() user: CurrentUser,
  ) {
    return this.service.remove(id, dto.version, user);
  }
  @Post(':id/generate')
  @Roles(AccessRole.ADMIN)
  generate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: VersionDto,
    @GetCurrentUser() user: CurrentUser,
  ) {
    return this.service.generate(id, dto.version, user);
  }
}
