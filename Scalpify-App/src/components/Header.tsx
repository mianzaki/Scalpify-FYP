import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { CircleIconButton } from './ui';
import { colors, shadow, spacing } from '../theme';
import { initialsOf, useUser } from '../userStore';

// App-level header: hamburger / back, Scalpify wordmark, avatar.
export function AppHeader({
  showBack = false,
  variant = 'menu',
  rightSlot,
  onRightPress,
}: {
  showBack?: boolean;
  variant?: 'menu' | 'back' | 'none';
  rightSlot?: React.ReactNode;
  onRightPress?: () => void;
}) {
  const nav = useNavigation<any>();
  const user = useUser();
  const initials = initialsOf(user);

  const left =
    showBack || variant === 'back' ? (
      <Pressable hitSlop={8} onPress={() => nav.goBack()} style={styles.iconBtn}>
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>
    ) : variant === 'menu' ? (
      <Pressable hitSlop={8} style={styles.iconBtn}>
        <Ionicons name="menu" size={24} color={colors.text} />
      </Pressable>
    ) : (
      <View style={{ width: 32 }} />
    );

  return (
    <View style={styles.row}>
      {left}
      <Text style={styles.wordmark}>Scalpify</Text>
      <View style={{ flex: 1 }} />
      {rightSlot ?? (
        <Pressable hitSlop={8} onPress={onRightPress}>
          <View style={{ position: 'relative' }}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials || '·'}</Text>
            </View>
            {user && <View style={styles.avatarStatus} />}
          </View>
        </Pressable>
      )}
    </View>
  );
}

// Section header used inside a scroll view (large bold title + optional subtitle).
export function PageTitle({
  title,
  subtitle,
  style,
}: {
  title: string;
  subtitle?: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md }, style]}>
      <Text style={styles.pageTitle}>{title}</Text>
      {subtitle ? <Text style={styles.pageSub}>{subtitle}</Text> : null}
    </View>
  );
}

// Compact in-scroll header used on stack-pushed screens.
export function ScreenHeader({
  title,
  subtitle,
  showBack = true,
  rightSlot,
}: {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  rightSlot?: React.ReactNode;
}) {
  const nav = useNavigation();
  return (
    <View style={styles.compactRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}>
        {showBack && (
          <CircleIconButton icon="chevron-back" onPress={() => nav.goBack()} />
        )}
        <View style={{ flex: 1 }}>
          {title && <Text style={styles.compactTitle}>{title}</Text>}
          {subtitle && <Text style={styles.compactSub}>{subtitle}</Text>}
        </View>
      </View>
      {rightSlot}
    </View>
  );
}

export function StatusBarFiller() {
  return <View style={{ height: 8 }} />;
}

export function PulseLogo({ size = 18 }: { size?: number }) {
  return <Ionicons name="pulse" size={size} color={colors.primary} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  wordmark: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    ...shadow.card,
  },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  avatarStatus: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    right: 0,
    bottom: 0,
    borderWidth: 1.5,
    borderColor: '#fff',
  },

  pageTitle: { color: colors.textStrong, fontSize: 28, fontWeight: '800' },
  pageSub: { color: colors.textMuted, fontSize: 14, marginTop: 4, lineHeight: 20 },

  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  compactTitle: { color: colors.textStrong, fontSize: 22, fontWeight: '700' },
  compactSub: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
});
