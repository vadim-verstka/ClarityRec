import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  is_recommendation_ready?: boolean;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(null);

  // Инициализация из localStorage
  const initFromStorage = () => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      token.value = storedToken;
      user.value = JSON.parse(storedUser);
    }
  };

  const setUser = (newUser: User, newToken: string) => {
    user.value = newUser;
    token.value = newToken;
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = () => {
    user.value = null;
    token.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const isAdmin = computed(() => user.value?.role === 'admin');
  const isUser = computed(() => user.value?.role === 'user');
  const isAuthenticated = computed(() => !!user.value);

  return {
    user,
    token,
    initFromStorage,
    setUser,
    logout,
    isAdmin,
    isUser,
    isAuthenticated
  };
});
