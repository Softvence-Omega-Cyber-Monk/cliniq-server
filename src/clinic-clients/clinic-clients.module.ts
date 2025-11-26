import { Module } from '@nestjs/common';
import { ClinicClientsController } from './clinic-clients.controller';
import { ClinicClientsService } from './clinic-clients.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ClinicClientsController],
  providers: [ClinicClientsService],
  exports: [ClinicClientsService],
})
export class ClinicClientsModule {}