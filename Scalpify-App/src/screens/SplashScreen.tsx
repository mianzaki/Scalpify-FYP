import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../navigation';
import { useUser } from '../userStore';

const logo = require('../../assets/logo.jpeg');

export default function SplashScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useUser();

  useEffect(() => {
    const t = setTimeout(() => {
      nav.reset({
        index: 0,
        routes: [{ name: user ? 'MainTabs' : 'Welcome' }],
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [user, nav]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.center}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.tagline}>AI HAIR-LOSS ASSESSMENT & RECOVERY</Text>
        <View style={styles.rule} />
      </View>

      <View style={styles.footer}>
        <Ionicons name="phone-portrait-outline" size={14} color={colors.textMuted} />
        <Text style={styles.footerText}>Local-only · No data leaves your device</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl },
  logo: {
    width: 260,
    height: 240,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: 8,
    textAlign: 'center',
  },
  rule: {
    height: 3,
    width: 120,
    backgroundColor: colors.primary,
    borderRadius: 2,
    marginTop: 24,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: spacing.xl,
    alignSelf: 'center',
  },
  footerText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
});
