import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

interface Props {
  level: number;  // 0.0–1.0
  horizontal?: boolean;
  height?: number;
  width?: number;
}

const SEGMENTS = 16;

export default function VuMeter({ level, horizontal = false, height = 120, width = 12 }: Props) {
  const filled = Math.round(Math.min(1, Math.max(0, level)) * SEGMENTS);

  if (horizontal) {
    return (
      <View style={[styles.hContainer, { height: width, width: height }]}>
        {Array.from({ length: SEGMENTS }).map((_, i) => {
          const active = i < filled;
          const ratio = i / SEGMENTS;
          let color = Colors.vuGreen;
          if (ratio > 0.85)      color = Colors.vuRed;
          else if (ratio > 0.65) color = Colors.vuYellow;
          return (
            <View
              key={i}
              style={[
                styles.hSeg,
                { backgroundColor: active ? color : Colors.faderBg },
              ]}
            />
          );
        })}
      </View>
    );
  }

  return (
    <View style={[styles.vContainer, { height, width }]}>
      {Array.from({ length: SEGMENTS })
        .map((_, i) => {
          const segIdx = SEGMENTS - 1 - i;
          const active = segIdx < filled;
          const ratio = segIdx / SEGMENTS;
          let color = Colors.vuGreen;
          if (ratio > 0.85)      color = Colors.vuRed;
          else if (ratio > 0.65) color = Colors.vuYellow;
          return (
            <View
              key={i}
              style={[
                styles.vSeg,
                { backgroundColor: active ? color : Colors.faderBg },
              ]}
            />
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  vContainer: {
    flexDirection: 'column',
    gap: 1,
    justifyContent: 'flex-end',
  },
  vSeg: {
    flex: 1,
    borderRadius: 1,
  },
  hContainer: {
    flexDirection: 'row',
    gap: 1,
    alignItems: 'center',
  },
  hSeg: {
    flex: 1,
    borderRadius: 1,
  },
});
