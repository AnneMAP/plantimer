// Web stub - most functions don't work on web

export default {
  async wakeupAndUnlock(): Promise<boolean> {
    console.warn('wakeupAndUnlock is not supported on web');
    return false;
  },
  
  async openApp(packageName: string): Promise<boolean> {
    console.warn('openApp is not supported on web');
    return false;
  },
  
  async isDeviceLocked(): Promise<boolean> {
    return false;
  },
  
  async requestWakeLock(): Promise<boolean> {
    console.warn('requestWakeLock is not supported on web');
    return false;
  },
  
  async releaseWakeLock(): Promise<boolean> {
    return false;
  },
  
  async isBatteryOptimizationEnabled(): Promise<boolean> {
    return false;
  },
  
  async requestBatteryOptimizationDisable(): Promise<boolean> {
    console.warn('requestBatteryOptimizationDisable is not supported on web');
    return false;
  },
  
  async canDrawOverlays(): Promise<boolean> {
    return false;
  },
  
  async requestOverlayPermission(): Promise<boolean> {
    console.warn('requestOverlayPermission is not supported on web');
    return false;
  },
};
