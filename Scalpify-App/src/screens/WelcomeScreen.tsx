import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const logo = require('../../assets/logo.jpeg');
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, GhostLink, Pill, PrimaryButton } from '../components/ui';
import { AppHeader } from '../components/Header';
import { colors, shadow, spacing } from '../theme';
import type { RootStackParamList } from '../navigation';

type FeatureIcon = React.ComponentProps<typeof Ionicons>['name'];

const FEATURES: { icon: FeatureIcon; tint: string; bg: string; title: string; body: string }[] = [
  {
    icon: 'camera',
    tint: colors.primary,
    bg: colors.primarySoft,
    title: 'Precision Scan',
    body: 'High-res analysis of scalp health & density.',
  },
  {
    icon: 'flask',
    tint: '#fff',
    bg: colors.success,
    title: 'Lab Insights',
    body: 'Science-backed metrics for follicles.',
  },
  {
    icon: 'calendar',
    tint: colors.primary,
    bg: colors.primarySoft,
    title: 'Growth Plans',
    body: 'Tailored routines for your specific goals.',
  },
];

export default function WelcomeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <AppHeader />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={{ paddingHorizontal: spacing.xl }}>
          <Card style={styles.hero}>
            <View style={styles.heroImage}>
              <Image source={logo} style={styles.heroLogo} resizeMode="contain" />
            </View>

            <Text style={styles.heroTitle}>Your Journey to{'\n'}Healthier Hair Begins</Text>
            <Text style={styles.heroBody}>
              Scalpify gives you objective analysis and personalized guidance using advanced AI.
              Let's build your profile locally.
            </Text>

            <View style={styles.pillRow}>
              <Pill label="Clinical Precision" variant="success" icon="shield-checkmark" />
              <Pill label="Privacy First" variant="primary" icon="lock-closed" />
            </View>
            <View style={[styles.pillRow, { marginTop: 8 }]}>
              <Pill label="AI-Powered" variant="default" icon="sparkles" />
            </View>

            <PrimaryButton
              label="Get Started"
              onPress={() => nav.navigate('SignUp')}
              style={{ marginTop: spacing.xl }}
            />
            <Text style={styles.heroFinePrint}>
              Secure processing. No data leaves your device without consent.
            </Text>
          </Card>

          <View style={{ alignItems: 'center', marginTop: spacing.lg }}>
            <GhostLink
              label="I already have an account"
              onPress={() => nav.navigate('SignIn')}
            />
          </View>

          <View style={{ gap: 12, marginTop: spacing.xl }}>
            {FEATURES.map(f => (
              <View key={f.title} style={styles.featureCard}>
                <View style={[styles.featureIcon, { backgroundColor: f.bg }]}>
                  <Ionicons name={f.icon} size={20} color={f.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureBody}>{f.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  heroImage: {
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: '#EEF4FB',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  heroLogo: { width: '90%', height: '90%' },
  heroTitle: {
    color: colors.textStrong,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 32,
  },
  heroBody: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 14,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.xl,
  },
  heroFinePrint: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.cardElev,
    borderRadius: 18,
    padding: spacing.lg,
    ...shadow.card,
    shadowOpacity: 0.04,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: { color: colors.textStrong, fontSize: 16, fontWeight: '700' },
  featureBody: { color: colors.textMuted, fontSize: 13, marginTop: 2, lineHeight: 18 },
});
