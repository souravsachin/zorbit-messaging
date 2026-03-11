/**
 * Canonical event type constants for the messaging domain.
 * Naming convention: domain.entity.action
 */
export const MessagingEvents = {
  TOPIC_CREATED: 'messaging.topic.created',
  TOPIC_DELETED: 'messaging.topic.deleted',
  DLQ_MESSAGE_RECEIVED: 'messaging.dlq.message.received',
} as const;

export type MessagingEventType = (typeof MessagingEvents)[keyof typeof MessagingEvents];

/**
 * Canonical event envelope for all Zorbit platform events.
 */
export interface ZorbitEventEnvelope<T = unknown> {
  eventId: string;
  eventType: string;
  timestamp: string;
  source: string;
  namespace: string;
  namespaceId: string;
  payload: T;
  metadata?: Record<string, string>;
}
