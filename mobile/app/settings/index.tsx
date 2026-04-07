import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/lib/api';
import { logout } from '../../src/lib/auth';
import { colors } from '../../src/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface RowProps {
  icon: IoniconsName;
  iconBg: string;
  iconColor: string;
  label: string;
  sub?: string;
  onPress: () => void;
  last?: boolean;
}

function Row({ icon, iconBg, iconColor, label, sub, onPress, last }: RowProps) {
  return (
    <TouchableOpacity
      style={[s.row, !last && s.rowBorder]}
      onPress={onPress}
      activeOpacity={0.65}
    >
      <View style={[s.rowIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={s.rowBody}>
        <Text style={s.rowLabel}>{label}</Text>
        {!!sub && <Text style={s.rowSub}>{sub}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.grey4} />
    </TouchableOpacity>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.card}>{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const [biz, setBiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/business')
      .then((r) => setBiz(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await logout();
    router.replace('/(auth)/login');
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Settings</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
          <Ionicons name="close" size={22} color={colors.black} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Business card */}
        <View style={s.profileCard}>
          <View style={s.profileAvatar}>
            <Text style={s.profileAvatarText}>
              {biz?.name?.[0]?.toUpperCase() || 'B'}
            </Text>
          </View>
          <View style={s.profileInfo}>
            {loading
              ? <ActivityIndicator color={colors.orange} />
              : <>
                  <Text style={s.profileName}>{biz?.name || 'My Business'}</Text>
                  <Text style={s.profileType}>{biz?.agent_type?.replace(/_/g, ' ') || 'Home Services'}</Text>
                </>
            }
          </View>
          <View style={[
            s.agentPill,
            { backgroundColor: biz?.agent_active ? '#D1FAE5' : colors.redLight }
          ]}>
            <View style={[
              s.agentDot,
              { backgroundColor: biz?.agent_active ? colors.green : colors.red }
            ]} />
            <Text style={[
              s.agentPillText,
              { color: biz?.agent_active ? colors.green : colors.red }
            ]}>
              {biz?.agent_active ? 'Active' : 'Paused'}
            </Text>
          </View>
        </View>

        {/* Business section */}
        <Section title="BUSINESS">
          <Row
            icon="business-outline"
            iconBg="#FFF0E6"
            iconColor={colors.orange}
            label="Business Profile"
            sub="Name, industry, service area"
            onPress={() => router.push('/settings/business' as any)}
          />
          <Row
            icon="time-outline"
            iconBg="#EFF6FF"
            iconColor={colors.blue}
            label="Service Hours"
            sub={biz?.hours_text || 'Set your availability'}
            onPress={() => router.push('/settings/business' as any)}
          />
          <Row
            icon="sparkles-outline"
            iconBg="#F5F3FF"
            iconColor="#7C3AED"
            label="Agent Instructions"
            sub="Custom prompt & rules"
            onPress={() => router.push('/settings/instructions' as any)}
            last
          />
        </Section>

        {/* Services section */}
        <Section title="SERVICES & PRICING">
          <Row
            icon="pricetag-outline"
            iconBg="#D1FAE5"
            iconColor={colors.green}
            label="Services & Pricing"
            sub="Add or edit what you offer"
            onPress={() => router.push('/settings/services' as any)}
            last
          />
        </Section>

        {/* Account section */}
        <Section title="ACCOUNT">
          <TouchableOpacity
            style={s.logoutRow}
            onPress={handleLogout}
            activeOpacity={0.65}
          >
            <View style={[s.rowIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="log-out-outline" size={18} color={colors.red} />
            </View>
            <Text style={s.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.black, letterSpacing: -0.5 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.grey5,
    alignItems: 'center', justifyContent: 'center',
  },

  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.white, borderRadius: 18,
    padding: 16, marginBottom: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  profileAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.orange,
    alignItems: 'center', justifyContent: 'center',
  },
  profileAvatarText: { color: colors.white, fontSize: 22, fontWeight: '800' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '700', color: colors.black },
  profileType: {
    fontSize: 12, color: colors.grey3, marginTop: 2,
    textTransform: 'capitalize',
  },
  agentPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  agentDot: { width: 6, height: 6, borderRadius: 3 },
  agentPillText: { fontSize: 11, fontWeight: '700' },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: colors.grey3,
    letterSpacing: 0.8, marginBottom: 8, marginLeft: 4,
  },
  card: {
    backgroundColor: colors.white, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: colors.black },
  rowSub: { fontSize: 12, color: colors.grey3, marginTop: 1 },

  logoutRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: colors.red },
});
