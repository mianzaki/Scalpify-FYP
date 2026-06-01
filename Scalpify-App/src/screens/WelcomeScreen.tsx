import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation';

const logo = require('../../assets/logo.png');

export default function WelcomeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const brandFade = useRef(new Animated.Value(0)).current;
  const brandSlide = useRef(new Animated.Value(20)).current;
  const ctaFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(brandFade, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(brandSlide, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(ctaFade, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={{ flex: 1.4 }} />

      <Animated.View style={[styles.brand, { opacity: brandFade, transform: [{ translateY: brandSlide }] }]}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
      </Animated.View>

      <View style={{ flex: 1 }} />

      <Animated.View style={[styles.cta, { opacity: ctaFade }]}>
        <Pressable
          onPress={() => nav.navigate('Onboarding')}
          style={({ pressed }) => [styles.mainBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
        >
          <Text style={styles.mainBtnLabel}>Sign In / Get Started</Text>
        </Pressable>

        <Pressable
          onPress={() => nav.reset({ index: 0, routes: [{ name: 'MainTabs' }] })}
          hitSlop={14}
          style={styles.guestWrap}
        >
          <Text style={styles.guestLabel}>Explore as Guest</Text>
        </Pressable>
      </Animated.View>

      <View style={styles.linesWrap} pointerEvents="none">
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <View
            key={i}
            style={[styles.line, { bottom: i * 11, width: 130 + i * 26, opacity: 0.025 + i * 0.01 }]}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  brand: { alignItems: 'center' },
  logo: { width: 180, height: 180 },

  cta: { paddingHorizontal: 28, paddingBottom: 48, gap: 18, alignItems: 'center' },
  mainBtn: {
    width: '100%', paddingVertical: 17, borderRadius: 999,
    backgroundColor: '#F5F5F0', alignItems: 'center',
  },
  mainBtnLabel: { color: '#0B0F14', fontSize: 16, fontWeight: '700' },
  guestWrap: { paddingVertical: 4 },
  guestLabel: { color: colors.primary, fontSize: 14, fontWeight: '600' },

  linesWrap: {
    position: 'absolute', bottom: 0, right: 0, width: 280, height: 100, overflow: 'hidden',
  },
  line: {
    position: 'absolute', right: -30, height: 1,
    backgroundColor: '#fff', transform: [{ rotate: '-35deg' }],
  },
});
