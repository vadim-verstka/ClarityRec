# ClarityRec Core — Автономная система рекомендаций

Интеллектуальная система рекомендаций с прозрачными объяснениями (XAI-ready). Предоставляет REST API для приема событий взаимодействия пользователей, формирования персонализированных рекомендаций и объяснения факторов влияния.

## 🚀 Быстрый старт

### 1. Запуск через Docker

```bash
cd core

# Создать .env файл из примера
cp .env.example .env

# Запустить контейнер
docker build -t clarityrec-core .
docker run -p 3001:3001 --env-file .env clarityrec-core
```

### 2. Локальный запуск (для разработки)

```bash
cd core

# Установить зависимости
npm install

# Скопировать переменные окружения
cp .env.example .env

# Запустить в режиме разработки
npm run dev

# Или собрать и запустить продакшн версию
npm run build
npm start
```

Сервер будет доступен по адресу: **http://localhost:3001**

Swagger UI (документация API): **http://localhost:3001/docs**

## 🔑 API-ключ

По умолчанию используется ключ: `clarity-rec-demo-api-key-2024`

Для изменения создайте файл `.env`:
```env
API_KEY=your-custom-api-key-here
PORT=3001
NODE_ENV=development
CORS_ORIGINS=*
```

Все запросы к API должны содержать заголовок:
```
X-API-Key: clarity-rec-demo-api-key-2024
```

## 📡 API Endpoints

### 1. Синхронизация каталога

Перед отправкой событий необходимо загрузить каталог элементов.

**Endpoint:** `POST /api/v1/catalog/sync`

**Request:**
```json
{
  "items": [
    {
      "item_id": "card_1",
      "categories": ["Технологии"],
      "tags": ["ИИ", "машинное обучение"],
      "features": {
        "complexity": 0.8,
        "popularity": 0.9
      }
    },
    {
      "item_id": "card_2",
      "categories": ["Образование"],
      "tags": ["курсы", "онлайн"],
      "features": {
        "complexity": 0.5,
        "popularity": 0.7
      }
    }
  ]
}
```

**Response:**
```json
{
  "status": "ok",
  "synced_count": 2
}
```

**Пример curl:**
```bash
curl -X POST http://localhost:3001/api/v1/catalog/sync \
  -H "Content-Type: application/json" \
  -H "X-API-Key: clarity-rec-demo-api-key-2024" \
  -d '{
    "items": [
      {
        "item_id": "card_1",
        "categories": ["Технологии"],
        "tags": ["ИИ", "машинное обучение"],
        "features": {"complexity": 0.8, "popularity": 0.9}
      }
    ]
  }'
```

---

### 2. Отправка события (лайк/просмотр/покупка)

Отправьте событие взаимодействия пользователя с элементом.

**Endpoint:** `POST /api/v1/events`

**Request:**
```json
{
  "user_id": "user_123",
  "item_id": "card_1",
  "event_type": "like",
  "metadata": {
    "source": "mobile_app"
  }
}
```

**Response:**
```json
{
  "status": "ok",
  "user_events_count": 1,
  "recommendation_ready": false
}
```

**Примечание:** `recommendation_ready` становится `true` после ≥3 лайков.

**Пример curl:**
```bash
curl -X POST http://localhost:3001/api/v1/events \
  -H "Content-Type: application/json" \
  -H "X-API-Key: clarity-rec-demo-api-key-2024" \
  -d '{
    "user_id": "user_123",
    "item_id": "card_1",
    "event_type": "like"
  }'
```

---

### 3. Получение рекомендаций

Получите персонализированные рекомендации с объяснением факторов влияния.

**Endpoint:** `POST /api/v1/recommend`

**Request:**
```json
{
  "user_id": "user_123",
  "limit": 5,
  "context": {
    "device": "mobile",
    "role": "student"
  }
}
```

**Response:**
```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "recommendations": [
    {
      "item_id": "card_2",
      "score": 0.923456,
      "feature_impacts": [
        {
          "name": "Категория: Технологии",
          "weight": 1.0,
          "direction": "positive"
        },
        {
          "name": "Тег: ИИ",
          "weight": 0.85,
          "direction": "positive"
        },
        {
          "name": "Признак: complexity",
          "weight": 0.62,
          "direction": "positive"
        }
      ]
    }
  ],
  "meta": {
    "model_version": "cosine-similarity-v1.0",
    "latency_ms": 12
  }
}
```

**Пример curl:**
```bash
curl -X POST http://localhost:3001/api/v1/recommend \
  -H "Content-Type: application/json" \
  -H "X-API-Key: clarity-rec-demo-api-key-2024" \
  -d '{
    "user_id": "user_123",
    "limit": 5
  }'
```

---

### 4. Health Check

Проверка работоспособности сервиса (без API-ключа).

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

**Пример curl:**
```bash
curl http://localhost:3001/health
```

---

## 🧠 Алгоритм рекомендаций

1. **Сбор предпочтений**: При каждом событии (`like`, `view`, `purchase`) обновляются веса категорий, тегов и признаков в профиле пользователя.
   - `like`: вес 1.0
   - `view`: вес 0.3
   - `purchase`: вес 2.0

2. **Векторизация**: Профиль пользователя и элементы каталога представляются как векторы в многомерном пространстве признаков.

3. **Косинусное сходство**: Для каждого элемента вычисляется косинусное сходство между вектором профиля и вектором элемента.

4. **Расчет влияний (Feature Impacts)**: Для каждой рекомендации определяется вклад отдельных признаков (категории, теги, features) в итоговый скор. Веса нормализуются к диапазону [0, 1].

5. **Ранжирование**: Элементы сортируются по убыванию скора, возвращаются Top-K.

## 📊 Документация API

Полная интерактивная документация доступна через Swagger UI:

**http://localhost:3001/docs**

Там можно:
- Просмотреть все эндпоинты
- Изучить схемы запросов/ответов
- Протестировать API прямо из браузера

## 🔧 Интеграция с основным приложением

### Пример интеграции на Node.js

```typescript
import axios from 'axios';

const CLARITYREC_API_URL = 'http://localhost:3001';
const API_KEY = 'clarity-rec-demo-api-key-2024';

const apiClient = axios.create({
  baseURL: CLARITYREC_API_URL,
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
  }
});

// Синхронизация каталога
async function syncCatalog(items: Array<{item_id: string, categories: string[], tags: string[], features: Record<string, number>}>) {
  const response = await apiClient.post('/api/v1/catalog/sync', { items });
  return response.data;
}

// Отправка лайка
async function sendLike(userId: string, itemId: string) {
  const response = await apiClient.post('/api/v1/events', {
    user_id: userId,
    item_id: itemId,
    event_type: 'like'
  });
  return response.data;
}

// Получение рекомендаций
async function getRecommendations(userId: string, limit: number = 5) {
  const response = await apiClient.post('/api/v1/recommend', {
    user_id: userId,
    limit
  });
  return response.data;
}
```

## 🐳 Docker Compose (опционально)

Добавьте сервис в ваш `docker-compose.yml`:

```yaml
services:
  clarityrec-core:
    build:
      context: ./core
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - API_KEY=clarity-rec-demo-api-key-2024
      - NODE_ENV=production
      - CORS_ORIGINS=http://localhost:5173,http://localhost:80
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3001/health"]
      interval: 30s
      timeout: 3s
      retries: 3
```

## 📝 Структура проекта

```
core/
├── index.ts           # Точка входа, настройка Fastify
├── routes.ts          # Определение API маршрутов
├── auth.ts            # Проверка API-ключей
├── store.ts           # Хранилище данных в памяти
├── algorithm.ts       # Алгоритм рекомендаций (косинусное сходство)
├── types.ts           # TypeScript типы
├── package.json
├── tsconfig.json
├── Dockerfile
├── .env.example
└── README.md
```

## ⚙️ Конфигурация

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `API_KEY` | Ключ для доступа к API | `clarity-rec-demo-api-key-2024` |
| `PORT` | Порт сервера | `3001` |
| `NODE_ENV` | Режим работы (`development`/`production`) | `development` |
| `CORS_ORIGINS` | Разрешенные origins (через запятую) | `*` |

## 🚨 Важные замечания

1. **Хранение данных**: Сейчас данные хранятся в памяти (Map). При перезапуске сервиса все данные теряются. Для продакшена рекомендуется подключить Redis или PostgreSQL.

2. **Масштабирование**: Сервис stateless, можно запускать несколько экземпляров за балансировщиком нагрузки. Для общего хранилища используйте внешний Redis.

3. **Безопасность**: 
   - Смените API-ключ на уникальный в продакшене
   - Используйте HTTPS
   - Настройте CORS для конкретных доменов

4. **Готовность к расширению**: 
   - Архитектура готова к замене алгоритма на ML-модель
   - Можно добавить сохранение истории событий
   - Легко интегрировать A/B тестирование

## 📄 Лицензия

MIT
