import { UserProfile, CatalogItem, Vector } from './types';

/**
 * Хранилище данных в памяти
 */
class InMemoryStore {
  // Профили пользователей: user_id -> UserProfile
  private users: Map<string, UserProfile> = new Map();
  
  // Каталог товаров: item_id -> CatalogItem
  private catalog: Map<string, CatalogItem> = new Map();
  
  /**
   * Получить или создать профиль пользователя
   */
  getUserProfile(userId: string): UserProfile {
    if (!this.users.has(userId)) {
      this.users.set(userId, {
        user_id: userId,
        category_weights: {},
        tag_weights: {},
        feature_weights: {},
        events_count: 0,
        likes_count: 0,
        last_updated: new Date(),
        events: []
      });
    }
    return this.users.get(userId)!;
  }
  
  /**
   * Обновить профиль пользователя после события
   */
  updateUserProfile(
    userId: string,
    itemType: 'like' | 'view' | 'purchase',
    categories: string[],
    tags: string[],
    features: Record<string, number>
  ): UserProfile {
    const profile = this.getUserProfile(userId);
    
    // Веса для разных типов событий
    const weights = {
      like: 1.0,
      view: 0.3,
      purchase: 2.0
    };
    
    const baseWeight = weights[itemType];
    
    // Обновляем веса категорий
    for (const category of categories) {
      profile.category_weights[category] = 
        (profile.category_weights[category] || 0) + baseWeight;
    }
    
    // Обновляем веса тегов
    for (const tag of tags) {
      profile.tag_weights[tag] = 
        (profile.tag_weights[tag] || 0) + baseWeight * 0.5;
    }
    
    // Обновляем веса признаков
    for (const [featureName, featureValue] of Object.entries(features)) {
      profile.feature_weights[featureName] = 
        (profile.feature_weights[featureName] || 0) + (featureValue * baseWeight * 0.3);
    }
    
    // Обновляем счетчики
    profile.events_count += 1;
    if (itemType === 'like') {
      profile.likes_count += 1;
    }
    
    // Добавляем событие в историю
    profile.events.push({
      item_id: '', // itemId будет установлен в routes.ts
      event_type: itemType,
      timestamp: new Date()
    });
    
    profile.last_updated = new Date();
    
    return profile;
  }
  
  /**
   * Проверить готовность рекомендаций (≥3 лайков)
   */
  isRecommendationReady(userId: string): boolean {
    const profile = this.getUserProfile(userId);
    return profile.likes_count >= 3;
  }
  
  /**
   * Синхронизировать каталог
   */
  syncCatalog(items: CatalogItem[]): number {
    let syncedCount = 0;
    
    for (const item of items) {
      this.catalog.set(item.item_id, item);
      syncedCount++;
    }
    
    return syncedCount;
  }
  
  /**
   * Получить все элементы каталога
   */
  getAllCatalogItems(): CatalogItem[] {
    return Array.from(this.catalog.values());
  }
  
  /**
   * Получить элемент каталога по ID
   */
  getCatalogItem(itemId: string): CatalogItem | undefined {
    return this.catalog.get(itemId);
  }
  
  /**
   * Нормализовать вектор весов профиля
   */
  normalizeProfileVector(profile: UserProfile): Vector {
    const vector: Vector = {};
    
    // Собираем все признаки в один вектор
    for (const [category, weight] of Object.entries(profile.category_weights)) {
      vector[`cat_${category}`] = weight;
    }
    
    for (const [tag, weight] of Object.entries(profile.tag_weights)) {
      vector[`tag_${tag}`] = weight;
    }
    
    for (const [feature, weight] of Object.entries(profile.feature_weights)) {
      vector[`feat_${feature}`] = weight;
    }
    
    // Нормализация L2
    const magnitude = Math.sqrt(
      Object.values(vector).reduce((sum, val) => sum + val * val, 0)
    );
    
    if (magnitude > 0) {
      for (const key in vector) {
        vector[key] = vector[key] / magnitude;
      }
    }
    
    return vector;
  }
  
  /**
   * Создать вектор для элемента каталога
   */
  createItemVector(item: CatalogItem): Vector {
    const vector: Vector = {};
    
    // Категории с высоким весом
    for (const category of item.categories) {
      vector[`cat_${category}`] = 1.0;
    }
    
    // Теги со средним весом
    for (const tag of item.tags) {
      vector[`tag_${tag}`] = 0.5;
    }
    
    // Признаки с их значениями
    for (const [feature, value] of Object.entries(item.features)) {
      vector[`feat_${feature}`] = value;
    }
    
    // Нормализация L2
    const magnitude = Math.sqrt(
      Object.values(vector).reduce((sum, val) => sum + val * val, 0)
    );
    
    if (magnitude > 0) {
      for (const key in vector) {
        vector[key] = vector[key] / magnitude;
      }
    }
    
    return vector;
  }
}

// Экспорт единственного экземпляра хранилища
export const store = new InMemoryStore();
