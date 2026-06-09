import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Modal,
} from 'react-native';
import { useSurface } from '../context/SurfaceContext';
import ChannelStrip from '../components/ChannelStrip';
import { Colors } from '../theme/colors';

interface Props {
  onDisconnect: () => void;
}

export default function MixerScreen({ onDisconnect }: Props) {
  const { state, disconnect, send } = useSurface();
  const [showSettings, setShowSettings] = useState(false);
  const [bankOffset, setBankOffset] = useState(0);

  const BANK_SIZE = 8;
  const channelIds = state.channelOrder;
  const bankStart = bankOffset * BANK_SIZE;
  const visibleIds = channelIds.slice(bankStart, bankStart + BANK_SIZE);
  const totalBanks = Math.ceil(channelIds.length / BANK_SIZE);

  const handleDisconnect = useCallback(() => {
    disconnect();
    onDisconnect();
  }, [disconnect, onDisconnect]);

  const requestFullState = useCallback(() => {
    send({ event: 'get_full_state' });
  }, [send]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} hidden />

      {/* Header bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.wsIndicator, { backgroundColor: state.wsConnected ? Colors.success : Colors.danger }]} />
          <Text style={styles.studioLabel}>{state.studioId || 'DSP Core'}</Text>
        </View>

        {/* Bank selector */}
        {totalBanks > 1 && (
          <View style={styles.bankRow}>
            {Array.from({ length: totalBanks }).map((_, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.bankBtn, i === bankOffset && styles.bankBtnActive]}
                onPress={() => setBankOffset(i)}
              >
                <Text style={[styles.bankBtnText, i === bankOffset && styles.bankBtnTextActive]}>
                  {i + 1}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={requestFullState}>
            <Text style={styles.iconBtnText}>⟳</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowSettings(true)}>
            <Text style={styles.iconBtnText}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Channel strips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strips}
        scrollEventThrottle={16}
      >
        {visibleIds.map((id: string) => {
          const ch = state.channels[id];
          if (!ch) return null;
          return (
            <View key={id} style={styles.stripWrapper}>
              <ChannelStrip channel={ch} compact={visibleIds.length > 6} />
            </View>
          );
        })}
        {visibleIds.length === 0 && (
          <View style={styles.noChannels}>
            <Text style={styles.noChannelsText}>Geen kanalen ontvangen.</Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={requestFullState}>
              <Text style={styles.refreshBtnText}>Vernieuwen</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Connection lost banner */}
      {!state.wsConnected && (
        <View style={styles.disconnectedBanner}>
          <Text style={styles.disconnectedText}>⚠ Verbinding verbroken — herverbinden...</Text>
        </View>
      )}

      {/* Settings modal */}
      <Modal visible={showSettings} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Instellingen</Text>
            <Text style={styles.modalInfo}>Studio: {state.studioId}</Text>
            <Text style={styles.modalInfo}>WS: {state.wsUrl}</Text>
            <Text style={styles.modalInfo}>
              Kanalen: {channelIds.length}
            </Text>
            <Text style={styles.modalInfo}>
              Status: {state.wsConnected ? '🟢 Verbonden' : '🔴 Niet verbonden'}
            </Text>

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.btn, styles.btnDanger]}
                onPress={() => { setShowSettings(false); handleDisconnect(); }}
              >
                <Text style={styles.btnText}>Koppel los</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={() => setShowSettings(false)}
              >
                <Text style={styles.btnText}>Sluiten</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
    flexDirection: 'column',
  },
  header: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  wsIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  studioLabel: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bankRow: {
    flexDirection: 'row',
    gap: 4,
  },
  bankBtn: {
    width: 24,
    height: 22,
    borderRadius: 4,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankBtnActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  bankBtnText: {
    color: Colors.textDim,
    fontSize: 10,
    fontWeight: '700',
  },
  bankBtnTextActive: {
    color: '#fff',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    width: 28,
    height: 26,
    borderRadius: 4,
    backgroundColor: Colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: {
    color: Colors.textDim,
    fontSize: 14,
  },
  stripWrapper: {
    flexDirection: 'row',
  },
  strips: {
    flexDirection: 'row',
    flexGrow: 1,
    paddingVertical: 0,
  },
  noChannels: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  noChannelsText: {
    color: Colors.textDim,
    fontSize: 14,
  },
  refreshBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  refreshBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  disconnectedBanner: {
    backgroundColor: Colors.onAirDim,
    padding: 6,
    alignItems: 'center',
  },
  disconnectedText: {
    color: '#ffaaaa',
    fontSize: 11,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBox: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    width: 320,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  modalInfo: {
    color: Colors.textDim,
    fontSize: 13,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  btn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnDanger: {
    backgroundColor: Colors.danger,
  },
  btnPrimary: {
    backgroundColor: Colors.accent,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
