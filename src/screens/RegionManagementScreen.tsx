import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, RefreshControl, Alert } from 'react-native';
import { Appbar, Text, Card, FAB, Button, Dialog, Portal, TextInput, ActivityIndicator, useTheme, Chip, Searchbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Region, User } from '../types';
import { getCurrentUser } from '../services/authService';

export const RegionManagementScreen = () => {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [regionName, setRegionName] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  
  const navigation = useNavigation();
  const theme = useTheme();

  useEffect(() => {
    loadCurrentUser();
    fetchRegions();
  }, []);

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
      setLoading(true);
      
      const { data, error } = await supabase
        .from('regions')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Bölgeler yüklenirken hata:', error);
        Alert.alert('Hata', 'Bölgeler yüklenirken bir sorun oluştu');
        return;
      }
      
      setRegions(data || []);
    } catch (error) {
      console.error('Bölgeler çekilirken hata:', error);
      Alert.alert('Hata', 'Bölgeler çekilirken bir sorun oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRegions();
  };

  const handleAddRegion = async () => {
    if (!regionName.trim()) {
      Alert.alert('Uyarı', 'Lütfen bölge adı girin');
      return;
    }
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('regions')
        .insert({ name: regionName.trim() })
        .select()
        .single();
      
      if (error) {
        console.error('Bölge eklenirken hata:', error);
        Alert.alert('Hata', 'Bölge eklenirken bir sorun oluştu');
        return;
      }
      
      setRegions([...regions, data]);
      setShowAddDialog(false);
      setRegionName('');
      Alert.alert('Başarılı', 'Bölge başarıyla eklendi');
    } catch (error) {
      console.error('Bölge eklenirken hata:', error);
      Alert.alert('Hata', 'Bölge eklenirken bir sorun oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRegion = async () => {
    if (!selectedRegion) return;
    if (!regionName.trim()) {
      Alert.alert('Uyarı', 'Lütfen bölge adı girin');
      return;
    }
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('regions')
        .update({ name: regionName.trim() })
        .eq('id', selectedRegion.id)
        .select()
        .single();
      
      if (error) {
        console.error('Bölge güncellenirken hata:', error);
        Alert.alert('Hata', 'Bölge güncellenirken bir sorun oluştu');
        return;
      }
      
      setRegions(regions.map(region => region.id === selectedRegion.id ? data : region));
      setShowEditDialog(false);
      setSelectedRegion(null);
      setRegionName('');
      Alert.alert('Başarılı', 'Bölge başarıyla güncellendi');
    } catch (error) {
      console.error('Bölge güncellenirken hata:', error);
      Alert.alert('Hata', 'Bölge güncellenirken bir sorun oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRegion = async () => {
    if (!selectedRegion) return;
    
    try {
      setLoading(true);
      
      // Önce bu bölgeye ait kullanıcı var mı kontrol et
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('region_id', selectedRegion.id);
      
      if (userError) {
        console.error('Kullanıcılar kontrol edilirken hata:', userError);
        Alert.alert('Hata', 'Bölgeye ait kullanıcılar kontrol edilirken bir sorun oluştu');
        return;
      }
      
      if (userData && userData.length > 0) {
        Alert.alert(
          'Uyarı', 
          'Bu bölgeye atanmış kullanıcılar var. Lütfen önce kullanıcıların bölgelerini değiştirin.'
        );
        setShowDeleteDialog(false);
        return;
      }
      
      // Önce bu bölgeye ait klinik var mı kontrol et
      const { data: clinicData, error: clinicError } = await supabase
        .from('clinics')
        .select('id')
        .eq('region_id', selectedRegion.id);
      
      if (clinicError) {
        console.error('Klinikler kontrol edilirken hata:', clinicError);
        Alert.alert('Hata', 'Bölgeye ait klinikler kontrol edilirken bir sorun oluştu');
        return;
      }
      
      if (clinicData && clinicData.length > 0) {
        Alert.alert(
          'Uyarı', 
          'Bu bölgeye atanmış klinikler var. Lütfen önce kliniklerin bölgelerini değiştirin.'
        );
        setShowDeleteDialog(false);
        return;
      }
      
      // Şimdi bölgeyi silebiliriz
      const { error } = await supabase
        .from('regions')
        .delete()
        .eq('id', selectedRegion.id);
      
      if (error) {
        console.error('Bölge silinirken hata:', error);
        Alert.alert('Hata', 'Bölge silinirken bir sorun oluştu');
        return;
      }
      
      setRegions(regions.filter(region => region.id !== selectedRegion.id));
      setShowDeleteDialog(false);
      setSelectedRegion(null);
      Alert.alert('Başarılı', 'Bölge başarıyla silindi');
    } catch (error) {
      console.error('Bölge silinirken hata:', error);
      Alert.alert('Hata', 'Bölge silinirken bir sorun oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPress = (region: Region) => {
    setSelectedRegion(region);
    setRegionName(region.name);
    setShowEditDialog(true);
  };

  const handleDeletePress = (region: Region) => {
    setSelectedRegion(region);
    setShowDeleteDialog(true);
  };

  const canManageRegions = () => {
    if (!currentUser) return false;
    return ['admin', 'manager'].includes(currentUser.role);
  };

  // Filtered regions
  const filteredRegions = regions.filter(region => 
    region.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderRegionCard = ({ item }: { item: Region }) => (
    <Card style={styles.card} elevation={1}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.regionName}>{item.name}</Text>
          </View>
        </View>
      </Card.Content>
      
      {canManageRegions() && (
        <Card.Actions style={styles.cardActions}>
          <Button 
            icon="pencil" 
            mode="text" 
            onPress={() => handleEditPress(item)}
          >
            Düzenle
          </Button>
          <Button 
            icon="delete" 
            mode="text" 
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
        <Appbar.Content title="Bölge Yönetimi" />
        <Appbar.Action icon="magnify" onPress={() => {}} />
      </Appbar.Header>
      
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Bölge ara..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Bölgeler yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRegions}
          renderItem={renderRegionCard}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="map-marker-off" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Hiç bölge bulunamadı</Text>
              {canManageRegions() && (
                <Button 
                  mode="contained" 
                  onPress={() => setShowAddDialog(true)}
                  style={styles.createButton}
                  icon="plus"
                >
                  Yeni Bölge Ekle
                </Button>
              )}
            </View>
          }
        />
      )}
      
      {canManageRegions() && (
        <FAB
          style={styles.fab}
          icon="plus"
          onPress={() => setShowAddDialog(true)}
        />
      )}
      
      {/* Yeni Bölge Ekleme Dialog */}
      <Portal>
        <Dialog visible={showAddDialog} onDismiss={() => setShowAddDialog(false)}>
          <Dialog.Title>Yeni Bölge Ekle</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Bölge Adı"
              value={regionName}
              onChangeText={setRegionName}
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowAddDialog(false)}>İptal</Button>
            <Button onPress={handleAddRegion} disabled={loading}>Ekle</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Bölge Düzenleme Dialog */}
      <Portal>
        <Dialog visible={showEditDialog} onDismiss={() => setShowEditDialog(false)}>
          <Dialog.Title>Bölge Düzenle</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Bölge Adı"
              value={regionName}
              onChangeText={setRegionName}
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowEditDialog(false)}>İptal</Button>
            <Button onPress={handleUpdateRegion} disabled={loading}>Güncelle</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Bölge Silme Dialog */}
      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>Bölge Sil</Dialog.Title>
          <Dialog.Content>
            <Text>
              "{selectedRegion?.name}" bölgesini silmek istediğinizden emin misiniz?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>İptal</Button>
            <Button onPress={handleDeleteRegion} disabled={loading} textColor={theme.colors.error}>Sil</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchBar: {
    elevation: 0,
    backgroundColor: '#F3F4F6',
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
    alignItems: 'center',
  },
  regionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  cardActions: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    justifyContent: 'flex-end',
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
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 24,
  },
  createButton: {
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  input: {
    marginBottom: 16,
  },
}); 