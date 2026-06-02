import React, { useMemo, useRef, useState } from 'react';
import { Animated, Image, PanResponder, StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import type { ScanCoordinates } from '../api';

function polygons(segments?: { simplified_boundary?: { x: number; y: number }[]; boundary_points?: { x: number; y: number }[] }[]) {
  return (segments ?? [])
    .map(s => s.simplified_boundary ?? s.boundary_points ?? [])
    .filter(pts => pts.length >= 3)
    .map(pts => pts.map(p => `${p.x},${p.y}`).join(' '));
}

/**
 * Drag the divider to wipe between the original photo (right) and the AI overlay
 * (left): hair region tinted cyan, bald/thinning region outlined red.
 *
 * Smoothness: the divider position is an Animated.Value updated via setValue during
 * the gesture, so the wipe runs without triggering React re-renders (the SVG + images
 * render once and stay put).
 */
export function BeforeAfterScalp({
  photoUri,
  coordinates,
}: {
  photoUri: string;
  coordinates: ScanCoordinates;
}) {
  const [w, setW] = useState(0);
  const divX = useRef(new Animated.Value(0)).current;
  const containerRef = useRef<View>(null);
  const offsetX = useRef(0);
  const widthRef = useRef(0);

  const space = coordinates?.coordinate_space;
  const W = space?.width ?? 512;
  const H = space?.height ?? 512;
  const hair = polygons(coordinates?.hair_segments);
  const bald = polygons(coordinates?.bald_segments);

  const clampX = (x: number) => Math.max(0, Math.min(widthRef.current, x));

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        // Only claim horizontal drags so vertical scrolling still works.
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderGrant: e => divX.setValue(clampX(e.nativeEvent.pageX - offsetX.current)),
        onPanResponderMove: (_e, g) => divX.setValue(clampX(g.moveX - offsetX.current)),
      }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  function onLayout(e: { nativeEvent: { layout: { width: number } } }) {
    const width = e.nativeEvent.layout.width;
    widthRef.current = width;
    setW(width);
    divX.setValue(width / 2);
    containerRef.current?.measureInWindow(x => {
      offsetX.current = x;
    });
  }

  return (
    <View ref={containerRef} style={styles.box} onLayout={onLayout} {...pan.panHandlers}>
      {/* base = original photo */}
      <Image source={{ uri: photoUri }} style={styles.img} resizeMode="stretch" />
      <View style={[styles.label, styles.labelRight]}>
        <Text style={styles.labelText}>Before</Text>
      </View>

      {/* analyzed side, clipped to the divider (Animated width = smooth wipe) */}
      {w > 0 && (
        <Animated.View style={[styles.clip, { width: divX }]}>
          <Image source={{ uri: photoUri }} style={{ width: w, height: w }} resizeMode="stretch" />
          <Svg style={styles.svg} width={w} height={w} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            {hair.map((pts, i) => (
              <Polygon key={`h${i}`} points={pts} fill="rgba(34,211,238,0.32)" stroke="rgba(34,211,238,0.9)" strokeWidth={2} strokeLinejoin="round" />
            ))}
            {bald.map((pts, i) => (
              <Polygon key={`b${i}`} points={pts} fill="rgba(239,68,68,0.16)" stroke={colors.danger} strokeWidth={3} strokeLinejoin="round" />
            ))}
          </Svg>
          <View style={[styles.label, styles.labelLeft]}>
            <Text style={styles.labelText}>AI</Text>
          </View>
        </Animated.View>
      )}

      {/* divider + handle */}
      {w > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[styles.divider, { transform: [{ translateX: Animated.subtract(divX, 1) }] }]}
        >
          <View style={styles.handle}>
            <Ionicons name="chevron-back" size={12} color="#0B0F14" />
            <Ionicons name="chevron-forward" size={12} color="#0B0F14" />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', aspectRatio: 1, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.cardElev },
  img: { width: '100%', height: '100%' },
  clip: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
  svg: { position: 'absolute', left: 0, top: 0 },

  divider: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  handle: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#fff',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },

  label: { position: 'absolute', top: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.6)' },
  labelLeft: { left: 8 },
  labelRight: { right: 8 },
  labelText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
