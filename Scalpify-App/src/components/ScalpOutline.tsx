import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { colors } from '../theme';
import type { ScanCoordinates } from '../api';

/**
 * Shows the scan photo with the detected bald region's border drawn on top.
 *
 * The server analyses a 512×512 *stretched* version of the photo and returns the
 * boundary polygons in that space, so we display the photo stretched into a square
 * box and let the SVG viewBox map the 512-space points onto it 1:1 — keeping the
 * outline aligned with the scalp.
 */
export function ScalpOutline({
  photoUri,
  coordinates,
  show = true,
}: {
  photoUri: string;
  coordinates: ScanCoordinates;
  show?: boolean;
}) {
  const space = coordinates?.coordinate_space;
  const W = space?.width ?? 512;
  const H = space?.height ?? 512;
  const segments = coordinates?.bald_segments ?? [];

  const polygons = segments
    .map(s => s.simplified_boundary ?? s.boundary_points ?? [])
    .filter(pts => pts.length >= 3)
    .map(pts => pts.map(p => `${p.x},${p.y}`).join(' '));

  return (
    <View style={styles.box}>
      <Image source={{ uri: photoUri }} style={styles.img} resizeMode="stretch" />
      {show && polygons.length > 0 && (
        <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          {polygons.map((pts, i) => (
            <Polygon
              key={i}
              points={pts}
              fill="rgba(239,68,68,0.16)"
              stroke={colors.danger}
              strokeWidth={3}
              strokeLinejoin="round"
            />
          ))}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.cardElev,
  },
  img: { width: '100%', height: '100%' },
});
