import React, { useRef } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing } from '../theme';

const SCREEN_W = Dimensions.get('window').width;
const ITEM_W = Math.round(SCREEN_W / 5); // 5 numbers visible at once
const SIDE_PAD = (SCREEN_W - ITEM_W) / 2; // so first/last can centre
const RULER_TICKS = 41; // fixed (non-scrolling) ruler under the numbers

// Center number large/white; neighbours progressively smaller + faded.
function numStyle(distance: number): TextStyle {
  switch (distance) {
    case 0:
      return { fontSize: 46, color: colors.textStrong, fontWeight: '800', opacity: 1 };
    case 1:
      return { fontSize: 28, color: colors.textMuted, fontWeight: '700', opacity: 0.7 };
    case 2:
      return { fontSize: 22, color: colors.textFaint, fontWeight: '600', opacity: 0.4 };
    default:
      return { fontSize: 18, color: colors.textFaint, opacity: 0 };
  }
}

/**
 * Horizontal number carousel: the numbers scroll/snap, a fixed ruler + centre mark
 * sits underneath, and a light haptic fires on each value change. Used for age and
 * age-of-onset (shared so there's no duplicated picker code).
 */
export function RulerPicker({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const inited = useRef(false);
  const items = React.useMemo(
    () => Array.from({ length: max - min + 1 }, (_, i) => min + i),
    [min, max],
  );

  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const toOffset = (v: number) => (v - min) * ITEM_W;
  const toValue = (x: number) => clamp(min + Math.round(x / ITEM_W));

  function onContentSizeChange() {
    if (!inited.current) {
      scrollRef.current?.scrollTo({ x: toOffset(value), animated: false });
      inited.current = true;
    }
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const v = toValue(e.nativeEvent.contentOffset.x);
    if (v !== value) {
      Haptics.selectionAsync().catch(() => {});
      onChange(v);
    }
  }

  return (
    <View style={styles.break}>
      {/* MOVABLE numbers */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_W}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onContentSizeChange={onContentSizeChange}
        contentOffset={{ x: toOffset(value), y: 0 }}
        contentContainerStyle={{ paddingHorizontal: SIDE_PAD }}
      >
        {items.map(n => (
          <View key={n} style={styles.slot}>
            <Text style={[styles.num, numStyle(Math.abs(n - value))]}>{n}</Text>
          </View>
        ))}
      </ScrollView>

      {/* FIXED ruler + centre mark */}
      <View style={styles.ruler} pointerEvents="none">
        {Array.from({ length: RULER_TICKS }).map((_, i) => {
          const isCenter = i === (RULER_TICKS - 1) / 2;
          const major = i % 5 === 0;
          return (
            <View
              key={i}
              style={[styles.rTick, isCenter ? styles.rTickCenter : major ? styles.rTickMajor : styles.rTickMinor]}
            />
          );
        })}
      </View>
    </View>
  );
}

const NUM_BOX_H = 64;

const styles = StyleSheet.create({
  break: { marginHorizontal: -spacing.xl, marginTop: 24 },
  slot: { width: ITEM_W, height: NUM_BOX_H, alignItems: 'center', justifyContent: 'center' },
  num: { textAlign: 'center' },

  ruler: {
    flexDirection: 'row',
    width: SCREEN_W,
    height: 34,
    marginTop: 10,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  rTick: { borderRadius: 1 },
  rTickMinor: { width: 1.5, height: 10, backgroundColor: 'rgba(255,255,255,0.15)' },
  rTickMajor: { width: 1.5, height: 18, backgroundColor: 'rgba(255,255,255,0.30)' },
  rTickCenter: { width: 2.5, height: 30, backgroundColor: colors.primary },
});
