import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator, Text, Alert, ScrollView } from 'react-native';
import { Card, Title, Paragraph, IconButton, useTheme, Divider } from 'react-native-paper';
import MapView, { Marker } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { SafeAreaWrapper } from '../components/SafeAreaWrapper';
import { getCurrentLocation, saveUserLocation } from '../services/locationService';
import { getCurrentUser } from '../services/authService';

// Harita ekranı props için tip tanımı
type LocationMapScreenProps = {
  navigation: any;
};

// Konum bilgisi için tip tanımı
interface LocationData {
  id: number;
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  device_info: string;
  login_time: string;
  location_type: string;
  ip_address: string | null;
  created_at: string;
}

// Filtre seçenekleri için tip tanımı
type FilterOption = 'all' | 'login' | 'logout' | 'manual' | 'automatic';

export const LocationMapScreen = ({ navigation }: LocationMapScreenProps) => {
  const theme = useTheme();
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialRegion, setInitialRegion] = useState({
    latitude: 41.0082, // İstanbul varsayılan
    longitude: 28.9784,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [filterType, setFilterType] = useState<FilterOption>('all');
  const [currentRegion, setCurrentRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);

  // Lokasyonları yükle
  useEffect(() => {
    loadLocations();
  }, [filterType]);

  // Kullanıcı konumlarını yükle
  const loadLocations = async () => {
    try {
      setLoading(true);
      
      // Oturum açmış kullanıcıyı al
      const user = await getCurrentUser();
      
      if (!user) {
        Alert.alert('Hata', 'Kullanıcı bilgileri alınamadı');
        setLoading(false);
        return;
      }

      // Sorgu oluştur
      let query = supabase
        .from('user_locations')
        .select('*')
        .order('login_time', { ascending: false });
      
      // Filtre uygula
      if (filterType !== 'all') {
        query = query.eq('location_type', filterType);
      }
      
      // Rol kontrolü - Admin olmayan kullanıcılar sadece kendi konumlarını görebilir
      if (user.role !== 'admin') {
        query = query.eq('user_id', user.id);
      }
      
      // Sorguyu çalıştır
      const { data, error } = await query;
      
      if (error) {
        console.error('Konum verileri alınamadı:', error);
        Alert.alert('Hata', 'Konum verileri yüklenirken bir hata oluştu');
        setLoading(false);
        return;
      }
      
      if (data && data.length > 0) {
        setLocations(data as LocationData[]);
        
        // İlk konumu merkez olarak ayarla
        setInitialRegion({
          latitude: data[0].latitude,
          longitude: data[0].longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      } else {
        setLocations([]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Konum yükleme hatası:', error);
      Alert.alert('Hata', 'Konum verileri yüklenirken bir hata oluştu');
      setLoading(false);
    }
  };

  // Konum türüne göre simge rengini belirle
  const getMarkerColor = (locationType: string) => {
    switch (locationType) {
      case 'login': return '#10B981'; // Yeşil
      case 'logout': return '#EF4444'; // Kırmızı
      case 'manual': return '#6366F1'; // Mavi
      case 'automatic': return '#F59E0B'; // Turuncu
      default: return '#9CA3AF'; // Gri
    }
  };
  
  // Konum türüne göre simge adını belirle
  const getMarkerIcon = (locationType: string) => {
    switch (locationType) {
      case 'login': return 'login';
      case 'logout': return 'logout';
      case 'manual': return 'map-marker-check';
      case 'automatic': return 'map-marker-radius';
      default: return 'map-marker';
    }
  };
  
  // Manuel konum ekle
  const addManualLocation = async () => {
    try {
      const user = await getCurrentUser();
      
      if (!user) {
        Alert.alert('Hata', 'Kullanıcı bilgileri alınamadı');
        return;
      }
      
      // Konum kaydı başlatılıyor animasyonu gösterilebilir
      setLoading(true);
      
      // Manuel konum kaydet
      const result = await saveUserLocation(user.id, 'manual');
      
      if (result.success && result.location) {
        Alert.alert('Başarılı', 'Konumunuz kaydedildi');
        // Konum listesini yenile
        loadLocations();
      } else {
        Alert.alert('Hata', result.error || 'Konum kaydedilemedi');
        setLoading(false);
      }
    } catch (error) {
      console.error('Manuel konum ekleme hatası:', error);
      Alert.alert('Hata', 'Konum eklenirken bir sorun oluştu');
      setLoading(false);
    }
  };
  
  // Mevcut konuma git
  const goToCurrentLocation = async () => {
    try {
      const result = await getCurrentLocation();
      
      if (result.success && result.location) {
        const { latitude, longitude } = result.location;
        
        const region = {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        
        setCurrentRegion(region);
      } else {
        Alert.alert('Hata', result.error || 'Konum alınamadı');
      }
    } catch (error) {
      console.error('Mevcut konuma gitme hatası:', error);
      Alert.alert('Hata', 'Konum alınırken bir sorun oluştu');
    }
  };

  return (
    <SafeAreaWrapper backgroundColor="#f5f7fa">
      <View style={styles.container}>
        {/* Üst Araç Çubuğu */}
        <View style={styles.header}>
          <IconButton 
            icon="arrow-left" 
            size={24} 
            onPress={() => navigation.goBack()} 
          />
          <Title style={styles.headerTitle}>Konum Geçmişi</Title>
          <IconButton 
            icon="refresh" 
            size={24} 
            onPress={loadLocations} 
            disabled={loading}
          />
        </View>
        
        {/* Filtre Butonları */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filterType === 'all' && { backgroundColor: theme.colors.primary }
              ]}
              onPress={() => setFilterType('all')}
            >
              <Text style={[
                styles.filterText,
                filterType === 'all' && { color: '#fff' }
              ]}>Tümü</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterButton,
                filterType === 'login' && { backgroundColor: '#10B981' }
              ]}
              onPress={() => setFilterType('login')}
            >
              <Text style={[
                styles.filterText,
                filterType === 'login' && { color: '#fff' }
              ]}>Giriş</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterButton,
                filterType === 'logout' && { backgroundColor: '#EF4444' }
              ]}
              onPress={() => setFilterType('logout')}
            >
              <Text style={[
                styles.filterText,
                filterType === 'logout' && { color: '#fff' }
              ]}>Çıkış</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterButton,
                filterType === 'manual' && { backgroundColor: '#6366F1' }
              ]}
              onPress={() => setFilterType('manual')}
            >
              <Text style={[
                styles.filterText,
                filterType === 'manual' && { color: '#fff' }
              ]}>Manuel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterButton,
                filterType === 'automatic' && { backgroundColor: '#F59E0B' }
              ]}
              onPress={() => setFilterType('automatic')}
            >
              <Text style={[
                styles.filterText,
                filterType === 'automatic' && { color: '#fff' }
              ]}>Otomatik</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
        
        {/* Harita */}
        <View style={styles.mapContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Konum bilgileri yükleniyor...</Text>
            </View>
          ) : (
            <>
              <MapView
                style={styles.map}
                initialRegion={initialRegion}
                region={currentRegion || undefined}
              >
                {locations.map((location) => (
                  <Marker
                    key={location.id}
                    coordinate={{
                      latitude: location.latitude,
                      longitude: location.longitude
                    }}
                    pinColor={getMarkerColor(location.location_type)}
                    onPress={() => setSelectedLocation(location)}
                  >
                    <MaterialCommunityIcons 
                      name={getMarkerIcon(location.location_type)} 
                      size={30} 
                      color={getMarkerColor(location.location_type)} 
                    />
                  </Marker>
                ))}
              </MapView>
              
              {/* Seçili Konum Bilgisi */}
              {selectedLocation && (
                <Card style={styles.locationInfoCard}>
                  <Card.Content>
                    <View style={styles.locationInfoHeader}>
                      <View style={styles.locationTypeContainer}>
                        <MaterialCommunityIcons 
                          name={getMarkerIcon(selectedLocation.location_type)} 
                          size={24} 
                          color={getMarkerColor(selectedLocation.location_type)} 
                        />
                        <Title style={styles.locationInfoTitle}>
                          {selectedLocation.location_type === 'login' ? 'Giriş' : 
                           selectedLocation.location_type === 'logout' ? 'Çıkış' : 
                           selectedLocation.location_type === 'manual' ? 'Manuel Konum' : 
                           'Otomatik Konum'}
                        </Title>
                      </View>
                      <IconButton 
                        icon="close" 
                        size={20} 
                        onPress={() => setSelectedLocation(null)} 
                      />
                    </View>
                    
                    <Divider style={styles.divider} />
                    
                    <View style={styles.locationInfoRow}>
                      <MaterialCommunityIcons name="clock-outline" size={18} color="#4B5563" />
                      <Paragraph style={styles.locationInfoText}>
                        {new Date(selectedLocation.login_time).toLocaleString('tr-TR')}
                      </Paragraph>
                    </View>
                    
                    <View style={styles.locationInfoRow}>
                      <MaterialCommunityIcons name="map-marker" size={18} color="#4B5563" />
                      <Paragraph style={styles.locationInfoText}>
                        {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                      </Paragraph>
                    </View>
                    
                    <View style={styles.locationInfoRow}>
                      <MaterialCommunityIcons name="crosshairs-gps" size={18} color="#4B5563" />
                      <Paragraph style={styles.locationInfoText}>
                        Doğruluk: ±{selectedLocation.accuracy.toFixed(0)} m
                      </Paragraph>
                    </View>
                    
                    {selectedLocation.ip_address && (
                      <View style={styles.locationInfoRow}>
                        <MaterialCommunityIcons name="ip-network" size={18} color="#4B5563" />
                        <Paragraph style={styles.locationInfoText}>
                          IP: {selectedLocation.ip_address}
                        </Paragraph>
                      </View>
                    )}
                  </Card.Content>
                </Card>
              )}
              
              {/* Harita Kontrolleri */}
              <View style={styles.mapControls}>
                <TouchableOpacity 
                  style={[styles.mapControlButton, { backgroundColor: '#6366F1' }]}
                  onPress={goToCurrentLocation}
                >
                  <MaterialCommunityIcons name="crosshairs-gps" size={30} color="#FFF" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.mapControlButton, { backgroundColor: '#6366F1' }]}
                  onPress={addManualLocation}
                >
                  <MaterialCommunityIcons name="map-marker-plus" size={30} color="#FFF" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  filterContainer: {
    backgroundColor: '#fff',
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 5,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 5,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: Dimensions.get('window').width,
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#4B5563',
  },
  locationInfoCard: {
    position: 'absolute',
    bottom: 70,
    left: 10,
    right: 10,
    borderRadius: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  locationInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  divider: {
    marginVertical: 8,
  },
  locationInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  locationInfoText: {
    fontSize: 14,
    marginLeft: 8,
    color: '#4B5563',
  },
  mapControls: {
    position: 'absolute',
    right: 15,
    bottom: 70,
    alignItems: 'center',
  },
  mapControlButton: {
    width: 56,
    height: 56,
    borderRadius: 30,
    margin: 5,
    elevation: 3,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
}); 