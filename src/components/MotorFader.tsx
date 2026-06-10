import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
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
  const knobY  = (1 - value) * trackH;

  // Track the single touch that owns this fader
  const touchId  = useRef<string | null>(null);
  const startY   = useRef(0);
  const startVal = useRef(value);

  const faderColor = value > 0.85
    ? Colors.faderHigh
    : value > 0.65
      ? Colors.faderMid
      : Colors.faderFill;

  return (
    <View
      style={[styles.container, { height, width }]}
      // Use native touch handlers — each fader owns one identifier so
      // multiple faders can be dragged simultaneously (true multitouch).
      onStartShouldSetResponder={() => !disabled}
      onMoveShouldSetResponder={() => !disabled}
      onResponderGrant={(e) => {
        const t = String(e.nativeEvent.identifier);
        touchId.current  = t;
        startY.current   = e.nativeEvent.pageY;
        startVal.current = value;
      }}
      onResponderMove={(e) => {
        if (String(e.nativeEvent.identifier) !== touchId.current) return;
        const dy     = e.nativeEvent.pageY - startY.current;
        const delta  = -dy / trackH;
        const newVal = Math.max(0, Math.min(1, startVal.current + delta));
        onChange(newVal);
      }}
      onResponderRelease={(e) => {
        if (String(e.nativeEvent.identifier) !== touchId.current) return;
        touchId.current = null;
        const dy     = e.nativeEvent.pageY - startY.current;
        const delta  = -dy / trackH;
        const newVal = Math.max(0, Math.min(1, startVal.current + delta));
        onChangeEnd?.(newVal);
      }}
      onResponderTerminate={() => { touchId.current = null; }}
    >
      {/* Track */}
      <View style={styles.track}>
        <View
          style={[styles.fill, { height: trackH - knobY, backgroundColor: faderColor }]}
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
