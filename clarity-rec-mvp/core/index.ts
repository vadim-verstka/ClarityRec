import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import pino from 'pino';
import { registerRoutes } from './routes';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard'
    }
  }
});

async function main() {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
    }
  });

  // Регистрация CORS
  const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['*'];
  await fastify.register(cors, {
    origin: corsOrigins.includes('*') ? true : corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true
  });

  // Регистрация Swagger для документации API
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'ClarityRec Core API',
        description: 'Автономная интеллектуальная система рекомендаций с прозрачными объяснениями (XAI-ready)',
        version: '1.0.0'
      },
      servers: [
        {
          url: 'http://localhost:3001',
          description: 'Development server'
        }
      ],
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key'
          }
        }
      },
      security: [{ ApiKeyAuth: [] }]
    }
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    }
  });

  // Получение API-ключа из переменных окружения
  const apiKey = process.env.CLARITYREC_API_KEY || 'clarity-rec-secret-key-2024';
  
  logger.info('🔑 API Key configured');

  // Регистрация маршрутов API
  await registerRoutes(fastify, apiKey);

  // Запуск сервера
  const port = parseInt(process.env.PORT || '3001', 10);
  const host = '0.0.0.0';

  try {
    await fastify.listen({ port, host });
    logger.info(`
╔═══════════════════════════════════════════════════════════╗
║           🚀 ClarityRec Core запущен успешно!             ║
╠═══════════════════════════════════════════════════════════╣
║  Сервер доступен: http://${host}:${port}                     ║
║  Swagger UI:      http://${host}:${port}/docs                ║
║  Health check:    http://${host}:${port}/health              ║
║                                                           ║
║  API Key: ${apiKey}                                     ║
║                                                           ║
║  Примеры использования:                                   ║
║  1. Синхронизация каталога: POST /api/v1/catalog/sync    ║
║  2. Отправка события:     POST /api/v1/events            ║
║  3. Получение рекомендаций: POST /api/v1/recommend       ║
╚═══════════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

main();
