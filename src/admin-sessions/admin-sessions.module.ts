import { Module } from '@nestjs/common';
import { AdminSessionsController } from './admin-sessions.controller';
import { AdminSessionsService } from './admin-sessions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminSessionsController],
  providers: [AdminSessionsService],
  exports: [AdminSessionsService],
})
export class AdminSessionsModule {}
