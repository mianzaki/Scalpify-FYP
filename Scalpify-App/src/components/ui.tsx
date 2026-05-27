import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing } from '../theme';

export function Card({
  children,
  style,
  glow,
  flat,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  glow?: 'primary' | 'success' | 'warning' | 'danger';
  flat?: boolean;
}) {
  const tone =
    glow === 'success'
      ? { borderColor: colors.success }
      : glow === 'warning'
      ? { borderColor: colors.warning }
      : glow === 'danger'
      ? { borderColor: colors.danger }
      : glow === 'primary'
      ? { borderColor: colors.primary }
      : null;
  return (
    <View style={[styles.card, !flat && shadow.card, tone, style]}>{children}</View>
  );
}

type PillVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'soft';

export function Pill({
  label,
  variant = 'default',
  icon,
  style,
}: {
  label: string;
  variant?: PillVariant;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  style?: ViewStyle;
}) {
  const palette: Record<PillVariant, { bg: string; fg: string }> = {
    default: { bg: colors.cardElev, fg: colors.textMuted },
    primary: { bg: colors.primarySoft, fg: colors.primary },
    success: { bg: colors.successSoft, fg: colors.successText },
    warning: { bg: colors.warningSoft, fg: '#9A4A04' },
    danger: { bg: colors.dangerSoft, fg: colors.dangerText },
    soft: { bg: colors.cardElev, fg: colors.text },
  };
  const map = palette[variant];
  return (
    <View style={[styles.pill, { backgroundColor: map.bg }, style]}>
      {icon && <Ionicons name={icon} size={13} color={map.fg} style={{ marginRight: 6 }} />}
      <Text style={[styles.pillText, { color: map.fg }]}>{label}</Text>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  style,
  variant = 'primary',
  iconRight,
}: {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  variant?: 'primary' | 'success';
  iconRight?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  const bg = variant === 'success' ? colors.success : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryBtn,
        { backgroundColor: bg },
        disabled && { opacity: 0.5 },
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.primaryBtnText}>{label}</Text>
          {iconRight && <Ionicons name={iconRight} size={18} color="#fff" />}
        </View>
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  iconLeft,
  style,
}: {
  label: string;
  onPress?: () => void;
  iconLeft?: React.ComponentProps<typeof Ionicons>['name'];
  style?: ViewStyle | ViewStyle[];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryBtn,
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {iconLeft && <Ionicons name={iconLeft} size={16} color={colors.primary} style={{ marginRight: 8 }} />}
      <Text style={styles.secondaryBtnText}>{label}</Text>
    </Pressable>
  );
}

export function GhostLink({
  label,
  onPress,
  underline,
  color = colors.primary,
}: {
  label: string;
  onPress?: () => void;
  underline?: boolean;
  color?: string;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text style={[styles.ghostLink, { color }, underline && { textDecorationLine: 'underline' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({
  label,
  iconRight,
  iconLeft,
  ...rest
}: {
  label?: string;
  iconRight?: React.ComponentProps<typeof Ionicons>['name'];
  iconLeft?: React.ComponentProps<typeof Ionicons>['name'];
} & TextInputProps) {
  return (
    <View style={{ gap: 8 }}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={styles.fieldWrap}>
        {iconLeft && (
          <Ionicons name={iconLeft} size={18} color={colors.textDim} style={{ marginRight: 8 }} />
        )}
        <TextInput
          placeholderTextColor={colors.textFaint}
          style={styles.fieldInput}
          {...rest}
        />
        {iconRight && (
          <Ionicons name={iconRight} size={18} color={colors.textDim} />
        )}
      </View>
    </View>
  );
}

export function CircleIconButton({
  icon,
  onPress,
  bg = colors.card,
  size = 40,
  color = colors.text,
  border,
  shadowed,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
  bg?: string;
  size?: number;
  color?: string;
  border?: string;
  shadowed?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: border ? 1 : 0,
          borderColor: border,
        },
        shadowed && shadow.card,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Ionicons name={icon} size={size * 0.45} color={color} />
    </Pressable>
  );
}

// Small horizontal segmented control: [tab1 | tab2]
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.segmented, style]}>
      {options.map(opt => {
        const on = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.segmentedItem, on && styles.segmentedItemOn]}
          >
            <Text style={[styles.segmentedText, on && styles.segmentedTextOn]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Thin progress bar shown at the very top of certain screens (matches mockup
// blue/green sliver above the app header).
export function ScreenProgress({ pct = 30 }: { pct?: number }) {
  return (
    <View style={styles.progressBar}>
      <View style={[styles.progressFill, { width: `${Math.max(2, Math.min(100, pct))}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: spacing.lg,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  pillText: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.1 },
  primaryBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  ghostLink: { fontSize: 14, fontWeight: '600' },
  fieldLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  fieldInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 14,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.cardElev,
    borderRadius: 999,
    padding: 4,
    alignSelf: 'flex-start',
  },
  segmentedItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  segmentedItemOn: {
    backgroundColor: colors.primary,
  },
  segmentedText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  segmentedTextOn: { color: '#fff' },
  progressBar: {
    height: 4,
    backgroundColor: colors.cardElev,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
  },
});
