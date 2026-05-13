import { UserProfile, CatalogItem, Vector, FeatureImpact } from './types';
import { store } from './store';

/**
 * Вычислить косинусное сходство между двумя векторами
 */
export function cosineSimilarity(vec1: Vector, vec2: Vector): number {
  const keys = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);
  
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;
  
  for (const key of keys) {
    const val1 = vec1[key] || 0;
    const val2 = vec2[key] || 0;
    
    dotProduct += val1 * val2;
    magnitude1 += val1 * val1;
    magnitude2 += val2 * val2;
  }
  
  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);
  
  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }
  
  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Рассчитать влияние признаков на скор рекомендации
 */
export function calculateFeatureImpacts(
  profileVector: Vector,
  itemVector: Vector,
  profile: UserProfile
): FeatureImpact[] {
  const impacts: FeatureImpact[] = [];
  
  // Собираем все уникальные признаки
  const allKeys = new Set([...Object.keys(profileVector), ...Object.keys(itemVector)]);
  
  for (const key of allKeys) {
    const profileWeight = profileVector[key] || 0;
    const itemWeight = itemVector[key] || 0;
    
    // Влияние = произведение весов (положительное если оба > 0, отрицательное если разные знаки)
    const impact = profileWeight * itemWeight;
    
    if (impact !== 0) {
      // Определяем читаемое имя признака
      let name = key;
      if (key.startsWith('cat_')) {
        name = `Категория: ${key.substring(4)}`;
      } else if (key.startsWith('tag_')) {
        name = `Тег: ${key.substring(4)}`;
      } else if (key.startsWith('feat_')) {
        name = `Признак: ${key.substring(5)}`;
      }
      
      impacts.push({
        name,
        weight: Math.abs(impact),
        direction: impact > 0 ? 'positive' : 'negative'
      });
    }
  }
  
  // Нормализуем веса к [0, 1]
  const maxImpact = impacts.length > 0 
    ? Math.max(...impacts.map(i => i.weight)) 
    : 1;
  
  for (const impact of impacts) {
    impact.weight = parseFloat((impact.weight / maxImpact).toFixed(4));
  }
  
  // Сортируем по убыванию влияния
  impacts.sort((a, b) => b.weight - a.weight);
  
  // Возвращаем топ-5 влияний
  return impacts.slice(0, 5);
}

/**
 * Сгенерировать рекомендации для пользователя
 */
export function generateRecommendations(
  userId: string,
  limit: number = 10
): Array<{
  item_id: string;
  score: number;
  feature_impacts: FeatureImpact[];
  categories: string[];
}> {
  const startTime = Date.now();
  
  // Получаем профиль пользователя
  const profile = store.getUserProfile(userId);
  
  // Если у пользователя недостаточно лайков, возвращаем пустой список
  if (profile.likes_count < 3) {
    return [];
  }
  
  // Создаем нормализованный вектор профиля
  const profileVector = store.normalizeProfileVector(profile);
  
  // Получаем все элементы каталога
  const catalogItems = store.getAllCatalogItems();
  
  // Собираем категории, которые пользователь лайкал
  const likedCategories = new Set<string>();
  profile.events.forEach(event => {
    if (event.event_type === 'like') {
      const item = catalogItems.find(i => i.item_id === event.item_id);
      if (item) {
        item.categories.forEach(cat => likedCategories.add(cat));
      }
    }
  });
  
  // Вычисляем скор для каждого элемента
  const scoredItems = catalogItems.map(item => {
    const itemVector = store.createItemVector(item);
    const score = cosineSimilarity(profileVector, itemVector);
    const feature_impacts = calculateFeatureImpacts(profileVector, itemVector, profile);
    
    return {
      item_id: item.item_id,
      score: parseFloat(score.toFixed(6)),
      feature_impacts,
      categories: item.categories
    };
  });
  
  // Разделяем на релевантные (из лайкнутых категорий) и новые
  const relevantItems = scoredItems.filter(s => 
    s.categories.some(cat => likedCategories.has(cat))
  );
  const newItems = scoredItems.filter(s => 
    !s.categories.some(cat => likedCategories.has(cat))
  );
  
  // Сортируем релевантные по скору
  relevantItems.sort((a, b) => b.score - a.score);
  
  // Перемешиваем новые для случайности
  for (let i = newItems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newItems[i], newItems[j]] = [newItems[j], newItems[i]];
  }
  
  // Формируем итоговую выдачу: релевантные + 2 случайных новых
  const result = [
    ...relevantItems,
    ...newItems.slice(0, 2)
  ];
  
  // Возвращаем топ-N
  return result.slice(0, limit);
}
