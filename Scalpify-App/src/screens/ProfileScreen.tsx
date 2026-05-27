import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Pill, PrimaryButton } from '../components/ui';
import { AppHeader } from '../components/Header';
import { colors, shadow, spacing } from '../theme';
import type { RootStackParamList } from '../navigation';
import { daysSinceSurgery, initialsOf, signOut, useUser } from '../userStore';
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

export default function ProfileScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useUser();
  const history = useScanHistory();
  const day = daysSinceSurgery(user);
  const [sync, setSync] = useState(false); // off by default — no sync backend

  async function handleSignOut() {
    await signOut();
    nav.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  }

  async function handleClearCache() {
    await Promise.all([clearScans(), clearMeds()]);
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
              <Ionicons name="cloud-upload" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.syncTitle}>Sync with Server</Text>
              <Text style={styles.syncSub}>
                {sync ? 'Server sync requires Supabase setup' : 'Local-only — all data stays on device'}
              </Text>
            </View>
            <Switch
              value={sync}
              onValueChange={setSync}
              thumbColor="#fff"
              trackColor={{ false: colors.cardElev, true: colors.primary }}
            />
          </View>

          <View style={styles.dataCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="server" size={20} color={colors.successText} />
              <Text style={styles.cardTitle}>Data Persistence</Text>
            </View>
            <Text style={styles.dataBody}>
              Your clinical data is cached locally using AsyncStorage. Tap Clear Cache to wipe scans,
              medications, and daily logs from this device.
            </Text>
            <View style={styles.dataKey}>
              <Text style={styles.dataKeyText}>scalpify.*.v1</Text>
              <Text style={styles.dataKeyEnc}>On-device</Text>
            </View>
            <Pressable onPress={handleClearCache} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Clear Cache</Text>
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
    borderColor: '#fff',
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
    borderColor: '#fff',
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

  syncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#DDEBFB',
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
    backgroundColor: colors.cardElev,
    borderRadius: 18,
    padding: spacing.lg,
    gap: 12,
  },
  dataBody: { color: colors.text, fontSize: 13, lineHeight: 19 },
  dataKey: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 10,
  },
  dataKeyText: { color: colors.text, fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  dataKeyEnc: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  clearBtn: { backgroundColor: '#fff', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  clearBtnText: { color: colors.primary, fontSize: 14, fontWeight: '700' },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 14,
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
