import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../theme/colors';

interface Props {
  onRotate: (delta: number) => void;
  onPress: () => void;
  label?: string;
  size?: number;
}

const ROTATION_THRESHOLD = 8;  // px per step

export default function RotaryEncoder({ onRotate, onPress, label = '', size = 52 }: Props) {
  const lastY = useRef(0);
  const accumulated = useRef(0);
  const isDragging = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: (_: GestureResponderEvent, gs: PanResponderGestureState) => {
        lastY.current = gs.y0;
        accumulated.current = 0;
        isDragging.current = false;
      },
      onPanResponderMove: (_: GestureResponderEvent, gs: PanResponderGestureState) => {
        const dy = lastY.current - gs.moveY;
        accumulated.current += dy;
        lastY.current = gs.moveY;

        if (Math.abs(accumulated.current) >= ROTATION_THRESHOLD) {
          const steps = Math.round(accumulated.current / ROTATION_THRESHOLD);
          if (steps !== 0) {
            isDragging.current = true;
            onRotate(steps);
            accumulated.current -= steps * ROTATION_THRESHOLD;
          }
        }
      },
      onPanResponderRelease: () => {
        if (!isDragging.current) {
          onPress();
        }
        isDragging.current = false;
      },
    }),
  ).current;

  return (
    <View style={[styles.wrapper, { width: size, height: size + 16 }]}>
      <View
        style={[styles.knob, { width: size, height: size, borderRadius: size / 2 }]}
        {...panResponder.panHandlers}
      >
        {/* Indicator dot */}
        <View style={[styles.dot, { top: 4 }]} />
        {/* Grip lines */}
        {[0, 1, 2].map(i => (
          <View key={i} style={[styles.grip, { top: size / 2 - 5 + i * 5 }]} />
        ))}
      </View>
      {label ? (
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  knob: {
    backgroundColor: Colors.encoderBg,
    borderWidth: 2,
    borderColor: Colors.encoderRing,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: Colors.encoderRing,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  dot: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.encoderRing,
  },
  grip: {
    position: 'absolute',
    width: '55%',
    height: 2,
    backgroundColor: '#334',
    borderRadius: 1,
  },
  label: {
    color: Colors.textDim,
    fontSize: 8,
    marginTop: 2,
    textAlign: 'center',
  },
});
