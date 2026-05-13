import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import { ExplanationEngine } from './explanation-engine';
import { ClarityRecAdapter } from './adapters';
import { ExplanationRequest } from './types';

/**
 * XAI Module API Server
 * 
 * Независимый сервер, предоставляющий API для получения объяснений рекомендаций.
 * Может работать с любой системой рекомендаций через адаптеры.
 */
export class XAIModuleServer {
  private fastify: FastifyInstance;
  private explanationEngine: ExplanationEngine;
  private adapter: ClarityRecAdapter;
  private config: {
    port: number;
    host: string;
    coreApiUrl: string;
    apiKey: string;
  };

  constructor(config: {
    port?: number;
    host?: string;
    coreApiUrl: string;
    apiKey: string;
  }) {
    this.fastify = Fastify({ logger: true });
    this.explanationEngine = new ExplanationEngine();
    this.adapter = new ClarityRecAdapter(config.coreApiUrl, config.apiKey);
    
    this.config = {
      port: config.port || 3002,
      host: config.host || '0.0.0.0',
      coreApiUrl: config.coreApiUrl,
      apiKey: config.apiKey
    };
  }

  /**
   * Зарегистрировать маршруты API
   */
  private registerRoutes() {
    // CORS
    this.fastify.register(cors, {
      origin: '*',
      methods: ['GET', 'POST']
    });

    /**
     * GET /health - Health check
     */
    this.fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
      return {
        status: 'healthy',
        service: 'clarityrec-xai-module',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      };
    });

    /**
     * POST /api/explain - Получить объяснение рекомендаций
     * 
     * Входные данные:
     * - user_id: ID пользователя
     * - recommendations: массив рекомендаций (опционально, если не переданы - загрузятся из Core)
     * - context: контекст (device, locale)
     * 
     * Выходные данные:
     * - text_explanation: текстовое объяснение
     * - visualizations: данные для визуализаций
     * - detailed_data: детальные данные
     * - meta: метаданные
     */
    this.fastify.post<{ Body: ExplanationRequest }>('/api/explain', async (request: FastifyRequest<{ Body: ExplanationRequest }>, reply: FastifyReply) => {
      const startTime = Date.now();
      
      try {
        const { user_id, recommendations, context } = request.body;

        if (!user_id) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'user_id is required'
          });
        }

        // Получаем рекомендации, если не переданы
        let recs = recommendations;
        if (!recs || recs.length === 0) {
          recs = await this.adapter.getRecommendations(user_id, 10);
        }

        if (recs.length === 0) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'No recommendations found for user'
          });
        }

        // Получаем профиль пользователя
        const userProfile = await this.adapter.getUserProfile(user_id);

        // Получаем события пользователя
        const userEvents = await this.adapter.getUserEvents(user_id);

        // Генерируем объяснение
        const explanation = await this.explanationEngine.generateExplanation(
          {
            user_id,
            recommendations: recs,
            context
          },
          userProfile,
          userEvents
        );

        const latency = Date.now() - startTime;
        
        this.fastify.log.info({
          user_id,
          recommendations_count: recs.length,
          latency
        }, 'Explanation generated');

        return reply.send(explanation);
      } catch (error: any) {
        this.fastify.log.error({ error: error.message }, 'Error generating explanation');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: error.message
        });
      }
    });

    /**
     * GET /api/explain/:user_id - Получить объяснение рекомендаций (GET версия)
     */
    this.fastify.get<{ Params: { user_id: string }; Querystring: { limit?: number } }>(
      '/api/explain/:user_id',
      async (request: FastifyRequest<{ Params: { user_id: string }; Querystring: { limit?: number } }>, reply: FastifyReply) => {
        const { user_id } = request.params;
        const limit = request.query.limit || 10;

        try {
          // Получаем рекомендации
          const recommendations = await this.adapter.getRecommendations(user_id, limit);

          if (recommendations.length === 0) {
            return reply.code(404).send({
              error: 'Not Found',
              message: 'No recommendations found for user'
            });
          }

          // Получаем профиль пользователя
          const userProfile = await this.adapter.getUserProfile(user_id);

          // Получаем события пользователя
          const userEvents = await this.adapter.getUserEvents(user_id);

          // Генерируем объяснение
          const explanation = await this.explanationEngine.generateExplanation(
            {
              user_id,
              recommendations
            },
            userProfile,
            userEvents
          );

          return reply.send(explanation);
        } catch (error: any) {
          this.fastify.log.error({ error: error.message }, 'Error generating explanation');
          return reply.code(500).send({
            error: 'Internal Server Error',
            message: error.message
          });
        }
      }
    );

    /**
     * GET /api/visualizations/:user_id - Получить только визуализации
     */
    this.fastify.get<{ Params: { user_id: string } }>(
      '/api/visualizations/:user_id',
      async (request: FastifyRequest<{ Params: { user_id: string } }>, reply: FastifyReply) => {
        const { user_id } = request.params;

        try {
          const recommendations = await this.adapter.getRecommendations(user_id, 10);
          const userProfile = await this.adapter.getUserProfile(user_id);

          // Создаём запрос для генерации визуализаций
          const explanation = await this.explanationEngine.generateExplanation(
            { user_id, recommendations },
            userProfile,
            []
          );

          return reply.send({
            visualizations: explanation.visualizations
          });
        } catch (error: any) {
          this.fastify.log.error({ error: error.message }, 'Error generating visualizations');
          return reply.code(500).send({
            error: 'Internal Server Error',
            message: error.message
          });
        }
      }
    );

    /**
     * GET /api/factors/:user_id - Получить факторы влияния
     */
    this.fastify.get<{ Params: { user_id: string } }>(
      '/api/factors/:user_id',
      async (request: FastifyRequest<{ Params: { user_id: string } }>, reply: FastifyReply) => {
        const { user_id } = request.params;

        try {
          const userProfile = await this.adapter.getUserProfile(user_id);

          // Формируем факторы из профиля
          const categoryFactors = Object.entries(userProfile.category_weights)
            .map(([name, weight]) => ({
              name: `Категория: ${name}`,
              weight,
              direction: 'positive' as const
            }))
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 5);

          return reply.send({
            factors: categoryFactors,
            profile_summary: {
              total_events: userProfile.events_count,
              total_likes: userProfile.likes_count,
              categories_count: Object.keys(userProfile.category_weights).length
            }
          });
        } catch (error: any) {
          this.fastify.log.error({ error: error.message }, 'Error getting factors');
          return reply.code(500).send({
            error: 'Internal Server Error',
            message: error.message
          });
        }
      }
    );
  }

  /**
   * Запустить сервер
   */
  async start() {
    this.registerRoutes();

    try {
      await this.fastify.listen({
        port: this.config.port,
        host: this.config.host
      });

      console.log(`🚀 XAI Module запущен на http://${this.config.host}:${this.config.port}`);
      console.log(`📊 Подключён к ClarityRec Core: ${this.config.coreApiUrl}`);
    } catch (err) {
      this.fastify.log.error(err);
      process.exit(1);
    }
  }

  /**
   * Остановить сервер
   */
  async stop() {
    await this.fastify.close();
    console.log('XAI Module остановлен');
  }
}

// Экспорт для использования как библиотеки
export { ExplanationEngine } from './explanation-engine';
export { ClarityRecAdapter, GenericRecommendationAdapter } from './adapters';
export * from './types';
