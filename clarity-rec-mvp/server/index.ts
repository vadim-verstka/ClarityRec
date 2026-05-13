import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import bcrypt from 'bcrypt';
import axios from 'axios';
import db from './db.js';

const fastify = Fastify({ logger: true });

// Конфигурация сервиса рекомендаций ClarityRec Core
const CORE_SERVICE_URL = process.env.CORE_SERVICE_URL || 'http://clarityrec-core:3000';
const API_KEY = process.env.API_KEY || 'clarity-rec-mvp-key';

// Регистрация CORS
fastify.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE']
});

// Регистрация JWT
fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'clarity-rec-secret-key-mvp-2024'
});

// Декоратор для проверки авторизации
fastify.decorate('authenticate', async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
});

// ==================== AUTH ====================

// Вход админа
fastify.post('/api/auth/admin/login', async (request, reply) => {
  const { username, password } = request.body as { username: string; password: string };

  if (username !== 'admin') {
    return reply.code(401).send({ error: 'Неверные учётные данные' });
  }

  const admin = db.prepare('SELECT * FROM admin WHERE username = ?').get(username) as any;
  if (!admin) {
    return reply.code(401).send({ error: 'Админ не найден' });
  }

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) {
    return reply.code(401).send({ error: 'Неверный пароль' });
  }

  const token = fastify.jwt.sign({ id: admin.id, username: admin.username, role: 'admin' });
  return { token, user: { id: admin.id, username: admin.username, role: 'admin' } };
});

// ==================== USERS ====================

// Получить всех пользователей (только админ)
fastify.get('/api/users', {
  preHandler: [fastify.authenticate]
}, async (request, reply) => {
  const users = db.prepare('SELECT id, username, created_at, is_recommendation_ready FROM users').all();
  return users;
});

// Создать пользователя (только админ)
fastify.post('/api/users', {
  preHandler: [fastify.authenticate]
}, async (request, reply) => {
  const { username } = request.body as { username: string };

  if (!username || username.length < 3) {
    return reply.code(400).send({ error: 'Имя пользователя должно быть не менее 3 символов' });
  }

  try {
    const result = db.prepare('INSERT INTO users (username) VALUES (?)').run(username);
    return { id: result.lastInsertRowid, username };
  } catch (e: any) {
    if (e.message.includes('UNIQUE')) {
      return reply.code(400).send({ error: 'Пользователь с таким именем уже существует' });
    }
    throw e;
  }
});

// Переключиться на пользователя (режим просмотра от имени пользователя)
fastify.post('/api/users/:id/impersonate', {
  preHandler: [fastify.authenticate]
}, async (request, reply) => {
  const { id } = request.params as { id: string };
  const user = db.prepare('SELECT id, username, is_recommendation_ready FROM users WHERE id = ?').get(id) as any;

  if (!user) {
    return reply.code(404).send({ error: 'Пользователь не найден' });
  }

  // Генерируем токен от имени пользователя
  const token = fastify.jwt.sign({ id: user.id, username: user.username, role: 'user' });
  return { token, user: { id: user.id, username: user.username, role: 'user', is_recommendation_ready: !!user.is_recommendation_ready } };
});

// Получить текущего пользователя
fastify.get('/api/users/me', {
  preHandler: [fastify.authenticate]
}, async (request, reply) => {
  const user = request.user as any;
  if (user.role !== 'user') {
    return reply.code(403).send({ error: 'Доступ только для пользователей' });
  }

  const userData = db.prepare('SELECT id, username, is_recommendation_ready FROM users WHERE id = ?').get(user.id);
  return userData;
});

// ==================== CARDS ====================

// Получить все карточки (лента)
fastify.get('/api/cards', async (request, reply) => {
  const cards = db.prepare('SELECT * FROM cards ORDER BY id').all();
  return cards;
});

// ==================== LIKES ====================

// Поставить лайк
fastify.post('/api/likes', {
  preHandler: [fastify.authenticate]
}, async (request, reply) => {
  const user = request.user as any;
  if (user.role !== 'user') {
    return reply.code(403).send({ error: 'Доступ только для пользователей' });
  }

  const { cardId } = request.body as { cardId: number };

  try {
    // Получаем информацию о карточке
    const card = db.prepare('SELECT category FROM cards WHERE id = ?').get(cardId) as { category: string } | undefined;
    if (!card) {
      return reply.code(404).send({ error: 'Карточка не найдена' });
    }

    db.prepare('INSERT INTO likes (user_id, card_id) VALUES (?, ?)').run(user.id, cardId);

    // Отправляем событие в ClarityRec Core
    try {
      await axios.post(`${CORE_SERVICE_URL}/api/v1/events`, {
        api_key: API_KEY,
        user_id: `user_${user.id}`,
        item_id: `card_${cardId}`,
        event_type: 'like',
        metadata: {
          category: card.category
        }
      });
      fastify.log.info(`Событие лайка отправлено в ClarityRec Core для пользователя ${user.id}`);
    } catch (coreError: any) {
      fastify.log.warn(`Не удалось отправить событие в ClarityRec Core: ${coreError.message}`);
      // Не прерываем операцию, если сервис рекомендаций недоступен
    }

    // Проверяем количество лайков
    const likeCount = db.prepare('SELECT COUNT(*) as cnt FROM likes WHERE user_id = ?').get(user.id) as { cnt: number };

    // Если >= 5 лайков, устанавливаем флаг готовности рекомендаций
    if (likeCount.cnt >= 5) {
      db.prepare('UPDATE users SET is_recommendation_ready = 1 WHERE id = ?').run(user.id);
      
      // Синхронизируем каталог с ClarityRec Core при достижении порога
      try {
        const allCards = db.prepare('SELECT id, category FROM cards').all() as Array<{ id: number; category: string }>;
        const catalogItems = allCards.map(c => ({
          item_id: `card_${c.id}`,
          categories: [c.category],
          tags: [],
          features: {}
        }));
        
        await axios.post(`${CORE_SERVICE_URL}/api/v1/catalog/sync`, {
          api_key: API_KEY,
          items: catalogItems
        });
        fastify.log.info(`Каталог синхронизирован с ClarityRec Core (${catalogItems.length} элементов)`);
      } catch (syncError: any) {
        fastify.log.warn(`Не удалось синхронизировать каталог: ${syncError.message}`);
      }
    }

    return { success: true, likeCount: likeCount.cnt };
  } catch (e: any) {
    if (e.message.includes('UNIQUE')) {
      return reply.code(400).send({ error: 'Вы уже лайкнули эту карточку' });
    }
    throw e;
  }
});

// Получить количество лайков пользователя
fastify.get('/api/likes/count', {
  preHandler: [fastify.authenticate]
}, async (request, reply) => {
  const user = request.user as any;
  if (user.role !== 'user') {
    return reply.code(403).send({ error: 'Доступ только для пользователей' });
  }

  const result = db.prepare('SELECT COUNT(*) as cnt FROM likes WHERE user_id = ?').get(user.id) as { cnt: number };
  return { count: result.cnt };
});

// ==================== RECOMMENDATIONS (заглушка под будущий XAI) ====================

// Получение персональных рекомендаций через ClarityRec Core
fastify.get('/api/recommendations', {
  preHandler: [fastify.authenticate]
}, async (request, reply) => {
  const user = request.user as any;
  if (user.role !== 'user') {
    return reply.code(403).send({ error: 'Доступ только для пользователей' });
  }

  const userData = db.prepare('SELECT is_recommendation_ready FROM users WHERE id = ?').get(user.id) as any;

  if (!userData.is_recommendation_ready) {
    return reply.code(400).send({ error: 'Рекомендации ещё не сформированы. Необходимо минимум 5 лайков.' });
  }

  try {
    // Запрашиваем рекомендации у ClarityRec Core
    const coreResponse = await axios.post(`${CORE_SERVICE_URL}/api/v1/recommend`, {
      api_key: API_KEY,
      user_id: `user_${user.id}`,
      limit: 10,
      context: {
        device: 'web',
        role: 'user'
      }
    });

    const recommendations = coreResponse.data.recommendations || [];
    
    // Преобразуем рекомендации в формат для фронтенда
    const recommendedCards = recommendations.map((rec: any) => {
      // Извлекаем ID карточки из item_id (формат: card_123)
      const cardId = parseInt(rec.item_id.replace('card_', ''), 10);
      
      // Получаем информацию о карточке из БД
      const card = db.prepare('SELECT id, title, category, image_url FROM cards WHERE id = ?').get(cardId) as any;
      
      if (!card) {
        return null;
      }

      // Формируем объяснение на основе feature_impacts
      let explanation = '';
      if (rec.feature_impacts && rec.feature_impacts.length > 0) {
        const topImpacts = rec.feature_impacts
          .filter((imp: any) => imp.direction === 'positive')
          .slice(0, 2)
          .map((imp: any) => `${imp.name} (${Math.round(imp.weight * 100)}%)`);
        
        if (topImpacts.length > 0) {
          explanation = `Рекомендовано потому что: ${topImpacts.join(', ')}`;
        }
      }

      return {
        ...card,
        score: rec.score,
        explanation,
        feature_impacts: rec.feature_impacts || []
      };
    }).filter(Boolean);

    return {
      ready: true,
      message: 'Рекомендации сформированы',
      request_id: coreResponse.data.request_id,
      meta: coreResponse.data.meta,
      recommendations: recommendedCards
    };
  } catch (coreError: any) {
    fastify.log.error(`Ошибка при получении рекомендаций из ClarityRec Core: ${coreError.message}`);
    
    // Fallback: возвращаем популярные карточки на основе лайков пользователя
    const likedCategories = db.prepare(`
      SELECT c.category, COUNT(*) as cnt 
      FROM likes l 
      JOIN cards c ON l.card_id = c.id 
      WHERE l.user_id = ? 
      GROUP BY c.category 
      ORDER BY cnt DESC
    `).all(user.id) as Array<{ category: string; cnt: number }>;

    const topCategory = likedCategories[0]?.category;
    
    const fallbackCards = db.prepare(`
      SELECT id, title, category, image_url 
      FROM cards 
      WHERE category = ? 
      AND id NOT IN (SELECT card_id FROM likes WHERE user_id = ?)
      LIMIT 10
    `).all(topCategory || 'Технологии', user.id) as any[];

    return {
      ready: true,
      message: 'Рекомендации сформированы (fallback режим)',
      recommendations: fallbackCards.map(card => ({
        ...card,
        score: 0.5,
        explanation: 'Рекомендовано на основе ваших предпочтений',
        feature_impacts: []
      }))
    };
  }
});

// Получение объяснения рекомендаций через ClarityRec Core (XAI)
fastify.get('/api/explain', {
  preHandler: [fastify.authenticate]
}, async (request, reply) => {
  const user = request.user as any;
  if (user.role !== 'user') {
    return reply.code(403).send({ error: 'Доступ только для пользователей' });
  }

  const userData = db.prepare('SELECT is_recommendation_ready FROM users WHERE id = ?').get(user.id) as any;

  if (!userData.is_recommendation_ready) {
    return reply.code(400).send({ error: 'Рекомендации ещё не сформированы. Необходимо минимум 5 лайков.' });
  }

  try {
    // Получаем последние рекомендации для объяснения
    const coreResponse = await axios.post(`${CORE_SERVICE_URL}/api/v1/recommend`, {
      api_key: API_KEY,
      user_id: `user_${user.id}`,
      limit: 5,
      context: {
        device: 'web',
        role: 'user'
      }
    });

    const recommendations = coreResponse.data.recommendations || [];
    
    // Анализируем feature_impacts для формирования общего объяснения
    const allImpacts: Record<string, number> = {};
    recommendations.forEach((rec: any) => {
      if (rec.feature_impacts) {
        rec.feature_impacts.forEach((imp: any) => {
          if (imp.direction === 'positive') {
            allImpacts[imp.name] = (allImpacts[imp.name] || 0) + imp.weight;
          }
        });
      }
    });

    // Сортируем факторы по весу
    const sortedFactors = Object.entries(allImpacts)
      .map(([name, weight]) => ({ name, weight: weight / recommendations.length }))
      .sort((a, b) => b.weight - a.weight);

    // Формируем текстовое объяснение
    let explanationText = 'Наши рекомендации основаны на анализе ваших предпочтений. ';
    if (sortedFactors.length > 0) {
      const topFactors = sortedFactors.slice(0, 3).map(f => `${f.name} (${Math.round(f.weight * 100)}%)`);
      explanationText += `Основные факторы: ${topFactors.join(', ')}. `;
    }
    explanationText += 'Система проанализировала ваши лайки и подобрала контент, который соответствует вашим интересам.';

    // Получаем статистику по категориям
    const categoryStats = db.prepare(`
      SELECT c.category, COUNT(*) as cnt 
      FROM likes l 
      JOIN cards c ON l.card_id = c.id 
      WHERE l.user_id = ? 
      GROUP BY c.category 
      ORDER BY cnt DESC
    `).all(user.id) as Array<{ category: string; cnt: number }>;

    return {
      explanation: explanationText,
      factors: sortedFactors,
      category_preferences: categoryStats,
      meta: {
        model_version: coreResponse.data.meta?.model_version || '1.0.0',
        total_events: coreResponse.data.meta?.total_events || 0
      }
    };
  } catch (coreError: any) {
    fastify.log.error(`Ошибка при получении объяснения из ClarityRec Core: ${coreError.message}`);
    
    // Fallback объяснение
    const categoryStats = db.prepare(`
      SELECT c.category, COUNT(*) as cnt 
      FROM likes l 
      JOIN cards c ON l.card_id = c.id 
      WHERE l.user_id = ? 
      GROUP BY c.category 
      ORDER BY cnt DESC
    `).all(user.id) as Array<{ category: string; cnt: number }>;

    const topCategory = categoryStats[0]?.category;

    return {
      explanation: `Наши рекомендации основаны на ваших предпочтениях. Вы проявили наибольший интерес к категории "${topCategory}". Система продолжит учиться на ваших действиях, чтобы улучшить рекомендации.`,
      factors: [
        { name: 'Частота лайков', weight: 0.4 },
        { name: 'Разнообразие категорий', weight: 0.3 },
        { name: 'Последняя активность', weight: 0.3 }
      ],
      category_preferences: categoryStats,
      meta: {
        model_version: 'fallback-1.0.0',
        total_events: categoryStats.reduce((sum, s) => sum + s.cnt, 0)
      }
    };
  }
});

// Запуск сервера
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('🚀 Сервер запущен на http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
