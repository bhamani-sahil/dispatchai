import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/lib/api';
import { colors } from '../../src/theme';

interface Service {
  id: string;
  name: string;
  description?: string;
  flat_price?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  is_active: boolean;
}

interface ServiceForm {
  name: string;
  description: string;
  priceType: 'flat' | 'range';
  flatPrice: string;
  priceMin: string;
  priceMax: string;
}

const emptyForm = (): ServiceForm => ({
  name: '', description: '',
  priceType: 'flat', flatPrice: '', priceMin: '', priceMax: '',
});

function formFromService(s: Service): ServiceForm {
  return {
    name: s.name,
    description: s.description || '',
    priceType: s.flat_price != null ? 'flat' : 'range',
    flatPrice: s.flat_price != null ? String(s.flat_price) : '',
    priceMin: s.price_min != null ? String(s.price_min) : '',
    priceMax: s.price_max != null ? String(s.price_max) : '',
  };
}

function priceLabel(s: Service): string {
  if (s.flat_price != null) return `$${s.flat_price}`;
  if (s.price_min != null && s.price_max != null) return `$${s.price_min}–$${s.price_max}`;
  if (s.price_min != null) return `From $${s.price_min}`;
  return 'Price TBD';
}

export default function ServicesScreen() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const fetchServices = useCallback(async () => {
    try {
      const r = await api.get('/api/business/services');
      setServices(r.data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setModalVisible(true);
  }

  function openEdit(s: Service) {
    setEditingId(s.id);
    setForm(formFromService(s));
    setModalVisible(true);
  }

  async function saveService() {
    if (!form.name.trim()) { Alert.alert('Required', 'Service name is required'); return; }
    setSaving(true);
    try {
      const body: any = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        flat_price: form.priceType === 'flat' && form.flatPrice ? Number(form.flatPrice) : null,
        price_min: form.priceType === 'range' && form.priceMin ? Number(form.priceMin) : null,
        price_max: form.priceType === 'range' && form.priceMax ? Number(form.priceMax) : null,
        is_active: true,
      };
      if (editingId) {
        await api.put(`/api/business/services/${editingId}`, body);
      } else {
        await api.post('/api/business/services', body);
      }
      setModalVisible(false);
      fetchServices();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to save service');
    } finally {
      setSaving(false);
    }
  }

  async function deleteService(id: string, name: string) {
    Alert.alert(
      'Remove Service',
      `Remove "${name}" from your service list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/business/services/${id}`);
              fetchServices();
            } catch {
              Alert.alert('Error', 'Failed to remove service');
            }
          },
        },
      ]
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.black} />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.title}>Services & Pricing</Text>
          <Text style={s.sub}>Used by AI to quote customers</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.orange} size="large" />
        </View>
      ) : services.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIcon}>
            <Ionicons name="pricetag-outline" size={32} color={colors.grey4} />
          </View>
          <Text style={s.emptyTitle}>No services yet</Text>
          <Text style={s.emptySub}>Add your services and pricing so the AI can quote customers accurately.</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={openAdd}>
            <Text style={s.emptyBtnText}>Add First Service</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.card}>
            {services.map((svc, i) => (
              <View key={svc.id} style={[s.serviceRow, i < services.length - 1 && s.rowBorder]}>
                <View style={s.serviceLeft}>
                  <Text style={s.serviceName}>{svc.name}</Text>
                  {!!svc.description && (
                    <Text style={s.serviceDesc} numberOfLines={1}>{svc.description}</Text>
                  )}
                </View>
                <Text style={s.servicePrice}>{priceLabel(svc)}</Text>
                <TouchableOpacity onPress={() => openEdit(svc)} style={s.editBtn}>
                  <Ionicons name="pencil-outline" size={16} color={colors.grey3} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteService(svc.id, svc.name)} style={s.editBtn}>
                  <Ionicons name="trash-outline" size={16} color={colors.red} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <TouchableOpacity style={s.addRowBtn} onPress={openAdd} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={18} color={colors.orange} />
            <Text style={s.addRowBtnText}>Add Another Service</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={m.container}>
          <View style={m.header}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={m.cancelBtn}>
              <Text style={m.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={m.title}>{editingId ? 'Edit Service' : 'Add Service'}</Text>
            <TouchableOpacity
              style={[m.saveBtn, saving && m.saveBtnOff]}
              onPress={saveService}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Text style={m.saveBtnText}>Save</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={m.scroll} keyboardShouldPersistTaps="handled">

            <Text style={m.label}>SERVICE NAME</Text>
            <TextInput
              style={m.input}
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
              placeholder="e.g. Full Groom, Nail Trim"
              placeholderTextColor={colors.grey4}
            />

            <Text style={m.label}>DESCRIPTION (optional)</Text>
            <TextInput
              style={m.input}
              value={form.description}
              onChangeText={(v) => setForm({ ...form, description: v })}
              placeholder="e.g. Includes bath, blow-dry, and trim"
              placeholderTextColor={colors.grey4}
            />

            <Text style={m.label}>PRICING TYPE</Text>
            <View style={m.segRow}>
              <TouchableOpacity
                style={[m.seg, form.priceType === 'flat' && m.segActive]}
                onPress={() => setForm({ ...form, priceType: 'flat' })}
              >
                <Text style={[m.segText, form.priceType === 'flat' && m.segTextActive]}>
                  Flat Rate
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[m.seg, form.priceType === 'range' && m.segActive]}
                onPress={() => setForm({ ...form, priceType: 'range' })}
              >
                <Text style={[m.segText, form.priceType === 'range' && m.segTextActive]}>
                  Price Range
                </Text>
              </TouchableOpacity>
            </View>

            {form.priceType === 'flat' ? (
              <>
                <Text style={m.label}>PRICE ($)</Text>
                <TextInput
                  style={m.input}
                  value={form.flatPrice}
                  onChangeText={(v) => setForm({ ...form, flatPrice: v })}
                  placeholder="e.g. 45"
                  placeholderTextColor={colors.grey4}
                  keyboardType="decimal-pad"
                />
              </>
            ) : (
              <>
                <Text style={m.label}>PRICE RANGE ($)</Text>
                <View style={m.rangeRow}>
                  <TextInput
                    style={[m.input, m.rangeInput]}
                    value={form.priceMin}
                    onChangeText={(v) => setForm({ ...form, priceMin: v })}
                    placeholder="Min  e.g. 20"
                    placeholderTextColor={colors.grey4}
                    keyboardType="decimal-pad"
                  />
                  <Text style={m.rangeDash}>–</Text>
                  <TextInput
                    style={[m.input, m.rangeInput]}
                    value={form.priceMax}
                    onChangeText={(v) => setForm({ ...form, priceMax: v })}
                    placeholder="Max  e.g. 40"
                    placeholderTextColor={colors.grey4}
                    keyboardType="decimal-pad"
                  />
                </View>
              </>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.grey5,
    alignItems: 'center', justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800', color: colors.black, letterSpacing: -0.3 },
  sub: { fontSize: 12, color: colors.grey3, marginTop: 1 },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.orange,
    alignItems: 'center', justifyContent: 'center',
  },

  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  card: {
    backgroundColor: colors.white, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    overflow: 'hidden', marginBottom: 16,
  },
  serviceRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 10,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  serviceLeft: { flex: 1 },
  serviceName: { fontSize: 15, fontWeight: '600', color: colors.black },
  serviceDesc: { fontSize: 12, color: colors.grey3, marginTop: 2 },
  servicePrice: { fontSize: 14, fontWeight: '700', color: colors.orange },
  editBtn: { padding: 4 },

  addRowBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.white, borderRadius: 14, paddingVertical: 14,
    borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed',
  },
  addRowBtnText: { color: colors.orange, fontWeight: '600', fontSize: 14 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.grey5,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.black, marginBottom: 8 },
  emptySub: { fontSize: 14, color: colors.grey3, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn: {
    backgroundColor: colors.orange, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 14,
  },
  emptyBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});

const m = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, gap: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  cancelBtn: { minWidth: 60 },
  cancelText: { color: colors.grey2, fontSize: 15 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.black, textAlign: 'center' },
  saveBtn: {
    backgroundColor: colors.orange, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8, minWidth: 60, alignItems: 'center',
  },
  saveBtnOff: { opacity: 0.5 },
  saveBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },

  scroll: { padding: 20 },
  label: {
    fontSize: 11, fontWeight: '700', color: colors.grey3,
    letterSpacing: 0.8, marginBottom: 8, marginTop: 20, marginLeft: 2,
  },
  input: {
    backgroundColor: colors.white, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: colors.black, marginBottom: 4,
  },

  segRow: {
    flexDirection: 'row', gap: 8, marginBottom: 4,
  },
  seg: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', backgroundColor: colors.white,
  },
  segActive: { borderColor: colors.orange, backgroundColor: colors.orangeLight },
  segText: { fontSize: 14, fontWeight: '600', color: colors.grey2 },
  segTextActive: { color: colors.orange },

  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rangeInput: { flex: 1, marginBottom: 4 },
  rangeDash: { fontSize: 18, color: colors.grey3, fontWeight: '300' },
});
