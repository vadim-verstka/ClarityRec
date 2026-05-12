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
- Docker Compose (backend + frontend + nginx)
- Чистый CSS, современный дизайн

## 🚀 Быстрый старт

```bash
cd clarity-rec-mvp
docker compose up --build
```

Приложение будет доступно по адресу: http://localhost

## 🔐 Учётные данные

**Админ:**
- Логин: `admin`
- Пароль: `admin123`

## 📁 Структура проекта

```
clarity-rec-mvp/
├── server/
│   ├── index.ts          # Fastify сервер, все эндпоинты
│   ├── db.ts             # SQLite инициализация
│   ├── auth.ts           # JWT утилиты
│   └── package.json
├── client/
│   ├── src/
│   │   ├── views/        # Vue компоненты (Login, AdminPanel, UserFeed, UserProfile)
│   │   ├── stores/       # Pinia хранилища (auth, app)
│   │   ├── api.ts        # Axios instance + API методы
│   │   ├── router/       # Vue Router
│   │   └── App.vue
│   └── package.json
├── docker-compose.yml
├── nginx.conf
└── README.md
```

## 🛠 API Endpoints

### Auth
- `POST /api/auth/admin/login` - Вход админа

### Users
- `GET /api/users` - Список пользователей (админ)
- `POST /api/users` - Создать пользователя (админ)
- `POST /api/users/:id/impersonate` - Переключиться на пользователя (админ)
- `GET /api/users/me` - Текущий пользователь

### Cards
- `GET /api/cards` - Лента карточек

### Likes
- `POST /api/likes` - Поставить лайк
- `GET /api/likes/count` - Количество лайков пользователя

### Recommendations (заглушки под будущий XAI)
- `GET /api/recommend` - Получить рекомендации
- `GET /api/explain` - Объяснение рекомендаций

> ⚠️ В коде есть комментарии `// TODO: ClarityRec Core Integration` на местах будущей интеграции ML-модуля.

## 🎨 Функционал

1. **Админ-панель**: просмотр списка пользователей, создание новых, переключение в режим пользователя
2. **Лента карточек**: 30 моковых карточек (5 категорий), лайки с анимацией
3. **Счётчик лайков**: прогресс-бар, уведомление при достижении 5 лайков
4. **Личный кабинет**: 
   - Если < 5 лайков: круговой прогресс, призыв ставить лайки
   - Если ≥ 5 лайков: карточка "Рекомендации готовы" с заглушкой под графики XAI

## 📝 Примечания

- База данных SQLite создаётся автоматически при первом запуске
- Админ `admin` создаётся автоматически с паролем `admin123`
- 30 моковых карточек генерируются при первом запуске
- JWT токен хранится в localStorage, срок действия — 7 дней
