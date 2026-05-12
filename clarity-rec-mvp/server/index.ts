import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import bcrypt from 'bcrypt';
import db from './db.js';

const fastify = Fastify({ logger: true });

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
    db.prepare('INSERT INTO likes (user_id, card_id) VALUES (?, ?)').run(user.id, cardId);

    // Проверяем количество лайков
    const likeCount = db.prepare('SELECT COUNT(*) as cnt FROM likes WHERE user_id = ?').get(user.id) as { cnt: number };

    // Если >= 5 лайков, устанавливаем флаг готовности рекомендаций
    if (likeCount.cnt >= 5) {
      db.prepare('UPDATE users SET is_recommendation_ready = 1 WHERE id = ?').run(user.id);
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

// TODO: ClarityRec Core Integration - эндпоинт для получения рекомендаций
fastify.get('/api/recommend', {
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

  // TODO: ClarityRec Core Integration - здесь будет вызов ML-модели для генерации рекомендаций
  // Пока возвращаем заглушку
  return {
    ready: true,
    message: 'Рекомендации сформированы',
    // В будущем здесь будут реальные рекомендации от XAI-модуля
    recommendations: [
      { category: 'Технологии', score: 0.95, reason: 'Вы часто лайкали карточки этой категории' },
      { category: 'Образование', score: 0.87, reason: 'Вы проявили интерес к образовательному контенту' }
    ]
  };
});

// TODO: ClarityRec Core Integration - эндпоинт для объяснения рекомендаций (XAI)
fastify.get('/api/explain', {
  preHandler: [fastify.authenticate]
}, async (request, reply) => {
  const user = request.user as any;
  if (user.role !== 'user') {
    return reply.code(403).send({ error: 'Доступ только для пользователей' });
  }

  // TODO: ClarityRec Core Integration - здесь будет логика объяснения рекомендаций от XAI-модуля
  // Пока возвращаем заглушку
  return {
    explanation: 'Наши рекомендации основаны на ваших предпочтениях. Вы показали высокий интерес к категориям: Технологии и Образование.',
    factors: [
      { name: 'Частота лайков', weight: 0.4 },
      { name: 'Разнообразие категорий', weight: 0.3 },
      { name: 'Время взаимодействия', weight: 0.3 }
    ]
  };
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
