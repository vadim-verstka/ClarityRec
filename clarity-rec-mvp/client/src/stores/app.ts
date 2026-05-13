import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAppStore = defineStore('app', () => {
  const cards = ref<Array<{ id: number; title: string; category: string; image_url: string; score?: number; explanation?: string; feature_impacts?: Array<{ name: string; weight: number; direction: string }> }>>([]);
  const likeCount = ref<number>(0);
  const isLoading = ref(false);

  const setCards = (newCards: typeof cards.value) => {
    cards.value = newCards;
  };

  const setLikeCount = (count: number) => {
    likeCount.value = count;
  };

  const incrementLikeCount = () => {
    likeCount.value++;
  };

  const setLoading = (loading: boolean) => {
    isLoading.value = loading;
  };

  return {
    cards,
    likeCount,
    isLoading,
    setCards,
    setLikeCount,
    incrementLikeCount,
    setLoading
  };
});
