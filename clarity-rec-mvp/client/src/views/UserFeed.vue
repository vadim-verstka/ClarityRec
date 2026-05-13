<template>
  <div class="user-feed">
    <header class="header">
      <h1>{{ isRecommendationMode ? '🎯 Ваши рекомендации' : '📰 Лента карточек' }}</h1>
      <div class="nav-links">
        <span class="user-info">{{ authStore.user?.username }}</span>
        <router-link to="/profile" class="btn btn-primary">Личный кабинет</router-link>
        <button @click="handleLogout" class="btn btn-danger">Выйти</button>
      </div>
    </header>

    <main class="container">
      <!-- Статистика -->
      <div class="stats-bar card">
        <div class="stat">
          <span class="stat-value">{{ likeCount }}</span>
          <span class="stat-label">Лайков поставлено</span>
        </div>
        <div class="stat" v-if="!isRecommendationMode">
          <span class="stat-value">{{ 5 - likeCount > 0 ? 5 - likeCount : 0 }}</span>
          <span class="stat-label">Осталось до рекомендаций</span>
        </div>
        <div class="stat" v-else>
          <span class="stat-value">✓</span>
          <span class="stat-label">Рекомендации активны</span>
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${Math.min((likeCount / 5) * 100, 100)}%` }"
          ></div>
        </div>
      </div>

      <!-- Режим рекомендаций -->
      <div v-if="isRecommendationMode" class="recommendation-banner card">
        <div class="banner-icon">🎯</div>
        <div class="banner-content">
          <h2>Персонализированные рекомендации</h2>
          <p>На основе ваших {{ likeCount }} лайков система подобрала контент, который соответствует вашим интересам.</p>
          <div class="banner-meta" v-if="recommendationsMeta">
            <span class="meta-item">Версия модели: {{ recommendationsMeta.model_version }}</span>
            <span class="meta-item">Событий проанализировано: {{ recommendationsMeta.total_events }}</span>
          </div>
        </div>
      </div>

      <div v-if="isLoading" class="loading">
        {{ isRecommendationMode ? 'Загрузка рекомендаций...' : 'Загрузка карточек...' }}
      </div>

      <div v-else class="cards-grid">
        <div
          v-for="card in displayCards"
          :key="card.id"
          class="card-item card"
          :class="{ 'recommended': isRecommendationMode && card.score }"
        >
          <img :src="card.image_url" :alt="card.title" class="card-image" />
          <div class="card-content">
            <div class="card-header">
              <span :class="['category-badge', getCategoryClass(card.category)]">
                {{ card.category }}
              </span>
              <span v-if="card.score" class="score-badge">
                Score: {{ (card.score * 100).toFixed(0) }}%
              </span>
            </div>
            <h3>{{ card.title }}</h3>
            
            <!-- Объяснение рекомендации -->
            <p v-if="card.explanation" class="explanation-text">
              {{ card.explanation }}
            </p>
            
            <button
              @click="likeCard(card.id)"
              class="btn btn-like"
              :class="{ liked: likedCards.has(card.id) }"
              :disabled="isRecommendationMode && !likedCards.has(card.id)"
            >
              {{ likedCards.has(card.id) ? '❤️ Лайкнуто' : '🤍 Лайк' }}
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import { cardsApi, likesApi, recommendationsApi } from '@/api';

interface Card {
  id: number;
  title: string;
  category: string;
  image_url: string;
  score?: number;
  explanation?: string;
  feature_impacts?: Array<{ name: string; weight: number; direction: string }>;
}

interface RecommendationsMeta {
  model_version: string;
  total_events: number;
}

const router = useRouter();
const authStore = useAuthStore();
const appStore = useAppStore();

const cards = computed(() => appStore.cards);
const likeCount = computed(() => appStore.likeCount);
const isLoading = computed(() => appStore.isLoading);
const likedCards = ref<Set<number>>(new Set());
const recommendedCards = ref<Card[]>([]);
const recommendationsMeta = ref<RecommendationsMeta | null>(null);

// Режим рекомендаций активен, если у пользователя >= 5 лайков
const isRecommendationMode = computed(() => likeCount.value >= 5);

// Отображаемые карточки: либо рекомендации, либо обычная лента
const displayCards = computed(() => {
  if (isRecommendationMode.value && recommendedCards.value.length > 0) {
    return recommendedCards.value;
  }
  return cards.value;
});

const loadCards = async () => {
  appStore.setLoading(true);
  try {
    const response = await cardsApi.getAll();
    appStore.setCards(response.data);
    
    // Загружаем количество лайков
    const likeResponse = await likesApi.getCount();
    appStore.setLikeCount(likeResponse.data.count);
    
    // Если уже есть 5+ лайков, загружаем рекомендации
    if (likeResponse.data.count >= 5) {
      await loadRecommendations();
    }
  } catch (e) {
    console.error('Ошибка загрузки карточек:', e);
  } finally {
    appStore.setLoading(false);
  }
};

const loadRecommendations = async () => {
  try {
    const response = await recommendationsApi.get();
    if (response.data.recommendations) {
      recommendedCards.value = response.data.recommendations;
      recommendationsMeta.value = response.data.meta;
    }
  } catch (e) {
    console.error('Ошибка загрузки рекомендаций:', e);
    // При ошибке остаёмся на обычных карточках
  }
};

const likeCard = async (cardId: number) => {
  if (likedCards.value.has(cardId)) return;

  try {
    await likesApi.add(cardId);
    likedCards.value.add(cardId);
    appStore.incrementLikeCount();
    
    // Проверяем, достигли ли 5 лайков
    if (appStore.likeCount >= 5) {
      // Загружаем рекомендации
      await loadRecommendations();
      alert('🎉 Поздравляем! Вы набрали 5 лайков. Лента обновлена персонализированными рекомендациями!');
    }
  } catch (e: any) {
    if (e.response?.data?.error) {
      alert(e.response.data.error);
    }
  }
};

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};

const getCategoryClass = (category: string): string => {
  const map: Record<string, string> = {
    'Образование': 'cat-education',
    'Технологии': 'cat-tech',
    'Финансы': 'cat-finance',
    'Творчество': 'cat-creative',
    'Здоровье': 'cat-health'
  };
  return map[category] || '';
};

onMounted(() => {
  loadCards();
});
</script>

<style scoped>
.user-feed {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.header h1 {
  font-size: 22px;
  margin: 0;
  color: #2c3e50;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info {
  font-size: 14px;
  color: #7f8c8d;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

.stats-bar {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 24px;
  padding: 20px;
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #4a90d9;
}

.stat-label {
  font-size: 12px;
  color: #7f8c8d;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background-color: #eee;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4a90d9, #67b26f);
  transition: width 0.3s ease;
}

/* Баннер рекомендаций */
.recommendation-banner {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
  padding: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.banner-icon {
  font-size: 48px;
}

.banner-content h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
}

.banner-content p {
  margin: 0 0 12px 0;
  opacity: 0.9;
}

.banner-meta {
  display: flex;
  gap: 16px;
}

.meta-item {
  font-size: 12px;
  opacity: 0.8;
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: 12px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.card-item {
  overflow: hidden;
  padding: 0;
  transition: transform 0.2s, box-shadow 0.2s;
}

.card-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
}

.card-item.recommended {
  border: 2px solid #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.card-image {
  width: 100%;
  height: 180px;
  object-fit: cover;
}

.card-content {
  padding: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-content h3 {
  font-size: 16px;
  margin: 12px 0;
  color: #2c3e50;
  line-height: 1.4;
}

.category-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.cat-education {
  background-color: #e8f4fd;
  color: #3498db;
}

.cat-tech {
  background-color: #eef2f7;
  color: #5c6bc0;
}

.cat-finance {
  background-color: #e8f8e8;
  color: #27ae60;
}

.cat-creative {
  background-color: #fef3e2;
  color: #e67e22;
}

.cat-health {
  background-color: #fce4ec;
  color: #e91e63;
}

.score-badge {
  font-size: 11px;
  font-weight: 700;
  color: #667eea;
  background-color: #f0f0ff;
  padding: 4px 8px;
  border-radius: 8px;
}

.explanation-text {
  font-size: 12px;
  color: #7f8c8d;
  margin: 8px 0;
  padding: 8px;
  background-color: #f8f9fa;
  border-radius: 6px;
  line-height: 1.4;
}

.btn-like {
  width: 100%;
  margin-top: 12px;
  background-color: #f5f5f5;
  color: #2c3e50;
}

.btn-like:hover:not(:disabled) {
  background-color: #ffebee;
}

.btn-like.liked {
  background-color: #ffebee;
  color: #e74c3c;
}

.btn-like:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  padding: 60px;
  color: #7f8c8d;
  font-size: 16px;
}
</style>
