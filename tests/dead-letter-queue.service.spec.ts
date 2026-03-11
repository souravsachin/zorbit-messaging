import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { DeadLetterQueueService } from '../src/services/dead-letter-queue.service';
import {
  DeadLetterMessage,
  DlqMessageStatus,
} from '../src/models/entities/dead-letter-message.entity';
import { HashIdService } from '../src/services/hash-id.service';
import { EventPublisherService } from '../src/events/event-publisher.service';

describe('DeadLetterQueueService', () => {
  let service: DeadLetterQueueService;
  let dlqRepository: jest.Mocked<Repository<DeadLetterMessage>>;
  let hashIdService: jest.Mocked<HashIdService>;
  let eventPublisher: jest.Mocked<EventPublisherService>;

  const mockDlqMessage: Partial<DeadLetterMessage> = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    hashId: 'DLQ-81F3',
    originalTopic: 'identity.user',
    originalEvent: { eventType: 'identity.user.created', payload: { userId: 'U-81F3' } },
    errorMessage: 'Deserialization failed',
    retryCount: 0,
    status: DlqMessageStatus.PENDING,
    createdAt: new Date('2026-01-01'),
  };

  // Mock Kafka producer
  const mockProducer = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeadLetterQueueService,
        {
          provide: getRepositoryToken(DeadLetterMessage),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: HashIdService,
          useValue: { generate: jest.fn() },
        },
        {
          provide: EventPublisherService,
          useValue: { publish: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('localhost:9092'),
          },
        },
      ],
    }).compile();

    service = module.get<DeadLetterQueueService>(DeadLetterQueueService);
    dlqRepository = module.get(
      getRepositoryToken(DeadLetterMessage),
    ) as jest.Mocked<Repository<DeadLetterMessage>>;
    hashIdService = module.get(HashIdService) as jest.Mocked<HashIdService>;
    eventPublisher = module.get(EventPublisherService) as jest.Mocked<EventPublisherService>;

    // Inject mock producer
    (service as any).producer = mockProducer;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all dead letter messages', async () => {
      dlqRepository.find.mockResolvedValue([mockDlqMessage as DeadLetterMessage]);

      const result = await service.findAll();

      expect(dlqRepository.find).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].hashId).toBe('DLQ-81F3');
    });

    it('should filter by status when provided', async () => {
      dlqRepository.find.mockResolvedValue([]);

      await service.findAll(DlqMessageStatus.PENDING);

      expect(dlqRepository.find).toHaveBeenCalledWith({
        where: { status: DlqMessageStatus.PENDING },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('store', () => {
    it('should store a dead letter message and publish event', async () => {
      hashIdService.generate.mockReturnValue('DLQ-NEW1');
      dlqRepository.create.mockReturnValue({
        ...mockDlqMessage,
        hashId: 'DLQ-NEW1',
      } as DeadLetterMessage);
      dlqRepository.save.mockResolvedValue({
        ...mockDlqMessage,
        hashId: 'DLQ-NEW1',
      } as DeadLetterMessage);
      eventPublisher.publish.mockResolvedValue(undefined);

      const result = await service.store(
        'identity.user',
        { eventType: 'identity.user.created' },
        'Processing failed',
      );

      expect(hashIdService.generate).toHaveBeenCalledWith('DLQ');
      expect(dlqRepository.save).toHaveBeenCalled();
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        'messaging.dlq.message.received',
        'G',
        'G',
        expect.objectContaining({ dlqHashId: 'DLQ-NEW1' }),
      );
      expect(result.hashId).toBe('DLQ-NEW1');
    });
  });

  describe('retry', () => {
    it('should retry a pending message', async () => {
      dlqRepository.findOne.mockResolvedValue(mockDlqMessage as DeadLetterMessage);
      dlqRepository.save.mockResolvedValue({
        ...mockDlqMessage,
        retryCount: 1,
        status: DlqMessageStatus.RETRIED,
      } as DeadLetterMessage);

      const result = await service.retry('DLQ-81F3');

      expect(mockProducer.send).toHaveBeenCalledWith({
        topic: 'identity-user',
        messages: [
          {
            value: JSON.stringify(mockDlqMessage.originalEvent),
          },
        ],
      });
      expect(result.status).toBe(DlqMessageStatus.RETRIED);
    });

    it('should throw NotFoundException if message not found', async () => {
      dlqRepository.findOne.mockResolvedValue(null);

      await expect(service.retry('DLQ-0000')).rejects.toThrow(NotFoundException);
    });

    it('should throw if message is not pending', async () => {
      dlqRepository.findOne.mockResolvedValue({
        ...mockDlqMessage,
        status: DlqMessageStatus.DISCARDED,
      } as DeadLetterMessage);

      await expect(service.retry('DLQ-81F3')).rejects.toThrow(NotFoundException);
    });
  });

  describe('discard', () => {
    it('should discard a pending message', async () => {
      dlqRepository.findOne.mockResolvedValue(mockDlqMessage as DeadLetterMessage);
      dlqRepository.save.mockResolvedValue({
        ...mockDlqMessage,
        status: DlqMessageStatus.DISCARDED,
      } as DeadLetterMessage);

      const result = await service.discard('DLQ-81F3');

      expect(result.status).toBe(DlqMessageStatus.DISCARDED);
    });

    it('should throw NotFoundException if message not found', async () => {
      dlqRepository.findOne.mockResolvedValue(null);

      await expect(service.discard('DLQ-0000')).rejects.toThrow(NotFoundException);
    });

    it('should throw if message is not pending', async () => {
      dlqRepository.findOne.mockResolvedValue({
        ...mockDlqMessage,
        status: DlqMessageStatus.RETRIED,
      } as DeadLetterMessage);

      await expect(service.discard('DLQ-81F3')).rejects.toThrow(NotFoundException);
    });
  });
});
