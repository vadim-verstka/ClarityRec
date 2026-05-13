/**
 * Типы данных для XAI модуля
 */

// Входные данные для объяснения рекомендаций
export interface ExplanationRequest {
  user_id: string;
  recommendations: RecommendationItem[];
  user_profile?: UserProfileData;
  context?: {
    device?: string;
    locale?: string;
  };
}

// Элемент рекомендации
export interface RecommendationItem {
  item_id: string;
  score: number;
  feature_impacts: FeatureImpact[];
  categories?: string[];
  metadata?: Record<string, any>;
}

// Влияние признака
export interface FeatureImpact {
  name: string;
  weight: number;
  direction: 'positive' | 'negative';
}

// Данные профиля пользователя
export interface UserProfileData {
  user_id: string;
  category_weights: Record<string, number>;
  tag_weights: Record<string, number>;
  feature_weights: Record<string, number>;
  events_count: number;
  likes_count: number;
  liked_categories?: Array<{ category: string; count: number }>;
}

// Результат объяснения
export interface ExplanationResponse {
  request_id: string;
  user_id: string;
  
  // Текстовое объяснение
  text_explanation: TextExplanation;
  
  // Визуализации
  visualizations: Visualization[];
  
  // Детальные данные
  detailed_data: DetailedData;
  
  // Метаданные
  meta: {
    model_version: string;
    generated_at: string;
    latency_ms: number;
  };
}

// Текстовое объяснение
export interface TextExplanation {
  summary: string;
  main_factors: string[];
  personalized_message: string;
}

// Типы визуализаций
export type VisualizationType = 
  | 'bar_chart'
  | 'pie_chart'
  | 'radar_chart'
  | 'timeline'
  | 'heatmap'
  | 'network_graph';

export interface Visualization {
  type: VisualizationType;
  title: string;
  description: string;
  data: ChartData;
  config?: VisualizationConfig;
}

export interface ChartData {
  labels: string[];
  datasets: Dataset[];
  [key: string]: any;
}

export interface Dataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
}

export interface VisualizationConfig {
  showLegend?: boolean;
  showValues?: boolean;
  orientation?: 'horizontal' | 'vertical';
  colorScheme?: string[];
  min?: number;
  max?: number;
}

// Детальные данные
export interface DetailedData {
  category_breakdown: CategoryBreakdown[];
  feature_importance: FeatureImportance[];
  recommendation_reasons: RecommendationReason[];
  user_journey?: UserJourneyStep[];
}

export interface CategoryBreakdown {
  category: string;
  weight: number;
  percentage: number;
  liked_count: number;
  recommended_count: number;
}

export interface FeatureImportance {
  name: string;
  importance: number;
  direction: 'positive' | 'negative';
  description: string;
}

export interface RecommendationReason {
  item_id: string;
  reasons: string[];
  top_factors: FeatureImpact[];
}

export interface UserJourneyStep {
  timestamp: string;
  action: string;
  item_id?: string;
  category?: string;
}

// Конфигурация модуля
export interface XAIModuleConfig {
  apiBaseUrl: string;
  apiKey: string;
  defaultLocale?: string;
  enableCaching?: boolean;
  cacheTtlSeconds?: number;
}

// Адаптер для подключения к разным системам рекомендаций
export interface RecommendationSystemAdapter {
  getUserProfile(userId: string): Promise<UserProfileData>;
  getRecommendations(userId: string, limit?: number): Promise<RecommendationItem[]>;
  getUserEvents(userId: string): Promise<UserJourneyStep[]>;
}
