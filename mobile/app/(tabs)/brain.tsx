import { useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];
import api from '../../src/lib/api';
import { BrainMessage } from '../../src/types';
import { useTheme } from '../../src/theme';

const SUGGESTIONS: { icon: IoniconsName; text: string }[] = [
  { icon: 'calendar-outline',       text: 'Scan my schedule for today' },
  { icon: 'document-text-outline',  text: 'Generate a quote for John, drain cleaning $150' },
  { icon: 'chatbubble-outline',     text: 'Text the Friday 3pm customer to confirm their address' },
  { icon: 'pricetag-outline',       text: 'Update bath drain service price to $180' },
];

const INTENT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  generate_document: { bg: '#F3E8FF', text: '#7C3AED', label: 'Invoice' },
  schedule_scan: { bg: '#DBEAFE', text: '#3B82F6', label: 'Schedule' },
  text_customer: { bg: '#D1FAE5', text: '#10B981', label: 'Texted' },
  pricing_update: { bg: '#FFF0E6', text: '#F96302', label: 'Pricing' },
  forward: { bg: '#D1FAE5', text: '#10B981', label: 'Forward' },
  general: { bg: '#DBEAFE', text: '#3B82F6', label: 'General' },
};

export default function BrainScreen() {
  const { colors } = useTheme();
  const [messages, setMessages] = useState<BrainMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const send = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: 'user', content: text.trim() }]);
    setInput('');
    setLoading(true);
    try {
      const res = await api.post('/api/brain/chat', { message: text.trim() });
      const data = res.data;
      setMessages((m) => [...m, {
        role: 'assistant',
        content: data.response || data.reply || JSON.stringify(data),
        intent: data.intent,
        pdf_url: data.pdf_url || null,
        document: data.document || null,
      }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, []);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]} edges={['top']}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[s.title, { color: colors.text }]}>Intelligence</Text>
          <Text style={[s.sub, { color: colors.textSecondary }]}>Command your business operations</Text>
        </View>
        <View style={[s.headerIcon, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="flash" size={22} color={colors.primary} />
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={[s.messages, { backgroundColor: colors.bg }]}
        contentContainerStyle={s.messagesContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && (
          <View style={s.suggestions}>
            <Text style={[s.suggestTitle, { color: colors.textTertiary }]}>Try asking:</Text>
            {SUGGESTIONS.map((sug, i) => (
              <TouchableOpacity key={i} style={[s.suggestBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => send(sug.text)} activeOpacity={0.7}>
                <Ionicons name={sug.icon} size={18} color={colors.primary} />
                <Text style={[s.suggestText, { color: colors.text }]}>{sug.text}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {messages.map((msg, i) => (
          <View key={i} style={[s.bubbleWrap, msg.role === 'user' ? s.bubbleWrapUser : s.bubbleWrapAssistant]}>
            {msg.role === 'assistant' && msg.intent && INTENT_STYLES[msg.intent] && (
              <View style={[s.intentBadge, { backgroundColor: INTENT_STYLES[msg.intent].bg }]}>
                <Text style={[s.intentText, { color: INTENT_STYLES[msg.intent].text }]}>
                  {INTENT_STYLES[msg.intent].label}
                </Text>
              </View>
            )}
            <View style={[s.bubble, msg.role === 'user' ? s.bubbleUser : [s.bubbleAssistant, { backgroundColor: colors.card, borderColor: colors.border }]]}>
              <Text style={[s.bubbleText, msg.role === 'user' ? s.bubbleTextUser : { color: colors.text }]}>{msg.content}</Text>
            </View>
            {msg.pdf_url ? (
              <TouchableOpacity style={[s.pdfCard, { backgroundColor: colors.card, borderColor: colors.primary + '40' }]} onPress={() => Linking.openURL(msg.pdf_url!)} activeOpacity={0.8}>
                <View style={[s.pdfIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="document-text" size={20} color={colors.primary} />
                </View>
                <View style={s.pdfInfo}>
                  <Text style={[s.pdfLabel, { color: colors.text }]}>
                    {msg.document?.doc_type === 'invoice' ? 'Invoice' : 'Quote'}{' '}{msg.document?.doc_number || ''}
                  </Text>
                  <Text style={[s.pdfSub, { color: colors.textTertiary }]}>Tap to open PDF</Text>
                </View>
                <Ionicons name="open-outline" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            ) : null}
          </View>
        ))}

        {loading && (
          <View style={[s.bubbleWrap, s.bubbleWrapAssistant]}>
            <View style={[s.bubble, s.bubbleAssistant, s.bubbleLoading, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={[s.typingText, { color: colors.textTertiary }]}>Thinking...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[s.inputBar, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
        <TextInput
          style={[s.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
          placeholder="Ask anything about your business..."
          placeholderTextColor={colors.textTertiary}
          value={input}
          onChangeText={setInput}
          multiline
          returnKeyType="send"
          onSubmitEditing={() => send(input)}
          blurOnSubmit
        />
        <TouchableOpacity
          style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnOff]}
          onPress={() => send(input)}
          disabled={loading || !input.trim()}
        >
          <Ionicons name="arrow-up" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  sub: { fontSize: 13, marginTop: 2 },
  headerIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },

  messages: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 8 },

  suggestions: { marginBottom: 8 },
  suggestTitle: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  suggestBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
    borderWidth: 1,
  },
  suggestText: { flex: 1, fontSize: 14 },

  bubbleWrap: { marginBottom: 10 },
  bubbleWrapUser: { alignItems: 'flex-end' },
  bubbleWrapAssistant: { alignItems: 'flex-start' },

  intentBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 5, alignSelf: 'flex-start' },
  intentText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  bubble: { maxWidth: '85%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { backgroundColor: '#F96302', borderBottomRightRadius: 4 },
  bubbleAssistant: {
    borderBottomLeftRadius: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
    borderWidth: 1,
  },
  bubbleLoading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: '#FFF' },
  typingText: { fontSize: 14 },

  pdfCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, padding: 12, marginTop: 6,
    borderWidth: 1.5, maxWidth: '85%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  pdfIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pdfInfo: { flex: 1 },
  pdfLabel: { fontSize: 13, fontWeight: '700' },
  pdfSub: { fontSize: 11, marginTop: 1 },

  inputBar: { flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, alignItems: 'flex-end' },
  input: {
    flex: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, maxHeight: 100, borderWidth: 1.5,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#F96302', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#F96302', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  sendBtnOff: { backgroundColor: '#CCCCCC', shadowOpacity: 0 },
});
