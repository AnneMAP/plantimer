import { NativeModulesProxy, EventEmitter } from 'expo-modules-core';

// Import the native module. On web, it will be resolved to PlanTimer.web.ts
// and on native platforms to PlanTimer.ts
import PlanTimerModule from './PlanTimerModule';

// Reexport the module for external use
export { PlanTimerModule };

// Export types
export interface TimerSchedule {
  id: string;
  time: string;
  label: string;
  targetApp: string;
  enabled: boolean;
  repeat: boolean;
  repeatDays: number[];
}

// Helper functions for common operations

/**
 * Wake up the device and unlock the screen
 */
export async function wakeupAndUnlock(): Promise<boolean> {
  return await PlanTimerModule.wakeupAndUnlock();
}

/**
 * Open another app by package name
 */
export async function openApp(packageName: string): Promise<boolean> {
  return await PlanTimerModule.openApp(packageName);
}

/**
 * Check if the device is currently locked
 */
export async function isDeviceLocked(): Promise<boolean> {
  return await PlanTimerModule.isDeviceLocked();
}

/**
 * Request a wake lock to keep CPU running
 */
export async function requestWakeLock(): Promise<boolean> {
  return await PlanTimerModule.requestWakeLock();
}

/**
 * Release the wake lock
 */
export async function releaseWakeLock(): Promise<boolean> {
  return await PlanTimerModule.releaseWakeLock();
}

/**
 * Check if battery optimization is enabled (may prevent alarms)
 */
export async function isBatteryOptimizationEnabled(): Promise<boolean> {
  return await PlanTimerModule.isBatteryOptimizationEnabled();
}

/**
 * Request user to disable battery optimization for this app
 */
export async function requestBatteryOptimizationDisable(): Promise<boolean> {
  return await PlanTimerModule.requestBatteryOptimizationDisable();
}

/**
 * Check if app can draw overlays (needed for showing above lock screen)
 */
export async function canDrawOverlays(): Promise<boolean> {
  return await PlanTimerModule.canDrawOverlays();
}

/**
 * Request permission to draw overlays
 */
export async function requestOverlayPermission(): Promise<boolean> {
  return await PlanTimerModule.requestOverlayPermission();
}

/**
 * Complete flow: wakeup, unlock and open target app
 */
export async function wakeupUnlockAndOpen(packageName: string): Promise<boolean> {
  try {
    // Step 1: Wake up the device
    await wakeupAndUnlock();
    
    // Step 2: Wait a moment for unlock
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Step 3: Open the target app
    return await openApp(packageName);
  } catch (error) {
    console.error('Error in wakeupUnlockAndOpen:', error);
    return false;
  }
}
