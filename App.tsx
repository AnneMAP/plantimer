import React, { useState, useCallback } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { SurfaceProvider } from './src/context/SurfaceContext';
import StudioSelectScreen from './src/screens/StudioSelectScreen';
import MixerScreen from './src/screens/MixerScreen';

type Screen = 'studio_select' | 'mixer';

export default function App() {
  const [screen, setScreen] = useState<Screen>('studio_select');

  const handleConnected = useCallback(() => setScreen('mixer'), []);
  const handleDisconnect = useCallback(() => setScreen('studio_select'), []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SurfaceProvider>
        {screen === 'studio_select' && (
          <StudioSelectScreen onConnected={handleConnected} />
        )}
        {screen === 'mixer' && (
          <MixerScreen onDisconnect={handleDisconnect} />
        )}
      </SurfaceProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
