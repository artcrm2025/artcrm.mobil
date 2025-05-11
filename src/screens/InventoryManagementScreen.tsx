import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert, TextInput as RNTextInput } from 'react-native';
import { Text, Card, Title, Button, DataTable, IconButton, Searchbar, FAB, Modal, Portal, TextInput, SegmentedButtons, Menu, Divider, Chip, useTheme, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../services/authService';
import { User, UserRole, Product } from '../types';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type InventoryManagementScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'InventoryManagementScreen'>;

interface InventoryItem extends Product {
  stock_level: number;
  min_stock_level: number;
  location?: string;
  last_updated?: string;
  inventory_status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

const InventoryManagementScreen = () => {
  const navigation = useNavigation<InventoryManagementScreenNavigationProp>();
  const theme = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'stock_level' | 'category'>('name');
  const [sortOrder, setSortOrder] = useState<'ascending' | 'descending'>('ascending');
  const [page, setPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [categories, setCategories] = useState<string[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [stockUpdateValue, setStockUpdateValue] = useState('');
  const [locationValue, setLocationValue] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState(10);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, statusFilter, categoryFilter, inventoryItems, sortBy, sortOrder]);

  const loadData = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      if (currentUser) {
        await fetchInventory(currentUser);
      }
    } catch (error) {
      console.error('Envanter verisi yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async (currentUser: User) => {
    try {
      let query = supabase.from('products').select('*');
      
      if (currentUser.role === 'regional_manager') {
        // Bölge müdürleri sadece kendi bölgelerindeki envanter öğelerini görür
        query = query.eq('region_id', currentUser.region_id);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Envanter veri çekme hatası:', error);
        return;
      }
      
      // Kategori listesini oluştur
      const uniqueCategories = new Set<string>();
      
      // Mock envanter verisi oluştur (gerçek bir uygulama için bu veri veritabanından gelmeli)
      const items: InventoryItem[] = data.map(product => {
        if (product.category) {
          uniqueCategories.add(product.category);
        }
        
        const stockLevel = Math.floor(Math.random() * 50); // Demo için rastgele stok seviyesi
        const minStockLevel = 5;
        
        let inventoryStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
        if (stockLevel === 0) {
          inventoryStatus = 'out_of_stock';
        } else if (stockLevel <= minStockLevel) {
          inventoryStatus = 'low_stock';
        }
        
        return {
          ...product,
          stock_level: stockLevel,
          min_stock_level: minStockLevel,
          location: `Depo ${Math.floor(Math.random() * 3) + 1}`, // Demo için rastgele konum
          last_updated: new Date().toISOString(),
          inventory_status: inventoryStatus
        };
      });
      
      setInventoryItems(items);
      setFilteredItems(items);
      setCategories(Array.from(uniqueCategories));
      
    } catch (error) {
      console.error('Envanter verisi işleme hatası:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...inventoryItems];
    
    // Arama filtresi
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Durum filtresi
    if (statusFilter) {
      filtered = filtered.filter(item => item.inventory_status === statusFilter);
    }
    
    // Kategori filtresi
    if (categoryFilter) {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }
    
    // Sıralama
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'stock_level') {
        comparison = a.stock_level - b.stock_level;
      } else if (sortBy === 'category') {
        comparison = (a.category || '').localeCompare(b.category || '');
      }
      
      return sortOrder === 'ascending' ? comparison : -comparison;
    });
    
    setFilteredItems(filtered);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter(null);
    setCategoryFilter(null);
    setSortBy('name');
    setSortOrder('ascending');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock': return '#4CAF50';
      case 'low_stock': return '#FF9800';
      case 'out_of_stock': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in_stock': return 'Stokta';
      case 'low_stock': return 'Az Stok';
      case 'out_of_stock': return 'Tükendi';
      default: return status;
    }
  };

  const handleUpdateStock = async () => {
    if (!selectedItem) return;
    
    try {
      const stockValue = parseInt(stockUpdateValue);
      
      if (isNaN(stockValue) || stockValue < 0) {
        Alert.alert('Hata', 'Geçerli bir stok miktarı giriniz.');
        return;
      }
      
      // Gerçek uygulamada burada veritabanı güncellemesi yapılır
      
      // Mevcut durumda yerel state'i güncelliyoruz
      const updatedItems = inventoryItems.map(item => {
        if (item.id === selectedItem.id) {
          let status: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
          
          if (stockValue === 0) {
            status = 'out_of_stock';
          } else if (stockValue <= item.min_stock_level) {
            status = 'low_stock';
          }
          
          return {
            ...item,
            stock_level: stockValue,
            location: locationValue || item.location,
            last_updated: new Date().toISOString(),
            inventory_status: status
          };
        }
        return item;
      });
      
      setInventoryItems(updatedItems);
      setModalVisible(false);
      setStockUpdateValue('');
      setLocationValue('');
      
      Alert.alert('Başarılı', 'Stok bilgisi güncellendi.');
    } catch (error) {
      console.error('Stok güncelleme hatası:', error);
      Alert.alert('Hata', 'Stok güncellenirken bir sorun oluştu.');
    }
  };

  const openUpdateModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setStockUpdateValue(item.stock_level.toString());
    setLocationValue(item.location || '');
    setModalVisible(true);
  };

  const fromPage = page * itemsPerPage;
  const toPage = Math.min((page + 1) * itemsPerPage, filteredItems.length);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Envanter verisi yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.headerContainer}>
          <LinearGradient
            colors={['#4e54c8', '#8f94fb']}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.headerTitle}>Envanter Yönetimi</Text>
            <Text style={styles.headerSubtitle}>
              Stok seviyelerini takip edin ve yönetin
            </Text>
          </LinearGradient>
        </View>
        
        <View style={styles.searchAndFilterContainer}>
          <Searchbar
            placeholder="Ürün ara..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
          />
          
          <View style={styles.filterContainer}>
            <Text style={styles.filterTitle}>Filtreler:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipContainer}>
                <Menu
                  visible={menuVisible}
                  onDismiss={() => setMenuVisible(false)}
                  anchor={
                    <Button 
                      mode="outlined" 
                      onPress={() => setMenuVisible(true)}
                      icon="filter-variant"
                      style={styles.filterButton}
                    >
                      Filtrele
                    </Button>
                  }
                >
                  <Menu.Item 
                    title="Durum Filtresi" 
                    disabled={true} 
                    titleStyle={{ fontWeight: "bold" }}
                  />
                  <Divider />
                  <Menu.Item
                    onPress={() => {
                      setStatusFilter('in_stock');
                      setMenuVisible(false);
                    }}
                    title="Stokta"
                    trailingIcon={statusFilter === 'in_stock' ? 'check' : undefined}
                  />
                  <Menu.Item
                    onPress={() => {
                      setStatusFilter('low_stock');
                      setMenuVisible(false);
                    }}
                    title="Az Stok"
                    trailingIcon={statusFilter === 'low_stock' ? 'check' : undefined}
                  />
                  <Menu.Item
                    onPress={() => {
                      setStatusFilter('out_of_stock');
                      setMenuVisible(false);
                    }}
                    title="Tükendi"
                    trailingIcon={statusFilter === 'out_of_stock' ? 'check' : undefined}
                  />
                  <Divider />
                  <Menu.Item
                    onPress={() => {
                      setStatusFilter(null);
                      setMenuVisible(false);
                    }}
                    title="Filtreyi Temizle"
                    leadingIcon="close"
                  />
                </Menu>
                
                {statusFilter && (
                  <Chip
                    icon="filter-remove"
                    onPress={() => setStatusFilter(null)}
                    style={styles.activeFilterChip}
                  >
                    Durum: {getStatusText(statusFilter)}
                  </Chip>
                )}
                
                {categories.length > 0 && (
                  <Menu
                    visible={!!categoryFilter}
                    onDismiss={() => setCategoryFilter(null)}
                    anchor={
                      <Button 
                        mode="outlined" 
                        onPress={() => setCategoryFilter(categories[0])}
                        icon="shape"
                        style={styles.filterButton}
                      >
                        Kategori
                      </Button>
                    }
                  >
                    <Menu.Item 
                      title="Kategori Filtresi" 
                      disabled={true} 
                      titleStyle={{ fontWeight: "bold" }}
                    />
                    <Divider />
                    {categories.map(category => (
                      <Menu.Item
                        key={category}
                        onPress={() => {
                          setCategoryFilter(category);
                        }}
                        title={category}
                        trailingIcon={categoryFilter === category ? 'check' : undefined}
                      />
                    ))}
                    <Divider />
                    <Menu.Item
                      onPress={() => {
                        setCategoryFilter(null);
                      }}
                      title="Filtreyi Temizle"
                      leadingIcon="close"
                    />
                  </Menu>
                )}
                
                {categoryFilter && (
                  <Chip
                    icon="filter-remove"
                    onPress={() => setCategoryFilter(null)}
                    style={styles.activeFilterChip}
                  >
                    Kategori: {categoryFilter}
                  </Chip>
                )}
                
                {(statusFilter || categoryFilter || searchQuery) && (
                  <Button 
                    mode="text" 
                    onPress={clearFilters}
                    icon="filter-remove-outline"
                  >
                    Tümünü Temizle
                  </Button>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
        
        <Card style={styles.summaryCard}>
          <Card.Content style={styles.summaryContent}>
            <View style={styles.summaryItem}>
              <MaterialCommunityIcons name="package-variant" size={24} color="#4e54c8" />
              <Text style={styles.summaryValue}>{inventoryItems.length}</Text>
              <Text style={styles.summaryLabel}>Toplam Ürün</Text>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryItem}>
              <MaterialCommunityIcons name="package-variant-closed" size={24} color="#4CAF50" />
              <Text style={styles.summaryValue}>
                {inventoryItems.filter(item => item.inventory_status === 'in_stock').length}
              </Text>
              <Text style={styles.summaryLabel}>Stokta</Text>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryItem}>
              <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#FF9800" />
              <Text style={styles.summaryValue}>
                {inventoryItems.filter(item => item.inventory_status === 'low_stock').length}
              </Text>
              <Text style={styles.summaryLabel}>Az Stok</Text>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryItem}>
              <MaterialCommunityIcons name="package-variant-closed" size={24} color="#F44336" />
              <Text style={styles.summaryValue}>
                {inventoryItems.filter(item => item.inventory_status === 'out_of_stock').length}
              </Text>
              <Text style={styles.summaryLabel}>Tükendi</Text>
            </View>
          </Card.Content>
        </Card>
        
        <DataTable style={styles.table}>
          <DataTable.Header style={styles.tableHeader}>
            <DataTable.Title 
              style={styles.nameColumn}
              sortDirection={sortBy === 'name' ? (sortOrder === 'ascending' ? 'ascending' : 'descending') : undefined}
              onPress={() => {
                setSortBy('name');
                setSortOrder(sortOrder === 'ascending' ? 'descending' : 'ascending');
              }}
            >
              Ürün Adı
            </DataTable.Title>
            <DataTable.Title 
              numeric
              sortDirection={sortBy === 'stock_level' ? (sortOrder === 'ascending' ? 'ascending' : 'descending') : undefined}
              onPress={() => {
                setSortBy('stock_level');
                setSortOrder(sortOrder === 'ascending' ? 'descending' : 'ascending');
              }}
            >
              Stok
            </DataTable.Title>
            <DataTable.Title style={styles.statusColumn}>Durum</DataTable.Title>
            <DataTable.Title 
              style={styles.categoryColumn}
              sortDirection={sortBy === 'category' ? (sortOrder === 'ascending' ? 'ascending' : 'descending') : undefined}
              onPress={() => {
                setSortBy('category');
                setSortOrder(sortOrder === 'ascending' ? 'descending' : 'ascending');
              }}
            >
              Kategori
            </DataTable.Title>
            <DataTable.Title style={styles.actionColumn}>İşlem</DataTable.Title>
          </DataTable.Header>

          {filteredItems.slice(fromPage, toPage).map((item) => (
            <DataTable.Row key={item.id} style={styles.tableRow}>
              <DataTable.Cell style={styles.nameColumn}>{item.name}</DataTable.Cell>
              <DataTable.Cell numeric>{item.stock_level}</DataTable.Cell>
              <DataTable.Cell style={styles.statusColumn}>
                <Chip 
                  style={[styles.statusChip, { backgroundColor: getStatusColor(item.inventory_status) + '20' }]}
                  textStyle={{ color: getStatusColor(item.inventory_status) }}
                >
                  {getStatusText(item.inventory_status)}
                </Chip>
              </DataTable.Cell>
              <DataTable.Cell style={styles.categoryColumn}>{item.category}</DataTable.Cell>
              <DataTable.Cell style={styles.actionColumn}>
                <IconButton
                  icon="pencil-outline"
                  size={20}
                  onPress={() => openUpdateModal(item)}
                />
              </DataTable.Cell>
            </DataTable.Row>
          ))}

          <DataTable.Pagination
            page={page}
            numberOfPages={Math.ceil(filteredItems.length / itemsPerPage)}
            onPageChange={setPage}
            label={`${fromPage + 1}-${toPage} / ${filteredItems.length}`}
            showFastPaginationControls
            numberOfItemsPerPageList={[5, 10, 20]}
            numberOfItemsPerPage={itemsPerPage}
            onItemsPerPageChange={setItemsPerPage}
            selectPageDropdownLabel={'Sayfa başına'}
          />
        </DataTable>
      </ScrollView>
      
      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modalContainer}>
          <Title style={styles.modalTitle}>Stok Güncelle</Title>
          <Text style={styles.modalSubtitle}>{selectedItem?.name}</Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              label="Stok Miktarı"
              value={stockUpdateValue}
              onChangeText={setStockUpdateValue}
              keyboardType="numeric"
              style={styles.modalInput}
              mode="outlined"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <TextInput
              label="Depo Konumu"
              value={locationValue}
              onChangeText={setLocationValue}
              style={styles.modalInput}
              mode="outlined"
            />
          </View>
          
          <View style={styles.modalActions}>
            <Button 
              mode="outlined" 
              onPress={() => setModalVisible(false)}
              style={styles.modalButton}
            >
              İptal
            </Button>
            <Button 
              mode="contained" 
              onPress={handleUpdateStock}
              style={styles.modalButton}
            >
              Güncelle
            </Button>
          </View>
        </Modal>
      </Portal>
      
      <FAB
        icon="plus"
        label="Yeni Ürün"
        onPress={() => navigation.navigate('ProductManagementScreen')}
        style={styles.fab}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  headerContainer: {
    marginBottom: 16,
  },
  headerGradient: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  searchAndFilterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchbar: {
    marginBottom: 8,
  },
  filterContainer: {
    marginBottom: 8,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  filterButton: {
    marginRight: 8,
    marginBottom: 8,
  },
  activeFilterChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  menuHeader: {
    fontWeight: 'bold',
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
  },
  summaryDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#e0e0e0',
  },
  table: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 80,
    borderRadius: 8,
    elevation: 2,
  },
  tableHeader: {
    backgroundColor: '#f5f5f5',
  },
  tableRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  nameColumn: {
    flex: 3,
  },
  statusColumn: {
    flex: 2,
    justifyContent: 'center',
  },
  categoryColumn: {
    flex: 2,
  },
  actionColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  statusChip: {
    height: 28,
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
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: 'white',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  modalButton: {
    marginLeft: 8,
  },
});

export default InventoryManagementScreen; 