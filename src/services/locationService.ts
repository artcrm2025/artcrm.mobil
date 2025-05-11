import * as Location from 'expo-location';
import { Platform } from 'react-native';
// import DeviceInfo from 'react-native-device-info';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';
import * as Device from 'expo-device';

// Konum türleri
export type LocationType = 'login' | 'manual' | 'automatic' | 'logout';

// Konum kaydetme sonucu
export interface LocationResult {
  success: boolean;
  error?: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

/**
 * Mevcut konum bilgisini al
 */
export const getCurrentLocation = async (): Promise<LocationResult> => {
  try {
    // Konum izinlerini kontrol et
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.log('Konum izni verilmedi');
      return {
        success: false,
        error: 'Konum izni verilmedi'
      };
    }
    
    // Geçerli konumu al
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High
    });
    
    if (!location || !location.coords) {
      console.log('Konum alınamadı');
      return {
        success: false,
        error: 'Konum alınamadı'
      };
    }
    
    return {
      success: true,
      location: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0
      }
    };
  } catch (error) {
    console.error('Konum alınamadı:', error);
    return {
      success: false,
      error: 'Konum alınamadı'
    };
  }
};

/**
 * Cihaz bilgisi al - Expo Go uyumlu sürüm
 */
export const getDeviceInfo = async (): Promise<string> => {
  try {
    const deviceInfo = Device.modelName || 'Bilinmeyen Cihaz';
    const osName = Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Bilinmeyen';
    const osVersion = Platform.Version.toString();
    
    return `${deviceInfo} (${osName} ${osVersion})`;
  } catch (error) {
    console.error('Cihaz bilgisi alma hatası:', error);
    return 'Bilinmeyen Cihaz';
  }
};

/**
 * IP adresini al
 */
export const getIPAddress = async (): Promise<string | null> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('IP adresi alma hatası:', error);
    return null;
  }
};

/**
 * Konum bilgisini kaydet
 */
export const saveUserLocation = async (
  userId: string, 
  locationType: LocationType
): Promise<LocationResult> => {
  try {
    // Konum bilgisi al
    const locationResult = await getCurrentLocation();
    
    if (!locationResult.success || !locationResult.location) {
      console.log('Konum alınamadı');
      return {
        success: false,
        error: locationResult.error || 'Konum alınamadı'
      };
    }
    
    // Cihaz bilgileri
    let deviceInfo = '';
    
    // Web için tarayıcı bilgisi, mobil için cihaz bilgisi
    if (Platform.OS === 'web') {
      // Web platformunda tarayıcı bilgilerini al
      deviceInfo = JSON.stringify({
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language
      });
    } else {
      // Mobil cihaz bilgilerini al
      const brand = Device.brand || 'unknown';
      const modelName = Device.modelName || 'unknown';
      deviceInfo = JSON.stringify({
        platform: Platform.OS,
        version: Platform.Version,
        brand,
        model: modelName,
        isEmulator: Device.isDevice === false
      });
    }
    
    // IP adresi al
    const ipInfo = await NetInfo.fetch();
    // @ts-ignore NetInfo tiplerinin doğru tanımlanmamış olması durumuna karşı
    const ipAddress = ipInfo.details?.ipAddress || await getIPAddress();
    
    console.log('Konum kaydediliyor:', {
      latitude: locationResult.location.latitude, 
      longitude: locationResult.location.longitude
    });
    
    // Supabase'e kaydet
    const { data, error } = await supabase
      .from('user_locations')
      .insert({
        user_id: userId,
        latitude: locationResult.location.latitude,
        longitude: locationResult.location.longitude,
        accuracy: locationResult.location.accuracy,
        device_info: deviceInfo,
        location_type: locationType,
        ip_address: ipAddress,
        login_time: new Date().toISOString()
      })
      .select('*')
      .single();
    
    if (error) {
      console.error('Konum kaydedilemedi:', error);
      return {
        success: false,
        error: 'Konum kaydedilemedi: ' + error.message
      };
    }
    
    console.log('Konum başarıyla kaydedildi:', data);
    return {
      success: true,
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy
      }
    };
  } catch (error) {
    console.error('Konum kaydedilemedi:', error);
    return {
      success: false,
      error: 'Konum kaydedilemedi: ' + (error instanceof Error ? error.message : String(error))
    };
  }
};

/**
 * Otomatik konum takibi başlat
 */
let locationTrackingInterval: any = null;
const TRACKING_INTERVAL = 10 * 60 * 1000; // 10 dakika (milisaniye)

export const startLocationTracking = (userId: string): boolean => {
  // Zaten çalışıyorsa durdur
  if (locationTrackingInterval) {
    clearInterval(locationTrackingInterval);
  }
  
  // Düzenli aralıklarla konum kaydet
  locationTrackingInterval = setInterval(async () => {
    try {
      // Konum kaydet
      await saveUserLocation(userId, 'automatic');
      console.log('Otomatik konum kaydedildi');
    } catch (error) {
      console.error('Otomatik konum kaydedilemedi:', error);
    }
  }, TRACKING_INTERVAL);
  
  return true;
};

/**
 * Otomatik konum takibini durdur
 */
export const stopLocationTracking = (): boolean => {
  if (locationTrackingInterval) {
    clearInterval(locationTrackingInterval);
    locationTrackingInterval = null;
    console.log('Konum takibi durduruldu');
    return true;
  }
  
  return false;
};