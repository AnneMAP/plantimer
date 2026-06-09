import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { ChannelState, MenuState } from '../context/SurfaceContext';

interface Props {
  channel: ChannelState;
  sources: string[];
  rinTracks: string[];
  mainMenuItems: string[];
  busNames: string[];
}

export default function LcdDisplay({ channel, sources, rinTracks, mainMenuItems, busNames }: Props) {
  const lines = buildLines(channel, sources, rinTracks, mainMenuItems, busNames);

  return (
    <View style={styles.lcd}>
      {lines.map((line, i) => (
        <Text
          key={i}
          style={[styles.line, line.highlight && styles.lineHighlight, line.dim && styles.lineDim]}
          numberOfLines={1}
        >
          {line.text}
        </Text>
      ))}
    </View>
  );
}

interface LcdLine {
  text: string;
  highlight?: boolean;
  dim?: boolean;
}

function buildLines(
  ch: ChannelState,
  sources: string[],
  rinTracks: string[],
  mainMenuItems: string[],
  busNames: string[],
): LcdLine[] {
  switch (ch.menuState) {
    case 'HOME':
      return [
        { text: ch.label, highlight: true },
        { text: `SRC: ${ch.source}` },
        { text: `FADER: ${ch.fader < 0.001 ? '-inf' : `${(20 * Math.log10(ch.fader + 0.0001)).toFixed(1)} dB`}` },
        { text: ch.onAir ? '>>> ON AIR <<<' : 'OFF', highlight: ch.onAir, dim: !ch.onAir },
        ...(ch.pfl ? [{ text: 'PFL', highlight: false }] : []),
      ];

    case 'SOURCE_SELECT':
      return [
        { text: 'SELECT SOURCE:', highlight: true },
        ...sources.slice(0, 5).map((s, i) => ({
          text: `${i === ch.menuIndex ? '>' : ' '} ${s}`,
          highlight: i === ch.menuIndex,
        })),
      ];

    case 'MAIN':
      return [
        { text: `== ${ch.label} MENU ==`, highlight: true },
        ...mainMenuItems.map((item, i) => ({
          text: `${i === ch.menuIndex ? '>' : ' '} ${item}`,
          highlight: i === ch.menuIndex,
        })),
      ];

    case 'SRC':
      return [
        { text: '== SELECT SRC ==', highlight: true },
        ...sources.slice(0, 5).map((s, i) => ({
          text: `${i === ch.menuIndex ? '>' : ' '} ${s}`,
          highlight: i === ch.menuIndex,
        })),
      ];

    case 'GAIN':
      return [
        { text: '== GAIN ==', highlight: true },
        { text: `${ch.gain >= 0 ? '+' : ''}${ch.gain.toFixed(1)} dB`, highlight: true },
        { text: 'Draai om aan te passen', dim: true },
        { text: 'Druk: terug', dim: true },
      ];

    case 'EQ':
      return [
        { text: '== EQUALIZER ==', highlight: true },
        { text: `${ch.menuIndex === 0 ? '>' : ' '} LOW:  ${ch.eqLow >= 0 ? '+' : ''}${ch.eqLow.toFixed(1)} dB`, highlight: ch.menuIndex === 0 },
        { text: `${ch.menuIndex === 1 ? '>' : ' '} MID:  ${ch.eqMid >= 0 ? '+' : ''}${ch.eqMid.toFixed(1)} dB`, highlight: ch.menuIndex === 1 },
        { text: `${ch.menuIndex === 2 ? '>' : ' '} HIGH: ${ch.eqHigh >= 0 ? '+' : ''}${ch.eqHigh.toFixed(1)} dB`, highlight: ch.menuIndex === 2 },
      ];

    case 'COMP':
      return [
        { text: '== COMPRESSOR ==', highlight: true },
        { text: `${ch.menuIndex === 0 ? '>' : ' '} THR: ${ch.compThreshold.toFixed(0)} dB`, highlight: ch.menuIndex === 0 },
        { text: `${ch.menuIndex === 1 ? '>' : ' '} RAT: ${ch.compRatio.toFixed(1)}:1`, highlight: ch.menuIndex === 1 },
        { text: 'Druk: toggle/terug', dim: true },
      ];

    case 'BUS':
      return [
        { text: '== BUS ASSIGN ==', highlight: true },
        ...busNames.map((b, i) => {
          const active = ch.buses.includes(b);
          return {
            text: `${i === ch.menuIndex ? '>' : ' '} ${b.padEnd(4)} ${active ? '[ON]' : '[--]'}`,
            highlight: i === ch.menuIndex,
          };
        }),
      ];

    case 'RIN_SELECT':
      return [
        { text: 'SELECT RIN:', highlight: true },
        ...rinTracks.slice(0, 5).map((r, i) => ({
          text: `${i === ch.menuIndex ? '>' : ' '} ${r}`,
          highlight: i === ch.menuIndex,
        })),
      ];

    case 'WAIT_UI':
      return [
        { text: 'WACHTEN...', highlight: true },
        { text: `CH: ${ch.label}` },
        { text: 'Bevestig in Web UI', dim: true },
      ];

    default:
      return [{ text: ch.label }];
  }
}

const styles = StyleSheet.create({
  lcd: {
    backgroundColor: Colors.lcdBg,
    borderRadius: 4,
    padding: 4,
    minHeight: 70,
    borderWidth: 1,
    borderColor: '#1a3a1a',
  },
  line: {
    color: Colors.lcdText,
    fontSize: 9,
    fontFamily: 'monospace',
    lineHeight: 12,
  },
  lineHighlight: {
    color: '#86efac',
    fontWeight: '700',
  },
  lineDim: {
    color: Colors.lcdTextDim,
  },
});
