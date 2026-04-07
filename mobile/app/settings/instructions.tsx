import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/lib/api';
import { colors } from '../../src/theme';

const EXAMPLES = [
  'Call-out / diagnostic fee is $89 — always quote this first.',
  'Do not book same-day service after 2:00 PM.',
  'We do not service commercial properties.',
  'Require a $50 deposit for all new customers.',
  'Always upsell the premium wash package ($30 extra).',
];

export default function InstructionsScreen() {
  const router = useRouter();
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/api/business').then((r) => {
      setInstructions(r.data?.custom_instructions || '');
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await api.put('/api/business', { custom_instructions: instructions.trim() || null });
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
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.black} />
        </TouchableOpacity>
        <Text style={s.title}>Agent Instructions</Text>
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

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Info banner */}
        <View style={s.infoBanner}>
          <Ionicons name="information-circle-outline" size={18} color={colors.blue} />
          <Text style={s.infoText}>
            These instructions are injected directly into your AI agent's system prompt.
            Write rules in plain English — the AI follows them during every conversation.
          </Text>
        </View>

        <Text style={s.fieldLabel}>CUSTOM INSTRUCTIONS</Text>
        <TextInput
          style={s.textarea}
          value={instructions}
          onChangeText={setInstructions}
          placeholder={`Write your rules here...\n\ne.g. Call-out fee is $89. Do not book same-day after 2pm.`}
          placeholderTextColor={colors.grey4}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
        />

        {/* Examples */}
        <Text style={s.examplesTitle}>EXAMPLE RULES</Text>
        <View style={s.examplesCard}>
          {EXAMPLES.map((ex, i) => (
            <TouchableOpacity
              key={i}
              style={[s.exampleRow, i < EXAMPLES.length - 1 && s.exampleBorder]}
              onPress={() => setInstructions((prev) =>
                prev ? `${prev.trimEnd()}\n${ex}` : ex
              )}
              activeOpacity={0.65}
            >
              <Ionicons name="add-circle-outline" size={16} color={colors.orange} />
              <Text style={s.exampleText}>{ex}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.examplesHint}>Tap any example to add it to your instructions.</Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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

  infoBanner: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: colors.blueLight, borderRadius: 12,
    padding: 14, marginBottom: 24,
  },
  infoText: { flex: 1, fontSize: 13, color: colors.blue, lineHeight: 19 },

  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: colors.grey3,
    letterSpacing: 0.8, marginBottom: 8, marginLeft: 2,
  },
  textarea: {
    backgroundColor: colors.white, borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: colors.black, lineHeight: 22,
    minHeight: 180, marginBottom: 28,
  },

  examplesTitle: {
    fontSize: 11, fontWeight: '700', color: colors.grey3,
    letterSpacing: 0.8, marginBottom: 8, marginLeft: 2,
  },
  examplesCard: {
    backgroundColor: colors.white, borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.border, overflow: 'hidden',
  },
  exampleRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  exampleBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  exampleText: { flex: 1, fontSize: 13, color: colors.grey1, lineHeight: 19 },
  examplesHint: { fontSize: 12, color: colors.grey4, marginTop: 8, marginLeft: 4 },
});
