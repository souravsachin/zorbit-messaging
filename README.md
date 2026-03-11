# zorbit-messaging

Zorbit Platform Messaging Service — centralized Kafka messaging infrastructure.

## Features

- Kafka topic lifecycle management (create, delete, list, inspect)
- Dead letter queue management (store, retry, discard)
- Message schema registration and validation (JSON Schema via Ajv)
- Message routing between topics
- Kafka broker health monitoring

## Quick Start

```bash
npm install
cp .env.example .env
docker-compose up -d
npm run start:dev
```

Service runs on port **3004** by default.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/G/messaging/topics | List all topics |
| POST | /api/v1/G/messaging/topics | Create a topic |
| DELETE | /api/v1/G/messaging/topics/:topicId | Delete a topic |
| GET | /api/v1/G/messaging/topics/:topicId/stats | Topic statistics |
| GET | /api/v1/G/messaging/dlq | List dead letter messages |
| POST | /api/v1/G/messaging/dlq/:messageId/retry | Retry a DLQ message |
| POST | /api/v1/G/messaging/dlq/:messageId/discard | Discard a DLQ message |
| GET | /api/v1/G/messaging/health | Health check |

## Testing

```bash
npm test
npm run test:cov
```
