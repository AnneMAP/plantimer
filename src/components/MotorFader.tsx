import React, { useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { Colors } from '../theme/colors';

interface Props {
  value: number;       // 0.0–1.0
  onChange: (v: number) => void;
  onChangeEnd?: (v: number) => void;
  height?: number;
  width?: number;
  disabled?: boolean;
}

const KNOB_H = 28;

export default function MotorFader({
  value,
  onChange,
  onChangeEnd,
  height = 180,
  width = 32,
  disabled = false,
}: Props) {
  const trackH = height - KNOB_H;
  const knobY = (1 - value) * trackH;
  const startY = useRef(0);
  const startVal = useRef(value);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder:  () => !disabled,
      onPanResponderGrant: (_: GestureResponderEvent, gs: PanResponderGestureState) => {
        startY.current   = gs.y0;
        startVal.current = value;
      },
      onPanResponderMove: (_: GestureResponderEvent, gs: PanResponderGestureState) => {
        const dy     = gs.moveY - startY.current;
        const delta  = -dy / trackH;
        const newVal = Math.max(0, Math.min(1, startVal.current + delta));
        onChange(newVal);
      },
      onPanResponderRelease: (_: GestureResponderEvent, gs: PanResponderGestureState) => {
        const dy     = gs.moveY - startY.current;
        const delta  = -dy / trackH;
        const newVal = Math.max(0, Math.min(1, startVal.current + delta));
        onChangeEnd?.(newVal);
      },
    }),
  ).current;

  const faderColor = value > 0.85 ? Colors.faderHigh : value > 0.65 ? Colors.faderMid : Colors.faderFill;

  return (
    <View style={[styles.container, { height, width }]} {...panResponder.panHandlers}>
      {/* Track */}
      <View style={styles.track}>
        {/* Fill bar from bottom to knob */}
        <View
          style={[
            styles.fill,
            { height: trackH - knobY, backgroundColor: faderColor },
          ]}
        />
      </View>
      {/* Knob */}
      <View style={[styles.knob, { top: knobY }]}>
        <View style={styles.knobLine} />
        <View style={styles.knobLine} />
        <View style={styles.knobLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
  },
  track: {
    position: 'absolute',
    top: KNOB_H / 2,
    bottom: KNOB_H / 2,
    width: 4,
    backgroundColor: Colors.faderBg,
    borderRadius: 2,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  fill: {
    width: '100%',
    borderRadius: 2,
  },
  knob: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: KNOB_H,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#555',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  knobLine: {
    width: '60%',
    height: 1,
    backgroundColor: '#888',
    borderRadius: 1,
  },
});
