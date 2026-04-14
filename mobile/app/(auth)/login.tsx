import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar,
  ScrollView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { login, signup } from '../../src/lib/auth';
import { colors } from '../../src/theme';

// ── Logo component ────────────────────────────────────────────────────────────

function DispatchLogo({ size = 88 }: { size?: number }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 2200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0,  duration: 2200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: colors.orange,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: colors.orange,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.45,
          shadowRadius: 24,
          elevation: 18,
        }}
      >
        <Ionicons name="navigate" size={size * 0.42} color="#FFF" style={{ marginLeft: 2, marginTop: 1 }} />
        {/* Signal arc — inner */}
        <View
          style={{
            position: 'absolute',
            top: size * 0.08, right: size * 0.08,
            width: size * 0.22, height: size * 0.22,
            borderRadius: size * 0.22,
            borderWidth: 2.5,
            borderColor: 'rgba(255,255,255,0.5)',
            borderLeftWidth: 0, borderBottomWidth: 0,
          }}
        />
        {/* Signal arc — outer */}
        <View
          style={{
            position: 'absolute',
            top: size * 0.02, right: size * 0.02,
            width: size * 0.3, height: size * 0.3,
            borderRadius: size * 0.3,
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.25)',
            borderLeftWidth: 0, borderBottomWidth: 0,
          }}
        />
      </View>
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const router = useRouter();
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignup,     setIsSignup]     = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  // ── Entrance animation ──────────────────────────────────────────────────────
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Auth ────────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }
    setLoading(true);
    try {
      if (isSignup) {
        await signup(email.trim(), password);
        router.replace('/(auth)/onboarding' as any);
      } else {
        await login(email.trim(), password);
        router.replace('/(tabs)/dashboard');
      }
    } catch (e: any) {
      setError(e.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.outer}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo section */}
          <Animated.View style={[s.logoSection, { opacity: fadeAnim }]}>
            <DispatchLogo size={88} />
            <Text style={s.brand}>CueDesk</Text>
            <Text style={s.tagline}>Your AI-powered business assistant</Text>
          </Animated.View>

          {/* Auth card */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={s.card}>
              <Text style={s.cardTitle}>
                {isSignup ? 'Create your account' : 'Welcome back'}
              </Text>
              <Text style={s.cardSub}>
                {isSignup
                  ? 'Capture leads, schedule jobs, 24/7'
                  : 'Sign in to manage your business'}
              </Text>

              {/* Email */}
              <View style={s.fieldGroup}>
                <Text style={s.label}>Email</Text>
                <View style={[s.inputRow, { borderColor: email ? colors.orange : colors.border }]}>
                  <Ionicons name="mail-outline" size={20} color={colors.grey3} style={{ marginRight: 12 }} />
                  <TextInput
                    style={s.input}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.grey4}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={s.fieldGroup}>
                <Text style={s.label}>Password</Text>
                <View style={[s.inputRow, { borderColor: password ? colors.orange : colors.border }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.grey3} style={{ marginRight: 12 }} />
                  <TextInput
                    style={s.input}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.grey4}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.grey3}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {!!error && <Text style={s.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[s.btn, loading && s.btnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Text style={s.btnText}>{isSignup ? 'Get Started' : 'Sign In'}</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFF" />
                  </>
                )}
              </TouchableOpacity>

              <View style={s.toggleRow}>
                <Text style={s.toggleText}>
                  {isSignup ? "Already have an account?" : "Don't have an account?"}
                </Text>
                <TouchableOpacity onPress={() => { setIsSignup(!isSignup); setError(''); }}>
                  <Text style={s.toggleLink}>{isSignup ? 'Sign in' : 'Sign up'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  outer:  { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },

  logoSection: { alignItems: 'center', marginTop: 48, marginBottom: 36 },
  brand:   { fontSize: 36, fontWeight: '800', color: colors.black, letterSpacing: -1, marginTop: 20 },
  tagline: { fontSize: 15, color: colors.grey3, marginTop: 6 },

  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 12,
  },
  cardTitle: { fontSize: 26, fontWeight: '700', color: colors.black, marginBottom: 6 },
  cardSub:   { fontSize: 15, color: colors.grey3, marginBottom: 28, lineHeight: 22 },

  fieldGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: colors.grey1, marginBottom: 8, letterSpacing: 0.3 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: 16,
    backgroundColor: colors.bg,
  },
  input: { flex: 1, fontSize: 16, color: colors.black },

  errorText: { color: colors.red, fontSize: 13, marginBottom: 12, fontWeight: '500' },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 14,
    marginTop: 8,
    gap: 8,
    backgroundColor: colors.orange,
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { fontSize: 17, fontWeight: '700', color: '#FFF' },

  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 6,
  },
  toggleText: { fontSize: 15, color: colors.grey3 },
  toggleLink: { fontSize: 15, fontWeight: '600', color: colors.orange },
});
