<template>
  <div class="user-profile">
    <header class="header">
      <h1>👤 Личный кабинет</h1>
      <div class="nav-links">
        <span class="user-info">{{ authStore.user?.username }}</span>
        <router-link to="/feed" class="btn btn-primary">← К ленте</router-link>
        <button @click="handleLogout" class="btn btn-danger">Выйти</button>
      </div>
    </header>

    <main class="container">
      <!-- Статус рекомендаций -->
      <div v-if="isRecommendationReady" class="card ready-card">
        <div class="ready-header">
          <span class="ready-icon">✅</span>
          <h2>Рекомендации сформированы!</h2>
        </div>
        <p class="ready-message">
          На основе ваших предпочтений мы подготовили персональные рекомендации.
        </p>

        <!-- XAI Module: Объяснение рекомендаций -->
        <div v-if="isLoadingXAI" class="xai-loading">
          <div class="spinner"></div>
          <p>Загрузка объяснений...</p>
        </div>

        <div v-else-if="xaiData || xaiFactors" class="xai-explanation">
          <h3>📊 Объяснение рекомендаций от XAI модуля</h3>
          
          <!-- Текстовое объяснение -->
          <div v-if="xaiData?.text_explanation" class="explanation-text">
            <p>{{ xaiData.text_explanation }}</p>
          </div>

          <!-- Визуализации: График категорий -->
          <div v-if="getCategoryPercentages().length > 0" class="category-chart">
            <h4>🎯 Ваши интересы по категориям</h4>
            <div class="bar-chart">
              <div 
                v-for="(cat, index) in getCategoryPercentages()" 
                :key="cat.name"
                class="bar"
                :style="{ '--width': Math.min(cat.weight, 100) + '%', '--color': getCategoryColor(index) }"
              >
                <span class="bar-label">{{ cat.name }}</span>
                <span class="bar-value">{{ cat.weight }}%</span>
              </div>
            </div>
          </div>

          <!-- Факторы влияния -->
          <div v-if="xaiFactors?.factors && xaiFactors.factors.length > 0" class="factors-section">
            <h4>⚖️ Факторы влияния на рекомендации</h4>
            <div class="factors-grid">
              <div 
                v-for="(factor, index) in xaiFactors.factors.slice(0, 5)" 
                :key="index"
                class="factor-card"
              >
                <div class="factor-header">
                  <span class="factor-name">{{ factor.name }}</span>
                  <span :class="['factor-direction', factor.direction]">
                    {{ factor.direction === 'positive' ? '↑' : '↓' }}
                  </span>
                </div>
                <div class="factor-bar-container">
                  <div 
                    class="factor-bar"
                    :style="{ width: Math.round(factor.weight * 100) + '%' }"
                  ></div>
                </div>
                <span class="factor-weight">{{ Math.round(factor.weight * 100) }}%</span>
              </div>
            </div>
          </div>

          <!-- Статистика профиля -->
          <div v-if="xaiFactors?.profile_summary" class="profile-stats">
            <h4>📈 Статистика активности</h4>
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-value">{{ xaiFactors.profile_summary.total_events }}</span>
                <span class="stat-label">Событий</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ xaiFactors.profile_summary.total_likes }}</span>
                <span class="stat-label">Лайков</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ xaiFactors.profile_summary.categories_count }}</span>
                <span class="stat-label">Категорий</span>
              </div>
            </div>
          </div>

          <!-- Дополнительные визуализации из XAI -->
          <div v-if="xaiData?.visualizations && xaiData.visualizations.length > 0" class="additional-viz">
            <h4>📊 Детальные данные</h4>
            <div v-for="(viz, index) in xaiData.visualizations" :key="index" class="viz-card">
              <h5>{{ viz.title }}</h5>
              <div v-if="viz.type === 'bar_chart' && viz.data?.labels" class="chart-container">
                <div class="bar-chart">
                  <div 
                    v-for="(label, i) in viz.data.labels" 
                    :key="i"
                    class="bar"
                    :style="{ '--width': (viz.data.datasets?.[0]?.data?.[i] || 0) + '%', '--color': getCategoryColor(i) }"
                  >
                    <span class="bar-label">{{ label }}</span>
                    <span class="bar-value">{{ Math.round(viz.data.datasets?.[0]?.data?.[i] || 0) }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Fallback: заглушка если XAI недоступен -->
        <div v-else class="xai-placeholder">
          <h3>📊 Данные об интересах</h3>
          <p class="fallback-message">
            Модуль объяснений временно недоступен. Объяснения будут показаны здесь после загрузки.
          </p>
        </div>
      </div>

      <div v-else class="card pending-card">
        <div class="pending-header">
          <span class="pending-icon">⏳</span>
          <h2>Рекомендации ещё не готовы</h2>
        </div>
        <p class="pending-message">
          Ставьте лайки в ленте, чтобы получить персонализированные рекомендации.
        </p>
        <div class="progress-info">
          <div class="progress-circle">
            <svg viewBox="0 0 100 100">
              <circle class="progress-bg" cx="50" cy="50" r="45" />
              <circle 
                class="progress-ring" 
                cx="50" 
                cy="50" 
                r="45"
                :style="{ strokeDashoffset: 283 - (283 * likeCount / 5) }"
              />
            </svg>
            <span class="progress-text">{{ likeCount }}/5</span>
          </div>
          <p class="progress-hint">
            Необходимо минимум 5 лайков для формирования рекомендаций
          </p>
        </div>
        <router-link to="/feed" class="btn btn-primary btn-large">
          Перейти к ленте
        </router-link>
      </div>

      <!-- Информация о пользователе -->
      <div class="card user-info-card">
        <h3>Информация о пользователе</h3>
        <div class="info-row">
          <span class="info-label">Имя:</span>
          <span class="info-value">{{ authStore.user?.username }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Лайков:</span>
          <span class="info-value">{{ likeCount }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Статус:</span>
          <span :class="['status-badge', isRecommendationReady ? 'ready' : 'pending']">
            {{ isRecommendationReady ? 'Рекомендации активны' : 'Ожидание' }}
          </span>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import { likesApi, recommendApi, xaiApi } from '@/api';

interface XAIExplanation {
  text_explanation: string;
  visualizations: Array<{
    type: string;
    title: string;
    data: any;
  }>;
  factors: Array<{
    name: string;
    weight: number;
    direction: string;
  }>;
}

interface XAIVisualization {
  visualizations: Array<{
    type: string;
    title: string;
    data: {
      labels: string[];
      datasets: Array<{
        label: string;
        data: number[];
        backgroundColor?: string[];
        borderColor?: string;
        borderWidth?: number;
      }>;
    };
  }>;
}

interface XAIFactors {
  factors: Array<{
    name: string;
    weight: number;
    direction: string;
  }>;
  profile_summary: {
    total_events: number;
    total_likes: number;
    categories_count: number;
  };
}

const router = useRouter();
const authStore = useAuthStore();
const appStore = useAppStore();

const likeCount = computed(() => appStore.likeCount);
const isRecommendationReady = ref(false);
const xaiData = ref<XAIExplanation | null>(null);
const xaiVisualizations = ref<XAIVisualization | null>(null);
const xaiFactors = ref<XAIFactors | null>(null);
const isLoadingXAI = ref(false);

const loadUserData = async () => {
  try {
    // Загружаем количество лайков
    const likeResponse = await likesApi.getCount();
    appStore.setLikeCount(likeResponse.data.count);

    // Проверяем статус рекомендаций
    try {
      await recommendApi.getRecommendations();
      isRecommendationReady.value = true;
      
      // Загружаем данные от XAI модуля
      await loadXAIData();
    } catch {
      isRecommendationReady.value = false;
    }
  } catch (e) {
    console.error('Ошибка загрузки данных:', e);
  }
};

const loadXAIData = async () => {
  if (!authStore.user) return;
  
  isLoadingXAI.value = true;
  const userId = `user_${authStore.user.id}`;
  
  try {
    // Загружаем объяснение
    const explanationResponse = await xaiApi.getExplanation(userId);
    xaiData.value = explanationResponse.data;
    
    // Загружаем визуализации
    const vizResponse = await xaiApi.getVisualizations(userId);
    xaiVisualizations.value = vizResponse.data;
    
    // Загружаем факторы
    const factorsResponse = await xaiApi.getFactors(userId);
    xaiFactors.value = factorsResponse.data;
    
    console.log('XAI данные загружены:', { 
      explanation: xaiData.value, 
      visualizations: xaiVisualizations.value,
      factors: xaiFactors.value 
    });
  } catch (error) {
    console.error('Ошибка загрузки XAI данных:', error);
  } finally {
    isLoadingXAI.value = false;
  }
};

// Получить цвет для категории
const getCategoryColor = (index: number): string => {
  const colors = ['#3498db', '#27ae60', '#e67e22', '#e91e63', '#9b59b6'];
  return colors[index % colors.length];
};

// Получить проценты для категорий
const getCategoryPercentages = () => {
  if (!xaiFactors.value) return [];
  
  const weights = xaiFactors.value.factors
    .filter(f => f.name.startsWith('Категория: '))
    .map(f => ({
      name: f.name.replace('Категория: ', ''),
      weight: Math.round(f.weight * 100)
    }))
    .sort((a, b) => b.weight - a.weight);
  
  // Если нет данных о категориях из XAI, используем fallback
  if (weights.length === 0 && xaiData.value?.visualizations) {
    const categoryViz = xaiData.value.visualizations.find(v => v.type === 'category_distribution');
    if (categoryViz && categoryViz.data?.datasets?.[0]?.data) {
      return categoryViz.data.labels.map((label: string, i: number) => ({
        name: label,
        weight: Math.round(categoryViz.data.datasets[0].data[i])
      }));
    }
  }
  
  return weights;
};

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};

onMounted(() => {
  loadUserData();
});
</script>

<style scoped>
.user-profile {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px 20px;
}

.ready-card {
  border-left: 4px solid #27ae60;
}

.ready-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.ready-icon {
  font-size: 32px;
}

.ready-header h2 {
  color: #27ae60;
  margin: 0;
}

.ready-message {
  color: #7f8c8d;
  margin-bottom: 24px;
}

.pending-card {
  text-align: center;
  border-left: 4px solid #f39c12;
}

.pending-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
}

.pending-icon {
  font-size: 32px;
}

.pending-header h2 {
  color: #f39c12;
  margin: 0;
}

.pending-message {
  color: #7f8c8d;
  margin-bottom: 24px;
}

.progress-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
}

.progress-circle {
  position: relative;
  width: 150px;
  height: 150px;
  margin-bottom: 16px;
}

.progress-circle svg {
  transform: rotate(-90deg);
  width: 100%;
  height: 100%;
}

.progress-bg {
  fill: none;
  stroke: #eee;
  stroke-width: 8;
}

.progress-ring {
  fill: none;
  stroke: #4a90d9;
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 283;
  transition: stroke-dashoffset 0.5s ease;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
}

.progress-hint {
  color: #7f8c8d;
  font-size: 14px;
}

.btn-large {
  padding: 14px 32px;
  font-size: 16px;
}

/* XAI Loading */
.xai-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background: #f9f9f9;
  border-radius: 8px;
  margin-top: 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e0e0e0;
  border-top-color: #4a90d9;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* XAI Explanation Section */
.xai-explanation {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 24px;
  margin-top: 20px;
}

.xai-explanation h3 {
  margin-bottom: 20px;
  color: #2c3e50;
  font-size: 20px;
}

.xai-explanation h4 {
  margin: 24px 0 16px;
  color: #34495e;
  font-size: 16px;
}

.explanation-text {
  background: white;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  border-left: 4px solid #4a90d9;
}

.explanation-text p {
  color: #2c3e50;
  line-height: 1.6;
  margin: 0;
}

/* Category Chart */
.category-chart {
  margin-bottom: 24px;
}

/* Factors Section */
.factors-section {
  margin-bottom: 24px;
}

.factors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.factor-card {
  background: white;
  padding: 14px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.factor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.factor-name {
  font-size: 13px;
  color: #34495e;
  font-weight: 500;
}

.factor-direction {
  font-size: 16px;
  font-weight: 600;
}

.factor-direction.positive {
  color: #27ae60;
}

.factor-direction.negative {
  color: #e74c3c;
}

.factor-bar-container {
  height: 8px;
  background: #ecf0f1;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 6px;
}

.factor-bar {
  height: 100%;
  background: linear-gradient(90deg, #4a90d9, #3498db);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.factor-weight {
  font-size: 12px;
  color: #7f8c8d;
  font-weight: 600;
}

/* Profile Stats */
.profile-stats {
  margin-bottom: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-item {
  background: white;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #4a90d9;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #7f8c8d;
}

/* Additional Visualizations */
.additional-viz {
  margin-top: 24px;
}

.viz-card {
  background: white;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.viz-card h5 {
  margin: 0 0 12px;
  color: #34495e;
  font-size: 14px;
}

.chart-container {
  margin-top: 12px;
}

/* Fallback message */
.fallback-message {
  color: #7f8c8d;
  font-style: italic;
}

/* XAI Placeholder */
.xai-placeholder {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
}

.xai-placeholder h3 {
  margin-bottom: 16px;
  color: #2c3e50;
}

.chart-placeholder {
  margin-bottom: 20px;
}

.bar-chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bar-label {
  width: 100px;
  font-size: 13px;
  color: #34495e;
}

.bar-value {
  width: 40px;
  font-size: 13px;
  font-weight: 600;
  color: #2c3e50;
}

.bar::before {
  content: '';
  flex: 1;
  height: 12px;
  background: linear-gradient(90deg, var(--color), color-mix(in srgb, var(--color) 60%, white));
  border-radius: 6px;
  max-width: calc(var(--width) * 1% * 3);
}

.explanation {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.explanation h4 {
  margin-bottom: 12px;
  color: #2c3e50;
}

.explanation p {
  color: #7f8c8d;
  line-height: 1.6;
  margin-bottom: 16px;
}

.factors {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.factor {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 8px 16px;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  font-size: 13px;
}

.factor-name {
  color: #34495e;
}

.factor-weight {
  font-weight: 600;
  color: #4a90d9;
}

/* User info card */
.user-info-card {
  margin-top: 20px;
}

.user-info-card h3 {
  margin-bottom: 16px;
  color: #2c3e50;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  color: #7f8c8d;
}

.info-value {
  font-weight: 500;
  color: #2c3e50;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.ready {
  background-color: #d5f5e3;
  color: #27ae60;
}

.status-badge.pending {
  background-color: #fef3e2;
  color: #f39c12;
}
</style>
