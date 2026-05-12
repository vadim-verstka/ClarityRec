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

        <!-- Заглушка под будущий XAI-модуль -->
        <div class="xai-placeholder">
          <h3>📊 Ваши интересы (XAI-модуль)</h3>
          <div class="chart-placeholder">
            <div class="bar-chart">
              <div class="bar" style="--width: 95%; --color: #3498db;">
                <span class="bar-label">Технологии</span>
                <span class="bar-value">95%</span>
              </div>
              <div class="bar" style="--width: 87%; --color: #27ae60;">
                <span class="bar-label">Образование</span>
                <span class="bar-value">87%</span>
              </div>
              <div class="bar" style="--width: 72%; --color: #e67e22;">
                <span class="bar-label">Финансы</span>
                <span class="bar-value">72%</span>
              </div>
              <div class="bar" style="--width: 58%; --color: #e91e63;">
                <span class="bar-label">Здоровье</span>
                <span class="bar-value">58%</span>
              </div>
              <div class="bar" style="--width: 45%; --color: #9b59b6;">
                <span class="bar-label">Творчество</span>
                <span class="bar-value">45%</span>
              </div>
            </div>
          </div>

          <div class="explanation">
            <h4>🔍 Объяснение рекомендаций</h4>
            <p>
              <!-- TODO: ClarityRec Core Integration - здесь будет реальное объяснение от XAI -->
              Наши рекомендации основаны на анализе ваших лайков. Вы проявили наибольший интерес 
              к категориям <strong>«Технологии»</strong> и <strong>«Образование»</strong>.
            </p>
            <div class="factors">
              <div class="factor">
                <span class="factor-name">Частота лайков</span>
                <span class="factor-weight">40%</span>
              </div>
              <div class="factor">
                <span class="factor-name">Разнообразие категорий</span>
                <span class="factor-weight">30%</span>
              </div>
              <div class="factor">
                <span class="factor-name">Время взаимодействия</span>
                <span class="factor-weight">30%</span>
              </div>
            </div>
          </div>
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
import { likesApi, recommendApi } from '@/api';

const router = useRouter();
const authStore = useAuthStore();
const appStore = useAppStore();

const likeCount = computed(() => appStore.likeCount);
const isRecommendationReady = ref(false);

const loadUserData = async () => {
  try {
    // Загружаем количество лайков
    const likeResponse = await likesApi.getCount();
    appStore.setLikeCount(likeResponse.data.count);

    // Проверяем статус рекомендаций
    try {
      await recommendApi.getRecommendations();
      isRecommendationReady.value = true;
    } catch {
      isRecommendationReady.value = false;
    }
  } catch (e) {
    console.error('Ошибка загрузки данных:', e);
  }
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
