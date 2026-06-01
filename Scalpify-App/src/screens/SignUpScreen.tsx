import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const logo = require('../../assets/logo.png');
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, GhostLink, PrimaryButton, ScreenProgress } from '../components/ui';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../navigation';
import { signUp } from '../userStore';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function SignUpScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [surgeryDate, setSurgeryDate] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return Alert.alert('Missing name', 'Please enter your full name.');
    if (!email.trim()) return Alert.alert('Missing email', 'Please enter your email.');
    if (password.length < 6) return Alert.alert('Weak password', 'Use at least 6 characters.');
    if (password !== confirm) return Alert.alert('Passwords differ', 'Confirm password does not match.');
    if (surgeryDate && !ISO_DATE_RE.test(surgeryDate.trim())) {
      return Alert.alert('Invalid date', 'Use YYYY-MM-DD format, e.g. 2025-03-15.');
    }
    setSubmitting(true);
    try {
      await signUp({ fullName: name, email, surgeryDate: surgeryDate || null });
      // Required step: branched onboarding questionnaire right after sign-up, before
      // the main app. reset() so Back can't return to the sign-up form.
      nav.reset({ index: 0, routes: [{ name: 'OnbTreatment' }] });
    } catch (e: any) {
      Alert.alert('Sign-up failed', e?.message ?? String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScreenProgress pct={30} />
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoWrap}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </View>

        <Text style={styles.title}>Start Your Journey</Text>
        <Text style={styles.sub}>Create an account for personalized AI analysis.</Text>

        <Card style={styles.formCard}>
          <BoxField label="Full Name" placeholder="Dr. Sarah Johnson" icon="person-outline" value={name} onChangeText={setName} />
          <BoxField
            label="Email Address"
            placeholder="sarah@example.com"
            icon="mail-outline"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <BoxField
            label="Password"
            placeholder="••••••••"
            icon="lock-closed-outline"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <BoxField
            label="Confirm"
            placeholder="••••••••"
            icon="shield-checkmark-outline"
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
          />
          <BoxField
            label="Surgery Date (optional)"
            placeholder="YYYY-MM-DD"
            icon="calendar-outline"
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
            value={surgeryDate}
            onChangeText={setSurgeryDate}
          />

          <Pressable
            onPress={() => setAgreed(a => !a)}
            style={({ pressed }) => [styles.consent, pressed && { opacity: 0.85 }]}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
              {agreed && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={styles.consentText}>
              I agree to the <Text style={styles.link}>Terms of Service</Text> and{' '}
              <Text style={styles.link}>Privacy Policy</Text>
            </Text>
          </Pressable>

          <PrimaryButton
            label="Create Account"
            iconRight="arrow-forward"
            disabled={!agreed || submitting}
            loading={submitting}
            onPress={handleCreate}
            style={{ marginTop: spacing.lg }}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: spacing.lg }}>
            <Text style={styles.dim}>Already have an account?</Text>
            <GhostLink label="Log In" onPress={() => nav.navigate('SignIn')} />
          </View>
        </Card>

        <View style={styles.trustRow}>
          <TrustItem icon="phone-portrait-outline" label="Local Storage" />
          <TrustItem icon="sparkles-outline" label="AI Powered" />
          <TrustItem icon="cloud-offline-outline" label="No Server" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BoxField({
  label,
  icon,
  ...rest
}: {
  label: string;
  icon: IoniconName;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ gap: 8, marginBottom: spacing.lg }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldWrap}>
        <Ionicons name={icon} size={18} color={colors.textDim} style={{ marginRight: 8 }} />
        <TextInput
          style={{ flex: 1, color: colors.textStrong, fontSize: 16 }}
          placeholderTextColor={colors.textFaint}
          {...rest}
        />
      </View>
    </View>
  );
}

function TrustItem({ icon, label }: { icon: IoniconName; label: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 6, flex: 1 }}>
      <Ionicons name={icon} size={20} color={colors.textMuted} />
      <Text style={styles.trustLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  logoWrap: { alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.sm },
  logo: { width: 140, height: 110 },
  title: {
    color: colors.textStrong,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  sub: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  formCard: { marginTop: spacing.xl, padding: spacing.xl },
  fieldLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  consent: {
    flexDirection: 'row',
    gap: 12,
    marginTop: spacing.sm,
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  consentText: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 19 },
  link: { color: colors.primary, fontWeight: '600' },
  dim: { color: colors.textMuted, fontSize: 14 },
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  trustLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', textAlign: 'center' },
});
