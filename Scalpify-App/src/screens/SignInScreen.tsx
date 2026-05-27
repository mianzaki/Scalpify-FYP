import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const logo = require('../../assets/logo.jpeg');
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Field, GhostLink, PrimaryButton } from '../components/ui';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../navigation';
import { signIn } from '../userStore';

export default function SignInScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSignIn() {
    if (!email.trim() || !password) {
      return Alert.alert('Missing fields', 'Enter your email and password.');
    }
    setSubmitting(true);
    try {
      const user = await signIn(email);
      if (!user) {
        Alert.alert('Account not found', 'No local account matches that email. Create one first.');
        return;
      }
      nav.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.xl }} keyboardShouldPersistTaps="handled">
        <View style={styles.logoWrap}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </View>

        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.sub}>Securely sign in to your hair health dashboard.</Text>

        <Card style={styles.formCard}>
          <Field
            label="Email Address"
            placeholder="name@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            iconLeft="mail-outline"
            value={email}
            onChangeText={setEmail}
          />

          <View style={{ gap: 8, marginTop: spacing.lg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.label}>Password</Text>
              <GhostLink
                label="Forgot Password?"
                onPress={() =>
                  Alert.alert(
                    'Local-only auth',
                    'Scalpify currently stores your account on this device. Sign up again to create a fresh local account.',
                  )
                }
              />
            </View>
            <View style={styles.fieldWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textDim} style={{ marginRight: 8 }} />
              <TextInput
                style={{ flex: 1, color: colors.text, fontSize: 16 }}
                placeholder="••••••••"
                placeholderTextColor={colors.textFaint}
                secureTextEntry={!show}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable hitSlop={8} onPress={() => setShow(s => !s)}>
                <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textDim} />
              </Pressable>
            </View>
          </View>

          <View style={styles.encPill}>
            <Ionicons name="phone-portrait" size={14} color={colors.successText} />
            <Text style={styles.encText}>Stored only on this device</Text>
          </View>

          <PrimaryButton
            label="Sign In"
            loading={submitting}
            disabled={submitting}
            onPress={handleSignIn}
            style={{ marginTop: spacing.lg }}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: spacing.lg }}>
            <Text style={styles.dim}>Don't have an account?</Text>
            <GhostLink label="Sign Up" onPress={() => nav.navigate('SignUp')} />
          </View>
        </Card>

        <View style={styles.footer}>
          <View style={styles.footerItem}>
            <Ionicons name="phone-portrait-outline" size={14} color={colors.textMuted} />
            <Text style={styles.footerText}>LOCAL-ONLY STORAGE</Text>
          </View>
          <View style={styles.footerDivider} />
          <View style={styles.footerItem}>
            <Ionicons name="sparkles-outline" size={14} color={colors.textMuted} />
            <Text style={styles.footerText}>AI POWERED</Text>
          </View>
        </View>

        <Text style={styles.copyright}>
          © 2026 Scalpify AI Health. All rights reserved.{'\n'}
          Privacy Policy · Terms of Service · Help Center
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  logoWrap: { alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.sm },
  logo: { width: 160, height: 130 },
  title: {
    color: colors.textStrong,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  sub: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  formCard: {
    marginTop: spacing.xl,
    padding: spacing.xl,
  },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  encPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.successSoft,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: spacing.lg,
  },
  encText: { color: colors.successText, fontSize: 13, fontWeight: '600' },
  dim: { color: colors.textMuted, fontSize: 14 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: spacing.xxl,
  },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  footerDivider: { width: 1, height: 14, backgroundColor: colors.border },
  copyright: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 16,
  },
});
