import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Pill, PrimaryButton } from '../components/ui';
import { AppHeader } from '../components/Header';
import { colors, shadow, spacing } from '../theme';
import type { RootStackParamList } from '../navigation';
import { daysSinceSurgery, initialsOf, signOut, updateUser, useUser } from '../userStore';
import { clearScans, useScanHistory } from '../scanStore';
import { clearMeds } from '../medsStore';
import { APP_VERSION } from '../config';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const SETTINGS: { key: string; icon: IoniconName; label: string; route?: keyof RootStackParamList }[] = [
  { key: 'personal', icon: 'person-outline', label: 'Personal Information', route: 'MedicalProfile' },
  { key: 'notifications', icon: 'notifications-outline', label: 'Notification Preferences' },
  { key: 'privacy', icon: 'lock-closed-outline', label: 'Privacy & Security' },
];

function memberSince(ts: number | null | undefined): string {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${d.toLocaleString('en', { month: 'short' })} ${d.getFullYear()}`;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDate(s: string | null | undefined): Date {
  if (s) {
    const t = Date.parse(s);
    if (!Number.isNaN(t)) return new Date(t);
  }
  return new Date();
}

export default function ProfileScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useUser();
  const history = useScanHistory();
  const day = daysSinceSurgery(user);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Changing the surgery date updates `user.surgeryDate`; because the recovery
  // screen reads it via useUser(), its phase/day recompute automatically.
  function onSurgeryDateChange(event: { type?: string }, selected?: Date) {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected && (Platform.OS === 'ios' || event?.type === 'set')) {
      void updateUser({ surgeryDate: toISODate(selected) });
    }
  }

  async function handleSignOut() {
    await signOut();
    nav.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  }

  function handleClearData() {
    Alert.alert(
      'Delete your scans & medications?',
      'This permanently removes all your scans and medications from your account (on every device). Your profile and login stay. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void Promise.all([clearScans(), clearMeds()]);
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AppHeader />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={styles.identityWrap}>
          <View style={styles.avatarOuter}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsOf(user) || '?'}</Text>
            </View>
            <View style={styles.statusDot} />
          </View>
          <Text style={styles.name}>{user?.fullName ?? 'Guest'}</Text>
          <Text style={styles.metaLine}>
            {user ? `Member since ${memberSince(user.createdAt)}` : 'Not signed in'}
            {day !== null ? ` · Day ${day} of recovery` : ''}
          </Text>
          <View style={styles.pillsRow}>
            <Pill label={`${history.length} ${history.length === 1 ? 'scan' : 'scans'}`} variant="primary" />
            {user?.medical?.medications && user.medical.medications.length > 0 && (
              <Pill label={`${user.medical.medications.length} on regimen`} variant="success" />
            )}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={{ paddingHorizontal: spacing.xl, gap: spacing.lg }}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="medkit" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>Recovery</Text>
            </View>
            <Pressable onPress={() => setShowDatePicker(s => !s)} style={styles.settingRow}>
              <Ionicons name="calendar-outline" size={20} color={colors.text} />
              <Text style={styles.settingLabel}>Surgery date</Text>
              <Text style={styles.settingValue}>
                {user?.surgeryDate ? new Date(user.surgeryDate).toDateString().slice(4) : 'Not set'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
            </Pressable>
            {showDatePicker && (
              <View style={{ alignItems: 'center' }}>
                <DateTimePicker
                  value={parseDate(user?.surgeryDate)}
                  mode="date"
                  maximumDate={new Date()}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onSurgeryDateChange}
                />
                {Platform.OS === 'ios' && (
                  <Pressable onPress={() => setShowDatePicker(false)} style={styles.doneBtn}>
                    <Text style={styles.doneBtnText}>Done</Text>
                  </Pressable>
                )}
              </View>
            )}
            {user?.surgeryDate && (
              <Pressable
                onPress={() => {
                  void updateUser({ surgeryDate: null });
                  setShowDatePicker(false);
                }}
                hitSlop={6}
                style={{ paddingVertical: 6 }}
              >
                <Text style={styles.clearDateText}>Clear surgery date</Text>
              </Pressable>
            )}
            <Text style={styles.recoveryHint}>
              Your recovery calendar and current phase are calculated from this date.
            </Text>
          </Card>

          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="settings" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>Account Settings</Text>
            </View>
            <View style={{ marginTop: spacing.md }}>
              {SETTINGS.map(s => (
                <Pressable
                  key={s.key}
                  onPress={s.route ? () => nav.navigate(s.route!) : undefined}
                  style={styles.settingRow}
                >
                  <Ionicons name={s.icon} size={20} color={colors.text} />
                  <Text style={styles.settingLabel}>{s.label}</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
                </Pressable>
              ))}
            </View>
          </Card>

          <View style={styles.syncCard}>
            <View style={styles.syncIcon}>
              <Ionicons name="cloud-done" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.syncTitle}>Cloud Sync</Text>
              <Text style={styles.syncSub}>
                {user
                  ? `Synced to ${user.email} — your data follows you across devices.`
                  : 'Sign in to sync your data to your account.'}
              </Text>
            </View>
            <Ionicons name="checkmark-circle" size={24} color={colors.successText} />
          </View>

          <View style={styles.dataCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="server" size={20} color={colors.successText} />
              <Text style={styles.cardTitle}>Your Data</Text>
            </View>
            <Text style={styles.dataBody}>
              Your scans, medications and logs are stored securely in your Scalpify account and
              protected so only you can access them. Deleting clears them from every device.
            </Text>
            <View style={styles.dataKey}>
              <Text style={styles.dataKeyText}>Supabase · per-user (RLS)</Text>
              <Text style={styles.dataKeyEnc}>Cloud</Text>
            </View>
            <Pressable onPress={handleClearData} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Delete Scans & Medications</Text>
            </Pressable>
          </View>

          {!user ? (
            <PrimaryButton
              label="Sign In"
              iconRight="log-in-outline"
              onPress={() => nav.navigate('SignIn')}
            />
          ) : (
            <Pressable onPress={handleSignOut} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={18} color={colors.danger} />
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          )}

          <Text style={styles.versionText}>SCALPIFY V{APP_VERSION}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  identityWrap: { alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.md },
  avatarOuter: { position: 'relative' },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.border,
    ...shadow.card,
  },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '800' },
  statusDot: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.success,
    right: -2,
    bottom: -2,
    borderWidth: 3,
    borderColor: colors.bgBase,
  },
  name: { color: colors.textStrong, fontSize: 26, fontWeight: '800', marginTop: spacing.md },
  metaLine: { color: colors.textMuted, fontSize: 14, marginTop: 4 },
  pillsRow: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg, marginHorizontal: spacing.xl },

  cardTitle: { color: colors.textStrong, fontSize: 20, fontWeight: '800' },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: colors.borderSoft,
  },
  settingLabel: { flex: 1, color: colors.text, fontSize: 16 },
  settingValue: { color: colors.primary, fontSize: 15, fontWeight: '600', marginRight: 6 },
  doneBtn: { paddingVertical: 8, paddingHorizontal: 24, marginTop: 4 },
  doneBtnText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  clearDateText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  recoveryHint: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 8 },

  syncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primarySoft,
    padding: spacing.lg,
    borderRadius: 18,
  },
  syncIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  syncSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },

  dataCard: {
    backgroundColor: colors.cardSolid,
    borderRadius: 18,
    padding: spacing.lg,
    gap: 12,
  },
  dataBody: { color: colors.text, fontSize: 13, lineHeight: 19 },
  dataKey: {
    flexDirection: 'row',
    backgroundColor: colors.bgElev,
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 10,
  },
  dataKeyText: { color: colors.text, fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  dataKeyEnc: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  clearBtn: { backgroundColor: colors.cardSolid, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  clearBtnText: { color: colors.primary, fontSize: 14, fontWeight: '700' },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.cardSolid,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  logoutText: { color: colors.danger, fontSize: 15, fontWeight: '700' },

  versionText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
