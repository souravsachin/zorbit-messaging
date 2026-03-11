import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // OpenTelemetry must be initialized before the app starts
  initOpenTelemetry();

  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('Zorbit Messaging')
    .setDescription('Centralized Kafka messaging infrastructure including topic management, dead letter queues, message routing, and schema validation.')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('topics', 'Kafka topic lifecycle management')
    .addTag('dlq', 'Dead letter queue management')
    .addTag('health', 'Kafka broker health monitoring')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3004);

  await app.listen(port);
  console.log(`zorbit-messaging service listening on port ${port}`);
}

function initOpenTelemetry(): void {
  // TODO: Initialize OpenTelemetry SDK when @opentelemetry/sdk-node is configured
  // const sdk = new NodeSDK({
  //   serviceName: process.env.OTEL_SERVICE_NAME || 'zorbit-messaging',
  //   traceExporter: new OTLPTraceExporter({
  //     url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  //   }),
  // });
  // sdk.start();
}

bootstrap();
