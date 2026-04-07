import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, ActivityIndicator, Alert, Switch,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/lib/api';
import { colors } from '../../src/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const SECTORS: { value: string; label: string; icon: IoniconsName }[] = [
  { value: 'plumbing',           label: 'Plumbing',          icon: 'water-outline' },
  { value: 'hvac',               label: 'HVAC',              icon: 'thermometer-outline' },
  { value: 'auto_detailing',     label: 'Car Detailing',     icon: 'car-outline' },
  { value: 'pet_grooming',       label: 'Pet Grooming',      icon: 'paw-outline' },
  { value: 'carpet_cleaning',    label: 'Carpet Cleaning',   icon: 'brush-outline' },
  { value: 'junk_removal',       label: 'Junk Removal',      icon: 'trash-outline' },
  { value: 'house_cleaning',     label: 'House Cleaning',    icon: 'home-outline' },
  { value: 'landscaping',        label: 'Landscaping',       icon: 'leaf-outline' },
  { value: 'pest_control',       label: 'Pest Control',      icon: 'bug-outline' },
  { value: 'electrical',         label: 'Electrical',        icon: 'flash-outline' },
  { value: 'general_handyman',   label: 'Handyman',          icon: 'hammer-outline' },
  { value: 'moving_services',    label: 'Moving Services',   icon: 'cube-outline' },
  { value: 'garage_door_repair', label: 'Garage Door',       icon: 'business-outline' },
  { value: 'car_repair',         label: 'Car Repair',        icon: 'construct-outline' },
  { value: 'pressure_washing',   label: 'Pressure Washing',  icon: 'rainy-outline' },
  { value: 'locksmith',          label: 'Locksmith',         icon: 'key-outline' },
  { value: 'appliance_repair',   label: 'Appliance Repair',  icon: 'settings-outline' },
  { value: 'door_repair',        label: 'Door Repair',       icon: 'enter-outline' },
];

type HoursRow = { open: boolean; start: string; end: string };
type HoursState = { weekday: HoursRow; saturday: HoursRow; sunday: HoursRow };

function buildHoursText(h: HoursState): string {
  const parts: string[] = [];
  if (h.weekday.open)  parts.push(`Mon–Fri ${h.weekday.start}–${h.weekday.end}`);
  if (h.saturday.open) parts.push(`Sat ${h.saturday.start}–${h.saturday.end}`);
  if (h.sunday.open)   parts.push(`Sun ${h.sunday.start}–${h.sunday.end}`);
  return parts.join(', ') || 'Flexible hours';
}

function buildHoursJson(h: HoursState): Record<string, any> {
  const days: Record<string, any> = {};
  ['monday','tuesday','wednesday','thursday','friday'].forEach(d => {
    days[d] = h.weekday.open ? { open: h.weekday.start, close: h.weekday.end } : null;
  });
  days['saturday'] = h.saturday.open ? { open: h.saturday.start, close: h.saturday.end } : null;
  days['sunday']   = h.sunday.open   ? { open: h.sunday.start,   close: h.sunday.end   } : null;
  return days;
}

function hoursFromBiz(biz: any): HoursState {
  const bh = biz?.business_hours || {};
  const wd = bh['monday'] || bh['weekday'];
  const sat = bh['saturday'];
  const sun = bh['sunday'];
  return {
    weekday:  { open: !!wd,  start: wd?.open  || '08:00', end: wd?.close  || '17:00' },
    saturday: { open: !!sat, start: sat?.open  || '09:00', end: sat?.close || '14:00' },
    sunday:   { open: !!sun, start: sun?.open  || '10:00', end: sun?.close || '14:00' },
  };
}

function HoursRowInput({ label, row, onChange }: {
  label: string; row: HoursRow; onChange: (r: HoursRow) => void;
}) {
  return (
    <View style={hr.wrap}>
      <View style={hr.left}>
        <Switch
          value={row.open}
          onValueChange={(v) => onChange({ ...row, open: v })}
          trackColor={{ false: colors.grey5, true: colors.orange }}
          thumbColor={colors.white}
          ios_backgroundColor={colors.grey5}
        />
        <Text style={[hr.label, !row.open && hr.labelOff]}>{label}</Text>
      </View>
      {row.open ? (
        <View style={hr.times}>
          <TextInput
            style={hr.timeInput}
            value={row.start}
            onChangeText={(v) => onChange({ ...row, start: v })}
            placeholder="08:00"
            placeholderTextColor={colors.grey4}
            maxLength={5}
          />
          <Text style={hr.to}>to</Text>
          <TextInput
            style={hr.timeInput}
            value={row.end}
            onChangeText={(v) => onChange({ ...row, end: v })}
            placeholder="17:00"
            placeholderTextColor={colors.grey4}
            maxLength={5}
          />
        </View>
      ) : (
        <Text style={hr.closed}>Closed</Text>
      )}
    </View>
  );
}

export default function BusinessScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [sector, setSector] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [serviceLocation, setServiceLocation] = useState<'onsite'|'mobile'|'both'>('both');
  const [callbackPhone, setCallbackPhone] = useState('');
  const [agentName, setAgentName] = useState('');
  const [etransferEmail, setEtransferEmail] = useState('');
  const [hours, setHours] = useState<HoursState>({
    weekday:  { open: true,  start: '08:00', end: '17:00' },
    saturday: { open: false, start: '09:00', end: '14:00' },
    sunday:   { open: false, start: '10:00', end: '14:00' },
  });

  useEffect(() => {
    api.get('/api/business').then((r) => {
      const biz = r.data;
      setName(biz.name || '');
      setSector(biz.agent_type || '');
      setServiceArea(biz.service_area || '');
      setServiceLocation(biz.service_location || 'both');
      setCallbackPhone(biz.phone || biz.emergency_phone || '');
      setAgentName(biz.agent_name || '');
      setEtransferEmail(biz.etransfer_email || '');
      setHours(hoursFromBiz(biz));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function save() {
    if (!name.trim()) { Alert.alert('Required', 'Business name is required'); return; }
    setSaving(true);
    try {
      await api.put('/api/business', {
        name: name.trim(),
        agent_type: sector,
        service_area: serviceArea.trim() || null,
        hours_text: buildHoursText(hours),
        business_hours: buildHoursJson(hours),
        service_location: serviceLocation,
        phone: callbackPhone.trim() || null,
        agent_name: agentName.trim() || null,
        etransfer_email: etransferEmail.trim() || null,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.orange} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? undefined : 'height'}>
      <StatusBar barStyle="dark-content" />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.black} />
        </TouchableOpacity>
        <Text style={s.title}>Business Profile</Text>
        <TouchableOpacity
          style={[s.saveBtn, saving && s.saveBtnOff]}
          onPress={save}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={s.saveBtnText}>Save</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >

        {/* Business name */}
        <Text style={s.sectionLabel}>ORGANIZATION NAME</Text>
        <View style={s.inputWrap}>
          <Ionicons name="business-outline" size={16} color={colors.grey3} style={s.inputIcon} />
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="Acme Services Ltd."
            placeholderTextColor={colors.grey4}
          />
        </View>

        {/* Service area */}
        <Text style={s.sectionLabel}>SERVICE AREA</Text>
        <View style={s.inputWrap}>
          <Ionicons name="location-outline" size={16} color={colors.grey3} style={s.inputIcon} />
          <TextInput
            style={s.input}
            value={serviceArea}
            onChangeText={setServiceArea}
            placeholder="e.g. Calgary NW, AB"
            placeholderTextColor={colors.grey4}
          />
        </View>

        {/* Callback Number */}
        <Text style={s.sectionLabel}>CALLBACK NUMBER</Text>
        <View style={s.inputWrap}>
          <Ionicons name="call-outline" size={16} color={colors.grey3} style={s.inputIcon} />
          <TextInput
            style={s.input}
            value={callbackPhone}
            onChangeText={setCallbackPhone}
            placeholder="+1 403 555 0000"
            placeholderTextColor={colors.grey4}
            keyboardType="phone-pad"
          />
        </View>

        {/* Agent name */}
        <Text style={s.sectionLabel}>AI AGENT NAME</Text>
        <View style={s.inputWrap}>
          <Ionicons name="person-outline" size={16} color={colors.grey3} style={s.inputIcon} />
          <TextInput
            style={s.input}
            value={agentName}
            onChangeText={setAgentName}
            placeholder="Anna (default)"
            placeholderTextColor={colors.grey4}
          />
        </View>

        {/* E-Transfer email */}
        <Text style={s.sectionLabel}>E-TRANSFER EMAIL (for quotes)</Text>
        <View style={s.inputWrap}>
          <Ionicons name="mail-outline" size={16} color={colors.grey3} style={s.inputIcon} />
          <TextInput
            style={s.input}
            value={etransferEmail}
            onChangeText={setEtransferEmail}
            placeholder="yourname@email.com"
            placeholderTextColor={colors.grey4}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Industry sector */}
        <Text style={s.sectionLabel}>INDUSTRY SECTOR</Text>
        <View style={s.grid}>
          {SECTORS.map((sec) => {
            const active = sector === sec.value;
            return (
              <TouchableOpacity
                key={sec.value}
                style={[s.sectorCard, active && s.sectorActive]}
                onPress={() => setSector(sec.value)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={sec.icon}
                  size={20}
                  color={active ? colors.orange : colors.grey3}
                />
                <Text style={[s.sectorLabel, active && s.sectorLabelActive]}>
                  {sec.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Service location */}
        <Text style={s.sectionLabel}>HOW YOU SERVE CUSTOMERS</Text>
        <View style={s.locRow}>
          {([
            { value: 'onsite', label: 'Onsite / Shop', icon: 'storefront-outline' as const, desc: 'They come to you' },
            { value: 'mobile', label: 'Mobile / Home', icon: 'home-outline' as const,       desc: 'You go to them' },
            { value: 'both',   label: 'Both',          icon: 'swap-horizontal-outline' as const, desc: 'You offer both' },
          ]).map((opt) => {
            const active = serviceLocation === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[s.locCard, active && s.locCardActive]}
                onPress={() => setServiceLocation(opt.value as any)}
                activeOpacity={0.75}
              >
                <Ionicons name={opt.icon} size={20} color={active ? colors.orange : colors.grey3} />
                <Text style={[s.locLabel, active && s.locLabelActive]}>{opt.label}</Text>
                <Text style={s.locDesc}>{opt.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Service hours */}
        <Text style={s.sectionLabel}>SERVICE HOURS</Text>
        <View style={s.hoursBox}>
          <HoursRowInput
            label="Mon – Fri"
            row={hours.weekday}
            onChange={(r) => setHours({ ...hours, weekday: r })}
          />
          <View style={s.div} />
          <HoursRowInput
            label="Saturday"
            row={hours.saturday}
            onChange={(r) => setHours({ ...hours, saturday: r })}
          />
          <View style={s.div} />
          <HoursRowInput
            label="Sunday"
            row={hours.sunday}
            onChange={(r) => setHours({ ...hours, sunday: r })}
          />
        </View>

        <View style={{ height: 200 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, gap: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.grey5,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.black, letterSpacing: -0.3 },
  saveBtn: {
    backgroundColor: colors.orange, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8,
    minWidth: 60, alignItems: 'center',
  },
  saveBtnOff: { opacity: 0.5 },
  saveBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },

  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.grey3,
    letterSpacing: 0.8, marginBottom: 8, marginTop: 20, marginLeft: 2,
  },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: colors.black },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sectorCard: {
    width: '47.5%', flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12,
    backgroundColor: colors.white,
  },
  sectorActive: { borderColor: colors.orange, backgroundColor: colors.orangeLight },
  sectorLabel: { fontSize: 12, fontWeight: '600', color: colors.grey1, flex: 1 },
  sectorLabelActive: { color: colors.orange },

  locRow:        { flexDirection: 'row', gap: 8, marginBottom: 20 },
  locCard: {
    flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4,
    borderRadius: 12, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.white, gap: 4,
  },
  locCardActive: { borderColor: colors.orange, backgroundColor: colors.orangeLight },
  locLabel:      { fontSize: 11, fontWeight: '700', color: colors.grey2, textAlign: 'center' },
  locLabelActive:{ color: colors.orange },
  locDesc:       { fontSize: 10, color: colors.grey4, textAlign: 'center' },

  hoursBox: {
    backgroundColor: colors.white, borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.border, overflow: 'hidden',
  },
  div: { height: 1, backgroundColor: colors.border },
});

const hr = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontSize: 14, fontWeight: '600', color: colors.black },
  labelOff: { color: colors.grey3 },
  times: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    fontSize: 13, fontWeight: '600', color: colors.black,
    width: 58, textAlign: 'center', backgroundColor: colors.bg,
  },
  to: { fontSize: 12, color: colors.grey3, fontWeight: '500' },
  closed: { fontSize: 13, color: colors.grey4, fontWeight: '500' },
});
