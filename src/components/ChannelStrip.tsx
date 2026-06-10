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

const LONG_PRESS_MS = 800;

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
    sendCoughOn,
    sendCoughOff,
    sendFader,
    handleMenuPress,
    handleMenuRotate,
    state,
    busNames,
    mainMenuItems,
  } = useSurface();

  const chId = channel.channelId;

  // PFL button: short press = PFL toggle, long press = hold talkback
  const pflTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pflLongFired = useRef(false);

  const onPflPressIn = useCallback(() => {
    pflLongFired.current = false;
    pflTimer.current = setTimeout(() => {
      pflLongFired.current = true;
      sendTalkbackOn(chId);
      Vibration.vibrate(40);
    }, LONG_PRESS_MS);
  }, [chId, sendTalkbackOn]);

  const onPflPressOut = useCallback(() => {
    if (pflTimer.current) { clearTimeout(pflTimer.current); pflTimer.current = null; }
    if (pflLongFired.current) {
      sendTalkbackOff(chId);
      pflLongFired.current = false;
    } else {
      sendPflPress(chId);
      Vibration.vibrate(20);
    }
  }, [chId, sendPflPress, sendTalkbackOff]);

  // Encoder press: short press = menu, long press = hold cough
  const encTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const encLongFired = useRef(false);

  const onEncoderPressIn = useCallback(() => {
    encLongFired.current = false;
    encTimer.current = setTimeout(() => {
      encLongFired.current = true;
      sendCoughOn(chId);
      Vibration.vibrate(40);
    }, LONG_PRESS_MS);
  }, [chId, sendCoughOn]);

  const onEncoderPressOut = useCallback((wasDrag: boolean) => {
    if (encTimer.current) { clearTimeout(encTimer.current); encTimer.current = null; }
    if (wasDrag) {
      encLongFired.current = false;
      return;
    }
    if (encLongFired.current) {
      sendCoughOff(chId);
      encLongFired.current = false;
    } else {
      handleMenuPress(chId);
      Vibration.vibrate(20);
    }
  }, [chId, handleMenuPress, sendCoughOff]);

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

  const onFaderChange = useCallback((v: number) => {
    sendFader(chId, v);
  }, [chId, sendFader]);

  const onOnPress = useCallback(() => {
    sendOnPress(chId);
    Vibration.vibrate(20);
  }, [chId, sendOnPress]);

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
          onPressIn={onEncoderPressIn}
          onPressOut={onEncoderPressOut}
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
          style={[styles.btn, styles.btnPfl, (channel.pfl || channel.talkback) && styles.btnPflActive]}
          onPressIn={onPflPressIn}
          onPressOut={onPflPressOut}
          activeOpacity={0.7}
        >
          <Text style={[styles.btnLabel, (channel.pfl || channel.talkback) && styles.btnLabelActive]}>
            {channel.talkback ? 'TB' : 'PFL'}
          </Text>
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
    sendCoughOn,
    sendCoughOff,
    sendFader,
    handleMenuPress,
    handleMenuRotate,
    state,
    busNames,
    mainMenuItems,
  } = useSurface();

  const chId = channel.channelId;

  // PFL long-press = talkback
  const pflTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pflLongFired = useRef(false);
  const onPflIn = () => {
    pflLongFired.current = false;
    pflTimer.current = setTimeout(() => {
      pflLongFired.current = true;
      sendTalkbackOn(chId);
      Vibration.vibrate(40);
    }, LONG_PRESS_MS);
  };
  const onPflOut = () => {
    if (pflTimer.current) { clearTimeout(pflTimer.current); pflTimer.current = null; }
    if (pflLongFired.current) { sendTalkbackOff(chId); pflLongFired.current = false; }
    else { sendPflPress(chId); Vibration.vibrate(20); }
  };

  // Encoder long-press = cough
  const encTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const encLongFired = useRef(false);
  const onEncIn = () => {
    encLongFired.current = false;
    encTimer.current = setTimeout(() => {
      encLongFired.current = true;
      sendCoughOn(chId);
      Vibration.vibrate(40);
    }, LONG_PRESS_MS);
  };
  const onEncOut = (wasDrag: boolean) => {
    if (encTimer.current) { clearTimeout(encTimer.current); encTimer.current = null; }
    if (wasDrag) { encLongFired.current = false; return; }
    if (encLongFired.current) { sendCoughOff(chId); encLongFired.current = false; }
    else { handleMenuPress(chId); Vibration.vibrate(20); }
  };

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
        onPressIn={onEncIn}
        onPressOut={onEncOut}
        size={36}
      />

      <View style={styles.compactBtns}>
        <TouchableOpacity
          style={[styles.btnCompact, channel.onAir && styles.btnOnActive]}
          onPress={() => sendOnPress(chId)}
        >
          <Text style={styles.btnCompactText}>{channel.onAir ? 'ON' : 'off'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnCompact, (channel.pfl || channel.talkback) && styles.btnPflActive]}
          onPressIn={onPflIn}
          onPressOut={onPflOut}
        >
          <Text style={styles.btnCompactText}>{channel.talkback ? 'TB' : 'PFL'}</Text>
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
