import { Module } from '@nestjs/common';
import { PeriodicController } from './periodic.controller';
import { PeriodicService } from './periodic.service';
@Module({ controllers: [PeriodicController], providers: [PeriodicService] })
export class PeriodicModule {}
