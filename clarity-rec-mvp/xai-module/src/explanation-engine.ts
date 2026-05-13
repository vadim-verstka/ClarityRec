import { v4 as uuidv4 } from 'uuid';
import {
  ExplanationRequest,
  ExplanationResponse,
  UserProfileData,
  RecommendationItem,
  Visualization,
  ChartData,
  Dataset,
  DetailedData,
  CategoryBreakdown,
  FeatureImportance,
  RecommendationReason,
  TextExplanation,
  UserJourneyStep
} from './types';

/**
 * Генератор объяснений для системы рекомендаций
 * 
 * Этот класс является независимым модулем, который:
 * - Принимает данные от любой системы рекомендаций через адаптер
 * - Генерирует текстовые объяснения
 * - Создаёт данные для визуализаций
 * - Возвращает структурированный ответ
 */
export class ExplanationEngine {
  private modelVersion: string = 'xai-engine-v1.0';

  /**
   * Сгенерировать полное объяснение рекомендаций
   */
  async generateExplanation(
    request: ExplanationRequest,
    userProfile: UserProfileData,
    userEvents: UserJourneyStep[]
  ): Promise<ExplanationResponse> {
    const startTime = Date.now();

    // Генерируем текстовое объяснение
    const textExplanation = this.generateTextExplanation(request, userProfile);

    // Создаём визуализации
    const visualizations = this.generateVisualizations(request, userProfile);

    // Формируем детальные данные
    const detailedData = this.generateDetailedData(request, userProfile, userEvents);

    const latency = Date.now() - startTime;

    return {
      request_id: uuidv4(),
      user_id: request.user_id,
      text_explanation: textExplanation,
      visualizations: visualizations,
      detailed_data: detailedData,
      meta: {
        model_version: this.modelVersion,
        generated_at: new Date().toISOString(),
        latency_ms: latency
      }
    };
  }

  /**
   * Генерация текстового объяснения
   */
  private generateTextExplanation(
    request: ExplanationRequest,
    profile: UserProfileData
  ): TextExplanation {
    // Находим топ категории
    const topCategories = Object.entries(profile.category_weights)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    const topCategory = topCategories[0]?.[0] || 'не определена';
    const topCategoryWeight = topCategories[0]?.[1] || 0;

    // Формируем основные факторы
    const mainFactors: string[] = [];
    
    if (topCategories.length > 0) {
      mainFactors.push(`Предпочтение категории "${topCategory}" (${Math.round(topCategoryWeight * 10)} баллов)`);
    }

    if (profile.likes_count >= 5) {
      mainFactors.push(`Активное взаимодействие (${profile.likes_count} лайков)`);
    }

    if (profile.events_count > profile.likes_count) {
      mainFactors.push(`Разнообразие активности (${profile.events_count} событий)`);
    }

    // Персонализированное сообщение
    let personalizedMessage = `Мы проанализировали ваши ${profile.likes_count} лайков и подобрали контент, `;
    personalizedMessage += `который соответствует вашему интересу к категории "${topCategory}". `;
    
    if (topCategories.length > 1) {
      const secondCategory = topCategories[1][0];
      personalizedMessage += `Также вы проявили интерес к "${secondCategory}". `;
    }
    
    personalizedMessage += 'Система продолжит учиться на ваших действиях, чтобы улучшить рекомендации.';

    return {
      summary: `Рекомендации сформированы на основе анализа ${profile.likes_count} лайков пользователя.`,
      main_factors: mainFactors,
      personalized_message: personalizedMessage
    };
  }

  /**
   * Генерация визуализаций
   */
  private generateVisualizations(
    request: ExplanationRequest,
    profile: UserProfileData
  ): Visualization[] {
    const visualizations: Visualization[] = [];

    // 1. Bar chart: предпочтения по категориям
    const categoryLabels = Object.keys(profile.category_weights);
    const categoryValues = Object.values(profile.category_weights);
    const maxWeight = Math.max(...categoryValues, 1);
    const normalizedCategoryValues = categoryValues.map(v => (v / maxWeight) * 100);

    visualizations.push({
      type: 'bar_chart',
      title: '📊 Ваши интересы по категориям',
      description: 'Показывает распределение предпочтений по категориям на основе ваших лайков',
      data: {
        labels: categoryLabels,
        datasets: [{
          label: 'Интерес (%)',
          data: normalizedCategoryValues,
          backgroundColor: [
            '#3498db',
            '#27ae60',
            '#e67e22',
            '#e91e63',
            '#9b59b6',
            '#1abc9c',
            '#f39c12',
            '#34495e'
          ],
          borderWidth: 1
        }]
      },
      config: {
        showLegend: false,
        showValues: true,
        orientation: 'vertical'
      }
    });

    // 2. Pie chart: распределение лайков по категориям
    const totalLikes = categoryValues.reduce((sum, v) => sum + v, 0);
    const percentages = categoryValues.map(v => Math.round((v / totalLikes) * 100));

    visualizations.push({
      type: 'pie_chart',
      title: '🥧 Распределение ваших лайков',
      description: 'Доля каждой категории в общей активности',
      data: {
        labels: categoryLabels,
        datasets: [{
          label: 'Лайки',
          data: percentages,
          backgroundColor: [
            '#3498db',
            '#27ae60',
            '#e67e22',
            '#e91e63',
            '#9b59b6',
            '#1abc9c'
          ],
          borderWidth: 2
        }]
      },
      config: {
        showLegend: true,
        showValues: true
      }
    });

    // 3. Radar chart: профиль интересов (если есть теги)
    if (Object.keys(profile.tag_weights).length > 0) {
      const tagLabels = Object.keys(profile.tag_weights).slice(0, 6);
      const tagValues = tagLabels.map(tag => profile.tag_weights[tag] || 0);
      const maxTagWeight = Math.max(...tagValues, 1);
      const normalizedTagValues = tagValues.map(v => (v / maxTagWeight) * 100);

      visualizations.push({
        type: 'radar_chart',
        title: '🎯 Профиль интересов (теги)',
        description: 'Многомерный профиль ваших предпочтений по тегам',
        data: {
          labels: tagLabels,
          datasets: [{
            label: 'Интерес',
            data: normalizedTagValues,
            backgroundColor: 'rgba(52, 152, 219, 0.2)',
            borderColor: '#3498db',
            borderWidth: 2,
            fill: true
          }]
        },
        config: {
          showLegend: false,
          colorScheme: ['#3498db']
        }
      });
    }

    // 4. Влияние факторов на рекомендации
    const allFeatureImpacts = new Map<string, number>();
    request.recommendations.forEach(rec => {
      rec.feature_impacts.forEach(impact => {
        if (impact.direction === 'positive') {
          const current = allFeatureImpacts.get(impact.name) || 0;
          allFeatureImpacts.set(impact.name, current + impact.weight);
        }
      });
    });

    if (allFeatureImpacts.size > 0) {
      const featureLabels = Array.from(allFeatureImpacts.keys()).slice(0, 5);
      const featureWeights = featureLabels.map(name => {
        const weight = allFeatureImpacts.get(name) || 0;
        return Math.round((weight / request.recommendations.length) * 100);
      });

      visualizations.push({
        type: 'bar_chart',
        title: '⚖️ Факторы влияния на рекомендации',
        description: 'Какие факторы наиболее сильно повлияли на формирование рекомендаций',
        data: {
          labels: featureLabels,
          datasets: [{
            label: 'Влияние (%)',
            data: featureWeights,
            backgroundColor: '#27ae60',
            borderWidth: 1
          }]
        },
        config: {
          showLegend: false,
          showValues: true,
          orientation: 'horizontal'
        }
      });
    }

    return visualizations;
  }

  /**
   * Генерация детальных данных
   */
  private generateDetailedData(
    request: ExplanationRequest,
    profile: UserProfileData,
    userEvents: UserJourneyStep[]
  ): DetailedData {
    // Разбор по категориям
    const categoryBreakdown: CategoryBreakdown[] = [];
    const categoryWeights = Object.entries(profile.category_weights);
    const totalWeight = categoryWeights.reduce((sum, [, v]) => sum + v, 0);

    for (const [category, weight] of categoryWeights) {
      const likedCount = userEvents.filter(
        e => e.category === category && e.action === 'like'
      ).length;

      const recommendedCount = request.recommendations.filter(
        r => r.categories?.includes(category)
      ).length;

      categoryBreakdown.push({
        category,
        weight,
        percentage: Math.round((weight / totalWeight) * 100),
        liked_count: likedCount,
        recommended_count: recommendedCount
      });
    }

    categoryBreakdown.sort((a, b) => b.weight - a.weight);

    // Важность признаков
    const featureImportance: FeatureImportance[] = [];
    
    featureImportance.push({
      name: 'Частота лайков',
      importance: 0.4,
      direction: 'positive',
      description: 'Количество лайков влияет на уверенность системы в предпочтениях'
    });

    featureImportance.push({
      name: 'Разнообразие категорий',
      importance: 0.3,
      direction: 'positive',
      description: 'Ширина интересов помогает находить неочевидные рекомендации'
    });

    featureImportance.push({
      name: 'Последняя активность',
      importance: 0.3,
      direction: 'positive',
      description: 'Недавние лайки имеют больший вес при формировании рекомендаций'
    });

    // Причины для каждой рекомендации
    const recommendationReasons: RecommendationReason[] = request.recommendations.map(rec => {
      const reasons: string[] = [];
      
      const positiveImpacts = rec.feature_impacts.filter(i => i.direction === 'positive');
      
      positiveImpacts.slice(0, 2).forEach(impact => {
        reasons.push(`${impact.name} (${Math.round(impact.weight * 100)}%)`);
      });

      if (rec.categories && rec.categories.length > 0) {
        reasons.push(`Категория: ${rec.categories.join(', ')}`);
      }

      return {
        item_id: rec.item_id,
        reasons: reasons.length > 0 ? reasons : ['Соответствует вашему профилю'],
        top_factors: positiveImpacts.slice(0, 3)
      };
    });

    return {
      category_breakdown: categoryBreakdown,
      feature_importance: featureImportance,
      recommendation_reasons: recommendationReasons,
      user_journey: userEvents.slice(-10) // Последние 10 событий
    };
  }
}
