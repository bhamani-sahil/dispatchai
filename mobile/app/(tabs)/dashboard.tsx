import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Switch, Animated, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../../src/lib/api';
import { DashboardData, Booking, ActivityItem } from '../../src/types';
import { formatPhone, useTheme } from '../../src/theme';

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon, iconColor, iconBg, value, label, accent, delay = 0,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string; iconBg: string; value: string; label: string; accent: string; delay?: number;
}) {
  const { colors, isDark } = useTheme();
  const scale   = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 8, tension: 40, delay, useNativeDriver: true } as any),
    ]).start();
  }, []);

  return (
    <Animated.View style={[s.statCard, {
      backgroundColor: colors.card,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? colors.border : 'transparent',
      shadowColor: isDark ? '#000' : accent,
      shadowOffset: { width: 0, height: isDark ? 2 : 6 },
      shadowOpacity: isDark ? 0.4 : 0.15,
      shadowRadius: isDark ? 6 : 16,
      elevation: isDark ? 4 : 8,
      transform: [{ scale }],
      opacity,
    }]}>
      <View style={[s.statIconCircle, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={[s.statValue, { color: accent }]}>{value}</Text>
      <Text style={[s.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </Animated.View>
  );
}

// ── Activity row ──────────────────────────────────────────────────────────────

const ACTIVITY_META: Record<string, { icon: string; accent: string; bg: string }> = {
  booking:  { icon: 'checkmark-circle', accent: '#10B981', bg: '#D1FAE5' },
  blocked:  { icon: 'ban',              accent: '#6B7280', bg: '#F3F4F6' },
  message:  { icon: 'chatbubble',       accent: '#3B82F6', bg: '#DBEAFE' },
  quote:    { icon: 'cash',             accent: '#F96302', bg: '#FFF0E6' },
  default:  { icon: 'flash',            accent: '#F96302', bg: '#FFF0E6' },
};

function ActivityRow({ item, last }: { item: ActivityItem; last: boolean }) {
  const { colors } = useTheme();
  const meta = ACTIVITY_META[item.type] ?? ACTIVITY_META.default;
  const when = item.time ? timeAgo(item.time) : '';
  return (
    <View style={[s.actRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <View style={[s.actIconCircle, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon as any} size={18} color={meta.accent} />
      </View>
      <View style={s.actBody}>
        <Text style={[s.actLabel, { color: colors.text }]} numberOfLines={1}>{item.label}</Text>
        <Text style={[s.actSub, { color: colors.textTertiary }]} numberOfLines={1}>
          {item.summary || ''}
        </Text>
      </View>
      <Text style={[s.actTime, { color: colors.textTertiary }]}>{when}</Text>
    </View>
  );
}

// ── Job row ───────────────────────────────────────────────────────────────────

function JobRow({ job }: { job: Booking }) {
  const { colors } = useTheme();
  return (
    <View style={[s.jobRow, { backgroundColor: colors.card }]}>
      <View style={[s.jobTimeBox, { backgroundColor: colors.primaryLight }]}>
        <Text style={[s.jobDate, { color: colors.primary }]}>{job.slot_date?.slice(5)}</Text>
        <Text style={[s.jobSlot, { color: colors.primary }]}>{job.slot_time?.split('-')[0]}</Text>
      </View>
      <View style={s.jobBody}>
        <Text style={[s.jobPhone, { color: colors.text }]}>{formatPhone(job.customer_phone)}</Text>
        {!!job.customer_address && (
          <View style={s.jobMeta}>
            <Ionicons name="location-outline" size={12} color={colors.textTertiary} />
            <Text style={[s.jobMetaText, { color: colors.textTertiary }]} numberOfLines={1}>{job.customer_address}</Text>
          </View>
        )}
        {!!job.job_summary && (
          <View style={s.jobMeta}>
            <Ionicons name="briefcase-outline" size={12} color={colors.textTertiary} />
            <Text style={[s.jobMetaText, { color: colors.textTertiary }]} numberOfLines={1}>{job.job_summary}</Text>
          </View>
        )}
      </View>
      <View style={[s.jobBadge, { backgroundColor: colors.successLight }]}>
        <Text style={[s.jobBadgeText, { color: colors.success }]}>Booked</Text>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const [data,       setData]       = useState<DashboardData | null>(null);
  const [bizName,    setBizName]    = useState('');
  const [bizType,    setBizType]    = useState('');
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [dash, biz] = await Promise.all([
        api.get('/api/dashboard?period=this_week'),
        api.get('/api/business').catch(() => ({ data: { name: '' } })),
      ]);
      setData(dash.data);
      setBizName(biz.data?.name || '');
      setBizType(biz.data?.agent_type?.replace(/_/g, ' ') || '');
    } catch (e: any) {
      const status = e.response?.status;
      if (status === 401) router.replace('/(auth)/login');
      else if (status === 404) router.replace('/(auth)/onboarding' as any);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  async function toggleAgent(val: boolean) {
    await api.put('/api/dashboard/agent-toggle', { active: val });
    setData(d => d ? { ...d, agent_active: val } : d);
  }

  if (loading) {
    return (
      <View style={[s.loadingWrap, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const firstName = bizName.split(' ')[0] || 'there';

  return (
    <SafeAreaView style={[s.outer, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />
        }
      >
        {/* ── Header ── */}
        <Animated.View style={[s.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity style={[s.menuBtn, { backgroundColor: colors.card }]} onPress={() => setDrawerOpen(true)}>
            <Ionicons name="menu" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.greeting, { color: colors.text }]}>{greeting}</Text>
          <TouchableOpacity style={[s.avatar, { backgroundColor: colors.primary }]} onPress={() => router.push('/settings' as any)}>
            <Text style={s.avatarText}>{firstName[0]?.toUpperCase() || 'D'}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Stat cards ── */}
        <View style={s.statsGrid}>
          <StatCard icon="cash"     iconColor={colors.success} iconBg={isDark ? '#0A2A1A' : '#E8FFF3'} value={`$${(data?.revenue_converted ?? 0).toLocaleString()}`} label="Revenue"  accent={colors.success} delay={0}   />
          <StatCard icon="time"     iconColor={colors.info}    iconBg={isDark ? '#0A1A2A' : '#E6F0FF'} value={`${data?.time_saved_hours ?? 0} hrs`}                  label="Saved"    accent={colors.info}    delay={80}  />
          <StatCard icon="calendar" iconColor={colors.primary} iconBg={isDark ? '#2D1A12' : '#FFF0EB'} value={String(data?.total_bookings ?? 0)}                      label="Bookings" accent={colors.primary}  delay={160} />
          <StatCard icon="pulse"    iconColor={colors.purple}  iconBg={isDark ? '#1A102A' : '#F3EEFF'} value={`${Math.round(data?.conversion_rate ?? 0)}%`}           label="AI Score" accent={colors.purple}   delay={240} />
        </View>

        {/* ── Quick Actions ── */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={s.actions}>
            <TouchableOpacity
              style={[s.actionBtn, {
                backgroundColor: colors.primaryLight,
                shadowColor: isDark ? '#000' : colors.primary,
                borderWidth: isDark ? 1 : 0, borderColor: isDark ? colors.border : 'transparent',
              }]}
              onPress={() => router.push('/(tabs)/scheduler' as any)}
              activeOpacity={0.75}
            >
              <Ionicons name="add-circle" size={24} color={colors.primary} />
              <Text style={[s.actionLabel, { color: colors.primary }]}>New Job</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.actionBtn, {
                backgroundColor: colors.card,
                shadowColor: isDark ? '#000' : colors.info,
                borderWidth: isDark ? 1 : 0, borderColor: isDark ? colors.border : 'transparent',
              }]}
              onPress={() => router.push('/(tabs)/inbox' as any)}
              activeOpacity={0.75}
            >
              <Ionicons name="chatbubbles" size={24} color={colors.info} />
              <Text style={[s.actionLabel, { color: colors.info }]}>Chats</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.actionBtn, {
                backgroundColor: data?.agent_active ? (isDark ? '#0A2A1A' : '#E8FFF3') : colors.card,
                shadowColor: isDark ? '#000' : colors.success,
                borderWidth: isDark ? 1 : 0, borderColor: isDark ? colors.border : 'transparent',
              }]}
              onPress={() => toggleAgent(!data?.agent_active)}
              activeOpacity={0.75}
            >
              <View style={s.agentDotRow}>
                <View style={[s.agentDot, { backgroundColor: data?.agent_active ? colors.success : colors.textTertiary }]} />
                <Ionicons name="flash" size={24} color={data?.agent_active ? colors.success : colors.textSecondary} />
              </View>
              <Text style={[s.actionLabel, { color: data?.agent_active ? colors.success : colors.textSecondary }]}>
                AI {data?.agent_active ? 'Active' : 'Off'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Upcoming jobs ── */}
        {(data?.upcoming_jobs?.length ?? 0) > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>Upcoming Jobs</Text>
              <View style={[s.countBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[s.countBadgeText, { color: colors.primary }]}>{data!.upcoming_jobs.length}</Text>
              </View>
            </View>
            {data!.upcoming_jobs.map((job, i) => <JobRow key={i} job={job} />)}
          </View>
        )}

        {/* ── Recent Activity ── */}
        {(data?.recent_activity?.length ?? 0) > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
            <View style={[s.activityCard, { backgroundColor: colors.card }]}>
              {data!.recent_activity.slice(0, 6).map((item, i) => (
                <ActivityRow
                  key={i}
                  item={item}
                  last={i === Math.min(5, data!.recent_activity.length - 1)}
                />
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Business Drawer ── */}
      <Modal visible={drawerOpen} animationType="slide" transparent>
        <Pressable style={s.drawerOverlay} onPress={() => setDrawerOpen(false)}>
          <Pressable style={[s.drawerContent, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={s.drawerBiz}>
              <View style={[s.drawerLogo, { backgroundColor: colors.primary }]}>
                <Ionicons name="flash" size={26} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.drawerBizName, { color: colors.text }]} numberOfLines={1}>{bizName || 'My Business'}</Text>
                <Text style={[s.drawerBizType, { color: colors.textSecondary }]} numberOfLines={1}>
                  {bizType ? bizType.charAt(0).toUpperCase() + bizType.slice(1) : 'DispatchAI'}
                </Text>
              </View>
            </View>

            <View style={[s.drawerDivider, { backgroundColor: colors.border }]} />

            <View style={s.drawerRow}>
              <View style={s.drawerRowLeft}>
                <View style={[s.drawerIcon, { backgroundColor: data?.agent_active ? '#E8FFF3' : '#FEE2E2' }]}>
                  <Ionicons name="flash" size={20} color={data?.agent_active ? '#10B981' : '#EF4444'} />
                </View>
                <View>
                  <Text style={[s.drawerLabel, { color: colors.text }]}>AI Agent</Text>
                  <Text style={[s.drawerSub, { color: data?.agent_active ? '#10B981' : '#EF4444' }]}>
                    {data?.agent_active ? 'Active — Taking calls' : 'Inactive'}
                  </Text>
                </View>
              </View>
              <Switch
                value={data?.agent_active ?? false}
                onValueChange={toggleAgent}
                trackColor={{ false: colors.border, true: 'rgba(16,185,129,0.35)' }}
                thumbColor={data?.agent_active ? '#10B981' : '#FFF'}
              />
            </View>

            <View style={s.drawerRow}>
              <View style={s.drawerRowLeft}>
                <View style={[s.drawerIcon, { backgroundColor: isDark ? colors.primaryLight : colors.surface }]}>
                  <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color={isDark ? colors.primary : colors.textSecondary} />
                </View>
                <View>
                  <Text style={[s.drawerLabel, { color: colors.text }]}>Dark Mode</Text>
                  <Text style={[s.drawerSub, { color: colors.textTertiary }]}>{isDark ? 'On' : 'Off'}</Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: 'rgba(249,99,2,0.35)' }}
                thumbColor={isDark ? colors.primary : '#FFF'}
              />
            </View>

            <View style={[s.drawerDivider, { backgroundColor: colors.border }]} />

            {[
              { icon: 'business-outline', label: 'Business Profile',   sub: 'Name, hours, area',     route: '/settings/business' },
              { icon: 'pricetag-outline', label: 'Services & Pricing', sub: 'Edit what you offer',   route: '/settings/services' },
              { icon: 'settings-outline', label: 'All Settings',       sub: 'Account & preferences', route: '/settings' },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                style={s.drawerLink}
                onPress={() => { setDrawerOpen(false); router.push(item.route as any); }}
              >
                <Ionicons name={item.icon as any} size={22} color={colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.drawerLabel, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[s.drawerSub, { color: colors.textTertiary }]}>{item.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  outer:       { flex: 1 },
  scroll:      { paddingBottom: 32 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20,
  },
  menuBtn: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  greeting:   { flex: 1, fontSize: 24, fontWeight: '700' },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFF', fontWeight: '800', fontSize: 18 },

  // Stats
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 20, justifyContent: 'space-between', marginBottom: 28,
  },
  statCard: {
    width: '48%', padding: 18, borderRadius: 20, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 14, elevation: 5,
  },
  statIconCircle: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statValue:  { fontSize: 26, fontWeight: '700', marginBottom: 2 },
  statLabel:  { fontSize: 13, fontWeight: '500' },

  // Sections
  section:       { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle:  { flex: 1, fontSize: 18, fontWeight: '700', marginBottom: 14 },
  countBadge:    { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  countBadgeText:{ fontWeight: '700', fontSize: 12 },

  // Quick actions
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1, padding: 16, borderRadius: 16, alignItems: 'center', gap: 8,
    shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.12, shadowRadius: 14, elevation: 6,
  },
  actionLabel:  { fontSize: 12, fontWeight: '600' },
  agentDotRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  agentDot:     { width: 8, height: 8, borderRadius: 4 },

  // Job rows
  jobRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  jobTimeBox:   { borderRadius: 12, padding: 10, alignItems: 'center', minWidth: 54 },
  jobDate:      { fontWeight: '700', fontSize: 12 },
  jobSlot:      { fontSize: 11, marginTop: 2 },
  jobBody:      { flex: 1 },
  jobPhone:     { fontSize: 14, fontWeight: '700' },
  jobMeta:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  jobMetaText:  { fontSize: 12, flex: 1 },
  jobBadge:     { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  jobBadgeText: { fontSize: 11, fontWeight: '700' },

  // Activity
  activityCard: {
    borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  actRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  actIconCircle:{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actBody:      { flex: 1 },
  actLabel:     { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  actSub:       { fontSize: 12 },
  actTime:      { fontSize: 12 },

  // Drawer
  drawerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  drawerContent: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 28, paddingBottom: 44,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12, shadowRadius: 24, elevation: 20,
  },
  drawerBiz:     { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  drawerLogo:    { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  drawerBizName: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  drawerBizType: { fontSize: 13, textTransform: 'capitalize' },
  drawerDivider: { height: 1, marginVertical: 16 },
  drawerRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  drawerRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  drawerIcon:    { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  drawerLabel:   { fontSize: 15, fontWeight: '600', marginBottom: 1 },
  drawerSub:     { fontSize: 12 },
  drawerLink:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 14 },
});
