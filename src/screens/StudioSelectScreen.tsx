import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  StatusBar,
} from 'react-native';
import { fetchStudios, makeWsUrl, StudioInfo } from '../services/tunnelDiscovery';
import { useSurface } from '../context/SurfaceContext';
import { Colors } from '../theme/colors';

interface Props {
  onConnected: () => void;
}

export default function StudioSelectScreen({ onConnected }: Props) {
  const { connect, state } = useSurface();
  const [studios, setStudios] = useState<StudioInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);

  const loadStudios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchStudios(true);
      setStudios(list);
      if (list.length === 0) setError('Geen studio\'s gevonden. Controleer of de server online is.');
    } catch (e: any) {
      setError(`Fout bij ophalen: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStudios(); }, [loadStudios]);

  useEffect(() => {
    if (state.wsConnected && connecting) {
      setConnecting(null);
      onConnected();
    }
  }, [state.wsConnected, connecting, onConnected]);

  const selectStudio = useCallback((studio: StudioInfo) => {
    const wsUrl = makeWsUrl(studio);
    setConnecting(studio.studio_id);
    connect(wsUrl, studio.studio_id);
  }, [connect]);

  const connectManual = useCallback(() => {
    const url = manualUrl.trim();
    if (!url) { Alert.alert('Voer een WebSocket URL in'); return; }
    const wsUrl = url.startsWith('ws') ? url : `ws://${url}`;
    setConnecting('manual');
    connect(wsUrl, 'manual');
  }, [manualUrl, connect]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      <View style={styles.header}>
        <Text style={styles.title}>DSP Core Surface</Text>
        <Text style={styles.subtitle}>Selecteer studio</Text>
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Verbinding zoeken...</Text>
        </View>
      )}

      {!loading && error && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.btn} onPress={loadStudios}>
            <Text style={styles.btnText}>Opnieuw proberen</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && studios.length > 0 && (
        <FlatList
          data={studios}
          keyExtractor={(s: StudioInfo) => s.studio_id}
          contentContainerStyle={styles.list}
          renderItem={({ item }: { item: StudioInfo }) => {
            const isConnecting = connecting === item.studio_id;
            return (
              <TouchableOpacity
                style={styles.studioCard}
                onPress={() => selectStudio(item)}
                disabled={!!connecting}
              >
                <View style={styles.studioRow}>
                  <View style={styles.studioInfo}>
                    <Text style={styles.studioName}>{item.studio_id}</Text>
                    <Text style={styles.studioUrl}>{item.websocket_url}</Text>
                    {item.updated && (
                      <Text style={styles.studioUpdated}>
                        Bijgewerkt: {new Date(item.updated).toLocaleString('nl-NL')}
                      </Text>
                    )}
                  </View>
                  {isConnecting ? (
                    <ActivityIndicator size="small" color={Colors.accent} />
                  ) : (
                    <View style={styles.connectBadge}>
                      <Text style={styles.connectBadgeText}>VERBINDEN</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <View style={styles.manualSection}>
        <TouchableOpacity
          style={styles.manualToggle}
          onPress={() => setShowManual((v: boolean) => !v)}
        >
          <Text style={styles.manualToggleText}>
            {showManual ? '▲ Handmatig adres' : '▼ Handmatig adres'}
          </Text>
        </TouchableOpacity>

        {showManual && (
          <View style={styles.manualRow}>
            <TextInput
              style={styles.input}
              value={manualUrl}
              onChangeText={setManualUrl}
              placeholder="ws://192.168.1.x:8750 of wss://xxxx.trycloudflare.com"
              placeholderTextColor={Colors.textDim}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <TouchableOpacity
              style={[styles.btn, styles.btnConnect]}
              onPress={connectManual}
              disabled={!!connecting}
            >
              {connecting === 'manual'
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.btnText}>Verbinden</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textDim,
    marginTop: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: Colors.textDim,
    fontSize: 14,
    marginTop: 12,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  studioCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  studioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  studioInfo: {
    flex: 1,
  },
  studioName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  studioUrl: {
    fontSize: 12,
    color: Colors.textDim,
    marginTop: 2,
  },
  studioUpdated: {
    fontSize: 11,
    color: Colors.textFaint,
    marginTop: 2,
  },
  connectBadge: {
    backgroundColor: Colors.accent,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 12,
  },
  connectBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  manualSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 16,
  },
  manualToggle: {
    paddingVertical: 8,
  },
  manualToggleText: {
    color: Colors.textDim,
    fontSize: 13,
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btn: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  btnConnect: {
    minWidth: 100,
    alignItems: 'center',
  },
});
