import axios from 'axios';
import {
  UserProfileData,
  RecommendationItem,
  UserJourneyStep,
  FeatureImpact
} from './types';

/**
 * Адаптер для подключения к ClarityRec Core API
 * 
 * Этот адаптер позволяет XAI модулю работать с системой рекомендаций ClarityRec
 * Может быть заменён на другой адаптер для интеграции с другими системами
 */
export class ClarityRecAdapter {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Получить профиль пользователя из ClarityRec Core
   */
  async getUserProfile(userId: string): Promise<UserProfileData> {
    try {
      // В текущей версии ClarityRec не имеет endpoint для получения профиля
      // Поэтому мы получаем его через рекомендации и события
      const recommendations = await this.getRecommendations(userId, 5);
      
      // Анализируем feature_impacts из рекомендаций для восстановления профиля
      const categoryWeights: Record<string, number> = {};
      const tagWeights: Record<string, number> = {};
      const featureWeights: Record<string, number> = {};

      recommendations.forEach(rec => {
        rec.feature_impacts.forEach(impact => {
          if (impact.name.startsWith('Категория: ')) {
            const catName = impact.name.replace('Категория: ', '');
            categoryWeights[catName] = (categoryWeights[catName] || 0) + impact.weight;
          } else if (impact.name.startsWith('Тег: ')) {
            const tagName = impact.name.replace('Тег: ', '');
            tagWeights[tagName] = (tagWeights[tagName] || 0) + impact.weight;
          } else if (impact.name.startsWith('Признак: ')) {
            const featName = impact.name.replace('Признак: ', '');
            featureWeights[featName] = (featureWeights[featName] || 0) + impact.weight;
          }
        });
      });

      // Получаем события для подсчёта лайков
      const events = await this.getUserEvents(userId);
      const likesCount = events.filter(e => e.action === 'like').length;

      return {
        user_id: userId,
        category_weights: categoryWeights,
        tag_weights: tagWeights,
        feature_weights: featureWeights,
        events_count: events.length,
        likes_count: likesCount
      };
    } catch (error: any) {
      console.error('Ошибка получения профиля:', error.message);
      
      // Возвращаем пустой профиль при ошибке
      return {
        user_id: userId,
        category_weights: {},
        tag_weights: {},
        feature_weights: {},
        events_count: 0,
        likes_count: 0
      };
    }
  }

  /**
   * Получить рекомендации из ClarityRec Core
   */
  async getRecommendations(userId: string, limit: number = 10): Promise<RecommendationItem[]> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/v1/recommend`, {
        api_key: this.apiKey,
        user_id: userId,
        limit: limit,
        context: {
          device: 'web',
          role: 'user'
        }
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data.recommendations || [];
    } catch (error: any) {
      console.error('Ошибка получения рекомендаций:', error.message);
      return [];
    }
  }

  /**
   * Получить события пользователя
   * В текущей версии ClarityRec не имеет endpoint для получения событий
   * Поэтому возвращаем заглушку
   */
  async getUserEvents(userId: string): Promise<UserJourneyStep[]> {
    try {
      // Пока возвращаем пустой список, т.к. в ClarityRec нет такого endpoint
      // В будущем можно добавить endpoint GET /api/v1/users/:user_id/events
      return [];
    } catch (error: any) {
      console.error('Ошибка получения событий:', error.message);
      return [];
    }
  }

  /**
   * Отправить событие в ClarityRec Core
   */
  async sendEvent(
    userId: string,
    itemId: string,
    eventType: 'like' | 'view' | 'purchase',
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      await axios.post(`${this.baseUrl}/api/v1/events`, {
        api_key: this.apiKey,
        user_id: userId,
        item_id: itemId,
        event_type: eventType,
        metadata
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return true;
    } catch (error: any) {
      console.error('Ошибка отправки события:', error.message);
      return false;
    }
  }
}

/**
 * Универсальный адаптер для любой системы рекомендаций
 * 
 * Позволяет подключить XAI модуль к произвольной системе рекомендаций
 * через настройку endpoints
 */
export class GenericRecommendationAdapter {
  private config: {
    userProfileEndpoint: string;
    recommendationsEndpoint: string;
    eventsEndpoint: string;
    apiKey?: string;
    headers?: Record<string, string>;
  };

  constructor(config: {
    userProfileEndpoint: string;
    recommendationsEndpoint: string;
    eventsEndpoint: string;
    apiKey?: string;
    headers?: Record<string, string>;
  }) {
    this.config = config;
  }

  async getUserProfile(userId: string): Promise<UserProfileData> {
    const url = this.config.userProfileEndpoint.replace('{user_id}', userId);
    
    const response = await axios.get(url, {
      headers: {
        ...(this.config.apiKey && { 'X-API-Key': this.config.apiKey }),
        ...this.config.headers
      }
    });

    return response.data;
  }

  async getRecommendations(userId: string, limit: number = 10): Promise<RecommendationItem[]> {
    const url = this.config.recommendationsEndpoint.replace('{user_id}', userId);
    
    const response = await axios.get(url, {
      params: { limit },
      headers: {
        ...(this.config.apiKey && { 'X-API-Key': this.config.apiKey }),
        ...this.config.headers
      }
    });

    return response.data.recommendations || [];
  }

  async getUserEvents(userId: string): Promise<UserJourneyStep[]> {
    const url = this.config.eventsEndpoint.replace('{user_id}', userId);
    
    const response = await axios.get(url, {
      headers: {
        ...(this.config.apiKey && { 'X-API-Key': this.config.apiKey }),
        ...this.config.headers
      }
    });

    return response.data.events || [];
  }
}
