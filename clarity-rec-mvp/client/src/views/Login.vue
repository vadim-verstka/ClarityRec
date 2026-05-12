<template>
  <div class="login-page">
    <div class="login-card card">
      <h2>Вход в ClarityRec</h2>
      <p class="subtitle">Система рекомендаций</p>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username">Имя пользователя</label>
          <input
            id="username"
            v-model="username"
            type="text"
            class="input"
            placeholder="admin"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">Пароль</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="input"
            placeholder="••••••••"
            required
          />
        </div>

        <div v-if="error" class="error-message">{{ error }}</div>

        <button type="submit" class="btn btn-primary" :disabled="isLoading">
          {{ isLoading ? 'Вход...' : 'Войти' }}
        </button>
      </form>

      <div class="hint">
        <p>💡 Для входа используйте:</p>
        <p><strong>Логин:</strong> admin</p>
        <p><strong>Пароль:</strong> admin123</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/api';

const router = useRouter();
const authStore = useAuthStore();

const username = ref('');
const password = ref('');
const error = ref('');
const isLoading = ref(false);

const handleLogin = async () => {
  error.value = '';
  isLoading.value = true;

  try {
    const response = await authApi.adminLogin(username.value, password.value);
    authStore.setUser(response.data.user, response.data.token);
    
    // Перенаправляем в админку
    router.push('/admin');
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Ошибка входа';
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-card {
  max-width: 400px;
  width: 100%;
}

.login-card h2 {
  margin-bottom: 8px;
  color: #2c3e50;
}

.subtitle {
  color: #7f8c8d;
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #34495e;
}

.error-message {
  background-color: #fee;
  color: #e74c3c;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 14px;
}

.hint {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #eee;
  font-size: 13px;
  color: #7f8c8d;
}

.hint p {
  margin-bottom: 4px;
}
</style>
