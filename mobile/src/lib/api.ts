import axios from 'axios';
import { storage } from './storage';

export const BASE_URL = 'https://dispatchai-production-a289.up.railway.app';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// Attach token to every request
api.interceptors.request.use(async (config) => {
  const token = await storage.getItemAsync('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global 401 handler — clear token and redirect to login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await storage.deleteItemAsync('auth_token');
      // Dynamic import avoids circular dependency with router
      const { router } = await import('expo-router');
      router.replace('/(auth)/login' as any);
    }
    return Promise.reject(error);
  }
);

export default api;
