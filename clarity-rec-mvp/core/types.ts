/**
 * Типы данных для ClarityRec Core
 */

// События от клиента
export type EventType = 'like' | 'view' | 'purchase';

export interface EventInput {
  api_key: string;
  user_id: string;
  item_id: string;
  event_type: EventType;
  metadata?: Record<string, any>;
}

export interface EventResponse {
  status: 'ok';
  user_events_count: number;
  recommendation_ready: boolean;
}

// Запрос рекомендаций
export interface RecommendationRequest {
  api_key: string;
  user_id: string;
  limit: number;
  context?: {
    device?: string;
    role?: string;
  };
}

export interface FeatureImpact {
  name: string;
  weight: number;
  direction: 'positive' | 'negative';
}

export interface RecommendationItem {
  item_id: string;
  score: number;
  feature_impacts: FeatureImpact[];
}

export interface RecommendationResponse {
  request_id: string;
  recommendations: RecommendationItem[];
  meta: {
    model_version: string;
    latency_ms: number;
  };
}

// Элемент каталога
export interface CatalogItem {
  item_id: string;
  categories: string[];
  tags: string[];
  features: Record<string, number>;
}

export interface CatalogSyncInput {
  api_key: string;
  items: CatalogItem[];
}

export interface CatalogSyncResponse {
  status: 'ok';
  synced_count: number;
}

// Профиль пользователя (в памяти)
export interface UserProfile {
  user_id: string;
  category_weights: Record<string, number>;
  tag_weights: Record<string, number>;
  feature_weights: Record<string, number>;
  events_count: number;
  likes_count: number;
  last_updated: Date;
}

// Вектор для вычислений
export interface Vector {
  [key: string]: number;
}
