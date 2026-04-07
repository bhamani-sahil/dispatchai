import React, { createContext, useContext, useState, useCallback } from 'react';

/** Normalize any phone string to +1XXX-XXX-XXXX. Returns original if not parseable. */
export function formatPhone(raw: string): string {
  if (!raw) return raw;
  const digits = raw.replace(/\D/g, '');
  const d = digits.startsWith('1') && digits.length === 11 ? digits.slice(1) : digits;
  if (d.length === 10) return `+1${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return raw;
}

// ── Static colors (backward compat — existing screens keep using this) ─────────
export const colors = {
  orange: '#F96302',
  orangeLight: '#FFF0E6',
  orangeDark: '#D94F00',
  black: '#1A1A1A',
  grey1: '#333333',
  grey2: '#666666',
  grey3: '#999999',
  grey4: '#CCCCCC',
  grey5: '#F0F0F0',
  grey6: '#F8F8F8',
  white: '#FFFFFF',
  bg: '#FAF9F7',
  green: '#10B981',
  greenLight: '#D1FAE5',
  red: '#EF4444',
  redLight: '#FEE2E2',
  amber: '#F59E0B',
  amberLight: '#FEF3C7',
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
  border: '#EEECE8',
  shadow: 'rgba(0,0,0,0.06)',
};

// ── Theme system (new screens use useTheme for dark mode support) ──────────────
const lightColors = {
  primary: '#F96302',
  primaryLight: '#FFF0E6',
  primaryDark: '#D94F00',
  bg: '#FAF9F7',
  card: '#FFFFFF',
  surface: '#F4F2EE',
  text: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#EEECE8',
  inputBg: '#F4F2EE',
  tabBar: '#FFFFFF',
  success: '#10B981',
  successLight: '#D1FAE5',
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  purple: '#7C3AED',
};

const darkColors = {
  primary: '#F96302',
  primaryLight: '#2D1A0A',
  primaryDark: '#D94F00',
  bg: '#0C0C16',
  card: '#16162A',
  surface: '#1E1E36',
  text: '#F0F0F5',
  textSecondary: '#9999AA',
  textTertiary: '#666680',
  border: '#252540',
  inputBg: '#16162A',
  tabBar: '#101020',
  success: '#10B981',
  successLight: '#0A2A1A',
  info: '#4D94FF',
  infoLight: '#0A1828',
  warning: '#FBBF24',
  warningLight: '#2A2210',
  danger: '#F87171',
  dangerLight: '#2A1010',
  purple: '#A78BFA',
};

export type ThemeColors = typeof lightColors;

type ThemeContextType = {
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  colors: lightColors,
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const toggleTheme = useCallback(() => setIsDark((p) => !p), []);
  const themeColors = isDark ? darkColors : lightColors;
  return React.createElement(
    ThemeContext.Provider,
    { value: { colors: themeColors, isDark, toggleTheme } },
    children,
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
