import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/lib/api';
import { Conversation, Message } from '../../src/types';
import { colors, formatPhone, useTheme } from '../../src/theme';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function InboxScreen() {
  const { colors: tc } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected,      setSelected]      = useState<Conversation | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get('/api/conversations');
      setConversations(res.data);
    } catch {
      // global 401 interceptor handles auth expiry
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 8000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  if (selected) {
    return (
      <ConversationDetail
        conversation={selected}
        onBack={() => { setSelected(null); fetchConversations(); }}
      />
    );
  }

  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.customer_phone.includes(q) ||
      (c.last_message || '').toLowerCase().includes(q)
    );
  });

  const needsReview = conversations.filter(c => c.status === 'needs_review').length;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: tc.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: tc.border }]}>
        <View style={s.titleRow}>
          <Text style={[s.title, { color: tc.text }]}>Inbox</Text>
          {needsReview > 0 && (
            <View style={s.reviewBadge}>
              <Text style={s.reviewBadgeText}>{needsReview} review</Text>
            </View>
          )}
        </View>
      </View>

      {/* Search bar */}
      <View style={[s.searchBar, { backgroundColor: tc.card, borderColor: tc.border }]}>
        <Ionicons name="search" size={18} color={tc.textTertiary} style={{ marginRight: 10 }} />
        <TextInput
          style={[s.searchInput, { color: tc.text }]}
          placeholder="Search conversations..."
          placeholderTextColor={tc.textTertiary}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={tc.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={tc.primary} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="chatbubbles-outline" size={52} color={colors.grey5} />
          <Text style={s.emptyTitle}>{search ? 'No results' : 'No conversations yet'}</Text>
          <Text style={s.emptySub}>{search ? 'Try a different search' : 'Customer messages will appear here'}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <ConversationRow
              item={item}
              onPress={() => setSelected(item)}
            />
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function confidenceStyle(score: number): { color: string; bg: string; label: string } {
  if (score >= 0.85) return { color: colors.green,  bg: colors.greenLight,  label: `${Math.round(score * 100)}%` };
  if (score >= 0.65) return { color: colors.amber,  bg: colors.amberLight,  label: `${Math.round(score * 100)}%` };
  return               { color: colors.red,    bg: colors.redLight,    label: `${Math.round(score * 100)}%` };
}

function ConversationRow({ item, onPress }: { item: Conversation; onPress: () => void }) {
  const { colors: tc } = useTheme();
  const isReview   = item.status === 'needs_review';
  const isTakeover = item.status === 'human_takeover';
  const isAI       = item.status === 'ai_handling';
  const initials   = item.customer_phone.slice(-2);
  const when       = item.last_message_at ? timeAgo(item.last_message_at) : '';
  const conf       = item.ai_confidence != null ? confidenceStyle(item.ai_confidence) : null;

  return (
    <TouchableOpacity style={[s.card, { backgroundColor: tc.card }]} onPress={onPress} activeOpacity={0.72}>
      <View style={[s.avatar, isReview && s.avatarReview]}>
        <Text style={[s.avatarText, isReview && s.avatarTextReview]}>{initials}</Text>
      </View>
      <View style={s.cardBody}>
        <View style={s.cardTop}>
          <Text style={[s.cardPhone, { color: tc.text }]}>{formatPhone(item.customer_phone)}</Text>
          <View style={s.cardTopRight}>
            {conf && (
              <View style={[s.confPill, { backgroundColor: conf.bg }]}>
                <View style={[s.confDot, { backgroundColor: conf.color }]} />
                <Text style={[s.confText, { color: conf.color }]}>{conf.label}</Text>
              </View>
            )}
            <Text style={[s.cardTime, { color: tc.textTertiary }]}>{when}</Text>
          </View>
        </View>
        <View style={s.cardBottom}>
          {item.last_message ? (
            <Text style={[s.cardPreview, { color: tc.textSecondary }]} numberOfLines={1}>{item.last_message}</Text>
          ) : (
            <Text style={[s.cardPreview, { color: tc.textTertiary }]}>No messages yet</Text>
          )}
          {isTakeover && <StatusChip label="You" color={colors.orange} />}
          {isAI       && <StatusChip label="AI"  color={colors.green}  />}
          {isReview   && <StatusChip label="Review" color={colors.amber} />}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={tc.textTertiary} />
    </TouchableOpacity>
  );
}

function StatusChip({ label, color }: { label: string; color: string }) {
  return (
    <View style={[s.chip, { backgroundColor: color + '18', borderColor: color + '40' }]}>
      <Text style={[s.chipText, { color }]}>{label}</Text>
    </View>
  );
}

// ── Conversation detail ────────────────────────────────────────────────────────

function ConversationDetail({ conversation, onBack }: { conversation: Conversation; onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply,    setReply]    = useState('');
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [takeover, setTakeover] = useState(
    conversation.human_takeover ?? conversation.status === 'human_takeover'
  );
  const scrollRef = useRef<ScrollView>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get(`/api/conversations/${conversation.id}/messages`);
      setMessages(res.data);
    } finally {
      setLoading(false);
    }
  }, [conversation.id]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  async function toggleTakeover() {
    const endpoint = takeover
      ? `/api/conversations/${conversation.id}/handback`
      : `/api/conversations/${conversation.id}/takeover`;
    try {
      await api.put(endpoint);
      setTakeover(!takeover);
    } catch {
      Alert.alert('Error', 'Failed to update');
    }
  }

  async function sendReply() {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await api.post(`/api/conversations/${conversation.id}/reply`, { message: reply.trim() });
      setReply('');
      fetchMessages();
    } catch {
      Alert.alert('Error', 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={sd.outer} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={sd.header}>
          <TouchableOpacity onPress={onBack} style={sd.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={22} color={colors.orange} />
            <Text style={sd.backText}>Back</Text>
          </TouchableOpacity>
          <View style={sd.headerCenter}>
            <Text style={sd.headerPhone} numberOfLines={1}>{formatPhone(conversation.customer_phone)}</Text>
            <View style={[sd.statusDot, { backgroundColor: takeover ? colors.orange : colors.green }]} />
          </View>
          <TouchableOpacity
            style={[sd.takeoverBtn, takeover && sd.handbackBtn]}
            onPress={toggleTakeover}
          >
            <Text style={[sd.takeoverText, takeover && sd.handbackText]}>
              {takeover ? 'Hand back' : 'Take over'}
            </Text>
          </TouchableOpacity>
        </View>

        {takeover && (
          <View style={sd.banner}>
            <Ionicons name="person" size={14} color={colors.orangeDark} />
            <Text style={sd.bannerText}>You are handling this conversation</Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={colors.orange} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView
            ref={scrollRef}
            style={sd.messages}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
          </ScrollView>
        )}

        <View style={sd.inputBar}>
          <TextInput
            style={sd.input}
            placeholder="Type a reply..."
            placeholderTextColor={colors.grey4}
            value={reply}
            onChangeText={setReply}
            multiline
          />
          <TouchableOpacity
            style={[sd.sendBtn, (!reply.trim() || sending) && sd.sendBtnOff]}
            onPress={sendReply}
            disabled={sending || !reply.trim()}
          >
            {sending
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Ionicons name="arrow-up" size={20} color={colors.white} />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isOut   = msg.direction === 'outbound';
  const isOwner = msg.sender_type === 'owner';
  return (
    <View style={[sd.bubbleWrap, isOut ? sd.bubbleWrapOut : sd.bubbleWrapIn]}>
      {isOwner && <Text style={sd.ownerTag}>You</Text>}
      {!isOut && !isOwner && <Text style={sd.aiTag}>AI Agent</Text>}
      <View style={[sd.bubble, isOut ? sd.bubbleOut : sd.bubbleIn]}>
        <Text style={[sd.bubbleText, isOut && sd.bubbleTextOut]}>{msg.body}</Text>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header:    { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
  titleRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title:     { fontSize: 30, fontWeight: '800', color: colors.black, letterSpacing: -0.5 },

  reviewBadge:     { backgroundColor: colors.amberLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  reviewBadgeText: { fontSize: 12, fontWeight: '700', color: colors.amber },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: colors.white, borderRadius: 14,
    paddingHorizontal: 16, height: 46,
    borderWidth: 1.5, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.black },

  list: { paddingHorizontal: 16, paddingBottom: 24 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, borderRadius: 16,
    padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  avatar:           { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.orangeLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarReview:     { backgroundColor: colors.amberLight },
  avatarText:       { fontSize: 14, fontWeight: '700', color: colors.orange },
  avatarTextReview: { color: colors.amber },
  cardBody:   { flex: 1 },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardPhone:    { fontSize: 15, fontWeight: '700', color: colors.black },
  cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTime:     { fontSize: 12, color: colors.grey3 },
  confPill:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  confDot:      { width: 5, height: 5, borderRadius: 3 },
  confText:     { fontSize: 11, fontWeight: '700' },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardPreview:{ flex: 1, fontSize: 13, color: colors.grey3 },

  chip:     { borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
  chipText: { fontSize: 11, fontWeight: '700' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.black, marginTop: 16, marginBottom: 6 },
  emptySub:   { fontSize: 14, color: colors.grey3 },
});

const sd = StyleSheet.create({
  outer:   { flex: 1, backgroundColor: colors.white },
  header:  {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8,
  },
  backBtn:      { flexDirection: 'row', alignItems: 'center', gap: 2, paddingRight: 4 },
  backText:     { color: colors.orange, fontSize: 16, fontWeight: '600' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerPhone:  { fontSize: 15, fontWeight: '700', color: colors.black },
  statusDot:    { width: 8, height: 8, borderRadius: 4 },

  takeoverBtn:  { backgroundColor: colors.orangeLight, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  handbackBtn:  { backgroundColor: colors.greenLight },
  takeoverText: { color: colors.orange, fontWeight: '700', fontSize: 13 },
  handbackText: { color: colors.green },

  banner:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.orangeLight, paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#FFD6B0' },
  bannerText: { color: colors.orangeDark, fontSize: 13, fontWeight: '600' },

  messages: { flex: 1, backgroundColor: colors.grey6 },

  bubbleWrap:    { marginBottom: 10 },
  bubbleWrapIn:  { alignItems: 'flex-start' },
  bubbleWrapOut: { alignItems: 'flex-end' },
  aiTag:    { fontSize: 10, fontWeight: '600', color: colors.grey3, marginBottom: 3, marginLeft: 4 },
  ownerTag: { fontSize: 10, fontWeight: '600', color: colors.orange, marginBottom: 3, marginRight: 4, textAlign: 'right' },
  bubble:       { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleIn:     { backgroundColor: colors.white, borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  bubbleOut:    { backgroundColor: colors.orange, borderBottomRightRadius: 4 },
  bubbleText:    { fontSize: 15, color: colors.black, lineHeight: 21 },
  bubbleTextOut: { color: colors.white },

  inputBar: { flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white, alignItems: 'flex-end' },
  input:    { flex: 1, backgroundColor: colors.grey6, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: colors.black, maxHeight: 100, borderWidth: 1.5, borderColor: colors.border },
  sendBtn:     { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center', shadowColor: colors.orange, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  sendBtnOff:  { backgroundColor: colors.grey4, shadowOpacity: 0 },
});
