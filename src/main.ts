import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();
  app.use('/webhooks/stripe', json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    }
  }));
  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Enable transformation
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: false, // Don't throw error for extra properties (for multipart/form-data)
    }),
  );



  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Psychiatrist Management System API')
    .setDescription(
      'API documentation for the Psychiatrist Management System. ' +
      'This system allows private clinics and individual therapists to register, ' +
      'manage clients, appointments, and subscriptions.',
    )
    .setVersion('1.0')
    .addTag('Authentication', 'User authentication and authorization endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api-docs`);
}

bootstrap();