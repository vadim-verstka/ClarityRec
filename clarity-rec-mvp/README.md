# ClarityRec MVP

Веб-приложение для демонстрации будущей системы рекомендаций с элементами XAI (Explainable AI).

## 🎯 Концепция

MVP состоит из двух ролей:
- **Админ**: входит, создаёт пользователей, переключается в режим просмотра от их имени
- **Пользователь**: видит ленту карточек (5 категорий), ставит лайки. После 5 лайков появляется статус "Рекомендации сформированы"

## 📦 Технологии

### Backend
- Node.js 20
- Fastify
- TypeScript (строгий режим)
- SQLite (better-sqlite3)
- JWT + bcrypt

### Frontend
- Vue 3
- TypeScript
- Vite
- Vue Router
- Pinia
- Axios

### Infra
- Docker Compose (backend + frontend + nginx + clarityrec-core)
- Чистый CSS, современный дизайн

### Микросервис рекомендаций (ClarityRec Core)
- Node.js 20+
- Fastify
- TypeScript
- Алгоритм: косинусное сходство векторов
- Валидация: ajv (JSON Schema)
- Документация: Swagger UI
- Auth: API-Key (X-API-Key header)

## 🚀 Быстрый старт

```bash
cd clarity-rec-mvp
docker compose up --build
```

Приложение будет доступно по адресу: http://localhost

**Swagger UI ClarityRec Core:** http://localhost/core-docs/

## 🔐 Учётные данные

**Админ:**
- Логин: `admin`
- Пароль: `admin123`

**API-ключ ClarityRec Core:** `clarity-rec-demo-api-key-2024`

## 📁 Структура проекта

```
clarity-rec-mvp/
├── server/                 # Основной бэкенд (аутентификация, пользователи, UI)
│   ├── index.ts            # Fastify сервер, все эндпоинты
│   ├── db.ts               # SQLite инициализация
│   ├── auth.ts             # JWT утилиты
│   └── package.json
├── client/                 # Vue 3 фронтенд
│   ├── src/
│   │   ├── views/          # Vue компоненты (Login, AdminPanel, UserFeed, UserProfile)
│   │   ├── stores/         # Pinia хранилища (auth, app)
│   │   ├── api.ts          # Axios instance + API методы
│   │   ├── router/         # Vue Router
│   │   └── App.vue
│   └── package.json
├── core/                   # Микросервис рекомендаций ClarityRec Core
│   ├── index.ts            # Точка входа Fastify
│   ├── routes.ts           # API маршруты (/api/v1/events, /recommend, /catalog/sync)
│   ├── auth.ts             # Проверка API-ключей
│   ├── store.ts            # Хранилище данных в памяти (Map)
│   ├── algorithm.ts        # Алгоритм рекомендаций (косинусное сходство + feature impacts)
│   ├── types.ts            # TypeScript типы
│   ├── Dockerfile
│   └── README.md           # Подробная документация API
├── docker-compose.yml
├── nginx.conf
└── README.md
```

## 🛠 API Endpoints

### Основной backend (порт 3000)

#### Auth
- `POST /api/auth/admin/login` - Вход админа

#### Users
- `GET /api/users` - Список пользователей (админ)
- `POST /api/users` - Создать пользователя (админ)
- `POST /api/users/:id/impersonate` - Переключиться на пользователя (админ)
- `GET /api/users/me` - Текущий пользователь

#### Cards
- `GET /api/cards` - Лента карточек

#### Likes
- `POST /api/likes` - Поставить лайк
- `GET /api/likes/count` - Количество лайков пользователя

#### Recommendations (заглушки под будущий XAI)
- `GET /api/recommend` - Получить рекомендации
- `GET /api/explain` - Объяснение рекомендаций

---

### ClarityRec Core (порт 3001, через nginx: /core-api/)

Микросервис рекомендаций с прозрачным алгоритмом и объяснениями (XAI-ready).

#### События
- `POST /core-api/events` - Отправить событие (лайк/просмотр/покупка)

#### Рекомендации
- `POST /core-api/recommend` - Получить персонализированные рекомендации с feature_impacts

#### Каталог
- `POST /core-api/catalog/sync` - Синхронизировать каталог элементов

#### Health & Docs
- `GET /health` - Проверка работоспособности
- `GET /core-docs/` - Swagger UI документация

> 📖 **Подробная документация ClarityRec Core:** см. [`core/README.md`](core/README.md)

## 🧠 Как работает система рекомендаций

1. **Синхронизация каталога**: Элементы каталога (карточки) загружаются в ClarityRec Core через `/core-api/catalog/sync`
2. **Сбор предпочтений**: При лайке карточки фронтенд отправляет событие в ClarityRec Core через `/core-api/events`
3. **Обновление профиля**: Сервис обновляет веса категорий, тегов и признаков в профиле пользователя
4. **Генерация рекомендаций**: При запросе `/core-api/recommend`:
   - Строится вектор предпочтений пользователя
   - Вычисляется косинусное сходство с векторами элементов каталога
   - Рассчитывается влияние каждого признака (feature_impacts)
   - Возвращается ранжированный список Top-K с объяснениями

## 🎨 Функционал

1. **Админ-панель**: просмотр списка пользователей, создание новых, переключение в режим пользователя
2. **Лента карточек**: 30 моковых карточек (5 категорий), лайки с анимацией
3. **Счётчик лайков**: прогресс-бар, уведомление при достижении 5 лайков
4. **Личный кабинет**: 
   - Если < 5 лайков: круговой прогресс, призыв ставить лайки
   - Если ≥ 5 лайков: карточка "Рекомендации готовы" с заглушкой под графики XAI

## 🔗 Интеграция ClarityRec Core

Пример отправки лайка в микросервис рекомендаций:

```bash
curl -X POST http://localhost/core-api/events \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "item_id": "card_1",
    "event_type": "like"
  }'
```

Пример получения рекомендаций:

```bash
curl -X POST http://localhost/core-api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "limit": 5
  }'
```

Ответ содержит рекомендации с объяснением влияния признаков:

```json
{
  "request_id": "uuid...",
  "recommendations": [
    {
      "item_id": "card_2",
      "score": 0.923456,
      "feature_impacts": [
        {"name": "Категория: Технологии", "weight": 1.0, "direction": "positive"},
        {"name": "Тег: ИИ", "weight": 0.85, "direction": "positive"}
      ]
    }
  ],
  "meta": {"model_version": "cosine-similarity-v1.0", "latency_ms": 12}
}
```

## 📝 Примечания

- База данных SQLite создаётся автоматически при первом запуске
- Админ `admin` создаётся автоматически с паролем `admin123`
- 30 моковых карточек генерируются при первом запуске
- JWT токен хранится в localStorage, срок действия — 7 дней
- ClarityRec Core хранит данные в памяти (при перезапуске данные теряются)
- Для продакшена рекомендуется подключить Redis/PostgreSQL к ClarityRec Core

## 🐳 Docker Compose сервисы

| Сервис | Порт | Описание |
|--------|------|----------|
| backend | 3000 | Основной бэкенд (аутентификация, пользователи) |
| clarityrec-core | 3001 | Микросервис рекомендаций |
| frontend | 5173 | Vue 3 фронтенд |
| nginx | 80 | Проксирование запросов |

## 📄 Лицензия

MIT
