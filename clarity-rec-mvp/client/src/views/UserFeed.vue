<template>
  <div class="user-feed">
    <header class="header">
      <h1>📰 Лента карточек</h1>
      <div class="nav-links">
        <span class="user-info">{{ authStore.user?.username }}</span>
        <router-link to="/profile" class="btn btn-primary">Личный кабинет</router-link>
        <button @click="handleLogout" class="btn btn-danger">Выйти</button>
      </div>
    </header>

    <main class="container">
      <div class="stats-bar card">
        <div class="stat">
          <span class="stat-value">{{ likeCount }}</span>
          <span class="stat-label">Лайков поставлено</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ 5 - likeCount > 0 ? 5 - likeCount : 0 }}</span>
          <span class="stat-label">Осталось до рекомендаций</span>
        </div>
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: `${Math.min((likeCount / 5) * 100, 100)}%` }"
          ></div>
        </div>
      </div>

      <div v-if="isLoading" class="loading">Загрузка карточек...</div>

      <div v-else class="cards-grid">
        <div 
          v-for="card in cards" 
          :key="card.id" 
          class="card-item card"
        >
          <img :src="card.image_url" :alt="card.title" class="card-image" />
          <div class="card-content">
            <span :class="['category-badge', getCategoryClass(card.category)]">
              {{ card.category }}
            </span>
            <h3>{{ card.title }}</h3>
            <button 
              @click="likeCard(card.id)" 
              class="btn btn-like"
              :class="{ liked: likedCards.has(card.id) }"
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
import { cardsApi, likesApi } from '@/api';

interface Card {
  id: number;
  title: string;
  category: string;
  image_url: string;
}

const router = useRouter();
const authStore = useAuthStore();
const appStore = useAppStore();

const cards = computed(() => appStore.cards);
const likeCount = computed(() => appStore.likeCount);
const isLoading = computed(() => appStore.isLoading);
const likedCards = ref<Set<number>>(new Set());

const loadCards = async () => {
  appStore.setLoading(true);
  try {
    const response = await cardsApi.getAll();
    appStore.setCards(response.data);
    
    // Загружаем количество лайков
    const likeResponse = await likesApi.getCount();
    appStore.setLikeCount(likeResponse.data.count);
  } catch (e) {
    console.error('Ошибка загрузки карточек:', e);
  } finally {
    appStore.setLoading(false);
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
      // Можно показать уведомление
      alert('🎉 Поздравляем! Вы набрали 5 лайков. Рекомендации готовы в личном кабинете!');
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

.stats-bar {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 24px;
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

.card-image {
  width: 100%;
  height: 180px;
  object-fit: cover;
}

.card-content {
  padding: 16px;
}

.card-content h3 {
  font-size: 16px;
  margin: 12px 0;
  color: #2c3e50;
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

.btn-like {
  width: 100%;
  margin-top: 12px;
  background-color: #f5f5f5;
  color: #2c3e50;
}

.btn-like:hover {
  background-color: #ffebee;
}

.btn-like.liked {
  background-color: #ffebee;
  color: #e74c3c;
}

.loading {
  text-align: center;
  padding: 60px;
  color: #7f8c8d;
}
</style>
