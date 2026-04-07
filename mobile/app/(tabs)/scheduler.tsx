import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  ActivityIndicator, TouchableOpacity, Alert, TextInput, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/lib/api';
import { Booking } from '../../src/types';
import { colors, formatPhone } from '../../src/theme';

// ── Date helpers (no date-fns dependency) ────────────────────────────────────

const DAY_NAMES  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_FULL   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const result = new Date(d);
  result.setDate(d.getDate() - day);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(d.getDate() + n);
  return result;
}

function formatDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatLabel(d: Date): string {
  return `${DAY_FULL[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`.toUpperCase();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusColor(s: string) {
  if (s === 'booked' || s === 'assigned') return colors.green;
  if (s === 'confirmed') return colors.blue;
  if (s === 'completed') return colors.grey3;
  if (s === 'cancelled') return colors.red;
  if (s === 'blocked') return colors.grey2;
  return colors.grey3;
}

function statusBg(s: string) {
  if (s === 'booked' || s === 'assigned') return colors.greenLight;
  if (s === 'confirmed') return colors.blueLight;
  if (s === 'completed') return colors.grey5;
  if (s === 'cancelled') return colors.redLight;
  if (s === 'blocked') return colors.grey5;
  return colors.grey5;
}

// ── Time slots ────────────────────────────────────────────────────────────────

const DEFAULT_SLOTS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];

// Template slot strings — must match backend WEEKDAY_SLOTS / SATURDAY_SLOTS exactly
const WEEKDAY_BLOCK_SLOTS = ['8:00-10:00am', '10:00am-12:00pm', '1:00-3:00pm', '3:00-5:00pm'];
const SATURDAY_BLOCK_SLOTS = ['9:00-11:00am', '11:00am-1:00pm'];

function fmtSlot(t: string) {
  // If it's already a template range string (e.g. "8:00-10:00am"), display as-is
  if (t.includes('-') && (t.includes('am') || t.includes('pm'))) return t;
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12  = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function slotsForDate(date: string, bizHours: Record<string, any>): string[] {
  if (!date) return DEFAULT_SLOTS;
  const DAY_NAMES_FULL = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const d = new Date(date + 'T00:00:00');
  const dayName = DAY_NAMES_FULL[d.getDay()];
  const hours = bizHours?.[dayName];
  if (!hours) return []; // closed that day
  const start = parseInt(hours.open.split(':')[0], 10);
  const end   = parseInt(hours.close.split(':')[0], 10);
  const slots: string[] = [];
  for (let h = start; h < end; h++) slots.push(`${String(h).padStart(2,'0')}:00`);
  return slots.length ? slots : DEFAULT_SLOTS;
}

// Returns the actual template slot strings for block time — these match the backend exactly
function blockSlotsForDate(date: string, bizHours: Record<string, any>): string[] {
  if (!date) return WEEKDAY_BLOCK_SLOTS;
  const DAY_NAMES_FULL = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const d = new Date(date + 'T00:00:00');
  const dayName = DAY_NAMES_FULL[d.getDay()];
  if (!bizHours?.[dayName]) return []; // closed
  return d.getDay() === 6 ? SATURDAY_BLOCK_SLOTS : WEEKDAY_BLOCK_SLOTS;
}

function TimeSlotPicker({ selected, onSelect, slots }: { selected: string; onSelect: (t: string) => void; slots: string[] }) {
  if (!slots.length) {
    return <Text style={{ color: colors.grey3, fontSize: 13, marginBottom: 8 }}>Closed on this day</Text>;
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
      {slots.map((t) => {
        const active = selected === t;
        return (
          <TouchableOpacity key={t} style={[ts.chip, active && ts.chipActive]} onPress={() => onSelect(t)} activeOpacity={0.75}>
            <Text style={[ts.chipText, active && ts.chipTextActive]}>{fmtSlot(t)}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const ts = StyleSheet.create({
  chip:          { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white },
  chipActive:    { backgroundColor: colors.orangeLight, borderColor: colors.orange },
  chipText:      { fontSize: 13, fontWeight: '600', color: colors.grey2 },
  chipTextActive:{ color: colors.orange },
});

// ── Mini calendar ─────────────────────────────────────────────────────────────

const CAL_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function MiniCalendar({
  selected, month, onSelectDate, onChangeMonth,
}: {
  selected: string;
  month: Date;
  onSelectDate: (d: string) => void;
  onChangeMonth: (d: Date) => void;
}) {
  const year  = month.getFullYear();
  const mon   = month.getMonth();
  const first = new Date(year, mon, 1).getDay(); // 0=Sun
  const days  = new Date(year, mon + 1, 0).getDate();
  const todayKey = formatDate(new Date());

  const cells: (number | null)[] = [
    ...Array(first).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  // Pad last row so Saturday/Sunday columns always appear
  const trailing = (7 - (cells.length % 7)) % 7;
  if (trailing > 0) cells.push(...Array(trailing).fill(null));

  const monthLabel = new Date(year, mon).toLocaleString('default', { month: 'long', year: 'numeric' });

  function prevMonth() {
    const d = new Date(year, mon - 1, 1);
    onChangeMonth(d);
  }
  function nextMonth() {
    const d = new Date(year, mon + 1, 1);
    onChangeMonth(d);
  }
  function dayKey(day: number) {
    return `${year}-${String(mon + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return (
    <View style={cal.wrap}>
      {/* Month nav */}
      <View style={cal.nav}>
        <TouchableOpacity onPress={prevMonth} style={cal.navBtn}>
          <Ionicons name="chevron-back" size={18} color={colors.grey2} />
        </TouchableOpacity>
        <Text style={cal.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={nextMonth} style={cal.navBtn}>
          <Ionicons name="chevron-forward" size={18} color={colors.grey2} />
        </TouchableOpacity>
      </View>
      {/* Day headers */}
      <View style={cal.row}>
        {CAL_DAYS.map((d, i) => (
          <Text key={i} style={cal.dayHeader}>{d}</Text>
        ))}
      </View>
      {/* Day grid — rendered as explicit week rows to avoid flexWrap rounding bugs */}
      <View>
        {Array.from({ length: Math.ceil(cells.length / 7) }, (_, rowIdx) => (
          <View key={rowIdx} style={cal.weekRow}>
            {cells.slice(rowIdx * 7, rowIdx * 7 + 7).map((day, colIdx) => {
              if (!day) return <View key={colIdx} style={cal.cell} />;
              const key     = dayKey(day);
              const isToday = key === todayKey;
              const isSel   = key === selected;
              return (
                <TouchableOpacity key={colIdx} style={cal.cell} onPress={() => onSelectDate(key)} activeOpacity={0.7}>
                  <View style={[cal.dayInner, isSel && cal.dayInnerSelected, isToday && !isSel && cal.dayInnerToday]}>
                    <Text style={[cal.dayNum, isSel && cal.dayNumHighlighted, isToday && !isSel && cal.dayNumToday]}>
                      {day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const cal = StyleSheet.create({
  wrap:           { backgroundColor: colors.bg, borderRadius: 14, padding: 12, marginBottom: 4 },
  nav:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  navBtn:         { padding: 6 },
  monthLabel:     { fontSize: 14, fontWeight: '700', color: colors.black },
  row:            { flexDirection: 'row', marginBottom: 4 },
  dayHeader:      { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: colors.grey3 },
  weekRow:         { flexDirection: 'row' },
  cell:            { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayInner:        { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17 },
  dayInnerSelected:{ backgroundColor: colors.orange, borderRadius: 17 },
  dayInnerToday:   { borderWidth: 1.5, borderColor: colors.orange, borderRadius: 17 },
  dayNum:          { fontSize: 13, fontWeight: '500', color: colors.black },
  dayNumHighlighted: { color: colors.white, fontWeight: '700' },
  dayNumToday:     { color: colors.orange, fontWeight: '700' },
});

// ── Booking card ──────────────────────────────────────────────────────────────

function BookingCard({
  booking: b,
  expanded,
  onToggle,
  onRefresh,
  onForward,
}: {
  booking: Booking;
  expanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
  onForward: (booking: Booking) => void;
}) {
  const sc = statusColor(b.status);
  const timeLabel = b.slot_time?.split('-')[0] || b.slot_time || '—';

  async function updateStatus(status: string) {
    const labels: Record<string, string> = {
      completed: 'Mark as completed?',
      cancelled: 'Cancel this booking?',
      no_show:   'Mark as no-show?',
      booked:    'Reopen booking?',
    };
    Alert.alert(labels[status] || 'Update status?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        style: status === 'cancelled' ? 'destructive' : 'default',
        onPress: async () => {
          try {
            await api.put(`/api/calendar/bookings/${b.id}/status`, { status });
            onRefresh();
          } catch {
            Alert.alert('Error', 'Failed to update status');
          }
        },
      },
    ]);
  }

  return (
    <TouchableOpacity
      style={[s.jobCard, { borderColor: expanded ? colors.orange : 'transparent', borderWidth: expanded ? 2 : 0 }]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={s.jobRow}>
        <View style={s.timeBox}>
          <Text style={s.timeText}>{timeLabel}</Text>
          {!!b.period && <Text style={s.periodText}>{b.period}</Text>}
        </View>
        <View style={s.jobInfo}>
          <View style={s.jobTop}>
            <Text style={s.jobPhone}>{formatPhone(b.customer_phone) || '—'}</Text>
            <View style={[s.statusBadge, { backgroundColor: statusBg(b.status) }]}>
              <Text style={[s.statusText, { color: sc }]}>{b.status}</Text>
            </View>
          </View>
          {!!b.customer_address && (
            <View style={s.detailRow}>
              <Ionicons name="location" size={13} color={colors.grey3} />
              <Text style={s.detailText} numberOfLines={1}>{b.customer_address}</Text>
            </View>
          )}
          {!!b.job_summary && (
            <View style={s.detailRow}>
              <Ionicons name={b.status === 'blocked' ? 'ban-outline' : 'briefcase-outline'} size={13} color={colors.grey3} />
              <Text style={s.detailText} numberOfLines={2}>{b.job_summary}</Text>
            </View>
          )}
        </View>
      </View>

      {expanded && (
        <View style={s.actionRow}>
          {b.status === 'blocked' ? (
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: colors.greenLight, flex: 1 }]}
              onPress={() => Alert.alert('Mark slot as available?', 'This block will be removed.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Mark Available', onPress: async () => {
                    try { await api.delete(`/api/calendar/bookings/${b.id}`); onRefresh(); }
                    catch { Alert.alert('Error', 'Failed to unblock slot'); }
                }},
              ])}
              activeOpacity={0.75}
            >
              <Ionicons name="lock-open-outline" size={15} color={colors.green} />
              <Text style={[s.actionBtnText, { color: colors.green }]}>Mark Available</Text>
            </TouchableOpacity>
          ) : (
            [
              { icon: 'arrow-redo' as const,  label: 'Forward', color: colors.blue,  onPress: () => onForward(b) },
              { icon: 'checkmark' as const,    label: 'Done',    color: colors.green, onPress: () => updateStatus('completed') },
              { icon: 'close' as const,        label: 'Cancel',  color: colors.red,   onPress: () => updateStatus('cancelled') },
              { icon: 'alert-circle' as const, label: 'No-show', color: colors.grey3, onPress: () => updateStatus('no_show') },
            ].map((a) => (
              <TouchableOpacity key={a.label} style={[s.actionBtn, { backgroundColor: colors.grey5 }]} onPress={a.onPress} activeOpacity={0.75}>
                <Ionicons name={a.icon} size={15} color={a.color} />
                <Text style={[s.actionBtnText, { color: a.color }]}>{a.label}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SchedulerScreen() {
  const [bookings,    setBookings]    = useState<Booking[]>([]);
  const [bizHours,    setBizHours]    = useState<Record<string, any>>({});
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedId,  setExpandedId]  = useState<string | null>(null);

  // Create booking modal
  const [createModal, setCreateModal] = useState(false);
  const [createTab,   setCreateTab]   = useState<'booking' | 'block'>('booking');
  const [newPhone,    setNewPhone]    = useState('');
  const [newDate,     setNewDate]     = useState(formatDate(new Date()));
  const [newTime,     setNewTime]     = useState('');
  const [newAddress,  setNewAddress]  = useState('');
  const [newSummary,  setNewSummary]  = useState('');
  const [creating,    setCreating]    = useState(false);
  const [calMonth,    setCalMonth]    = useState(new Date());

  // Multi-block state
  type BlockEntry = { date: string; time: string; allDay: boolean; calMonth: Date; note: string };
  const makeBlock = (): BlockEntry => ({ date: formatDate(new Date()), time: '', allDay: false, calMonth: new Date(), note: '' });
  const [blocks, setBlocks] = useState<BlockEntry[]>([makeBlock()]);

  // Forward + contacts state (lifted here so modals render once at screen level)
  const [forwardBooking,   setForwardBooking]   = useState<Booking | null>(null);
  const [forwardModal,     setForwardModal]     = useState(false);
  const [techPhone,        setTechPhone]        = useState('');
  const [sending,          setSending]          = useState(false);
  function openForward(booking: Booking) {
    setForwardBooking(booking);
    setTechPhone('');
    setForwardModal(true);
  }

  async function forwardToTech() {
    if (!techPhone.trim() || !forwardBooking) { Alert.alert('Enter a phone number'); return; }
    setSending(true);
    try {
      await api.post('/api/calendar/forward-tech', { booking_id: forwardBooking.id, tech_phone: techPhone.trim() });
      setForwardModal(false);
      Alert.alert('Sent!', 'Job details forwarded to tech.');
      fetchBookings();
    } catch {
      Alert.alert('Error', 'Failed to send SMS');
    } finally {
      setSending(false);
    }
  }

  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = addDays(startOfWeek(new Date()), weekOffset * 7);
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const fetchBookings = useCallback(async () => {
    try {
      const [bRes, bizRes] = await Promise.all([
        api.get('/api/calendar/bookings'),
        api.get('/api/business'),
      ]);
      setBookings(bRes.data);
      if (bizRes.data?.business_hours) setBizHours(bizRes.data.business_hours);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchBookings(); }, [fetchBookings]));

  function derivePeriod(time: string): string {
    const hour = parseInt(time.split(':')[0], 10);
    if (isNaN(hour)) return 'morning';
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  async function handleCreate() {
    if (createTab === 'booking') {
      if (!newPhone.trim()) { Alert.alert('Phone number is required'); return; }
      if (!newDate) { Alert.alert('Please select a date'); return; }
      if (!newTime) { Alert.alert('Please select a time'); return; }
      setCreating(true);
      try {
        await api.post('/api/calendar/bookings', {
          customer_phone:   newPhone.trim(),
          slot_date:        newDate,
          slot_time:        newTime,
          period:           derivePeriod(newTime),
          customer_address: newAddress.trim() || null,
          job_summary:      newSummary.trim() || null,
          status:           'booked',
        });
        setCreateModal(false);
        setNewPhone(''); setNewAddress(''); setNewSummary(''); setNewTime('');
        fetchBookings();
      } catch {
        Alert.alert('Error', 'Failed to create booking. Please try again.');
      } finally {
        setCreating(false);
      }
    } else {
      // Block: validate all entries
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        if (!b.date) { Alert.alert(`Block ${i + 1}: select a date`); return; }
        if (!b.allDay && !b.time) { Alert.alert(`Block ${i + 1}: select a time or toggle All Day`); return; }
      }
      setCreating(true);
      try {
        await Promise.all(blocks.map((b) =>
          api.post('/api/calendar/bookings', {
            customer_phone: null,
            slot_date:      b.date,
            slot_time:      b.allDay ? 'all-day' : b.time,
            period:         b.allDay ? 'all-day' : derivePeriod(b.time),
            job_summary:    b.note.trim() ? `BLOCKED: ${b.note.trim()}` : 'BLOCKED',
            status:         'blocked',
          })
        ));
        setCreateModal(false);
        setBlocks([makeBlock()]);
        fetchBookings();
      } catch {
        Alert.alert('Error', 'Failed to save blocks. Please try again.');
      } finally {
        setCreating(false);
      }
    }
  }

  const selectedKey = formatDate(selectedDate);
  const dayBookings = bookings.filter(b => b.slot_date === selectedKey);

  return (
    <SafeAreaView style={s.outer} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Schedule</Text>
        <View style={s.jobsBadge}>
          <Text style={s.jobsBadgeText}>{dayBookings.length} job{dayBookings.length !== 1 ? 's' : ''}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={s.addBtn} onPress={() => setCreateModal(true)} activeOpacity={0.8}>
          <Ionicons name="add" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Week strip */}
      <View style={s.weekStripRow}>
        <TouchableOpacity
          onPress={() => setWeekOffset(w => Math.max(0, w - 1))}
          style={[s.weekArrow, weekOffset === 0 && { opacity: 0.25 }]}
          disabled={weekOffset === 0}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
        >
          <Ionicons name="chevron-back" size={20} color={colors.grey2} />
        </TouchableOpacity>
        <View style={s.weekStrip}>
        {weekDays.map((day, i) => {
          const key        = formatDate(day);
          const todayKey   = formatDate(new Date());
          const isToday    = key === todayKey;
          const isSelected = key === selectedKey;
          const hasDot     = bookings.some(b => b.slot_date === key);
          return (
            <TouchableOpacity
              key={i}
              style={[s.dayCell, isSelected && s.dayCellSelected]}
              onPress={() => { setSelectedDate(day); setExpandedId(null); }}
              activeOpacity={0.75}
            >
              <Text style={[s.dayName, isSelected && s.dayTextSelected]}>
                {DAY_NAMES[day.getDay()]}
              </Text>
              <Text style={[s.dayNum, isSelected && s.dayTextSelected]}>
                {day.getDate()}
              </Text>
              {hasDot && !isSelected && (
                <View style={s.dot} />
              )}
              {isToday && !isSelected && (
                <View style={[s.dot, { backgroundColor: colors.orange }]} />
              )}
            </TouchableOpacity>
          );
        })}
        </View>
        <TouchableOpacity
          onPress={() => setWeekOffset(w => w + 1)}
          style={s.weekArrow}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.grey2} />
        </TouchableOpacity>
      </View>

      {/* Date label */}
      <View style={s.dateLabel}>
        <Text style={s.dateLabelText}>
          {formatLabel(selectedDate)}
        </Text>
      </View>

      {/* Content */}
      {loading ? (
        <ActivityIndicator color={colors.orange} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchBookings(); }}
              tintColor={colors.orange}
            />
          }
        >
          {dayBookings.length === 0 ? (
            <View style={s.emptyState}>
              <View style={s.emptyIcon}>
                <Ionicons name="calendar-outline" size={40} color={colors.grey4} />
              </View>
              <Text style={s.emptyTitle}>No jobs today</Text>
              <Text style={s.emptySub}>Bookings from SMS conversations appear here</Text>
            </View>
          ) : (
            dayBookings.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                expanded={expandedId === b.id}
                onToggle={() => setExpandedId(expandedId === b.id ? null : b.id)}
                onRefresh={fetchBookings}
                onForward={openForward}
              />
            ))
          )}
        </ScrollView>
      )}
      {/* ── Forward to tech modal ── */}
      <Modal visible={forwardModal} transparent animationType="slide" onRequestClose={() => setForwardModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={s.modalOverlay}>
            <View style={s.modal}>
              <Text style={s.modalTitle}>Forward to Tech</Text>
              <Text style={s.modalSub}>{forwardBooking?.slot_date}  {forwardBooking?.slot_time?.split('-')[0]}</Text>
              <TextInput
                style={s.modalInput}
                placeholder="Tech phone number"
                placeholderTextColor={colors.grey4}
                value={techPhone}
                onChangeText={setTechPhone}
                keyboardType="phone-pad"
              />
              <View style={s.modalActions}>
                <TouchableOpacity style={s.modalCancel} onPress={() => setForwardModal(false)}>
                  <Text style={s.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.modalSend, sending && { opacity: 0.6 }]} onPress={forwardToTech} disabled={sending}>
                  <Text style={s.modalSendText}>{sending ? 'Sending...' : 'Send SMS'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Create booking / block modal ── */}
      <Modal visible={createModal} transparent animationType="slide" onRequestClose={() => setCreateModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setCreateModal(false)} />
          <View style={s.createSheet}>
            {/* Header row: tabs + close button */}
            <View style={s.sheetHeader}>
              <View style={s.tabRow}>
                <TouchableOpacity
                  style={[s.tabBtn, createTab === 'booking' && { borderColor: colors.orange, borderWidth: 2, backgroundColor: colors.orangeLight }]}
                  onPress={() => { setCreateTab('booking'); setNewTime(''); }}
                >
                  <Ionicons name="add-circle-outline" size={18} color={createTab === 'booking' ? colors.orange : colors.grey3} />
                  <Text style={[s.tabBtnText, { color: createTab === 'booking' ? colors.orange : colors.grey2 }]}>New Booking</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.tabBtn, createTab === 'block' && { borderColor: colors.red, borderWidth: 2, backgroundColor: colors.redLight }]}
                  onPress={() => { setCreateTab('block'); setNewTime(''); }}
                >
                  <Ionicons name="ban" size={18} color={createTab === 'block' ? colors.red : colors.grey3} />
                  <Text style={[s.tabBtnText, { color: createTab === 'block' ? colors.red : colors.grey2 }]}>Block Time</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => setCreateModal(false)} style={s.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={colors.grey2} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Phone (booking only) */}
              {createTab === 'booking' && (
                <>
                  <Text style={s.createLabel}>CUSTOMER PHONE</Text>
                  <TextInput
                    style={s.createInput}
                    placeholder="+1 403 555 0000"
                    placeholderTextColor={colors.grey4}
                    value={newPhone}
                    onChangeText={setNewPhone}
                    keyboardType="phone-pad"
                  />
                </>
              )}

              {/* Booking: date + time slots + address + summary */}
              {createTab === 'booking' && (
                <>
                  <Text style={s.createLabel}>DATE</Text>
                  <MiniCalendar
                    selected={newDate}
                    month={calMonth}
                    onSelectDate={setNewDate}
                    onChangeMonth={setCalMonth}
                  />
                  <Text style={s.createLabel}>TIME</Text>
                  <TimeSlotPicker
                    selected={newTime}
                    onSelect={setNewTime}
                    slots={slotsForDate(newDate, bizHours)}
                  />
                  <Text style={s.createLabel}>ADDRESS (optional)</Text>
                  <TextInput
                    style={s.createInput}
                    placeholder="123 Main St NW"
                    placeholderTextColor={colors.grey4}
                    value={newAddress}
                    onChangeText={setNewAddress}
                  />
                  <Text style={s.createLabel}>SERVICE SUMMARY</Text>
                  <TextInput
                    style={[s.createInput, { height: 80, paddingTop: 12 }]}
                    placeholder="e.g. Full grooming - Golden Retriever"
                    placeholderTextColor={colors.grey4}
                    value={newSummary}
                    onChangeText={setNewSummary}
                    multiline
                    textAlignVertical="top"
                  />
                </>
              )}

              {/* Block: multiple entries */}
              {createTab === 'block' && (
                <>
                  {blocks.map((blk, idx) => (
                    <View key={idx} style={s.blockEntry}>
                      {blocks.length > 1 && (
                        <View style={s.blockEntryHeader}>
                          <Text style={s.blockEntryNum}>Block {idx + 1}</Text>
                          <TouchableOpacity onPress={() => setBlocks(blocks.filter((_, i) => i !== idx))}>
                            <Ionicons name="close-circle" size={20} color={colors.red} />
                          </TouchableOpacity>
                        </View>
                      )}
                      <Text style={s.createLabel}>DATE</Text>
                      <MiniCalendar
                        selected={blk.date}
                        month={blk.calMonth}
                        onSelectDate={(d) => setBlocks(blocks.map((b, i) => i === idx ? { ...b, date: d } : b))}
                        onChangeMonth={(m) => setBlocks(blocks.map((b, i) => i === idx ? { ...b, calMonth: m } : b))}
                      />
                      <View style={s.allDayRow}>
                        <Text style={s.allDayLabel}>All Day</Text>
                        <TouchableOpacity
                          style={[s.allDayToggle, blk.allDay && s.allDayToggleActive]}
                          onPress={() => setBlocks(blocks.map((b, i) => i === idx ? { ...b, allDay: !b.allDay, time: '' } : b))}
                          activeOpacity={0.8}
                        >
                          <View style={[s.allDayThumb, blk.allDay && s.allDayThumbActive]} />
                        </TouchableOpacity>
                      </View>
                      {!blk.allDay && (
                        <>
                          <Text style={s.createLabel}>TIME SLOT</Text>
                          <TimeSlotPicker
                            selected={blk.time}
                            onSelect={(t) => setBlocks(blocks.map((b, i) => i === idx ? { ...b, time: t } : b))}
                            slots={blockSlotsForDate(blk.date, bizHours)}
                          />
                        </>
                      )}
                      <Text style={s.createLabel}>REASON (optional)</Text>
                      <TextInput
                        style={[s.createInput, { height: 60, paddingTop: 10 }]}
                        placeholder="e.g. Lunch break"
                        placeholderTextColor={colors.grey4}
                        value={blk.note}
                        onChangeText={(t) => setBlocks(blocks.map((b, i) => i === idx ? { ...b, note: t } : b))}
                        multiline
                        textAlignVertical="top"
                      />
                    </View>
                  ))}
                  <TouchableOpacity
                    style={s.addBlockBtn}
                    onPress={() => setBlocks([...blocks, makeBlock()])}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={colors.orange} />
                    <Text style={s.addBlockText}>Add another block</Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={[s.createConfirmBtn, creating && { opacity: 0.6 }]}
                onPress={handleCreate}
                disabled={creating}
                activeOpacity={0.85}
              >
                <Text style={s.createConfirmText}>
                  {creating ? 'Saving...' : createTab === 'booking' ? 'Confirm Booking' : `Block Time${blocks.length > 1 ? ` (${blocks.length})` : ''}`}
                </Text>
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  outer: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
  },
  title:          { fontSize: 30, fontWeight: '700', color: colors.black },
  jobsBadge:      { backgroundColor: colors.orangeLight, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  jobsBadgeText:  { fontSize: 14, fontWeight: '700', color: colors.orange },

  // Week strip
  weekStripRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 14 },
  weekArrow:    { paddingHorizontal: 6, paddingVertical: 4 },
  weekStrip: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  dayCell: {
    alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16,
  },
  dayCellSelected: { backgroundColor: colors.orange },
  dayName: { fontSize: 12, fontWeight: '500', color: colors.grey3, marginBottom: 4 },
  dayNum:  { fontSize: 18, fontWeight: '700', color: colors.black },
  dayTextSelected: { color: colors.white },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.grey4, marginTop: 4 },

  // Date label
  dateLabel: { backgroundColor: colors.grey5, paddingHorizontal: 20, paddingVertical: 10 },
  dateLabelText: { fontSize: 12, fontWeight: '600', color: colors.grey3, letterSpacing: 0.5 },

  // Job list
  scroll: { padding: 16, paddingBottom: 40 },

  jobCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  jobRow:   { flexDirection: 'row' },
  timeBox: {
    backgroundColor: colors.orangeLight,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 14, alignItems: 'center',
    marginRight: 14, minWidth: 68,
  },
  timeText:   { fontSize: 14, fontWeight: '700', color: colors.orange },
  periodText: { fontSize: 11, fontWeight: '500', color: colors.orangeDark, marginTop: 2 },

  jobInfo:  { flex: 1 },
  jobTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  jobPhone: { fontSize: 15, fontWeight: '600', color: colors.black },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  statusText:  { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },

  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 4 },
  detailText: { flex: 1, fontSize: 13, color: colors.grey2, lineHeight: 18 },

  // Action row
  actionRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    marginTop: 14, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  actionBtnText: { fontSize: 12, fontWeight: '600' },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.grey5,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.black, marginBottom: 6 },
  emptySub:   { fontSize: 14, color: colors.grey3, textAlign: 'center', paddingHorizontal: 40 },

  // Add button
  addBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.orange,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },

  // Create sheet
  createSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
    maxHeight: '88%',
  },
  sheetHeader:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  closeBtn:        { padding: 4 },
  tabRow:  { flex: 1, flexDirection: 'row', gap: 10 },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.border,
  },
  tabBtnText: { fontSize: 13, fontWeight: '700' },

  createLabel: { fontSize: 11, fontWeight: '700', color: colors.grey3, letterSpacing: 0.6, marginBottom: 8, marginTop: 12 },
  createInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.black,
    backgroundColor: colors.bg,
  },
  createRow: { flexDirection: 'row' },

  allDayRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border, marginBottom: 4 },
  allDayLabel:       { fontSize: 15, fontWeight: '600', color: colors.black },
  allDayToggle:      { width: 46, height: 26, borderRadius: 13, backgroundColor: colors.grey5, padding: 3 },
  allDayToggleActive:{ backgroundColor: colors.orange },
  allDayThumb:       { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.white },
  allDayThumbActive: { transform: [{ translateX: 20 }] },

  createConfirmBtn: {
    backgroundColor: colors.orange, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    marginTop: 20,
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  createConfirmText: { color: colors.white, fontWeight: '700', fontSize: 16 },

  // Block entries
  blockEntry: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 16,
    padding: 14, marginBottom: 14, backgroundColor: colors.bg,
  },
  blockEntryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  blockEntryNum:    { fontSize: 13, fontWeight: '700', color: colors.grey2 },
  addBlockBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.orange, borderStyle: 'dashed',
    marginBottom: 4,
  },
  addBlockText: { fontSize: 14, fontWeight: '600', color: colors.orange },

  // Forward modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle:      { fontSize: 18, fontWeight: '800', color: colors.black, marginBottom: 4 },
  modalSub:        { fontSize: 13, color: colors.grey3, marginBottom: 16 },
  modalInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.black,
  },
  modalActions:    { flexDirection: 'row', gap: 10 },
  modalCancel: {
    flex: 1, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 12, paddingVertical: 13, alignItems: 'center',
  },
  modalCancelText: { color: colors.grey2, fontWeight: '600' },
  modalSend: {
    flex: 2, backgroundColor: colors.orange,
    borderRadius: 12, paddingVertical: 13, alignItems: 'center',
  },
  modalSendText:   { color: colors.white, fontWeight: '700' },

});
