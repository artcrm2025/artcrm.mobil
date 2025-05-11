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
type UserLocationScreenProps = {
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
  user_name?: string;
  user_role?: string;
  region_id?: number;
  region_name?: string;
}

// Kullanıcı için tip tanımı
interface User {
  id: string;
  name: string;
  role: string;
  region_id?: number;
}

// Bölge için tip tanımı
interface Region {
  id: number;
  name: string;
}

// Filtre seçenekleri için tip tanımı
type FilterOption = 'all' | 'login' | 'logout' | 'manual' | 'automatic';

export const UserLocationScreen = ({ navigation }: UserLocationScreenProps) => {
  const theme = useTheme();
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialRegion, setInitialRegion] = useState({
    latitude: 41.0082, // İstanbul varsayılan
    longitude: 28.9784,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [filterType, setFilterType] = useState<FilterOption>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [currentRegion, setCurrentRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);

  // Kullanıcılar ve bölgeleri yükle
  useEffect(() => {
    loadUsersAndRegions();
  }, []);

  // Kullanıcı konumlarını yükle
  useEffect(() => {
    loadLocations();
  }, [filterType, selectedUser, selectedRegion]);

  // Kullanıcıları ve bölgeleri yükle
  const loadUsersAndRegions = async () => {
    try {
      // Kullanıcıları al
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, role, region_id');
      
      if (userError) {
        console.error('Kullanıcılar alınamadı:', userError);
        Alert.alert('Hata', 'Kullanıcı bilgileri yüklenirken bir hata oluştu');
        return;
      }
      
      setUsers(userData as User[]);
      
      // Bölgeleri al
      const { data: regionData, error: regionError } = await supabase
        .from('regions')
        .select('id, name');
      
      if (regionError) {
        console.error('Bölgeler alınamadı:', regionError);
        Alert.alert('Hata', 'Bölge bilgileri yüklenirken bir hata oluştu');
        return;
      }
      
      setRegions(regionData as Region[]);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu');
    }
  };

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

      // Sorguyu oluştur
      let query = supabase
        .from('user_locations')
        .select('*');
      
      // Tip filtresi uygula
      if (filterType !== 'all') {
        query = query.eq('location_type', filterType);
      }
      
      // Kullanıcı filtresi uygula
      if (selectedUser !== 'all') {
        query = query.eq('user_id', selectedUser);
      }
      
      // Rol kontrolü - Admin olmayan kullanıcılar sadece kendi konumlarını görebilir
      if (user.role !== 'admin') {
        query = query.eq('user_id', user.id);
      } 
      // Admin için bölge filtresi
      else if (selectedRegion !== 'all') {
        // Doğrudan user_id'leri kullanarak filtreleme yapacağız
        // İlgili bölgedeki kullanıcı ID'lerini al
        const { data: regionUsers } = await supabase
          .from('users')
          .select('id')
          .eq('region_id', selectedRegion);
        
        if (regionUsers && regionUsers.length > 0) {
          const userIds = regionUsers.map(u => u.id);
          query = query.in('user_id', userIds);
        }
      }
      
      // Konumları zamana göre sırala ve her kullanıcının son konumunu al
      query = query.order('login_time', { ascending: false });

      // Sorguyu çalıştır
      console.log('Konum sorgusu yapılıyor...');
      const { data, error } = await query;
      
      if (error) {
        console.error('Konum verileri alınamadı:', error);
        Alert.alert('Hata', 'Konum verileri yüklenirken bir hata oluştu');
        setLoading(false);
        return;
      }
      
      console.log(`${data?.length || 0} adet konum verisi alındı`);

      if (data && data.length > 0) {
        // Her kullanıcı için en son konum bilgisini al
        const latestLocationsByUser: Record<string, any> = {};
        data.forEach((loc: any) => {
          if (!latestLocationsByUser[loc.user_id] || 
              new Date(loc.login_time) > new Date(latestLocationsByUser[loc.user_id].login_time)) {
            latestLocationsByUser[loc.user_id] = loc;
          }
        });
        
        // Sadece en son konumları içeren diziyi oluştur
        const latestLocations = Object.values(latestLocationsByUser) as any[];
        
        // Tüm kullanıcı ID'lerini al
        const userIds = [...new Set(latestLocations.map(item => item.user_id))];
        
        // Kullanıcı bilgilerini ayrı bir sorgu ile al
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, name, role, region_id')
          .in('id', userIds);
        
        if (userError) {
          console.error('Kullanıcı bilgileri alınamadı:', userError);
        }
        
        // Kullanıcı ID'lerine göre kullanıcı bilgilerini eşleştir
        const userMap = (userData || []).reduce((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {} as Record<string, any>);
        
        // Bölge ID'lerini topla
        const regionIds = [...new Set((userData || [])
          .filter(user => user.region_id)
          .map(user => user.region_id))];
        
        // Bölge isimlerini al
        let regionNames = {} as Record<number, string>;
        
        if (regionIds.length > 0) {
          const { data: regionData } = await supabase
            .from('regions')
            .select('id, name')
            .in('id', regionIds);
          
          if (regionData) {
            regionNames = regionData.reduce((acc, region) => {
              acc[region.id] = region.name;
              return acc;
            }, {} as Record<number, string>);
          }
        }
        
        // Konum verilerini düzenle
        const formattedLocations = latestLocations.map((item: any) => {
          const user = userMap[item.user_id];
          const regionId = user?.region_id;
          
          return {
            ...item,
            user_name: user?.name,
            user_role: user?.role,
            region_id: regionId,
            region_name: regionId ? regionNames[regionId] : undefined
          } as LocationData;
        });
        
        console.log(`${formattedLocations.length} adet kullanıcı için en son konum gösteriliyor`);
        setLocations(formattedLocations);
        
        // Türkiye'deki konumları filtrele (yaklaşık olarak Türkiye sınırları)
        const turkiyeLocations = formattedLocations.filter(loc => 
          loc.latitude >= 36 && loc.latitude <= 42 && // Türkiye'nin enlem sınırları
          loc.longitude >= 26 && loc.longitude <= 45  // Türkiye'nin boylam sınırları
        );
        
        // Türkiye'de konum varsa onu merkez yap, yoksa İstanbul'u kullan
        if (turkiyeLocations.length > 0) {
          setInitialRegion({
            latitude: turkiyeLocations[0].latitude,
            longitude: turkiyeLocations[0].longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          });
        } else {
          // Türkiye'de konum yoksa İstanbul'u merkez olarak kullan
          setInitialRegion({
            latitude: 41.0082, // İstanbul varsayılan
            longitude: 28.9784,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          });
        }
      } else {
        console.log('Konum verisi bulunamadı');
        setLocations([]);
        // Veri olmasa bile İstanbul'u merkez olarak ayarla
        setInitialRegion({
          latitude: 41.0082, // İstanbul varsayılan
          longitude: 28.9784,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
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

  // Kullanıcı değişikliği
  const handleUserChange = (userId: string) => {
    setSelectedUser(userId);
    
    if (userId !== 'all') {
      // Seçilen kullanıcının son konumuna odaklan
      const userLocation = locations.find(loc => loc.user_id === userId);
      if (userLocation) {
        setCurrentRegion({
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    }
  };

  // Bölge değişikliği
  const handleRegionChange = (regionId: string) => {
    setSelectedRegion(regionId);
    
    if (regionId !== 'all') {
      // Seçilen bölgedeki ilk kullanıcının konumuna odaklan
      const regionLocation = locations.find(loc => loc.region_id?.toString() === regionId);
      if (regionLocation) {
        setCurrentRegion({
          latitude: regionLocation.latitude,
          longitude: regionLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      }
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
          <Title style={styles.headerTitle}>Konum Takibi</Title>
          <IconButton 
            icon="refresh" 
            size={24} 
            onPress={loadLocations} 
            disabled={loading}
          />
        </View>
        
        {/* Filtre Kontrolleri */}
        <ScrollView style={styles.filterScrollContainer}>
          {/* Konum Türü Filtreleri */}
          <View style={styles.filterContainer}>
            <Text style={styles.filterSectionTitle}>Konum Türü</Text>
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
          
          {/* Bölge Filtresi */}
          <View style={styles.filterContainer}>
            <Text style={styles.filterSectionTitle}>Bölge</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  selectedRegion === 'all' && { backgroundColor: theme.colors.primary }
                ]}
                onPress={() => handleRegionChange('all')}
              >
                <Text style={[
                  styles.filterText,
                  selectedRegion === 'all' && { color: '#fff' }
                ]}>Tüm Bölgeler</Text>
              </TouchableOpacity>
              
              {regions.map(region => (
                <TouchableOpacity
                  key={region.id}
                  style={[
                    styles.filterButton,
                    selectedRegion === region.id.toString() && { backgroundColor: theme.colors.primary }
                  ]}
                  onPress={() => handleRegionChange(region.id.toString())}
                >
                  <Text style={[
                    styles.filterText,
                    selectedRegion === region.id.toString() && { color: '#fff' }
                  ]}>{region.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          {/* Kullanıcı Filtresi */}
          <View style={styles.filterContainer}>
            <Text style={styles.filterSectionTitle}>Kullanıcı</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  selectedUser === 'all' && { backgroundColor: theme.colors.primary }
                ]}
                onPress={() => handleUserChange('all')}
              >
                <Text style={[
                  styles.filterText,
                  selectedUser === 'all' && { color: '#fff' }
                ]}>Tüm Kullanıcılar</Text>
              </TouchableOpacity>
              
              {users
                .filter(user => selectedRegion === 'all' || user.region_id?.toString() === selectedRegion)
                .map(user => (
                  <TouchableOpacity
                    key={user.id}
                    style={[
                      styles.filterButton,
                      selectedUser === user.id && { backgroundColor: theme.colors.primary }
                    ]}
                    onPress={() => handleUserChange(user.id)}
                  >
                    <Text style={[
                      styles.filterText,
                      selectedUser === user.id && { color: '#fff' }
                    ]}>{user.name}</Text>
                  </TouchableOpacity>
                ))
              }
            </ScrollView>
          </View>
        </ScrollView>
        
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
                      <MaterialCommunityIcons name="account" size={18} color="#4B5563" />
                      <Paragraph style={styles.locationInfoText}>
                        {selectedLocation.user_name || `Kullanıcı #${selectedLocation.user_id}`}
                      </Paragraph>
                    </View>
                    
                    {selectedLocation.region_name && (
                      <View style={styles.locationInfoRow}>
                        <MaterialCommunityIcons name="map" size={18} color="#4B5563" />
                        <Paragraph style={styles.locationInfoText}>
                          Bölge: {selectedLocation.region_name}
                        </Paragraph>
                      </View>
                    )}
                    
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
                  style={[styles.mapControlButton, { backgroundColor: '#10B981' }]}
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
  filterScrollContainer: {
    maxHeight: 240,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 5,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
    marginBottom: 8,
    color: '#374151',
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
    right: 16,
    bottom: 70,
    flexDirection: 'column',
  },
  mapControlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  }
}); 