import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, RefreshControl, Alert, ScrollView } from 'react-native';
import { Appbar, Text, Card, Button, Divider, TextInput, Dialog, Portal, Searchbar, useTheme, ActivityIndicator, Chip, Menu, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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
  regions?: { name: string };
};

export const ClinicManagementScreen = () => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [regions, setRegions] = useState<{id: number, name: string}[]>([]);
  const [filterRegion, setFilterRegion] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<string>('name_asc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // Klinik düzenleme state'leri
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [clinicName, setClinicName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [address, setAddress] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  
  const theme = useTheme();
  const navigation = useNavigation();

  useEffect(() => {
    loadCurrentUser();
    fetchRegions();
    fetchClinics();
  }, [filterRegion, filterStatus, sortOption]);

  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
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
      
      // Filtreleri uygula
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

  const handleAddClinic = async () => {
    if (!clinicName.trim()) {
      Alert.alert('Uyarı', 'Lütfen klinik adı girin');
      return;
    }
    
    if (selectedRegion === null) {
      Alert.alert('Uyarı', 'Lütfen bir bölge seçin');
      return;
    }
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('clinics')
        .insert({
          name: clinicName.trim(),
          contact_person: contactPerson.trim() || null,
          contact_info: contactInfo.trim() || null,
          address: address.trim() || null,
          region_id: selectedRegion,
          status: status
        })
        .select()
        .single();
      
      if (error) {
        console.error('Klinik eklenirken hata:', error);
        Alert.alert('Hata', 'Klinik eklenirken bir sorun oluştu');
        return;
      }
      
      // Form alanlarını temizle
      clearFormFields();
      setShowAddDialog(false);
      
      // Klinikleri yeniden yükle
      fetchClinics();
      Alert.alert('Başarılı', 'Klinik başarıyla eklendi');
    } catch (error) {
      console.error('Klinik eklenirken hata:', error);
      Alert.alert('Hata', 'Klinik eklenirken bir sorun oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClinic = async () => {
    if (!selectedClinic) return;
    
    if (!clinicName.trim()) {
      Alert.alert('Uyarı', 'Lütfen klinik adı girin');
      return;
    }
    
    if (selectedRegion === null) {
      Alert.alert('Uyarı', 'Lütfen bir bölge seçin');
      return;
    }
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('clinics')
        .update({
          name: clinicName.trim(),
          contact_person: contactPerson.trim() || null,
          contact_info: contactInfo.trim() || null,
          address: address.trim() || null,
          region_id: selectedRegion,
          status: status
        })
        .eq('id', selectedClinic.id)
        .select()
        .single();
      
      if (error) {
        console.error('Klinik güncellenirken hata:', error);
        Alert.alert('Hata', 'Klinik güncellenirken bir sorun oluştu');
        return;
      }
      
      // Form alanlarını temizle
      clearFormFields();
      setShowEditDialog(false);
      setSelectedClinic(null);
      
      // Klinikleri yeniden yükle
      fetchClinics();
      Alert.alert('Başarılı', 'Klinik başarıyla güncellendi');
    } catch (error) {
      console.error('Klinik güncellenirken hata:', error);
      Alert.alert('Hata', 'Klinik güncellenirken bir sorun oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClinic = async () => {
    if (!selectedClinic) return;
    
    try {
      setLoading(true);
      
      // Önce bu kliniğe ait teklif, ameliyat raporu veya ziyaret raporu var mı kontrol et
      const { data: proposalData, error: proposalError } = await supabase
        .from('proposals')
        .select('id')
        .eq('clinic_id', selectedClinic.id);
      
      if (proposalError) {
        console.error('Teklifler kontrol edilirken hata:', proposalError);
      }
      
      if (proposalData && proposalData.length > 0) {
        Alert.alert(
          'Uyarı', 
          'Bu kliniğe ait teklifler var. Silmeden önce teklifleri başka bir kliniğe taşıyın veya silin.'
        );
        setShowDeleteDialog(false);
        setLoading(false);
        return;
      }
      
      const { error } = await supabase
        .from('clinics')
        .delete()
        .eq('id', selectedClinic.id);
      
      if (error) {
        console.error('Klinik silinirken hata:', error);
        Alert.alert('Hata', 'Klinik silinirken bir sorun oluştu');
        return;
      }
      
      setShowDeleteDialog(false);
      setSelectedClinic(null);
      
      // Klinikleri yeniden yükle
      fetchClinics();
      Alert.alert('Başarılı', 'Klinik başarıyla silindi');
    } catch (error) {
      console.error('Klinik silinirken hata:', error);
      Alert.alert('Hata', 'Klinik silinirken bir sorun oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPress = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setClinicName(clinic.name);
    setContactPerson(clinic.contact_person || '');
    setContactInfo(clinic.contact_info || '');
    setAddress(clinic.address || '');
    setSelectedRegion(clinic.region_id);
    setStatus(clinic.status);
    setShowEditDialog(true);
  };

  const handleDeletePress = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setShowDeleteDialog(true);
  };

  const handleStatusToggle = async (clinic: Clinic) => {
    try {
      setLoading(true);
      
      const newStatus = clinic.status === 'active' ? 'inactive' : 'active';
      
      const { error } = await supabase
        .from('clinics')
        .update({ status: newStatus })
        .eq('id', clinic.id);
      
      if (error) {
        console.error('Klinik durumu güncellenirken hata:', error);
        Alert.alert('Hata', 'Klinik durumu güncellenirken bir sorun oluştu');
        return;
      }
      
      // Klinikleri yeniden yükle
      fetchClinics();
    } catch (error) {
      console.error('Klinik durumu güncellenirken hata:', error);
      Alert.alert('Hata', 'Klinik durumu güncellenirken bir sorun oluştu');
    } finally {
      setLoading(false);
    }
  };

  const clearFormFields = () => {
    setClinicName('');
    setContactPerson('');
    setContactInfo('');
    setAddress('');
    setSelectedRegion(null);
    setStatus('active');
  };

  const canManageClinics = () => {
    if (!currentUser) return false;
    return ['admin', 'manager'].includes(currentUser.role);
  };

  // Filtrelenmiş klinikler
  const filteredClinics = clinics.filter(clinic => 
    clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (clinic.contact_person && clinic.contact_person.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (clinic.address && clinic.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getSortText = () => {
    switch (sortOption) {
      case 'name_asc': return 'İsim (A-Z)';
      case 'name_desc': return 'İsim (Z-A)';
      case 'created_asc': return 'Eklenme (Eski-Yeni)';
      case 'created_desc': return 'Eklenme (Yeni-Eski)';
      default: return 'Sırala';
    }
  };

  const renderClinic = ({ item }: { item: Clinic }) => (
    <Card style={styles.card} elevation={1}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.clinicName}>{item.name}</Text>
            {item.regions && (
              <Text style={styles.regionName}>{item.regions.name}</Text>
            )}
          </View>
          <Chip 
            mode="outlined" 
            style={{ 
              borderColor: item.status === 'active' ? theme.colors.primary : theme.colors.error 
            }}
            textStyle={{ 
              color: item.status === 'active' ? theme.colors.primary : theme.colors.error 
            }}
          >
            {item.status === 'active' ? 'Aktif' : 'Pasif'}
          </Chip>
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.detailsContainer}>
          {item.contact_person && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="account" size={16} color="#6B7280" />
              <Text style={styles.detailLabel}>İlgili Kişi:</Text>
              <Text style={styles.detailValue}>{item.contact_person}</Text>
            </View>
          )}
          
          {item.contact_info && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="phone" size={16} color="#6B7280" />
              <Text style={styles.detailLabel}>İletişim:</Text>
              <Text style={styles.detailValue}>{item.contact_info}</Text>
            </View>
          )}
          
          {item.address && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="map-marker" size={16} color="#6B7280" />
              <Text style={styles.detailLabel}>Adres:</Text>
              <Text style={styles.detailValue}>{item.address}</Text>
            </View>
          )}
        </View>
      </Card.Content>
      
      {canManageClinics() && (
        <Card.Actions style={styles.cardActions}>
          <Button 
            mode="text" 
            icon="pencil" 
            onPress={() => handleEditPress(item)}
          >
            Düzenle
          </Button>
          <Button 
            mode="text" 
            icon={item.status === 'active' ? 'close-circle-outline' : 'check-circle-outline'} 
            textColor={item.status === 'active' ? theme.colors.error : theme.colors.primary}
            onPress={() => handleStatusToggle(item)}
          >
            {item.status === 'active' ? 'Pasif Yap' : 'Aktif Yap'}
          </Button>
          <Button 
            mode="text" 
            icon="delete" 
            textColor={theme.colors.error}
            onPress={() => handleDeletePress(item)}
          >
            Sil
          </Button>
        </Card.Actions>
      )}
    </Card>
  );

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Klinik Yönetimi" />
        <Appbar.Action icon="magnify" onPress={() => {}} />
      </Appbar.Header>
      
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Klinik ara..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          <TouchableOpacity 
            style={styles.sortButton}
            onPress={() => setShowSortMenu(true)}
          >
            <MaterialCommunityIcons name="sort-variant" size={16} color="#6B7280" />
            <Text style={styles.sortButtonText}>{getSortText()}</Text>
          </TouchableOpacity>
          
          <Chip
            selected={filterRegion === null}
            onPress={() => setFilterRegion(null)}
            style={styles.filterChip}
          >
            Tüm Bölgeler
          </Chip>
          
          {regions.map(region => (
            <Chip
              key={region.id}
              selected={filterRegion === region.id}
              onPress={() => setFilterRegion(region.id)}
              style={styles.filterChip}
            >
              {region.name}
            </Chip>
          ))}
          
          <View style={{ width: 8 }} />
          
          <Chip
            selected={filterStatus === null}
            onPress={() => setFilterStatus(null)}
            style={styles.filterChip}
          >
            Tüm Durumlar
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
        </ScrollView>
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="hospital-building" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Hiç klinik bulunamadı</Text>
              {canManageClinics() && (
                <Button 
                  mode="contained" 
                  onPress={() => setShowAddDialog(true)}
                  style={styles.createButton}
                  icon="plus"
                >
                  Yeni Klinik Ekle
                </Button>
              )}
            </View>
          }
        />
      )}
      
      {canManageClinics() && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => {
            clearFormFields();
            setShowAddDialog(true);
          }}
        >
          <MaterialCommunityIcons name="plus" size={24} color="white" />
        </TouchableOpacity>
      )}
      
      {/* Yeni Klinik Ekleme Dialog */}
      <Portal>
        <Dialog visible={showAddDialog} onDismiss={() => setShowAddDialog(false)}>
          <Dialog.Title>Yeni Klinik Ekle</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Klinik Adı *"
              value={clinicName}
              onChangeText={setClinicName}
              style={styles.input}
            />
            
            <TextInput
              mode="outlined"
              label="İlgili Kişi"
              value={contactPerson}
              onChangeText={setContactPerson}
              style={styles.input}
            />
            
            <TextInput
              mode="outlined"
              label="İletişim Bilgisi"
              value={contactInfo}
              onChangeText={setContactInfo}
              style={styles.input}
            />
            
            <TextInput
              mode="outlined"
              label="Adres"
              value={address}
              onChangeText={setAddress}
              multiline
              style={styles.input}
            />
            
            <Text style={styles.selectLabel}>Bölge *</Text>
            <View style={styles.regionsContainer}>
              {regions.map(region => (
                <Chip
                  key={region.id}
                  selected={selectedRegion === region.id}
                  onPress={() => setSelectedRegion(region.id)}
                  style={styles.regionChip}
                  showSelectedOverlay
                >
                  {region.name}
                </Chip>
              ))}
            </View>
            
            <Text style={styles.selectLabel}>Durum</Text>
            <View style={styles.statusContainer}>
              <Chip
                selected={status === 'active'}
                onPress={() => setStatus('active')}
                style={styles.statusChip}
                showSelectedOverlay
              >
                Aktif
              </Chip>
              <Chip
                selected={status === 'inactive'}
                onPress={() => setStatus('inactive')}
                style={styles.statusChip}
                showSelectedOverlay
              >
                Pasif
              </Chip>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowAddDialog(false)}>İptal</Button>
            <Button onPress={handleAddClinic} disabled={loading}>Ekle</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Klinik Düzenleme Dialog */}
      <Portal>
        <Dialog visible={showEditDialog} onDismiss={() => setShowEditDialog(false)}>
          <Dialog.Title>Klinik Düzenle</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Klinik Adı *"
              value={clinicName}
              onChangeText={setClinicName}
              style={styles.input}
            />
            
            <TextInput
              mode="outlined"
              label="İlgili Kişi"
              value={contactPerson}
              onChangeText={setContactPerson}
              style={styles.input}
            />
            
            <TextInput
              mode="outlined"
              label="İletişim Bilgisi"
              value={contactInfo}
              onChangeText={setContactInfo}
              style={styles.input}
            />
            
            <TextInput
              mode="outlined"
              label="Adres"
              value={address}
              onChangeText={setAddress}
              multiline
              style={styles.input}
            />
            
            <Text style={styles.selectLabel}>Bölge *</Text>
            <View style={styles.regionsContainer}>
              {regions.map(region => (
                <Chip
                  key={region.id}
                  selected={selectedRegion === region.id}
                  onPress={() => setSelectedRegion(region.id)}
                  style={styles.regionChip}
                  showSelectedOverlay
                >
                  {region.name}
                </Chip>
              ))}
            </View>
            
            <Text style={styles.selectLabel}>Durum</Text>
            <View style={styles.statusContainer}>
              <Chip
                selected={status === 'active'}
                onPress={() => setStatus('active')}
                style={styles.statusChip}
                showSelectedOverlay
              >
                Aktif
              </Chip>
              <Chip
                selected={status === 'inactive'}
                onPress={() => setStatus('inactive')}
                style={styles.statusChip}
                showSelectedOverlay
              >
                Pasif
              </Chip>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowEditDialog(false)}>İptal</Button>
            <Button onPress={handleUpdateClinic} disabled={loading}>Güncelle</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Klinik Silme Dialog */}
      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>Klinik Sil</Dialog.Title>
          <Dialog.Content>
            <Text>
              "{selectedClinic?.name}" kliniğini silmek istediğinizden emin misiniz?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>İptal</Button>
            <Button onPress={handleDeleteClinic} disabled={loading} textColor={theme.colors.error}>Sil</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Sıralama Menu */}
      <Menu
        visible={showSortMenu}
        onDismiss={() => setShowSortMenu(false)}
        anchor={{ x: 20, y: 130 }}
      >
        <Menu.Item
          title="İsim (A-Z)"
          onPress={() => {
            setSortOption('name_asc');
            setShowSortMenu(false);
          }}
          leadingIcon="sort-alphabetical-ascending"
          trailingIcon={sortOption === 'name_asc' ? 'check' : undefined}
        />
        <Menu.Item
          title="İsim (Z-A)"
          onPress={() => {
            setSortOption('name_desc');
            setShowSortMenu(false);
          }}
          leadingIcon="sort-alphabetical-descending"
          trailingIcon={sortOption === 'name_desc' ? 'check' : undefined}
        />
        <Divider />
        <Menu.Item
          title="Eklenme (Eski-Yeni)"
          onPress={() => {
            setSortOption('created_asc');
            setShowSortMenu(false);
          }}
          leadingIcon="sort-calendar-ascending"
          trailingIcon={sortOption === 'created_asc' ? 'check' : undefined}
        />
        <Menu.Item
          title="Eklenme (Yeni-Eski)"
          onPress={() => {
            setSortOption('created_desc');
            setShowSortMenu(false);
          }}
          leadingIcon="sort-calendar-descending"
          trailingIcon={sortOption === 'created_desc' ? 'check' : undefined}
        />
      </Menu>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  searchContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchBar: {
    elevation: 0,
    backgroundColor: '#F3F4F6',
  },
  filterContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  sortButtonText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  filterChip: {
    marginRight: 8,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  clinicName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  regionName: {
    fontSize: 14,
    color: '#6B7280',
  },
  divider: {
    marginVertical: 12,
  },
  detailsContainer: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    marginLeft: 8,
    marginRight: 4,
    fontSize: 14,
    color: '#6B7280',
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  cardActions: {
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#6366F1',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 16,
    color: '#6B7280',
  },
  createButton: {
    marginTop: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  selectLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  regionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  regionChip: {
    margin: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statusChip: {
    marginRight: 8,
  },
}); 