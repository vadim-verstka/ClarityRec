import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue')
    },
    {
      path: '/admin',
      name: 'AdminPanel',
      component: () => import('@/views/AdminPanel.vue'),
      meta: { requiresAuth: true, adminOnly: true }
    },
    {
      path: '/feed',
      name: 'UserFeed',
      component: () => import('@/views/UserFeed.vue'),
      meta: { requiresAuth: true, userOnly: true }
    },
    {
      path: '/profile',
      name: 'UserProfile',
      component: () => import('@/views/UserProfile.vue'),
      meta: { requiresAuth: true, userOnly: true }
    },
    {
      path: '/',
      redirect: '/login'
    }
  ]
});

// Guard для проверки авторизации
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();
  
  // Инициализируем хранилище если ещё не сделано
  if (!authStore.user && localStorage.getItem('token')) {
    authStore.initFromStorage();
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login');
  } else if (to.meta.adminOnly && !authStore.isAdmin) {
    next('/login');
  } else if (to.meta.userOnly && !authStore.isUser) {
    // Если админ пытается зайти на пользовательскую страницу, перенаправляем в админку
    if (authStore.isAdmin) {
      next('/admin');
    } else {
      next('/login');
    }
  } else {
    next();
  }
});

export default router;
