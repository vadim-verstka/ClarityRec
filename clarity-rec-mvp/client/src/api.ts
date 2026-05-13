import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Интерцептор для добавления токена
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Интерцептор для обработки ошибок авторизации
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Методы API
export const authApi = {
  adminLogin: (username: string, password: string) =>
    api.post('/auth/admin/login', { username, password })
};

export const usersApi = {
  getAll: () => api.get('/users'),
  create: (username: string) => api.post('/users', { username }),
  impersonate: (id: number) => api.post(`/users/${id}/impersonate`),
  getMe: () => api.get('/users/me')
};

export const cardsApi = {
  getAll: () => api.get('/cards')
};

export const likesApi = {
  add: (cardId: number) => api.post('/likes', { cardId }),
  getCount: () => api.get('/likes/count')
};

export const recommendationsApi = {
  get: () => api.get('/recommendations'),
  getExplanation: () => api.get('/explain')
};

export const recommendApi = {
  getRecommendations: () => api.get('/recommend'),
  getExplanation: () => api.get('/explain')
};
