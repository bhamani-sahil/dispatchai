import * as SecureStore from 'expo-secure-store';
import { BASE_URL } from './api';

function fetchWithTimeout(url: string, options: RequestInit, ms = 20000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(id));
}

export async function login(email: string, password: string): Promise<string> {
  const res = await fetchWithTimeout(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err.detail;
    const msg = typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? (detail[0]?.msg || 'Login failed')
        : (detail?.message || 'Login failed');
    throw new Error(msg);
  }
  const data = await res.json();
  const token = data.access_token;
  await SecureStore.setItemAsync('auth_token', token);
  return token;
}

export async function signup(email: string, password: string): Promise<string> {
  const res = await fetchWithTimeout(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err.detail;
    const msg = typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? (detail[0]?.msg || 'Signup failed')
        : (detail?.message || 'Signup failed');
    throw new Error(msg);
  }
  const data = await res.json();
  const token = data.access_token;
  await SecureStore.setItemAsync('auth_token', token);
  return token;
}

export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync('auth_token');
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync('auth_token');
}
