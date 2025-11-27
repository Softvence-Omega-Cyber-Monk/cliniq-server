// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { TherapistsModule } from './therapists/therapists.module';
import { ClientsModule } from './clients/clients.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { ReportsModule } from './reports/reports.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PaymentMethodsModule } from './paymentMethod/payment-methods.module';
import { SubscriptionPlansModule } from './subscription-plans/subscription-plans.module';
import { SupportModule } from './support/support.module';
import { ResourcesModule } from './resources/resources.module';
import { ClinicClientsModule } from './clinic-clients/clinic-clients.module';
import { AdminSessionsModule } from './admin-sessions/admin-sessions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    TherapistsModule,
    ClientsModule,
    AppointmentsModule,
    ReportsModule ,
    SubscriptionsModule,
    PaymentMethodsModule,
    SubscriptionPlansModule,
    SupportModule,
    ResourcesModule,
    ClinicClientsModule,
    AdminSessionsModule
  ],
})
export class AppModule {}