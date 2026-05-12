<template>
  <div class="admin-panel">
    <header class="header">
      <h1>👤 Панель администратора</h1>
      <div class="nav-links">
        <span class="user-info">{{ authStore.user?.username }}</span>
        <button @click="handleLogout" class="btn btn-danger">Выйти</button>
      </div>
    </header>

    <main class="container">
      <div class="card">
        <div class="card-header">
          <h2>Пользователи</h2>
          <button @click="showCreateModal = true" class="btn btn-success">
            + Создать пользователя
          </button>
        </div>

        <div v-if="isLoading" class="loading">Загрузка...</div>

        <table v-else class="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Имя пользователя</th>
              <th>Дата создания</th>
              <th>Рекомендации</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>{{ user.id }}</td>
              <td>{{ user.username }}</td>
              <td>{{ formatDate(user.created_at) }}</td>
              <td>
                <span :class="['status-badge', user.is_recommendation_ready ? 'ready' : 'pending']">
                  {{ user.is_recommendation_ready ? '✅ Готовы' : '⏳ Ожидание' }}
                </span>
              </td>
              <td>
                <button 
                  @click="impersonateUser(user.id)" 
                  class="btn btn-primary btn-small"
                >
                  👁 Просмотр как пользователь
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="users.length === 0 && !isLoading" class="empty-state">
          <p>Нет пользователей. Создайте первого!</p>
        </div>
      </div>
    </main>

    <!-- Модальное окно создания пользователя -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal card">
        <h3>Создать пользователя</h3>
        <form @submit.prevent="createUser">
          <div class="form-group">
            <label for="newUsername">Имя пользователя</label>
            <input
              id="newUsername"
              v-model="newUsername"
              type="text"
              class="input"
              placeholder="Минимум 3 символа"
              required
              minlength="3"
            />
          </div>

          <div v-if="createError" class="error-message">{{ createError }}</div>

          <div class="modal-actions">
            <button type="button" @click="showCreateModal = false" class="btn">
              Отмена
            </button>
            <button type="submit" class="btn btn-success" :disabled="isCreating">
              {{ isCreating ? 'Создание...' : 'Создать' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { usersApi } from '@/api';

interface User {
  id: number;
  username: string;
  created_at: string;
  is_recommendation_ready: number;
}

const router = useRouter();
const authStore = useAuthStore();

const users = ref<User[]>([]);
const isLoading = ref(false);
const showCreateModal = ref(false);
const newUsername = ref('');
const createError = ref('');
const isCreating = ref(false);

const loadUsers = async () => {
  isLoading.value = true;
  try {
    const response = await usersApi.getAll();
    users.value = response.data;
  } catch (e) {
    console.error('Ошибка загрузки пользователей:', e);
  } finally {
    isLoading.value = false;
  }
};

const createUser = async () => {
  createError.value = '';
  isCreating.value = true;

  try {
    await usersApi.create(newUsername.value);
    showCreateModal.value = false;
    newUsername.value = '';
    await loadUsers();
  } catch (e: any) {
    createError.value = e.response?.data?.error || 'Ошибка создания';
  } finally {
    isCreating.value = false;
  }
};

const impersonateUser = async (userId: number) => {
  try {
    const response = await usersApi.impersonate(userId);
    // Обновляем токен и данные пользователя
    authStore.setUser(response.data.user, response.data.token);
    // Перенаправляем в ленту
    router.push('/feed');
  } catch (e) {
    console.error('Ошибка переключения:', e);
  }
};

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

onMounted(() => {
  loadUsers();
});
</script>

<style scoped>
.admin-panel {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-header h2 {
  font-size: 18px;
  color: #2c3e50;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th,
.users-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.users-table th {
  font-weight: 600;
  color: #7f8c8d;
  font-size: 13px;
  text-transform: uppercase;
}

.users-table tr:hover {
  background-color: #f9f9f9;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
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

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
}

.loading,
.empty-state {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
}

/* Модальное окно */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  max-width: 400px;
  width: 90%;
}

.modal h3 {
  margin-bottom: 16px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
}

.error-message {
  background-color: #fee;
  color: #e74c3c;
  padding: 10px;
  border-radius: 6px;
  font-size: 14px;
}
</style>
