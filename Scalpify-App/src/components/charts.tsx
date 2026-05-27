import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Polyline, Stop } from 'react-native-svg';
import { colors } from '../theme';

// Circular progress ring rendered with SVG. `pct` is 0-100.
export function ProgressRing({
  pct,
  size = 130,
  stroke = 10,
  color = colors.primary,
  trackColor = colors.cardElev,
  children,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, pct));
  const dash = circumference * (1 - clamped / 100);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dash}
          strokeLinecap="round"
          // start at 12 o'clock
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>{children}</View>
    </View>
  );
}

// Filled smooth line chart with grid baseline + data dots.
export function SparkLine({
  data,
  height = 120,
  width = 280,
  color = colors.primary,
  gradient = true,
  style,
}: {
  data: number[];
  height?: number;
  width?: number;
  color?: string;
  gradient?: boolean;
  style?: ViewStyle;
}) {
  if (!data || data.length === 0) {
    return (
      <View style={[{ height, justifyContent: 'center', alignItems: 'center' }, style]}>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>No data yet</Text>
      </View>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padY = 8;
  const usableH = height - padY * 2;
  const step = data.length > 1 ? width / (data.length - 1) : width;

  const points = data.map((v, i) => {
    const x = i * step;
    const y = padY + usableH * (1 - (v - min) / range);
    return { x, y };
  });

  const polyPoints = points.map(p => `${p.x},${p.y}`).join(' ');
  // Fill path: start at first point, line through all, then down to baseline and back
  const fillPath = `M${points[0].x},${points[0].y} ${points.map(p => `L${p.x},${p.y}`).join(' ')} L${points[points.length - 1].x},${height} L${points[0].x},${height} Z`;

  return (
    <View style={[{ height, width }, style]}>
      <Svg width={width} height={height}>
        {gradient && (
          <Defs>
            <LinearGradient id="gradFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity="0.22" />
              <Stop offset="1" stopColor={color} stopOpacity="0" />
            </LinearGradient>
          </Defs>
        )}
        {gradient && <Path d={fillPath} fill="url(#gradFill)" />}
        <Polyline
          points={polyPoints}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 4 : 2.5}
            fill={i === points.length - 1 ? color : '#fff'}
            stroke={color}
            strokeWidth={i === points.length - 1 ? 0 : 1.5}
          />
        ))}
      </Svg>
    </View>
  );
}

// Vertical bar chart for Norwood progression (active bar gets primary color).
export function NorwoodBars({
  active,
  height = 64,
}: {
  active: string;
  height?: number;
}) {
  // Heights tuned to convey progression: I (smallest) → VII (tallest).
  const heights = [0.30, 0.40, 0.55, 0.70, 0.80, 0.92, 1.0];
  const labels = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const activeIdx = labels.findIndex(l => l.toUpperCase() === active.toUpperCase());

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 8, paddingHorizontal: 4 }}>
      {labels.map((l, i) => {
        const on = i === activeIdx;
        return (
          <View key={l} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <View
              style={{
                height: height * heights[i],
                width: '100%',
                borderRadius: 3,
                backgroundColor: on ? colors.primary : '#C8D7E8',
              }}
            />
            <Text
              style={{
                fontSize: 10,
                fontWeight: on ? '800' : '500',
                color: on ? colors.primary : colors.textDim,
              }}
            >
              {l}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
