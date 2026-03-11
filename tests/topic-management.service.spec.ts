import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { TopicManagementService } from '../src/services/topic-management.service';
import { Topic } from '../src/models/entities/topic.entity';
import { HashIdService } from '../src/services/hash-id.service';
import { EventPublisherService } from '../src/events/event-publisher.service';

describe('TopicManagementService', () => {
  let service: TopicManagementService;
  let topicRepository: jest.Mocked<Repository<Topic>>;
  let hashIdService: jest.Mocked<HashIdService>;
  let eventPublisher: jest.Mocked<EventPublisherService>;

  const mockTopic: Partial<Topic> = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    hashId: 'TOP-92AF',
    name: 'identity.user',
    partitions: 3,
    replicationFactor: 1,
    retentionMs: 604800000,
    createdAt: new Date('2026-01-01'),
  };

  // Mock Kafka admin client
  const mockAdmin = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    createTopics: jest.fn().mockResolvedValue(true),
    deleteTopics: jest.fn().mockResolvedValue(undefined),
    fetchTopicOffsets: jest.fn().mockResolvedValue([{ offset: '100' }]),
    describeCluster: jest.fn().mockResolvedValue({ brokers: [{ nodeId: 1 }] }),
    listTopics: jest.fn().mockResolvedValue(['identity-user']),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TopicManagementService,
        {
          provide: getRepositoryToken(Topic),
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

    service = module.get<TopicManagementService>(TopicManagementService);
    topicRepository = module.get(getRepositoryToken(Topic)) as jest.Mocked<Repository<Topic>>;
    hashIdService = module.get(HashIdService) as jest.Mocked<HashIdService>;
    eventPublisher = module.get(EventPublisherService) as jest.Mocked<EventPublisherService>;

    // Inject mock admin client
    (service as any).admin = mockAdmin;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all topics', async () => {
      topicRepository.find.mockResolvedValue([mockTopic as Topic]);

      const result = await service.findAll();

      expect(topicRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].hashId).toBe('TOP-92AF');
      expect(result[0].name).toBe('identity.user');
    });
  });

  describe('getStats', () => {
    it('should return topic stats', async () => {
      topicRepository.findOne.mockResolvedValue(mockTopic as Topic);

      const result = await service.getStats('TOP-92AF');

      expect(result.topicHashId).toBe('TOP-92AF');
      expect(result.name).toBe('identity.user');
      expect(result.messageCount).toBe(100);
    });

    it('should throw NotFoundException if topic not found', async () => {
      topicRepository.findOne.mockResolvedValue(null);

      await expect(service.getStats('TOP-0000')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a topic in Kafka and database', async () => {
      topicRepository.findOne.mockResolvedValue(null); // no duplicate
      hashIdService.generate.mockReturnValue('TOP-NEW1');
      topicRepository.create.mockReturnValue({ ...mockTopic, hashId: 'TOP-NEW1' } as Topic);
      topicRepository.save.mockResolvedValue({ ...mockTopic, hashId: 'TOP-NEW1' } as Topic);
      eventPublisher.publish.mockResolvedValue(undefined);

      const result = await service.create({
        name: 'identity.user',
        partitions: 3,
        replicationFactor: 1,
      });

      expect(hashIdService.generate).toHaveBeenCalledWith('TOP');
      expect(mockAdmin.createTopics).toHaveBeenCalled();
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        'messaging.topic.created',
        'G',
        'G',
        expect.objectContaining({ topicHashId: 'TOP-NEW1' }),
      );
      expect(result.hashId).toBe('TOP-NEW1');
    });

    it('should throw ConflictException if topic name already exists', async () => {
      topicRepository.findOne.mockResolvedValue(mockTopic as Topic);

      await expect(
        service.create({ name: 'identity.user' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should delete topic from Kafka and database', async () => {
      topicRepository.findOne.mockResolvedValue(mockTopic as Topic);
      topicRepository.remove.mockResolvedValue(mockTopic as Topic);
      eventPublisher.publish.mockResolvedValue(undefined);

      await service.remove('TOP-92AF');

      expect(mockAdmin.deleteTopics).toHaveBeenCalledWith({
        topics: ['identity-user'],
      });
      expect(topicRepository.remove).toHaveBeenCalled();
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        'messaging.topic.deleted',
        'G',
        'G',
        { topicHashId: 'TOP-92AF', name: 'identity.user' },
      );
    });

    it('should throw NotFoundException if topic not found', async () => {
      topicRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('TOP-0000')).rejects.toThrow(NotFoundException);
    });
  });
});
