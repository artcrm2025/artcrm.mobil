import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, RefreshControl, Image, ScrollView } from 'react-native';
import { Appbar, Text, Searchbar, Card, Paragraph, Chip, Button, FAB, Portal, Modal, Title, Divider, useTheme, ActivityIndicator, Menu, IconButton, TextInput, Badge } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../services/authService';
import { User } from '../types';

type Clinic = {
  id: number;
  name: string;
  contact_person: string | null;
  contact_info: string | null;
  address: string | null;
  region_id: number | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  created_by: number | null;
  updated_by: number | null;
  // İlişkili veriler
  regions?: { name: string };
};

// Navigasyon parametrelerini tanımla
type RootStackParamList = {
  CreateClinic: undefined;
  ClinicDetail: { clinicId: number };
  EditClinic: { clinicId: number };
  ClinicManagement: undefined;
};

// Navigasyon tipini tanımla
type ClinicsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ClinicsScreen = () => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRegion, setFilterRegion] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortOption, setSortOption] = useState<string>('name_asc');
  const [regions, setRegions] = useState<{id: number, name: string}[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const theme = useTheme();
  const navigation = useNavigation<ClinicsScreenNavigationProp>();

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    fetchRegions();
    fetchClinics();
  }, [filterRegion, filterStatus, sortOption, currentUser]);

  const loadUserData = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      
      // Eğer kullanıcı field_user veya regional_manager ise, otomatik olarak kendi bölgesini filtrele
      if (user && (user.role === 'field_user' || user.role === 'regional_manager') && user.region_id) {
        setFilterRegion(user.region_id);
      }
    } catch (error) {
      console.error('Kullanıcı bilgileri yüklenirken hata:', error);
    }
  };

  const fetchRegions = async () => {
    try {
      const { data, error } = await supabase
        .from('regions')
        .select('id, name')
        .order('name');
        
      if (error) {
        console.error('Bölgeler yüklenirken hata:', error);
        return;
      }
      
      setRegions(data || []);
    } catch (error) {
      console.error('Bölgeler yüklenirken hata:', error);
    }
  };

  const fetchClinics = async () => {
    try {
      setLoading(true);
      
      // Sorgu oluştur
      let query = supabase
        .from('clinics')
        .select('*, regions(name)');
      
      // Rol tabanlı erişim kontrolü
      if (currentUser) {
        if (currentUser.role === 'admin' || currentUser.role === 'manager') {
          // Admin ve Manager tüm klinikleri görebilir
          // Hiçbir kısıtlama uygulanmaz
        } else if ((currentUser.role === 'regional_manager' || currentUser.role === 'field_user') && currentUser.region_id) {
          // Bölge müdürü ve saha kullanıcıları sadece kendi bölgelerindeki klinikleri görebilir
          query = query.eq('region_id', currentUser.region_id);
          
          // Eğer ekstra bir bölge filtresi uygulanmışsa ve bu kullanıcının bölgesi değilse, kendi bölgesiyle değiştir
          if (filterRegion !== null && filterRegion !== currentUser.region_id) {
            console.log('Kullanıcı sadece kendi bölgesini görüntüleyebilir. Filtre sıfırlandı.');
            setFilterRegion(currentUser.region_id);
            return;
          }
        }
      }
      
      // Manuel filtreleri uygula (role-based filtreleme sonrası)
      if (filterRegion !== null) {
        query = query.eq('region_id', filterRegion);
      }
      
      if (filterStatus !== null) {
        query = query.eq('status', filterStatus);
      }
      
      // Sıralama uygula
      if (sortOption === 'name_asc') {
        query = query.order('name', { ascending: true });
      } else if (sortOption === 'name_desc') {
        query = query.order('name', { ascending: false });
      } else if (sortOption === 'created_asc') {
        query = query.order('created_at', { ascending: true });
      } else if (sortOption === 'created_desc') {
        query = query.order('created_at', { ascending: false });
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Klinikler çekilirken hata:', error);
        return;
      }
      
      setClinics(data || []);
      console.log(`Toplam ${data?.length || 0} klinik yüklendi. Kullanıcı rolü: ${currentUser?.role}, Bölge ID: ${currentUser?.region_id}`);
    } catch (error) {
      console.error('Klinikler çekilirken hata:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchClinics();
  }, [filterRegion, filterStatus, sortOption]);

  const getSortText = () => {
    switch (sortOption) {
      case 'name_asc':
        return 'İsme Göre (A-Z)';
      case 'name_desc':
        return 'İsme Göre (Z-A)';
      case 'date_newest':
        return 'En Yeni';
      case 'date_oldest':
        return 'En Eski';
      default:
        return 'Sırala';
    }
  };

  // Apply search filter to clinics
  const filteredClinics = clinics.filter(clinic => 
    clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (clinic.contact_person && clinic.contact_person.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (clinic.address && clinic.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderClinic = ({ item }: { item: Clinic }) => (
    <TouchableOpacity 
      onPress={() => navigation.navigate('ClinicDetail', { clinicId: item.id })}
      style={styles.cardContainer}
    >
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View>
              <Title style={styles.cardTitle}>{item.name}</Title>
              {item.regions && (
                <Paragraph style={styles.cardRegion}>
                  <MaterialCommunityIcons name="map-marker" size={14} color="#757575" />
                  {' '}{item.regions.name}
                </Paragraph>
              )}
            </View>
            <Chip 
              mode={item.status === 'active' ? 'flat' : 'outlined'} 
              style={[
                styles.statusChip, 
                { backgroundColor: item.status === 'active' ? '#E8F5E9' : 'transparent',
                  borderColor: item.status === 'active' ? '#43A047' : '#757575' }
              ]}
              textStyle={{ 
                color: item.status === 'active' ? '#2E7D32' : '#757575' 
              }}
            >
              {item.status === 'active' ? 'Aktif' : 'Pasif'}
            </Chip>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="account" size={18} color="#757575" style={styles.detailIcon} />
            <Text style={styles.detailLabel}>İletişim Kişisi:</Text>
            <Text style={styles.detailValue}>{item.contact_person || 'Belirtilmemiş'}</Text>
          </View>
          
          {item.contact_info && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="phone" size={18} color="#757575" style={styles.detailIcon} />
              <Text style={styles.detailLabel}>İletişim:</Text>
              <Text style={styles.detailValue}>{item.contact_info}</Text>
            </View>
          )}
          
          {item.address && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="map-marker" size={18} color="#757575" style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Adres:</Text>
              <Text style={styles.detailValue}>{item.address}</Text>
            </View>
          )}
        </Card.Content>
        
        <Card.Actions style={styles.cardActions}>
          <Button 
            mode="text" 
            icon="eye" 
            onPress={() => navigation.navigate('ClinicDetail', { clinicId: item.id })}
          >
            Detaylar
          </Button>
          
          {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
            <Button 
              mode="text" 
              icon="pencil" 
              onPress={() => navigation.navigate('EditClinic', { clinicId: item.id })}
            >
              Düzenle
            </Button>
          )}
          
          <Button 
            mode="text" 
            icon={item.status === 'active' ? "close-circle" : "check-circle"} 
            textColor={item.status === 'active' ? "#E53935" : "#43A047"}
            onPress={() => console.log('Durum Değiştir:', item.id)}
          >
            {item.status === 'active' ? 'Pasif Yap' : 'Aktif Yap'}
          </Button>
        </Card.Actions>
      </Card>
    </TouchableOpacity>
  );

  const renderFilterChips = () => {
    // Eğer kullanıcı field_user veya regional_manager ise, bölge filtreleme seçeneğini gösterme
    const showRegionFilter = currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager');
    
    return (
      <View style={styles.filterChipsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSortMenu(true)}
          >
            <Text style={styles.sortButtonText}>
              <MaterialCommunityIcons name="sort-variant" size={14} color="#424242" />
              {' '}{getSortText()}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={14} color="#424242" />
          </TouchableOpacity>
          
          <Chip
            selected={filterStatus === null}
            onPress={() => setFilterStatus(null)}
            style={styles.filterChip}
            showSelectedOverlay
          >
            Tüm Klinikler
          </Chip>
          <Chip
            selected={filterStatus === 'active'}
            onPress={() => setFilterStatus('active')}
            style={styles.filterChip}
            showSelectedOverlay
          >
            Aktif
          </Chip>
          <Chip
            selected={filterStatus === 'inactive'}
            onPress={() => setFilterStatus('inactive')}
            style={styles.filterChip}
            showSelectedOverlay
          >
            Pasif
          </Chip>
          
          {showRegionFilter && (
            <Chip
              selected={filterRegion !== null}
              onPress={() => setShowFilterModal(true)}
              style={styles.filterChip}
              showSelectedOverlay
              icon="map-marker"
            >
              Bölge
            </Chip>
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Klinikler" />
        <Appbar.Action icon="filter" onPress={() => setShowFilterModal(true)} />
        <Appbar.Action icon="magnify" onPress={() => {}} />
      </Appbar.Header>
      
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Klinik adı, kişi veya adres ara"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        
        {renderFilterChips()}
        
        <Menu
          visible={showSortMenu}
          onDismiss={() => setShowSortMenu(false)}
          anchor={
            <Appbar.Action 
              icon="sort" 
              onPress={() => setShowSortMenu(true)} 
            />
          }
        >
          <Menu.Item 
            onPress={() => {
              setSortOption('name_asc');
              setShowSortMenu(false);
            }} 
            title="İsme Göre (A-Z)" 
          />
          <Menu.Item 
            onPress={() => {
              setSortOption('name_desc');
              setShowSortMenu(false);
            }} 
            title="İsme Göre (Z-A)" 
          />
          <Menu.Item 
            onPress={() => {
              setSortOption('created_asc');
              setShowSortMenu(false);
            }} 
            title="Oluşturulma Tarihi (Eski-Yeni)" 
          />
          <Menu.Item 
            onPress={() => {
              setSortOption('created_desc');
              setShowSortMenu(false);
            }} 
            title="Oluşturulma Tarihi (Yeni-Eski)" 
          />
        </Menu>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Klinikler yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredClinics}
          renderItem={renderClinic}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="hospital-building" size={80} color="#BDBDBD" />
              <Text style={styles.emptyText}>Hiç klinik bulunamadı</Text>
              <Text style={styles.emptySubtext}>Yeni bir klinik ekleyin veya arama kriterlerinizi değiştirin</Text>
            </View>
          }
        />
      )}

      {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
        <FAB
          style={styles.fab}
          icon="plus"
          label="Yeni Klinik"
          onPress={() => navigation.navigate('CreateClinic')}
        />
      )}

      <Portal>
        <Modal
          visible={showFilterModal}
          onDismiss={() => setShowFilterModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Title style={styles.modalTitle}>Filtreler</Title>
          <Divider style={styles.modalDivider} />
          
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Bölge</Text>
            <View style={styles.filterOptions}>
              <Chip
                selected={filterRegion === null}
                onPress={() => setFilterRegion(null)}
                style={styles.filterChip}
              >
                Tümü
              </Chip>
              {regions.map((region) => (
                <Chip
                  key={region.id}
                  selected={filterRegion === region.id}
                  onPress={() => setFilterRegion(region.id)}
                  style={styles.filterChip}
                >
                  {region.name}
                </Chip>
              ))}
            </View>
          </View>
          
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Durum</Text>
            <View style={styles.filterOptions}>
              <Chip
                selected={filterStatus === null}
                onPress={() => setFilterStatus(null)}
                style={styles.filterChip}
              >
                Tümü
              </Chip>
              <Chip
                selected={filterStatus === 'active'}
                onPress={() => setFilterStatus('active')}
                style={styles.filterChip}
              >
                Aktif
              </Chip>
              <Chip
                selected={filterStatus === 'inactive'}
                onPress={() => setFilterStatus('inactive')}
                style={styles.filterChip}
              >
                Pasif
              </Chip>
            </View>
          </View>
          
          <Button
            mode="contained"
            onPress={() => {
              setShowFilterModal(false);
              fetchClinics();
            }}
            style={styles.applyButton}
          >
            Uygula
          </Button>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBar: {
    elevation: 0,
    backgroundColor: '#f5f5f5',
  },
  filterChipsContainer: {
    marginTop: 12,
    flexDirection: 'row',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
  },
  sortButtonText: {
    fontSize: 12,
    color: '#424242',
    marginRight: 4,
  },
  sortMenu: {
    marginTop: 45,
  },
  filterChip: {
    marginRight: 8,
  },
  listContainer: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#757575',
  },
  cardContainer: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardRegion: {
    fontSize: 14,
    color: '#757575',
  },
  statusChip: {
    height: 28,
  },
  divider: {
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    marginRight: 8,
  },
  detailLabel: {
    color: '#757575',
    fontWeight: '500',
    marginRight: 4,
    width: 100,
  },
  detailValue: {
    flex: 1,
    fontWeight: '400',
  },
  cardActions: {
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  modalDivider: {
    marginBottom: 20,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  applyButton: {
    marginTop: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#757575',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 8,
    textAlign: 'center',
  }
}); 