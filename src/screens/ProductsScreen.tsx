import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, Searchbar, Button, FAB, Chip, Menu, Divider, ActivityIndicator, DataTable } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../services/authService';
import { User, UserRole } from '../types';

type ProductsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProductsScreen'>;

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  category: string;
  stock_count: number;
  status: 'active' | 'inactive';
  image_url: string | null;
  created_at: string;
  region_id: number | null;
  region_name?: string;
}

interface FilterOptions {
  category: string | null;
  status: 'all' | 'active' | 'inactive';
  priceRange: { min: number | null; max: number | null };
  sortBy: 'name' | 'price' | 'stock' | 'created_at';
  sortOrder: 'asc' | 'desc';
}

const ProductsScreen = () => {
  const navigation = useNavigation<ProductsScreenNavigationProp>();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    category: null,
    status: 'all',
    priceRange: { min: null, max: null },
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const [page, setPage] = useState(0);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, filters, products]);

  const loadData = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      await fetchProducts(currentUser);
    } catch (error) {
      console.error('Ürün verileri yükleme hatası:', error);
      Alert.alert('Hata', 'Ürünler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (currentUser: User | null) => {
    if (!currentUser) return;
    
    let query = supabase.from('products').select('*, regions(name)');
    
    // Rol bazlı filtreleme
    if (currentUser.role === 'regional_manager' && currentUser.region_id) {
      query = query.eq('region_id', currentUser.region_id);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Ürün verisi çekme hatası:', error);
      return;
    }
    
    if (data) {
      const formattedProducts = data.map(product => ({
        ...product,
        region_name: product.regions ? product.regions.name : null
      }));
      
      setProducts(formattedProducts);
      
      // Kategorileri çıkar
      const uniqueCategories = Array.from(new Set(formattedProducts.map(p => p.category)));
      setCategories(uniqueCategories);
    }
  };

  const applyFilters = () => {
    let result = [...products];
    
    // Arama sorgusu
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(product => 
        product.name.toLowerCase().includes(query) || 
        (product.description && product.description.toLowerCase().includes(query))
      );
    }
    
    // Kategori filtresi
    if (filters.category) {
      result = result.filter(product => product.category === filters.category);
    }
    
    // Durum filtresi
    if (filters.status !== 'all') {
      result = result.filter(product => product.status === filters.status);
    }
    
    // Fiyat aralığı filtresi
    if (filters.priceRange.min !== null) {
      result = result.filter(product => product.price >= (filters.priceRange.min || 0));
    }
    if (filters.priceRange.max !== null) {
      result = result.filter(product => product.price <= (filters.priceRange.max || Infinity));
    }
    
    // Sıralama
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'stock':
          comparison = a.stock_count - b.stock_count;
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });
    
    setFilteredProducts(result);
    setPage(0);
  };

  const onChangeSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleDeleteProduct = async (id: number) => {
    Alert.alert(
      'Ürünü Sil',
      'Bu ürünü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id);
                
              if (error) {
                throw error;
              }
              
              Alert.alert('Başarılı', 'Ürün başarıyla silindi.');
              
              // Ürün listesini güncelle
              setProducts(products.filter(p => p.id !== id));
            } catch (error) {
              console.error('Ürün silme hatası:', error);
              Alert.alert('Hata', 'Ürün silinirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleUpdateStatus = async (id: number, newStatus: 'active' | 'inactive') => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('products')
        .update({ status: newStatus })
        .eq('id', id);
        
      if (error) {
        throw error;
      }
      
      Alert.alert('Başarılı', `Ürün durumu ${newStatus === 'active' ? 'aktif' : 'pasif'} olarak güncellendi.`);
      
      // Ürün listesini güncelle
      setProducts(products.map(p => p.id === id ? { ...p, status: newStatus } : p));
    } catch (error) {
      console.error('Ürün durumu güncelleme hatası:', error);
      Alert.alert('Hata', 'Ürün durumu güncellenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      category: null,
      status: 'all',
      priceRange: { min: null, max: null },
      sortBy: 'name',
      sortOrder: 'asc'
    });
    setSearchQuery('');
  };

  const paginatedProducts = filteredProducts.slice(
    page * itemsPerPage,
    (page + 1) * itemsPerPage
  );

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(price);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Ürünler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Ürün Yönetimi</Text>
        <Text style={styles.subheader}>
          Toplam {filteredProducts.length} ürün {searchQuery || filters.category ? '(filtrelenmiş)' : ''}
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Ürün adı veya açıklama ara..."
          onChangeText={onChangeSearch}
          value={searchQuery}
          style={styles.searchbar}
        />
        
        <Menu
          visible={filterMenuVisible}
          onDismiss={() => setFilterMenuVisible(false)}
          anchor={
            <Button 
              mode="contained" 
              onPress={() => setFilterMenuVisible(true)}
              icon="filter-variant"
              style={styles.filterButton}
            >
              Filtrele
            </Button>
          }
          style={styles.menu}
        >
          <Menu.Item 
            onPress={() => {}} 
            title="Sıralama" 
            titleStyle={styles.menuSectionTitle} 
          />
          <Menu.Item 
            onPress={() => setFilters({...filters, sortBy: 'name', sortOrder: 'asc'})} 
            title="İsme Göre (A-Z)" 
            leadingIcon={filters.sortBy === 'name' && filters.sortOrder === 'asc' ? "check" : undefined}
          />
          <Menu.Item 
            onPress={() => setFilters({...filters, sortBy: 'name', sortOrder: 'desc'})} 
            title="İsme Göre (Z-A)" 
            leadingIcon={filters.sortBy === 'name' && filters.sortOrder === 'desc' ? "check" : undefined}
          />
          <Menu.Item 
            onPress={() => setFilters({...filters, sortBy: 'price', sortOrder: 'asc'})} 
            title="Fiyat (Artan)" 
            leadingIcon={filters.sortBy === 'price' && filters.sortOrder === 'asc' ? "check" : undefined}
          />
          <Menu.Item 
            onPress={() => setFilters({...filters, sortBy: 'price', sortOrder: 'desc'})} 
            title="Fiyat (Azalan)" 
            leadingIcon={filters.sortBy === 'price' && filters.sortOrder === 'desc' ? "check" : undefined}
          />
          <Menu.Item 
            onPress={() => setFilters({...filters, sortBy: 'stock', sortOrder: 'desc'})} 
            title="Stok (En çok)" 
            leadingIcon={filters.sortBy === 'stock' && filters.sortOrder === 'desc' ? "check" : undefined}
          />
          <Menu.Item 
            onPress={() => setFilters({...filters, sortBy: 'stock', sortOrder: 'asc'})} 
            title="Stok (En az)" 
            leadingIcon={filters.sortBy === 'stock' && filters.sortOrder === 'asc' ? "check" : undefined}
          />
          
          <Divider />
          
          <Menu.Item 
            onPress={() => {}} 
            title="Durum" 
            titleStyle={styles.menuSectionTitle} 
          />
          <Menu.Item 
            onPress={() => setFilters({...filters, status: 'all'})} 
            title="Tümü" 
            leadingIcon={filters.status === 'all' ? "check" : undefined}
          />
          <Menu.Item 
            onPress={() => setFilters({...filters, status: 'active'})} 
            title="Aktif" 
            leadingIcon={filters.status === 'active' ? "check" : undefined}
          />
          <Menu.Item 
            onPress={() => setFilters({...filters, status: 'inactive'})} 
            title="Pasif" 
            leadingIcon={filters.status === 'inactive' ? "check" : undefined}
          />
          
          <Divider />
          
          <Menu.Item 
            onPress={() => {}} 
            title="Kategori" 
            titleStyle={styles.menuSectionTitle} 
          />
          <Menu.Item 
            onPress={() => setFilters({...filters, category: null})} 
            title="Tümü" 
            leadingIcon={filters.category === null ? "check" : undefined}
          />
          {categories.map((category) => (
            <Menu.Item 
              key={category}
              onPress={() => setFilters({...filters, category})} 
              title={category} 
              leadingIcon={filters.category === category ? "check" : undefined}
            />
          ))}
          
          <Divider />
          
          <Menu.Item 
            onPress={resetFilters} 
            title="Filtreleri Sıfırla" 
            leadingIcon="refresh"
          />
        </Menu>
      </View>
      
      {filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="package-variant-closed" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Ürün bulunamadı</Text>
          <Text style={styles.emptySubtext}>Arama kriterlerini değiştirmeyi veya filtreleri sıfırlamayı deneyin</Text>
          <Button 
            mode="contained" 
            onPress={resetFilters}
            style={styles.resetButton}
          >
            Filtreleri Sıfırla
          </Button>
        </View>
      ) : (
        <>
          <View style={styles.chipContainer}>
            {filters.category && (
              <Chip 
                onClose={() => setFilters({...filters, category: null})}
                style={styles.chip}
                icon="tag"
              >
                {filters.category}
              </Chip>
            )}
            {filters.status !== 'all' && (
              <Chip 
                onClose={() => setFilters({...filters, status: 'all'})}
                style={styles.chip}
                icon={filters.status === 'active' ? "check-circle" : "close-circle"}
              >
                {filters.status === 'active' ? 'Aktif' : 'Pasif'}
              </Chip>
            )}
            {(filters.priceRange.min !== null || filters.priceRange.max !== null) && (
              <Chip 
                onClose={() => setFilters({...filters, priceRange: { min: null, max: null }})}
                style={styles.chip}
                icon="currency-try"
              >
                Fiyat: {filters.priceRange.min || 0} - {filters.priceRange.max || '∞'} ₺
              </Chip>
            )}
          </View>
          
          <DataTable style={styles.dataTable}>
            <DataTable.Header>
              <DataTable.Title>Ürün Adı</DataTable.Title>
              <DataTable.Title numeric>Fiyat</DataTable.Title>
              <DataTable.Title numeric>Stok</DataTable.Title>
              <DataTable.Title>Durum</DataTable.Title>
              <DataTable.Title>İşlemler</DataTable.Title>
            </DataTable.Header>

            <ScrollView>
              {paginatedProducts.map((product) => (
                <DataTable.Row key={product.id}>
                  <DataTable.Cell>
                    <View style={styles.productCell}>
                      {product.image_url ? (
                        <Image source={{ uri: product.image_url }} style={styles.productImage} />
                      ) : (
                        <View style={styles.noImage}>
                          <MaterialCommunityIcons name="image-off" size={16} color="#999" />
                        </View>
                      )}
                      <View>
                        <Text style={styles.productName}>{product.name}</Text>
                        <Text style={styles.productCategory}>{product.category}</Text>
                      </View>
                    </View>
                  </DataTable.Cell>
                  <DataTable.Cell numeric>{formatPrice(product.price)}</DataTable.Cell>
                  <DataTable.Cell numeric>
                    <Text style={[
                      styles.stockText, 
                      product.stock_count <= 5 ? styles.lowStock : null
                    ]}>
                      {product.stock_count}
                    </Text>
                  </DataTable.Cell>
                  <DataTable.Cell>
                    <Chip 
                      style={[
                        styles.statusChip, 
                        product.status === 'active' ? styles.activeChip : styles.inactiveChip
                      ]}
                      textStyle={styles.statusChipText}
                    >
                      {product.status === 'active' ? 'Aktif' : 'Pasif'}
                    </Chip>
                  </DataTable.Cell>
                  <DataTable.Cell>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        onPress={() => navigation.navigate('EditProduct', { productId: product.id })}
                        style={styles.actionButton}
                      >
                        <MaterialCommunityIcons name="pencil" size={20} color="#5c6bc0" />
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        onPress={() => handleUpdateStatus(
                          product.id, 
                          product.status === 'active' ? 'inactive' : 'active'
                        )}
                        style={styles.actionButton}
                      >
                        <MaterialCommunityIcons 
                          name={product.status === 'active' ? "eye-off" : "eye"} 
                          size={20} 
                          color="#ffa000" 
                        />
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        onPress={() => handleDeleteProduct(product.id)}
                        style={styles.actionButton}
                      >
                        <MaterialCommunityIcons name="delete" size={20} color="#e53935" />
                      </TouchableOpacity>
                    </View>
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </ScrollView>

            <DataTable.Pagination
              page={page}
              numberOfPages={Math.ceil(filteredProducts.length / itemsPerPage)}
              onPageChange={page => setPage(page)}
              label={`${page + 1} / ${Math.ceil(filteredProducts.length / itemsPerPage)}`}
              showFastPaginationControls
              numberOfItemsPerPage={itemsPerPage}
              numberOfItemsPerPageList={[5, 10, 20]}
              onItemsPerPageChange={() => {}}
              selectPageDropdownLabel={'Sayfa başına'}
            />
          </DataTable>
        </>
      )}
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('CreateProduct', {})}
        label="Yeni Ürün"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    backgroundColor: '#5c6bc0',
    padding: 16,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subheader: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  searchbar: {
    flex: 1,
    marginRight: 8,
    elevation: 2,
  },
  filterButton: {
    height: 50,
    justifyContent: 'center',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  chip: {
    margin: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  resetButton: {
    marginTop: 24,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#5c6bc0',
  },
  dataTable: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 8,
    elevation: 2,
    flex: 1,
  },
  productCell: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productName: {
    fontWeight: 'bold',
  },
  productCategory: {
    fontSize: 12,
    color: '#666',
  },
  productImage: {
    width: 30,
    height: 30,
    borderRadius: 4,
    marginRight: 8,
  },
  noImage: {
    width: 30,
    height: 30,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  stockText: {
    fontWeight: 'bold',
  },
  lowStock: {
    color: '#e53935',
  },
  statusChip: {
    height: 24,
    alignSelf: 'flex-start',
  },
  statusChipText: {
    fontSize: 12,
  },
  activeChip: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  inactiveChip: {
    backgroundColor: 'rgba(229, 57, 53, 0.1)',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
  },
  menu: {
    width: 250,
  },
  menuSectionTitle: {
    fontWeight: 'bold',
  },
});

export default ProductsScreen;