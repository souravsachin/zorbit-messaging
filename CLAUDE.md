# Zorbit Service: zorbit-messaging

## Purpose

This repository implements the messaging service for the Zorbit platform.

Zorbit is a MACH-compliant shared platform infrastructure used to build enterprise applications.

The messaging service provides centralized Kafka messaging infrastructure including topic management, dead letter queues, message routing, and schema validation.

## Responsibilities

- Kafka topic lifecycle management (create, delete, list, inspect)
- Dead letter queue management (store failed messages, retry, discard)
- Message schema registration and validation
- Message routing between topics
- Kafka broker health monitoring and consumer lag tracking

## Architecture Context

This service follows Zorbit platform architecture.

Key rules:

- REST API grammar: /api/v1/{namespace}/{namespace_id}/resource
- namespace-based multi-tenancy (G, O, D, U)
- short hash identifiers (PREFIX-HASH, e.g. TOP-92AF, DLQ-81F3, SCH-51AA)
- event-driven integration (domain.entity.action)
- service isolation

## Dependencies

Allowed dependencies:

- infrastructure services (Kafka brokers)

Forbidden dependencies:

- direct database access to other services
- cross-service code imports

## Platform Dependencies

Upstream services:
- None (this IS the messaging infrastructure)

Downstream consumers:
- All platform services (topic management, schema validation, DLQ)
- zorbit-identity (identity events)
- zorbit-authorization (authorization events)
- zorbit-audit (audit events)
- zorbit-navigation (navigation events)

## Repository Structure

- /src/api — route definitions
- /src/controllers — request handlers (TopicController, DeadLetterQueueController, HealthController)
- /src/services — business logic (TopicManagementService, DeadLetterQueueService, SchemaValidationService, MessageRouterService, HealthService)
- /src/models — database entities and DTOs
- /src/events — event publishers and consumers
- /src/middleware — JWT, namespace, logging middleware
- /src/config — configuration module
- /tests — unit and integration tests

## Running Locally

```bash
npm install
cp .env.example .env
docker-compose up -d  # PostgreSQL + Kafka
npm run start:dev
```

Service runs on port 3004 (default). Production/server: port 3104.

## Events Published

- messaging.topic.created
- messaging.topic.deleted
- messaging.dlq.message.received

## Events Consumed

All platform events (for routing and monitoring).

## API Endpoints

- GET /api/v1/G/messaging/topics
- POST /api/v1/G/messaging/topics
- DELETE /api/v1/G/messaging/topics/:topicId
- GET /api/v1/G/messaging/topics/:topicId/stats
- GET /api/v1/G/messaging/dlq
- POST /api/v1/G/messaging/dlq/:messageId/retry
- POST /api/v1/G/messaging/dlq/:messageId/discard
- GET /api/v1/G/messaging/health

## Development Guidelines

Follow Zorbit architecture rules.
