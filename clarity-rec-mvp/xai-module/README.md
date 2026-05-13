# XAI Module - Независимый адаптивный модуль визуализации объяснений

## Описание

Этот модуль является **независимым** и **адаптивным** компонентом системы рекомендаций, который:

- **Независимость**: Работает через API, не зависит от конкретной реализации системы рекомендаций
- **Адаптивность**: Может быть подключён к любой системе рекомендаций через адаптеры
- **Визуализация**: Генерирует данные для графиков и диаграмм объяснений
- **Объяснимость**: Предоставляет текстовые объяснения рекомендаций на понятном языке

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    XAI Module                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Explanation Engine                                  │   │
│  │  - Генерация текстовых объяснений                    │   │
│  │  - Создание данных для визуализаций                  │   │
│  │  - Анализ факторов влияния                           │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Adapters                                            │   │
│  │  - ClarityRecAdapter (для ClarityRec Core)           │   │
│  │  - GenericRecommendationAdapter (для любых систем)   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↕
                    REST API (HTTP/JSON)
                              ↕
┌─────────────────────────────────────────────────────────────┐
│              Любая система рекомендаций                     │
│              (ClarityRec Core или другая)                   │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

### GET /health
Проверка работоспособности сервиса.

### POST /api/explain
Получить полное объяснение рекомендаций.

**Request Body:**
```json
{
  "user_id": "user_123",
  "recommendations": [
    {
      "item_id": "item_1",
      "score": 0.95,
      "feature_impacts": [
        {"name": "Категория: Технологии", "weight": 0.8, "direction": "positive"}
      ],
      "categories": ["Технологии"]
    }
  ],
  "context": {
    "device": "web",
    "locale": "ru"
  }
}
```

**Response:**
```json
{
  "request_id": "uuid",
  "user_id": "user_123",
  "text_explanation": {
    "summary": "Рекомендации сформированы на основе анализа 5 лайков пользователя.",
    "main_factors": [
      "Предпочтение категории \"Технологии\" (8 баллов)",
      "Активное взаимодействие (5 лайков)"
    ],
    "personalized_message": "Мы проанализировали ваши 5 лайков..."
  },
  "visualizations": [
    {
      "type": "bar_chart",
      "title": "📊 Ваши интересы по категориям",
      "data": {
        "labels": ["Технологии", "Образование"],
        "datasets": [{"label": "Интерес (%)", "data": [95, 87]}]
      }
    }
  ],
  "detailed_data": {
    "category_breakdown": [...],
    "feature_importance": [...],
    "recommendation_reasons": [...]
  },
  "meta": {
    "model_version": "xai-engine-v1.0",
    "generated_at": "2024-01-01T00:00:00Z",
    "latency_ms": 45
  }
}
```

### GET /api/explain/:user_id
Получить объяснение для пользователя (GET версия).

### GET /api/visualizations/:user_id
Получить только данные для визуализаций.

### GET /api/factors/:user_id
Получить факторы влияния на рекомендации.

## Интеграция с другими системами

### Через ClarityRecAdapter
```typescript
import { XAIModuleServer } from './src/index';

const server = new XAIModuleServer({
  port: 3002,
  coreApiUrl: 'http://clarityrec-core:3001',
  apiKey: 'your-api-key'
});

server.start();
```

### Через GenericRecommendationAdapter (для любой системы)
```typescript
import { GenericRecommendationAdapter, ExplanationEngine } from './src';

// Настройте adapter под вашу систему
const adapter = new GenericRecommendationAdapter({
  userProfileEndpoint: 'https://your-rec-system.com/api/users/{user_id}/profile',
  recommendationsEndpoint: 'https://your-rec-system.com/api/users/{user_id}/recommendations',
  eventsEndpoint: 'https://your-rec-system.com/api/users/{user_id}/events',
  apiKey: 'your-api-key'
});

// Используйте engine напрямую
const engine = new ExplanationEngine();
const profile = await adapter.getUserProfile('user_123');
const recommendations = await adapter.getRecommendations('user_123');
const events = await adapter.getUserEvents('user_123');

const explanation = await engine.generateExplanation(
  { user_id: 'user_123', recommendations },
  profile,
  events
);
```

## Запуск в Docker

```bash
cd xai-module
docker build -t clarityrec-xai-module .
docker run -p 3002:3002 \
  -e CORE_API_URL=http://clarityrec-core:3001 \
  -e API_KEY=your-api-key \
  clarityrec-xai-module
```

## Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| PORT | Порт сервера | 3002 |
| HOST | Хост сервера | 0.0.0.0 |
| CORE_API_URL | URL системы рекомендаций | http://localhost:3001 |
| API_KEY | API ключ для доступа к системе рекомендаций | - |

## Структура проекта

```
xai-module/
├── src/
│   ├── types.ts              # Типы TypeScript
│   ├── explanation-engine.ts # Движок генерации объяснений
│   ├── adapters.ts           # Адаптеры для систем рекомендаций
│   └── index.ts              # Основной сервер и экспорты
├── server.ts                 # Точка входа
├── package.json
├── tsconfig.json
└── Dockerfile
```

## Типы визуализаций

Модуль поддерживает следующие типы визуализаций:

1. **bar_chart** - Столбчатая диаграмма для сравнения категорий
2. **pie_chart** - Круговая диаграмма для распределения долей
3. **radar_chart** - Лепестковая диаграмма для многомерного профиля
4. **timeline** - Временная шкала активности пользователя
5. **heatmap** - Тепловая карта взаимодействий
6. **network_graph** - Граф связей между элементами

## Пример ответа с визуализацией

```json
{
  "type": "bar_chart",
  "title": "📊 Ваши интересы по категориям",
  "description": "Показывает распределение предпочтений по категориям",
  "data": {
    "labels": ["Технологии", "Образование", "Финансы"],
    "datasets": [{
      "label": "Интерес (%)",
      "data": [95, 87, 72],
      "backgroundColor": ["#3498db", "#27ae60", "#e67e22"]
    }]
  },
  "config": {
    "showLegend": false,
    "showValues": true,
    "orientation": "vertical"
  }
}
```

Эти данные можно напрямую передать в Chart.js или другую библиотеку визуализации.
