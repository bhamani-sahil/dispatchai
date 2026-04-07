import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getToken, logout } from '../src/lib/auth';
import api from '../src/lib/api';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    async function boot() {
      const token = await getToken();
      if (!token) { router.replace('/(auth)/login'); return; }

      // Verify token is still valid — if not, clear it and go to login
      try {
        await api.get('/api/auth/me');
        router.replace('/(tabs)/dashboard');
      } catch {
        await logout();
        router.replace('/(auth)/login');
      }
    }
    boot();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color="#F96302" size="large" />
    </View>
  );
}
