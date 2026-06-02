import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, radius, spacing } from '../theme';
import { sendChatMessage, type ChatContext, type ChatTurn } from '../api';
import {
  appendMessage,
  clearChat,
  useChatMessages,
  type ChatMessage,
} from '../chatStore';
import { daysSinceSurgery, firstNameOf, useUser } from '../userStore';
import { useLatestScanFull } from '../scanStore';
import { adherencePctForDate, useMeds, useMedsRevision } from '../medsStore';

const RECOVERY_PHASES = [
  { name: 'Procedure', start: 0, end: 2 },
  { name: 'Initial Healing', start: 3, end: 14 },
  { name: 'Shedding', start: 15, end: 90 },
  { name: 'Dormant', start: 91, end: 120 },
  { name: 'Early Regrowth', start: 121, end: 240 },
  { name: 'Maturation', start: 241, end: 365 },
];

function phaseName(day: number | null): string | null {
  if (day == null) return null;
  for (const p of RECOVERY_PHASES) {
    if (day >= p.start && day <= p.end) return p.name;
  }
  return RECOVERY_PHASES[RECOVERY_PHASES.length - 1].name;
}

const SUGGESTIONS = [
  'What does my latest scan mean?',
  'How long until I see regrowth?',
  'Tips to improve my adherence',
  'Is my shedding normal?',
];

export default function ChatScreen() {
  const nav = useNavigation<any>();
  const user = useUser();
  const latest = useLatestScanFull();
  const meds = useMeds();
  useMedsRevision();
  const messages = useChatMessages();

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const buildContext = useCallback((): ChatContext => {
    const day = daysSinceSurgery(user);
    const scan = latest?.data;
    return {
      firstName: firstNameOf(user) || undefined,
      treatmentDone: user?.medical?.treatmentDone ?? null,
      recoveryDay: day,
      recoveryPhase: phaseName(day),
      age: user?.medical?.age ?? null,
      sex: user?.medical?.sex ?? null,
      latestScan: scan
        ? {
            severity: scan.classification.severity,
            norwood: scan.classification.norwood_scale,
            baldnessPct: Math.round(scan.measurements.percentage.baldness_ratio),
            coveragePct: Math.round(scan.measurements.percentage.hair_coverage),
          }
        : null,
      medications: meds.map(m => m.name),
      adherencePct: meds.length ? adherencePctForDate(new Date()) : null,
    };
  }, [user, latest, meds]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || sending) return;
      setError(null);
      setInput('');
      appendMessage('user', content);

      // Build the turn list from the persisted history + the message we just added.
      const turns: ChatTurn[] = [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content },
      ];

      setSending(true);
      try {
        const res = await sendChatMessage(turns, buildContext());
        appendMessage('assistant', res.reply);
      } catch (e: any) {
        setError(e?.message || 'Could not reach the assistant. Check your connection.');
      } finally {
        setSending(false);
      }
    },
    [messages, sending, buildContext],
  );

  const data = useMemo(() => [...messages].reverse(), [messages]);
  const empty = messages.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} style={styles.headerBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Ionicons name="sparkles" size={14} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Scalpify Assistant</Text>
            <Text style={styles.headerSub}>Hair & recovery help</Text>
          </View>
        </View>
        <Pressable
          onPress={() => clearChat()}
          style={styles.headerBtn}
          hitSlop={8}
          disabled={empty}
        >
          <Ionicons
            name="create-outline"
            size={20}
            color={empty ? colors.textDim : colors.text}
          />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {empty ? (
          <ScrollView contentContainerStyle={styles.emptyWrap} keyboardShouldPersistTaps="handled">
            <View style={styles.bigAvatar}>
              <Ionicons name="sparkles" size={30} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>
              Hi {firstNameOf(user) || 'there'} 👋
            </Text>
            <Text style={styles.emptyBody}>
              I'm your Scalpify assistant. Ask me about your scan results, treatments,
              recovery timeline, or how to use the app.
            </Text>
            <View style={styles.chips}>
              {SUGGESTIONS.map(s => (
                <Pressable key={s} style={styles.chip} onPress={() => send(s)}>
                  <Text style={styles.chipText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : (
          <FlatList
            ref={listRef}
            data={data}
            inverted
            keyExtractor={m => m.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => <Bubble msg={item} />}
            ListHeaderComponent={sending ? <TypingBubble /> : null}
          />
        )}

        {error && (
          <View style={styles.errorBar}>
            <Ionicons name="warning-outline" size={15} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Composer */}
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Ask anything about your hair…"
            placeholderTextColor={colors.textDim}
            value={input}
            onChangeText={setInput}
            multiline
            editable={!sending}
            onSubmitEditing={() => send(input)}
          />
          <Pressable
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnOff]}
            onPress={() => send(input)}
            disabled={!input.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="arrow-up" size={20} color="#fff" />
            )}
          </Pressable>
        </View>
        <Text style={styles.disclaimer}>
          AI assistant — not a substitute for a doctor's advice.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <View style={[styles.row, isUser ? styles.rowRight : styles.rowLeft]}>
      {!isUser && (
        <View style={styles.botAvatar}>
          <Ionicons name="sparkles" size={12} color={colors.primary} />
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{msg.content}</Text>
      </View>
    </View>
  );
}

function TypingBubble() {
  return (
    <View style={[styles.row, styles.rowLeft]}>
      <View style={styles.botAvatar}>
        <Ionicons name="sparkles" size={12} color={colors.primary} />
      </View>
      <View style={[styles.bubble, styles.bubbleBot, styles.typing]}>
        <ActivityIndicator size="small" color={colors.textMuted} />
        <Text style={styles.typingText}>Thinking…</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgBase },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: colors.textStrong, fontSize: 15, fontWeight: '700' },
  headerSub: { color: colors.textMuted, fontSize: 11 },

  listContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.lg, gap: 10 },

  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, maxWidth: '100%' },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  botAvatar: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.lg,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: colors.cardSolid,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { color: colors.text, fontSize: 15, lineHeight: 21 },
  bubbleTextUser: { color: '#fff' },

  typing: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText: { color: colors.textMuted, fontSize: 14 },

  emptyWrap: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: 12 },
  bigAvatar: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { color: colors.textStrong, fontSize: 22, fontWeight: '800' },
  emptyBody: { color: colors.textMuted, fontSize: 15, lineHeight: 21, textAlign: 'center', maxWidth: 320 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 8 },
  chip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '600' },

  errorBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.dangerSoft,
    marginHorizontal: spacing.md,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: radius.md,
  },
  errorText: { color: colors.dangerText, fontSize: 13, flex: 1 },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.cardSolid,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 11,
    color: colors.text,
    fontSize: 15,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnOff: { backgroundColor: colors.primarySoft },
  disclaimer: {
    color: colors.textDim,
    fontSize: 11,
    textAlign: 'center',
    paddingTop: 6,
    paddingBottom: 8,
  },
});
