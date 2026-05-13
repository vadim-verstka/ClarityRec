import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Ajv from 'ajv';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import { verifyApiKey } from './auth';
import { store } from './store';
import { generateRecommendations } from './algorithm';
import {
  EventInput,
  EventResponse,
  RecommendationRequest,
  RecommendationResponse,
  CatalogSyncInput,
  CatalogSyncResponse
} from './types';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard'
    }
  }
});

// JSON Schema для валидации
const eventSchema = {
  type: 'object',
  required: ['api_key', 'user_id', 'item_id', 'event_type'],
  properties: {
    api_key: { type: 'string' },
    user_id: { type: 'string' },
    item_id: { type: 'string' },
    event_type: { 
      type: 'string', 
      enum: ['like', 'view', 'purchase'] 
    },
    metadata: { 
      type: 'object',
      additionalProperties: true 
    }
  },
  additionalProperties: false
};

const recommendationSchema = {
  type: 'object',
  required: ['api_key', 'user_id', 'limit'],
  properties: {
    api_key: { type: 'string' },
    user_id: { type: 'string' },
    limit: { type: 'integer', minimum: 1, maximum: 100 },
    context: {
      type: 'object',
      properties: {
        device: { type: 'string' },
        role: { type: 'string' }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
};

const catalogSyncSchema = {
  type: 'object',
  required: ['api_key', 'items'],
  properties: {
    api_key: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        required: ['item_id', 'categories', 'tags', 'features'],
        properties: {
          item_id: { type: 'string' },
          categories: { 
            type: 'array', 
            items: { type: 'string' } 
          },
          tags: { 
            type: 'array', 
            items: { type: 'string' } 
          },
          features: { 
            type: 'object',
            additionalProperties: { type: 'number' }
          }
        },
        additionalProperties: false
      }
    }
  },
  additionalProperties: false
};

const ajv = new Ajv();
const validateEvent = ajv.compile(eventSchema);
const validateRecommendation = ajv.compile(recommendationSchema);
const validateCatalogSync = ajv.compile(catalogSyncSchema);

/**
 * Регистрация маршрутов API
 */
export async function registerRoutes(fastify: FastifyInstance, apiKey: string) {
  
  // Middleware для проверки API-ключа (теперь берем из тела запроса)
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Пропускаем проверку для Swagger и healthcheck
    if (request.url.startsWith('/documentation') || request.url === '/health' || request.url.startsWith('/docs')) {
      return;
    }
    
    // Получаем API-ключ из тела запроса
    const body = request.body as any;
    const providedKey = body?.api_key;
    
    if (!providedKey || !verifyApiKey(providedKey, apiKey)) {
      reply.code(403).send({ 
        error: 'Forbidden', 
        message: 'Invalid or missing API key' 
      });
    }
  });
  
  /**
   * POST /api/v1/events - Принять событие (лайк/просмотр/покупка)
   */
  fastify.post<{ Body: EventInput }>('/api/v1/events', {
    schema: {
      description: 'Отправить событие взаимодействия пользователя с элементом',
      tags: ['Events'],
      body: eventSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            user_events_count: { type: 'integer' },
            recommendation_ready: { type: 'boolean' }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'array' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      const startTime = Date.now();
      
      // Валидация входных данных
      if (!validateEvent(request.body)) {
        logger.error({ errors: validateEvent.errors }, 'Validation error');
        return reply.code(400).send({
          error: 'Validation failed',
          details: validateEvent.errors
        });
      }
      
      const { user_id, item_id, event_type } = request.body;
      
      // Получаем элемент каталога для обновления профиля
      const item = store.getCatalogItem(item_id);
      
      if (!item) {
        logger.warn({ item_id }, 'Item not found in catalog');
        return reply.code(404).send({
          error: 'Item not found',
          message: `Item ${item_id} not found in catalog. Please sync catalog first.`
        });
      }
      
      // Обновляем профиль пользователя
      const profile = store.updateUserProfile(
        user_id,
        event_type,
        item.categories,
        item.tags,
        item.features
      );
      
      // Обновляем item_id в последнем событии (т.к. в store.ts мы его не знали)
      if (profile.events.length > 0) {
        profile.events[profile.events.length - 1].item_id = item_id;
      }
      
      const isReady = store.isRecommendationReady(user_id);
      
      const latency = Date.now() - startTime;
      logger.info({ user_id, item_id, event_type, latency }, 'Event processed');
      
      const response: EventResponse = {
        status: 'ok',
        user_events_count: profile.events_count,
        recommendation_ready: isReady
      };
      
      return reply.send(response);
    }
  });
  
  /**
   * POST /api/v1/recommend - Получить рекомендации
   */
  fastify.post<{ Body: RecommendationRequest }>('/api/v1/recommend', {
    schema: {
      description: 'Получить персонализированные рекомендации для пользователя',
      tags: ['Recommendations'],
      body: recommendationSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            request_id: { type: 'string' },
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  item_id: { type: 'string' },
                  score: { type: 'number' },
                  feature_impacts: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        weight: { type: 'number' },
                        direction: { type: 'string', enum: ['positive', 'negative'] }
                      }
                    }
                  }
                }
              }
            },
            meta: {
              type: 'object',
              properties: {
                model_version: { type: 'string' },
                latency_ms: { type: 'integer' }
              }
            }
          }
        }
      }
    },
    handler: async (request, reply) => {
      const startTime = Date.now();
      
      // Валидация входных данных
      if (!validateRecommendation(request.body)) {
        logger.error({ errors: validateRecommendation.errors }, 'Validation error');
        return reply.code(400).send({
          error: 'Validation failed',
          details: validateRecommendation.errors
        });
      }
      
      const { user_id, limit } = request.body;
      
      // Генерируем рекомендации
      const recommendations = generateRecommendations(user_id, limit);
      
      const latency = Date.now() - startTime;
      logger.info({ user_id, limit, recommendations_count: recommendations.length, latency }, 'Recommendations generated');
      
      const response: RecommendationResponse = {
        request_id: uuidv4(),
        recommendations,
        meta: {
          model_version: 'cosine-similarity-v1.0',
          latency_ms: latency
        }
      };
      
      return reply.send(response);
    }
  });
  
  /**
   * POST /api/v1/catalog/sync - Синхронизировать каталог
   */
  fastify.post<{ Body: CatalogSyncInput }>('/api/v1/catalog/sync', {
    schema: {
      description: 'Синхронизировать каталог элементов для рекомендаций',
      tags: ['Catalog'],
      body: catalogSyncSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            synced_count: { type: 'integer' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      const startTime = Date.now();
      
      // Валидация входных данных
      if (!validateCatalogSync(request.body)) {
        logger.error({ errors: validateCatalogSync.errors }, 'Validation error');
        return reply.code(400).send({
          error: 'Validation failed',
          details: validateCatalogSync.errors
        });
      }
      
      const { items } = request.body;
      
      // Синхронизируем каталог
      const syncedCount = store.syncCatalog(items);
      
      const latency = Date.now() - startTime;
      logger.info({ synced_count: syncedCount, latency }, 'Catalog synced');
      
      const response: CatalogSyncResponse = {
        status: 'ok',
        synced_count: syncedCount
      };
      
      return reply.send(response);
    }
  });
  
  /**
   * GET /health - Health check endpoint (без проверки API-ключа)
   */
  fastify.get('/health', {
    schema: {
      hide: true
    },
    handler: async (request, reply) => {
      return reply.send({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    }
  });
}
