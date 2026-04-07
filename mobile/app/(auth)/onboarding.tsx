import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  StatusBar, Switch, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/lib/api';
import { colors } from '../../src/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

// ── Industry sectors ──────────────────────────────────────────────────────────

const SECTORS: {
  value: string; label: string; icon: IoniconsName;
  color: string; bg: string;
}[] = [
  { value: 'plumbing',           label: 'Plumbing',       icon: 'water',             color: '#0066FF', bg: '#E6F0FF' },
  { value: 'hvac',               label: 'HVAC',           icon: 'thermometer',       color: '#00C48C', bg: '#E8FFF3' },
  { value: 'electrical',         label: 'Electrical',     icon: 'flash',             color: '#F59E0B', bg: '#FEF3C7' },
  { value: 'pet_grooming',       label: 'Pet Grooming',   icon: 'paw',               color: '#EC4899', bg: '#FDF2F8' },
  { value: 'auto_detailing',     label: 'Auto Detailing', icon: 'car-sport',         color: '#7C3AED', bg: '#F3EEFF' },
  { value: 'house_cleaning',     label: 'Cleaning',       icon: 'sparkles',          color: '#06B6D4', bg: '#E0F7FA' },
  { value: 'landscaping',        label: 'Landscaping',    icon: 'leaf',              color: '#22C55E', bg: '#DCFCE7' },
  { value: 'pest_control',       label: 'Pest Control',   icon: 'bug',               color: '#EF4444', bg: '#FEE2E2' },
  { value: 'carpet_cleaning',    label: 'Carpet Care',    icon: 'grid',              color: '#8B5CF6', bg: '#EDE9FE' },
  { value: 'junk_removal',       label: 'Junk Removal',   icon: 'trash',             color: '#64748B', bg: '#F1F5F9' },
  { value: 'moving_services',    label: 'Moving',         icon: 'cube',              color: '#F97316', bg: '#FFEDD5' },
  { value: 'general_handyman',   label: 'Handyman',       icon: 'hammer',            color: '#0EA5E9', bg: '#E0F2FE' },
  { value: 'garage_door_repair', label: 'Garage Door',    icon: 'home',              color: '#84CC16', bg: '#ECFCCB' },
  { value: 'car_repair',         label: 'Car Repair',     icon: 'construct-outline', color: '#A855F7', bg: '#F3E8FF' },
  { value: 'locksmith',          label: 'Locksmith',      icon: 'key',               color: '#EAB308', bg: '#FEF9C3' },
  { value: 'pressure_washing',   label: 'Pressure Wash',  icon: 'rainy-outline',     color: '#0EA5E9', bg: '#E0F2FE' },
  { value: 'appliance_repair',   label: 'Appliance',      icon: 'settings-outline',  color: '#6B7280', bg: '#F3F4F6' },
  { value: 'other',              label: 'Other',          icon: 'apps',              color: '#6B7280', bg: '#F3F4F6' },
];

const SERVICE_TYPES = [
  { value: 'onsite', icon: 'storefront-outline' as IoniconsName, label: 'Onsite / Shop',   desc: 'Customers come to your location' },
  { value: 'mobile', icon: 'car-outline' as IoniconsName,         label: 'Mobile / Home',   desc: 'You travel to them' },
  { value: 'both',   icon: 'swap-horizontal-outline' as IoniconsName, label: 'Both',        desc: 'You offer both options' },
];

// ── Hours helpers ─────────────────────────────────────────────────────────────

type HoursRow = { open: boolean; start: string; end: string };
type HoursState = { weekday: HoursRow; saturday: HoursRow; sunday: HoursRow };

function buildHoursText(h: HoursState): string {
  const parts: string[] = [];
  if (h.weekday.open)  parts.push(`Mon–Fri ${h.weekday.start}–${h.weekday.end}`);
  if (h.saturday.open) parts.push(`Sat ${h.saturday.start}–${h.saturday.end}`);
  if (h.sunday.open)   parts.push(`Sun ${h.sunday.start}–${h.sunday.end}`);
  return parts.join(', ') || 'Flexible hours';
}

function buildHoursJson(h: HoursState): Record<string, { open: string; close: string } | null> {
  const days: Record<string, { open: string; close: string } | null> = {};
  ['monday','tuesday','wednesday','thursday','friday'].forEach(d => {
    days[d] = h.weekday.open ? { open: h.weekday.start, close: h.weekday.end } : null;
  });
  days['saturday'] = h.saturday.open ? { open: h.saturday.start, close: h.saturday.end } : null;
  days['sunday']   = h.sunday.open   ? { open: h.sunday.start,   close: h.sunday.end   } : null;
  return days;
}

// ── Shared header (4-step progress bar) ──────────────────────────────────────

function OnboardingHeader({ step, onBack }: { step: number; onBack?: () => void }) {
  const progress = step / 4;
  return (
    <View style={h.wrap}>
      <TouchableOpacity style={h.backBtn} onPress={onBack} disabled={!onBack} activeOpacity={0.7}>
        {onBack && <Ionicons name="chevron-back" size={24} color={colors.black} />}
      </TouchableOpacity>
      <View style={h.progressWrap}>
        <View style={h.track}>
          <Animated.View style={[h.fill, { width: `${progress * 100}%` as any }]} />
        </View>
      </View>
      <View style={{ width: 44 }} />
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [phone,     setPhone]     = useState('');

  // Step 2
  const [sector, setSector] = useState('');
  const [search, setSearch] = useState('');

  // Step 3
  const [serviceLocation, setServiceLocation] = useState<'onsite'|'mobile'|'both'|''>('');

  // Step 4
  const [bizName,      setBizName]      = useState('');
  const [hours,        setHours]        = useState<HoursState>({
    weekday:  { open: true,  start: '08:00', end: '17:00' },
    saturday: { open: false, start: '09:00', end: '14:00' },
    sunday:   { open: false, start: '10:00', end: '14:00' },
  });
  const [instructions, setInstructions] = useState('');

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // ── Animations ────────────────────────────────────────────────────────────

  const stepAnim    = useRef(new Animated.Value(0)).current;
  const sectorAnims = useRef(SECTORS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    stepAnim.setValue(0);
    Animated.timing(stepAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    if (step === 2) {
      sectorAnims.forEach(a => a.setValue(0));
      Animated.stagger(40, sectorAnims.map(a =>
        Animated.spring(a, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true })
      )).start();
    }
  }, [step]);

  const fadeSlide = {
    opacity: stepAnim,
    transform: [{ translateY: stepAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
  };

  // ── Navigation ────────────────────────────────────────────────────────────

  function goNext() {
    setError('');
    if (step === 1) {
      if (!firstName.trim()) { setError('First name is required'); return; }
      setStep(2);
    } else if (step === 2) {
      if (!sector) { setError('Please select your industry'); return; }
      setStep(3);
    } else if (step === 3) {
      if (!serviceLocation) { setError('Please select how you serve customers'); return; }
      setStep(4);
    }
  }

  async function complete() {
    setError('');
    if (!bizName.trim()) { setError('Organization name is required'); return; }
    setLoading(true);
    try {
      await api.post('/api/business', {
        name: bizName.trim(),
        agent_type: sector,
        hours_text: buildHoursText(hours),
        business_hours: buildHoursJson(hours),
        custom_instructions: instructions.trim() || null,
        service_location: serviceLocation || 'both',
      });
      router.replace('/(tabs)/dashboard');
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to save. Try again.');
    } finally {
      setLoading(false);
    }
  }

  const filteredSectors = search.trim()
    ? SECTORS.filter(s => s.label.toLowerCase().includes(search.toLowerCase()))
    : SECTORS;

  // ── Step 2: Industry (full-screen grid) ───────────────────────────────────

  if (step === 2) {
    return (
      <SafeAreaView style={s.outer}>
        <StatusBar barStyle="dark-content" />
        <OnboardingHeader step={2} onBack={() => { setError(''); setStep(1); }} />

        <Animated.View style={[{ flex: 1 }, fadeSlide]}>
          <View style={s.titleSection}>
            <Text style={s.bigTitle}>What's your trade?</Text>
            <Text style={s.bigSub}>We'll customize AI responses for your industry.</Text>
          </View>

          <View style={s.searchBar}>
            <Ionicons name="search" size={20} color={colors.grey3} />
            <TextInput
              style={s.searchInput}
              placeholder="Search industries..."
              placeholderTextColor={colors.grey4}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={20} color={colors.grey3} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView contentContainerStyle={s.gridScroll} showsVerticalScrollIndicator={false}>
            <View style={s.grid}>
              {filteredSectors.map((sec) => {
                const idx    = SECTORS.indexOf(sec);
                const anim   = sectorAnims[idx];
                const active = sector === sec.value;
                return (
                  <Animated.View
                    key={sec.value}
                    style={[s.sectorCardWrap, {
                      opacity: anim,
                      transform: [{ scale: anim.interpolate({ inputRange: [0,1], outputRange: [0.85, 1] }) }],
                    }]}
                  >
                    <TouchableOpacity
                      style={[s.sectorCard, { backgroundColor: active ? sec.bg : colors.white, borderColor: active ? sec.color : colors.border }]}
                      onPress={() => setSector(sec.value)}
                      activeOpacity={0.75}
                    >
                      <View style={[s.iconCircle, { backgroundColor: sec.bg }]}>
                        <Ionicons name={sec.icon} size={24} color={sec.color} />
                      </View>
                      <Text style={[s.sectorLabel, { color: active ? sec.color : colors.grey1 }]}>{sec.label}</Text>
                      {active && (
                        <View style={[s.checkBadge, { backgroundColor: sec.color }]}>
                          <Ionicons name="checkmark" size={12} color="#FFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
              {filteredSectors.length === 0 && (
                <View style={s.emptyState}>
                  <Ionicons name="search-outline" size={48} color={colors.grey5} />
                  <Text style={s.emptyText}>No industries found</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </Animated.View>

        <View style={s.bottomBar}>
          {!!error && <Text style={[s.error, { marginBottom: 10 }]}>{error}</Text>}
          <TouchableOpacity
            style={[s.continueBtn, !sector && s.btnDisabled]}
            onPress={goNext}
            disabled={!sector}
            activeOpacity={0.85}
          >
            <Text style={s.continueBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Step 3: Service Type ──────────────────────────────────────────────────

  if (step === 3) {
    return (
      <SafeAreaView style={s.outer}>
        <StatusBar barStyle="dark-content" />
        <OnboardingHeader step={3} onBack={() => { setError(''); setStep(2); }} />

        <Animated.View style={[s.serviceTypeContent, fadeSlide]}>
          <Text style={s.bigTitle}>How do you serve{'\n'}customers?</Text>
          <Text style={s.bigSub}>This helps us optimize your booking flow.</Text>

          <View style={s.serviceCards}>
            {SERVICE_TYPES.map((st) => {
              const isActive = serviceLocation === st.value;
              return (
                <TouchableOpacity
                  key={st.value}
                  style={[s.serviceCard, isActive && s.serviceCardActive]}
                  onPress={() => setServiceLocation(st.value as any)}
                  activeOpacity={0.75}
                >
                  <View style={[s.serviceIconWrap, isActive && s.serviceIconWrapActive]}>
                    <Ionicons name={st.icon} size={28} color={isActive ? colors.orange : colors.grey3} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.serviceLabel, isActive && s.serviceLabelActive]}>{st.label}</Text>
                    <Text style={s.serviceDesc}>{st.desc}</Text>
                  </View>
                  {isActive && (
                    <View style={s.serviceCheck}>
                      <Ionicons name="checkmark" size={16} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        <View style={s.bottomBar}>
          {!!error && <Text style={[s.error, { marginBottom: 10 }]}>{error}</Text>}
          <TouchableOpacity
            style={[s.continueBtn, !serviceLocation && s.btnDisabled]}
            onPress={goNext}
            disabled={!serviceLocation}
            activeOpacity={0.85}
          >
            <Text style={s.continueBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Steps 1 & 4 (card layout) ─────────────────────────────────────────────

  return (
    <SafeAreaView style={s.outer}>
      <StatusBar barStyle="dark-content" />
      <OnboardingHeader
        step={step}
        onBack={step > 1 ? () => { setError(''); setStep(step - 1); } : undefined}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Step 1: Personal Details ── */}
          {step === 1 && (
            <Animated.View style={[s.card, fadeSlide]}>
              <Text style={s.cardTitle}>Personal Details</Text>
              <Text style={s.cardSub}>Configure your administrator profile.</Text>

              <View style={s.row}>
                <View style={s.half}>
                  <Text style={s.label}>FIRST NAME</Text>
                  <TextInput
                    style={[s.input, { borderColor: firstName ? colors.orange : colors.border }]}
                    placeholder="John"
                    placeholderTextColor={colors.grey4}
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                  />
                </View>
                <View style={{ width: 14 }} />
                <View style={s.half}>
                  <Text style={s.label}>LAST NAME</Text>
                  <TextInput
                    style={[s.input, { borderColor: lastName ? colors.orange : colors.border }]}
                    placeholder="Doe"
                    placeholderTextColor={colors.grey4}
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={s.field}>
                <Text style={s.label}>PHONE NUMBER</Text>
                <TextInput
                  style={[s.input, { borderColor: phone ? colors.orange : colors.border }]}
                  placeholder="(555) 123-4567"
                  placeholderTextColor={colors.grey4}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>

              {!!error && <Text style={s.error}>{error}</Text>}

              <TouchableOpacity style={s.nextBtn} onPress={goNext} activeOpacity={0.85}>
                <Text style={s.nextBtnText}>Next Step</Text>
                <Ionicons name="chevron-forward" size={20} color="#FFF" />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ── Step 4: Operational Rules ── */}
          {step === 4 && (
            <Animated.View style={[s.card, fadeSlide]}>
              <Text style={s.cardTitle}>Operational Rules</Text>
              <Text style={s.cardSub}>Configure booking parameters and AI behavior.</Text>

              <View style={s.field}>
                <Text style={s.label}>ORGANIZATION NAME</Text>
                <View style={[s.inputRow, { borderColor: bizName ? colors.orange : colors.border }]}>
                  <Ionicons name="business-outline" size={20} color={colors.grey3} style={{ marginRight: 12 }} />
                  <TextInput
                    style={s.inputRowText}
                    placeholder="Ace moving service"
                    placeholderTextColor={colors.grey4}
                    value={bizName}
                    onChangeText={setBizName}
                  />
                </View>
              </View>

              <Text style={[s.label, { marginBottom: 14 }]}>SERVICE HOURS</Text>
              <View style={s.schedBlock}>
                <View style={[s.schedRow, { borderBottomColor: colors.border }]}>
                  <Switch
                    value={hours.weekday.open}
                    onValueChange={(v) => setHours({ ...hours, weekday: { ...hours.weekday, open: v } })}
                    trackColor={{ false: colors.grey5, true: colors.orangeLight }}
                    thumbColor={hours.weekday.open ? colors.orange : colors.white}
                  />
                  <Text style={[s.dayText, { color: hours.weekday.open ? colors.black : colors.grey3 }]}>Mon — Fri</Text>
                  {hours.weekday.open ? (
                    <View style={s.timeRow}>
                      <View style={s.timePill}><Text style={s.timeVal}>{hours.weekday.start}</Text></View>
                      <Text style={s.toText}>to</Text>
                      <View style={s.timePill}><Text style={s.timeVal}>{hours.weekday.end}</Text></View>
                    </View>
                  ) : <Text style={s.closedText}>Closed</Text>}
                </View>
                <View style={[s.schedRow, { borderBottomColor: colors.border }]}>
                  <Switch
                    value={hours.saturday.open}
                    onValueChange={(v) => setHours({ ...hours, saturday: { ...hours.saturday, open: v } })}
                    trackColor={{ false: colors.grey5, true: colors.orangeLight }}
                    thumbColor={hours.saturday.open ? colors.orange : colors.white}
                  />
                  <Text style={[s.dayText, { color: hours.saturday.open ? colors.black : colors.grey3 }]}>Saturday</Text>
                  <Text style={s.closedText}>{hours.saturday.open ? 'Open' : 'Closed'}</Text>
                </View>
                <View style={s.schedRow}>
                  <Switch
                    value={hours.sunday.open}
                    onValueChange={(v) => setHours({ ...hours, sunday: { ...hours.sunday, open: v } })}
                    trackColor={{ false: colors.grey5, true: colors.orangeLight }}
                    thumbColor={hours.sunday.open ? colors.orange : colors.white}
                  />
                  <Text style={[s.dayText, { color: hours.sunday.open ? colors.black : colors.grey3 }]}>Sunday</Text>
                  <Text style={s.closedText}>{hours.sunday.open ? 'Open' : 'Closed'}</Text>
                </View>
              </View>

              <View style={s.field}>
                <Text style={s.label}>CUSTOM INSTRUCTIONS (optional)</Text>
                <TextInput
                  style={[s.textArea, { borderColor: instructions ? colors.orange : colors.border }]}
                  placeholder="e.g. Do not schedule same-day jobs..."
                  placeholderTextColor={colors.grey4}
                  value={instructions}
                  onChangeText={setInstructions}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {!!error && <Text style={s.error}>{error}</Text>}

              <TouchableOpacity
                style={[s.completeBtn, loading && s.btnDisabled]}
                onPress={complete}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color={colors.white} />
                  : <><Text style={s.completeBtnText}>Complete Setup</Text><Ionicons name="checkmark" size={20} color="#FFF" /></>
                }
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  outer:  { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },

  // Step 2 (industry)
  titleSection: { paddingHorizontal: 20, marginBottom: 14 },
  bigTitle: { fontSize: 28, fontWeight: '700', color: colors.black, marginBottom: 6, lineHeight: 36 },
  bigSub:   { fontSize: 14, color: colors.grey3 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, marginHorizontal: 20,
    paddingHorizontal: 16, height: 48, borderRadius: 14, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 15, marginLeft: 12, color: colors.black },

  gridScroll:    { paddingHorizontal: 20, paddingBottom: 110 },
  grid:          { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 8 },
  sectorCardWrap:{ width: '47%', marginBottom: 12 },
  sectorCard: {
    padding: 16, borderRadius: 16, borderWidth: 2, alignItems: 'center',
    position: 'relative', shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  sectorLabel: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  checkBadge: {
    position: 'absolute', top: 8, right: 8,
    width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  emptyState: { width: '100%', alignItems: 'center', paddingTop: 60 },
  emptyText:  { fontSize: 15, color: colors.grey3, marginTop: 12 },

  // Step 3 (service type)
  serviceTypeContent: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
  serviceCards:   { gap: 14, marginTop: 36 },
  serviceCard: {
    flexDirection: 'row', alignItems: 'center', padding: 18,
    borderRadius: 20, borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.white,
  },
  serviceCardActive:   { borderColor: colors.orange, backgroundColor: colors.orangeLight },
  serviceIconWrap: {
    width: 52, height: 52, borderRadius: 16, alignItems: 'center',
    justifyContent: 'center', marginRight: 16, backgroundColor: colors.grey5,
  },
  serviceIconWrapActive: { backgroundColor: '#FFE4D6' },
  serviceLabel:    { fontSize: 17, fontWeight: '700', color: colors.black, marginBottom: 3 },
  serviceLabelActive: { color: colors.orange },
  serviceDesc:     { fontSize: 13, color: colors.grey3 },
  serviceCheck: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center',
  },

  // Bottom bar
  bottomBar: {
    backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 34,
  },
  continueBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 54, borderRadius: 14, gap: 8, backgroundColor: colors.orange,
    shadowColor: colors.orange, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  continueBtnText: { fontSize: 17, fontWeight: '700', color: '#FFF' },

  // Card layout (steps 1 & 4)
  card: {
    backgroundColor: colors.white, borderRadius: 24,
    paddingHorizontal: 24, paddingVertical: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 8,
  },
  cardTitle: { fontSize: 26, fontWeight: '700', color: colors.black, marginBottom: 6 },
  cardSub:   { fontSize: 15, color: colors.grey3, marginBottom: 32 },

  row:   { flexDirection: 'row' },
  half:  { flex: 1 },
  field: { marginBottom: 22 },
  label: { fontSize: 12, fontWeight: '600', color: colors.grey3, letterSpacing: 0.5, marginBottom: 8 },

  input: {
    height: 54, borderRadius: 14, borderWidth: 2,
    paddingHorizontal: 16, fontSize: 16, color: colors.black, backgroundColor: colors.bg,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', height: 54,
    borderRadius: 14, borderWidth: 2, paddingHorizontal: 16, backgroundColor: colors.bg,
  },
  inputRowText: { flex: 1, fontSize: 16, color: colors.black },
  textArea: {
    borderRadius: 14, borderWidth: 2, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, minHeight: 100, color: colors.black, backgroundColor: colors.bg,
  },

  // Hours
  schedBlock: { marginBottom: 24 },
  schedRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  dayText:    { fontSize: 15, fontWeight: '500', marginLeft: 12, flex: 1 },
  timeRow:    { flexDirection: 'row', alignItems: 'center' },
  timePill:   { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.grey5 },
  timeVal:    { fontSize: 14, fontWeight: '500', color: colors.black },
  toText:     { fontSize: 13, color: colors.grey3, marginHorizontal: 8 },
  closedText: { fontSize: 13, color: colors.grey4 },

  // Buttons
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 54, borderRadius: 14, marginTop: 12, gap: 8, backgroundColor: colors.black,
  },
  nextBtnText: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  completeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 54, borderRadius: 14, marginTop: 12, gap: 8, backgroundColor: colors.orange,
    shadowColor: colors.orange, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  completeBtnText: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  btnDisabled: { opacity: 0.4, shadowOpacity: 0 },

  error: { color: colors.red, fontSize: 13, marginBottom: 12, fontWeight: '500' },
});

// ── Header styles ─────────────────────────────────────────────────────────────

const h = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 16 },
  backBtn: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.white, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
  },
  progressWrap: { flex: 1 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: colors.border },
  fill:  { height: '100%', borderRadius: 3, backgroundColor: colors.orange },
});
