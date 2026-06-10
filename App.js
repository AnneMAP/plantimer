import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Switch,
  TextInput,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Linking } from 'react-native';

// Stub implementation - native module will be injected during CI build
const PlanTimer = {
  wakeupAndUnlock: async () => { console.log('Stub: wakeupAndUnlock'); return true; },
  openApp: async (packageName) => { 
    console.log('Stub: openApp', packageName); 
    // Fallback to React Native Linking
    try {
      const canOpen = await Linking.canOpenURL(`package:${packageName}`);
      if (canOpen) {
        await Linking.openURL(`package:${packageName}`);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  },
  isDeviceLocked: async () => false,
  requestWakeLock: async () => false,
  releaseWakeLock: async () => false,
  isBatteryOptimizationEnabled: async () => false,
  requestBatteryOptimizationDisable: async () => false,
  canDrawOverlays: async () => false,
  requestOverlayPermission: async () => false,
  wakeupUnlockAndOpen: async (packageName) => {
    console.log('Stub: wakeupUnlockAndOpen', packageName);
    return PlanTimer.openApp(packageName);
  },
};

// Constants
const ALARM_TASK = 'PLAN_TIMER_ALARM_TASK';
const STORAGE_KEY = '@plantimer_schedules';
const STORAGE_TARGET_APP = '@plantimer_target_app';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

// Background task for checking alarms
TaskManager.defineTask(ALARM_TASK, async () => {
  try {
    const now = new Date();
    const schedulesJson = await AsyncStorage.getItem(STORAGE_KEY);
    const schedules = schedulesJson ? JSON.parse(schedulesJson) : [];
    
    for (const schedule of schedules) {
      if (!schedule.enabled) continue;
      
      const scheduleTime = new Date(schedule.time);
      const timeDiff = Math.abs(now - scheduleTime);
      
      // If within 1 minute of scheduled time, trigger alarm
      if (timeDiff < 60000 && now >= scheduleTime) {
        await triggerAlarm(schedule);
      }
    }
    
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

async function triggerAlarm(schedule) {
  // Trigger a high-priority notification that will wake the device
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'PlanTimer Alarm!',
      body: `Tijd om te unlocken - ${schedule.label || 'Geen label'}`,
      sound: 'alarm.mp3',
      priority: 'max',
      vibrate: [0, 500, 500, 500, 500, 500],
      data: { 
        action: 'UNLOCK_REQUEST',
        targetApp: schedule.targetApp,
        scheduleId: schedule.id 
      },
    },
    trigger: null, // Immediate
  });
}

export default function App() {
  const [schedules, setSchedules] = useState([]);
  const [targetApp, setTargetApp] = useState('com.mijneigenplan.app');
  const [newTime, setNewTime] = useState(new Date());
  const [newLabel, setNewLabel] = useState('');
  const [newTargetApp, setNewTargetApp] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  // Load saved data
  useEffect(() => {
    loadData();
    requestPermissions();
    registerBackgroundTask();
    
    // Listen for notification responses
    const subscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    
    return () => subscription.remove();
  }, []);

  const loadData = async () => {
    try {
      const [schedulesJson, savedTargetApp] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(STORAGE_TARGET_APP),
      ]);
      
      if (schedulesJson) {
        setSchedules(JSON.parse(schedulesJson));
      }
      if (savedTargetApp) {
        setTargetApp(savedTargetApp);
        setNewTargetApp(savedTargetApp);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const saveData = async (newSchedules) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSchedules));
      setSchedules(newSchedules);
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const saveTargetApp = async (appPackage) => {
    try {
      await AsyncStorage.setItem(STORAGE_TARGET_APP, appPackage);
      setTargetApp(appPackage);
    } catch (error) {
      console.error('Error saving target app:', error);
    }
  };

  const requestPermissions = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowCriticalAlerts: true,
        },
        android: {},
      });
      finalStatus = status;
    }
    
    setHasPermission(finalStatus === 'granted');
    
    if (finalStatus !== 'granted') {
      Alert.alert(
        'Permissie nodig',
        'Deze app heeft notificatie permissies nodig om timers te laten werken.'
      );
    }
  };

  const registerBackgroundTask = async () => {
    try {
      await BackgroundFetch.registerTaskAsync(ALARM_TASK, {
        minimumInterval: 60, // Check every minute
        stopOnTerminate: false,
        startOnBoot: true,
      });
    } catch (error) {
      console.log('Background task registration error (may already be registered):', error);
    }
  };

  const handleNotificationResponse = async (response) => {
    const data = response.notification.request.content.data;
    
    if (data?.action === 'UNLOCK_REQUEST') {
      // Try to open the target app
      await openTargetApp(data.targetApp || targetApp);
    }
  };

  const openTargetApp = async (packageName) => {
    try {
      if (Platform.OS === 'android') {
        // Use native module to wake up, unlock and open app
        const result = await PlanTimer.wakeupUnlockAndOpen(packageName);
        if (!result) {
          Alert.alert('Fout', 'Kon de app niet openen. Controleer of de app is geïnstalleerd.');
        }
      } else {
        Alert.alert('Info', 'Deze functie werkt alleen op Android.');
      }
    } catch (error) {
      console.error('Error opening app:', error);
      Alert.alert('Fout', `Kon app niet openen: ${error.message}`);
    }
  };

  const checkPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        // Check battery optimization
        const isBatteryOptEnabled = await PlanTimer.isBatteryOptimizationEnabled();
        if (isBatteryOptEnabled) {
          Alert.alert(
            'Batterij Optimalisatie',
            'Voor betrouwbare alarms, moet je batterij-optimalisatie uitschakelen voor deze app.',
            [
              { text: 'Annuleren', style: 'cancel' },
              { text: 'Uitschakelen', onPress: () => PlanTimer.requestBatteryOptimizationDisable() }
            ]
          );
        }

        // Check overlay permission
        const canOverlay = await PlanTimer.canDrawOverlays();
        if (!canOverlay) {
          Alert.alert(
            'Overlay Permissie',
            'Deze app heeft permissie nodig om over andere apps te tonen (voor alarm boven lockscreen).',
            [
              { text: 'Annuleren', style: 'cancel' },
              { text: 'Instellingen', onPress: () => PlanTimer.requestOverlayPermission() }
            ]
          );
        }
      } catch (error) {
        console.log('Permission check error:', error);
      }
    }
  };

  // Check permissions on mount
  useEffect(() => {
    if (hasPermission) {
      checkPermissions();
    }
  }, [hasPermission]);

  const addSchedule = () => {
    if (!hasPermission) {
      Alert.alert('Permissie nodig', 'Geef eerst notificatie permissie.');
      return;
    }

    const newSchedule = {
      id: Date.now().toString(),
      time: newTime.toISOString(),
      label: newLabel || 'Alarm',
      targetApp: newTargetApp || targetApp,
      enabled: true,
      repeat: false,
      repeatDays: [],
    };

    const updatedSchedules = [...schedules, newSchedule];
    saveData(updatedSchedules);
    
    // Schedule the notification
    scheduleAlarmNotification(newSchedule);
    
    setNewLabel('');
    setNewTargetApp('');
    setShowTimePicker(false);
    
    Alert.alert('Succes', 'Timer toegevoegd!');
  };

  const scheduleAlarmNotification = async (schedule) => {
    try {
      const scheduleDate = new Date(schedule.time);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'PlanTimer Alarm!',
          body: `${schedule.label} - Unlock je telefoon om door te gaan`,
          sound: 'alarm.mp3',
          priority: 'max',
          vibrate: [0, 500, 1000, 500, 1000, 500],
          data: { 
            action: 'UNLOCK_REQUEST',
            targetApp: schedule.targetApp,
            scheduleId: schedule.id 
          },
        },
        trigger: {
          date: scheduleDate,
        },
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  };

  const toggleSchedule = (id) => {
    const updated = schedules.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    saveData(updated);
  };

  const deleteSchedule = (id) => {
    Alert.alert(
      'Timer verwijderen',
      'Weet je zeker dat je deze timer wilt verwijderen?',
      [
        { text: 'Annuleren', style: 'cancel' },
        { 
          text: 'Verwijderen', 
          style: 'destructive',
          onPress: () => {
            const updated = schedules.filter(s => s.id !== id);
            saveData(updated);
          }
        }
      ]
    );
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setNewTime(selectedTime);
    }
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('nl-NL', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const renderScheduleItem = ({ item }) => (
    <View style={styles.scheduleItem}>
      <View style={styles.scheduleInfo}>
        <Text style={styles.scheduleTime}>{formatTime(item.time)}</Text>
        <Text style={styles.scheduleLabel}>{item.label}</Text>
        <Text style={styles.scheduleApp}>App: {item.targetApp}</Text>
      </View>
      <View style={styles.scheduleActions}>
        <Switch
          value={item.enabled}
          onValueChange={() => toggleSchedule(item.id)}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={item.enabled ? '#4CAF50' : '#f4f3f4'}
        />
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => deleteSchedule(item.id)}
        >
          <Text style={styles.deleteButtonText}>×</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PlanTimer</Text>
        <Text style={styles.headerSubtitle}>Auto-opener met unlock</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Target App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Standaard App</Text>
          <Text style={styles.sectionDesc}>
            Package naam van de app die geopend moet worden (bijv: com.mijneigenplan.app)
          </Text>
          <TextInput
            style={styles.input}
            value={newTargetApp}
            onChangeText={setNewTargetApp}
            placeholder={targetApp}
            placeholderTextColor="#666"
          />
          <TouchableOpacity 
            style={styles.button}
            onPress={() => {
              if (newTargetApp) {
                saveTargetApp(newTargetApp);
                Alert.alert('Opgeslagen', 'Standaard app bijgewerkt');
              }
            }}
          >
            <Text style={styles.buttonText}>Standaard App Opslaan</Text>
          </TouchableOpacity>
        </View>

        {/* Add New Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nieuwe Timer Toevoegen</Text>
          
          <TouchableOpacity 
            style={styles.timeButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={styles.timeButtonText}>
              {newTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>

          {showTimePicker && (
            <DateTimePicker
              value={newTime}
              mode="time"
              is24Hour={true}
              display="spinner"
              onChange={onTimeChange}
            />
          )}

          <TextInput
            style={styles.input}
            value={newLabel}
            onChangeText={setNewLabel}
            placeholder="Label (bijv: Werk, School, etc.)"
            placeholderTextColor="#666"
          />

          <TextInput
            style={styles.input}
            value={newTargetApp}
            onChangeText={setNewTargetApp}
            placeholder={`Specifieke app (leeg = ${targetApp})`}
            placeholderTextColor="#666"
          />

          <TouchableOpacity style={styles.addButton} onPress={addSchedule}>
            <Text style={styles.addButtonText}>+ Timer Toevoegen</Text>
          </TouchableOpacity>
        </View>

        {/* Schedule List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Geplande Timers</Text>
          {schedules.length === 0 ? (
            <Text style={styles.emptyText}>Geen timers gepland</Text>
          ) : (
            <FlatList
              data={schedules}
              keyExtractor={(item) => item.id}
              renderItem={renderScheduleItem}
              scrollEnabled={false}
            />
          )}
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructies</Text>
          <Text style={styles.instructionText}>
            1. Zorg dat batterij-optimalisatie UIT staat voor deze app{'\n'}
            2. Geef alle permissies bij installatie{'\n'}
            3. Op de geplande tijd klinkt er een alarm{'\n'}
            4. Unlock je telefoon (vingerafdruk/PIN/patroon){'\n'}
            5. De app wordt automatisch geopend{'\n'}
            {'\n'}
            <Text style={styles.bold}>Opmerking:</Text> Voor volledige automatisering 
            met wake-lock en direct openen, moet de app native Android modules bevatten 
            die via EAS Build worden gecompileerd.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    backgroundColor: '#16213e',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#a0a0a0',
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  sectionDesc: {
    fontSize: 12,
    color: '#a0a0a0',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 15,
    color: '#fff',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  button: {
    backgroundColor: '#0f3460',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  timeButton: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#e94560',
  },
  timeButtonText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e94560',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  scheduleItem: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleTime: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e94560',
  },
  scheduleLabel: {
    fontSize: 14,
    color: '#fff',
    marginTop: 5,
  },
  scheduleApp: {
    fontSize: 12,
    color: '#a0a0a0',
    marginTop: 2,
  },
  scheduleActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    marginLeft: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e94560',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  instructionText: {
    color: '#a0a0a0',
    fontSize: 14,
    lineHeight: 22,
  },
  bold: {
    fontWeight: 'bold',
    color: '#fff',
  },
});
