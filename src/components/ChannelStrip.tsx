import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
} from 'react-native';
import { ChannelState } from '../context/SurfaceContext';
import { useSurface } from '../context/SurfaceContext';
import LcdDisplay from './LcdDisplay';
import VuMeter from './VuMeter';
import MotorFader from './MotorFader';
import RotaryEncoder from './RotaryEncoder';
import { Colors } from '../theme/colors';

interface Props {
  channel: ChannelState;
  compact?: boolean;
}

export default function ChannelStrip({ channel, compact = false }: Props) {
  const {
    sendOnPress,
    sendPflPress,
    sendTalkbackOn,
    sendTalkbackOff,
    sendFader,
    handleMenuPress,
    handleMenuRotate,
    state,
    busNames,
    mainMenuItems,
  } = useSurface();

  const chId = channel.channelId;
  const talkbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onFaderChange = useCallback((v: number) => {
    sendFader(chId, v);
  }, [chId, sendFader]);

  const onTalkbackPressIn = useCallback(() => {
    sendTalkbackOn(chId);
    Vibration.vibrate(30);
  }, [chId, sendTalkbackOn]);

  const onTalkbackPressOut = useCallback(() => {
    sendTalkbackOff(chId);
  }, [chId, sendTalkbackOff]);

  const onEncoderRotate = useCallback((delta: number) => {
    handleMenuRotate(chId, delta);
  }, [chId, handleMenuRotate]);

  const onEncoderPress = useCallback(() => {
    handleMenuPress(chId);
    Vibration.vibrate(20);
  }, [chId, handleMenuPress]);

  const onOnPress = useCallback(() => {
    sendOnPress(chId);
    Vibration.vibrate(20);
  }, [chId, sendOnPress]);

  const onPflPress = useCallback(() => {
    sendPflPress(chId);
    Vibration.vibrate(20);
  }, [chId, sendPflPress]);

  const inMenu = channel.menuState !== 'HOME';

  if (compact) {
    return <ChannelStripCompact channel={channel} />;
  }

  return (
    <View style={styles.strip}>
      {/* LCD */}
      <LcdDisplay
        channel={channel}
        sources={state.sources}
        rinTracks={state.rinTracks}
        mainMenuItems={mainMenuItems}
        busNames={busNames}
      />

      {/* Encoder */}
      <View style={styles.encoderRow}>
        <RotaryEncoder
          onRotate={onEncoderRotate}
          onPress={onEncoderPress}
          label={inMenu ? '▶ Menu' : 'MENU'}
          size={44}
        />
        <View style={styles.menuStateBadge}>
          <Text style={styles.menuStateText}>{channel.menuState}</Text>
        </View>
      </View>

      {/* Buttons row */}
      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={[styles.btn, styles.btnOn, channel.onAir && styles.btnOnActive]}
          onPress={onOnPress}
          activeOpacity={0.7}
        >
          <Text style={[styles.btnLabel, channel.onAir && styles.btnLabelActive]}>
            {channel.onAir ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnPfl, channel.pfl && styles.btnPflActive]}
          onPress={onPflPress}
          activeOpacity={0.7}
        >
          <Text style={[styles.btnLabel, channel.pfl && styles.btnLabelActive]}>PFL</Text>
        </TouchableOpacity>
      </View>

      {/* Talkback button */}
      <TouchableOpacity
        style={[styles.btn, styles.btnTb, channel.talkback && styles.btnTbActive]}
        onPressIn={onTalkbackPressIn}
        onPressOut={onTalkbackPressOut}
        activeOpacity={0.7}
      >
        <Text style={[styles.btnLabel, channel.talkback && styles.btnLabelActive]}>TB</Text>
      </TouchableOpacity>

      {/* Fader + VU */}
      <View style={styles.faderSection}>
        <VuMeter level={channel.meter} height={140} width={10} />
        <MotorFader
          value={channel.fader}
          onChange={onFaderChange}
          height={140}
          width={28}
        />
      </View>

      {/* Channel label at bottom */}
      <Text style={styles.channelLabel}>{channel.label}</Text>
    </View>
  );
}

// ─── Compact strip (for 8-channel landscape view) ────────────────────────────

function ChannelStripCompact({ channel }: { channel: ChannelState }) {
  const {
    sendOnPress,
    sendPflPress,
    sendTalkbackOn,
    sendTalkbackOff,
    sendFader,
    handleMenuPress,
    handleMenuRotate,
    state,
    busNames,
    mainMenuItems,
  } = useSurface();

  const chId = channel.channelId;

  return (
    <View style={styles.stripCompact}>
      <LcdDisplay
        channel={channel}
        sources={state.sources}
        rinTracks={state.rinTracks}
        mainMenuItems={mainMenuItems}
        busNames={busNames}
      />

      <RotaryEncoder
        onRotate={(d) => handleMenuRotate(chId, d)}
        onPress={() => handleMenuPress(chId)}
        size={36}
      />

      <View style={styles.compactBtns}>
        <TouchableOpacity
          style={[styles.btnCompact, channel.onAir  && styles.btnOnActive]}
          onPress={() => sendOnPress(chId)}
        >
          <Text style={styles.btnCompactText}>{channel.onAir ? 'ON' : 'off'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnCompact, channel.pfl && styles.btnPflActive]}
          onPress={() => sendPflPress(chId)}
        >
          <Text style={styles.btnCompactText}>PFL</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnCompact, styles.btnTb, channel.talkback && styles.btnTbActive]}
          onPressIn={() => sendTalkbackOn(chId)}
          onPressOut={() => sendTalkbackOff(chId)}
        >
          <Text style={styles.btnCompactText}>TB</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.compactFader}>
        <VuMeter level={channel.meter} height={110} width={8} />
        <MotorFader value={channel.fader} onChange={(v) => sendFader(chId, v)} height={110} width={22} />
      </View>

      <Text style={styles.channelLabelSmall}>{channel.label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  strip: {
    width: 88,
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 4,
    paddingVertical: 6,
    alignItems: 'center',
    gap: 4,
  },
  encoderRow: {
    alignItems: 'center',
    gap: 2,
  },
  menuStateBadge: {
    backgroundColor: Colors.surface2,
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  menuStateText: {
    color: Colors.textFaint,
    fontSize: 7,
    textTransform: 'uppercase',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 3,
    width: '100%',
  },
  btn: {
    flex: 1,
    height: 24,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  btnOn: {
    backgroundColor: Colors.surface2,
    borderColor: Colors.onAirDim,
  },
  btnOnActive: {
    backgroundColor: Colors.onAir,
    borderColor: Colors.onAir,
  },
  btnPfl: {
    backgroundColor: Colors.surface2,
    borderColor: Colors.pflDim,
  },
  btnPflActive: {
    backgroundColor: Colors.pfl,
    borderColor: Colors.pfl,
  },
  btnTb: {
    width: '100%',
    height: 22,
    borderRadius: 4,
    backgroundColor: Colors.surface2,
    borderColor: Colors.talkbackDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  btnTbActive: {
    backgroundColor: Colors.talkback,
    borderColor: Colors.talkback,
  },
  btnLabel: {
    color: Colors.textDim,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  btnLabelActive: {
    color: '#fff',
  },
  faderSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    flex: 1,
  },
  channelLabel: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Compact
  stripCompact: {
    width: 72,
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 3,
    paddingVertical: 4,
    alignItems: 'center',
    gap: 3,
  },
  compactBtns: {
    flexDirection: 'row',
    gap: 2,
    width: '100%',
  },
  btnCompact: {
    flex: 1,
    height: 20,
    borderRadius: 3,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCompactText: {
    color: Colors.textDim,
    fontSize: 7,
    fontWeight: '700',
  },
  compactFader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    flex: 1,
  },
  channelLabelSmall: {
    color: Colors.text,
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
