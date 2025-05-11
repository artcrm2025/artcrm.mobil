import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Appbar, Text, Card, Button, Divider, TextInput, Dialog, Portal, Searchbar, useTheme, ActivityIndicator, Chip, Menu, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../services/authService';
import { User } from '../types';

type Product = {
  id: number;
  name: string;
  category_id: number | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
};

type Category = {
  id: number;
  name: string;
};

export const ProductManagementScreen = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Ürün kategorileri (normalde backendden gelir, ancak bu örnek için sabit tanımlayalım)
  const categories: Category[] = [
    { id: 1, name: 'İmplantlar' },
    { id: 2, name: 'Cerrahi Aletler' },
    { id: 3, name: 'Greftler ve Membranlar' },
    { id: 4, name: 'Sarf Malzemeleri' }
  ];
  
  const [filterCategory, setFilterCategory] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<string>('name_asc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  
  // Ürün düzenleme state'leri
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productName, setProductName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  
  const theme = useTheme();
  const navigation = useNavigation();

  useEffect(() => {
    loadCurrentUser();
    fetchProducts();
  }, [filterCategory, filterStatus, sortOption]);

  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Kullanıcı bilgileri yüklenirken hata:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Sorgu oluştur
      let query = supabase
        .from('products')
        .select('*');
      
      // Filtreleri uygula
      if (filterCategory !== null) {
        query = query.eq('category_id', filterCategory);
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
        console.error('Ürünler çekilirken hata:', error);
        return;
      }
      
      setProducts(data || []);
    } catch (error) {
      console.error('Ürünler çekilirken hata:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, [filterCategory, filterStatus, sortOption]);

  const handleAddProduct = async () => {
    if (!productName.trim()) {
      Alert.alert('Uyarı', 'Lütfen ürün adı girin');
      return;
    }
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: productName.trim(),
          category_id: selectedCategory,
          status: status
        })
        .select()
        .single();
      
      if (error) {
        console.error('Ürün eklenirken hata:', error);
        Alert.alert('Hata', 'Ürün eklenirken bir sorun oluştu');
        return;
      }
      
      // Form alanlarını temizle
      clearFormFields();
      setShowAddDialog(false);
      
      // Ürünleri yeniden yükle
      fetchProducts();
      Alert.alert('Başarılı', 'Ürün başarıyla eklendi');
    } catch (error) {
      console.error('Ürün eklenirken hata:', error);
      Alert.alert('Hata', 'Ürün eklenirken bir sorun oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!selectedProduct) return;
    
    if (!productName.trim()) {
      Alert.alert('Uyarı', 'Lütfen ürün adı girin');
      return;
    }
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('products')
        .update({
          name: productName.trim(),
          category_id: selectedCategory,
          status: status
        })
        .eq('id', selectedProduct.id)
        .select()
        .single();
      
      if (error) {
        console.error('Ürün güncellenirken hata:', error);
        Alert.alert('Hata', 'Ürün güncellenirken bir sorun oluştu');
        return;
      }
      
      // Form alanlarını temizle
      clearFormFields();
      setShowEditDialog(false);
      setSelectedProduct(null);
      
      // Ürünleri yeniden yükle
      fetchProducts();
      Alert.alert('Başarılı', 'Ürün başarıyla güncellendi');
    } catch (error) {
      console.error('Ürün güncellenirken hata:', error);
      Alert.alert('Hata', 'Ürün güncellenirken bir sorun oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;
    
    try {
      setLoading(true);
      
      // Önce bu ürüne ait teklif veya ameliyat raporu var mı kontrol et
      const { data: proposalData, error: proposalError } = await supabase
        .from('proposal_items')
        .select('id')
        .eq('product_id', selectedProduct.id);
      
      if (proposalError) {
        console.error('Teklifler kontrol edilirken hata:', proposalError);
      }
      
      if (proposalData && proposalData.length > 0) {
        Alert.alert(
          'Uyarı', 
          'Bu ürün tekliflerde kullanılmaktadır. Silmeden önce teklifleri güncelleyin.'
        );
        setShowDeleteDialog(false);
        setLoading(false);
        return;
      }
      
      const { data: surgeryData, error: surgeryError } = await supabase
        .from('surgery_reports')
        .select('id')
        .eq('product_id', selectedProduct.id);
      
      if (surgeryError) {
        console.error('Ameliyat raporları kontrol edilirken hata:', surgeryError);
      }
      
      if (surgeryData && surgeryData.length > 0) {
        Alert.alert(
          'Uyarı', 
          'Bu ürün ameliyat raporlarında kullanılmaktadır. Silmeden önce raporları güncelleyin.'
        );
        setShowDeleteDialog(false);
        setLoading(false);
        return;
      }
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', selectedProduct.id);
      
      if (error) {
        console.error('Ürün silinirken hata:', error);
        Alert.alert('Hata', 'Ürün silinirken bir sorun oluştu');
        return;
      }
      
      setShowDeleteDialog(false);
      setSelectedProduct(null);
      
      // Ürünleri yeniden yükle
      fetchProducts();
      Alert.alert('Başarılı', 'Ürün başarıyla silindi');
    } catch (error) {
      console.error('Ürün silinirken hata:', error);
      Alert.alert('Hata', 'Ürün silinirken bir sorun oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPress = (product: Product) => {
    setSelectedProduct(product);
    setProductName(product.name);
    setSelectedCategory(product.category_id);
    setStatus(product.status);
    setShowEditDialog(true);
  };

  const handleDeletePress = (product: Product) => {
    setSelectedProduct(product);
    setShowDeleteDialog(true);
  };

  const handleStatusToggle = async (product: Product) => {
    try {
      setLoading(true);
      
      const newStatus = product.status === 'active' ? 'inactive' : 'active';
      
      const { error } = await supabase
        .from('products')
        .update({ status: newStatus })
        .eq('id', product.id);
      
      if (error) {
        console.error('Ürün durumu güncellenirken hata:', error);
        Alert.alert('Hata', 'Ürün durumu güncellenirken bir sorun oluştu');
        return;
      }
      
      // Ürünleri yeniden yükle
      fetchProducts();
    } catch (error) {
      console.error('Ürün durumu güncellenirken hata:', error);
      Alert.alert('Hata', 'Ürün durumu güncellenirken bir sorun oluştu');
    } finally {
      setLoading(false);
    }
  };

  const clearFormFields = () => {
    setProductName('');
    setSelectedCategory(null);
    setStatus('active');
  };

  const canManageProducts = () => {
    if (!currentUser) return false;
    return ['admin', 'manager'].includes(currentUser.role);
  };

  // Filtrelenmiş ürünler
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryNameById = (categoryId: number | null): string => {
    if (categoryId === null) return 'Kategorisiz';
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Kategorisiz';
  };

  const getSortText = () => {
    switch (sortOption) {
      case 'name_asc': return 'İsim (A-Z)';
      case 'name_desc': return 'İsim (Z-A)';
      case 'created_asc': return 'Eklenme (Eski-Yeni)';
      case 'created_desc': return 'Eklenme (Yeni-Eski)';
      default: return 'Sırala';
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <Card style={styles.card} elevation={1}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.categoryName}>{getCategoryNameById(item.category_id)}</Text>
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
      </Card.Content>
      
      {canManageProducts() && (
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
        <Appbar.Content title="Ürün Yönetimi" />
        <Appbar.Action icon="magnify" onPress={() => {}} />
      </Appbar.Header>
      
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Ürün ara..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        
        <View style={styles.filterContainer}>
          <TouchableOpacity 
            style={styles.sortButton}
            onPress={() => setShowSortMenu(true)}
          >
            <MaterialCommunityIcons name="sort-variant" size={16} color="#6B7280" />
            <Text style={styles.sortButtonText}>{getSortText()}</Text>
          </TouchableOpacity>
          
          <Chip
            selected={filterCategory === null}
            onPress={() => setFilterCategory(null)}
            style={styles.filterChip}
          >
            Tüm Kategoriler
          </Chip>
          
          {categories.map(category => (
            <Chip
              key={category.id}
              selected={filterCategory === category.id}
              onPress={() => setFilterCategory(category.id)}
              style={styles.filterChip}
            >
              {category.name}
            </Chip>
          ))}
        </View>
        
        <View style={styles.filterContainer}>
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
        </View>
      </View>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Ürünler yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="package-variant" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Hiç ürün bulunamadı</Text>
              {canManageProducts() && (
                <Button 
                  mode="contained" 
                  onPress={() => setShowAddDialog(true)}
                  style={styles.createButton}
                  icon="plus"
                >
                  Yeni Ürün Ekle
                </Button>
              )}
            </View>
          }
        />
      )}
      
      {canManageProducts() && (
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
      
      {/* Yeni Ürün Ekleme Dialog */}
      <Portal>
        <Dialog visible={showAddDialog} onDismiss={() => setShowAddDialog(false)}>
          <Dialog.Title>Yeni Ürün Ekle</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Ürün Adı *"
              value={productName}
              onChangeText={setProductName}
              style={styles.input}
            />
            
            <Text style={styles.selectLabel}>Kategori</Text>
            <View style={styles.categoriesContainer}>
              <Chip
                selected={selectedCategory === null}
                onPress={() => setSelectedCategory(null)}
                style={styles.categoryChip}
                showSelectedOverlay
              >
                Kategorisiz
              </Chip>
              
              {categories.map(category => (
                <Chip
                  key={category.id}
                  selected={selectedCategory === category.id}
                  onPress={() => setSelectedCategory(category.id)}
                  style={styles.categoryChip}
                  showSelectedOverlay
                >
                  {category.name}
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
            <Button onPress={handleAddProduct} disabled={loading}>Ekle</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Ürün Düzenleme Dialog */}
      <Portal>
        <Dialog visible={showEditDialog} onDismiss={() => setShowEditDialog(false)}>
          <Dialog.Title>Ürün Düzenle</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Ürün Adı *"
              value={productName}
              onChangeText={setProductName}
              style={styles.input}
            />
            
            <Text style={styles.selectLabel}>Kategori</Text>
            <View style={styles.categoriesContainer}>
              <Chip
                selected={selectedCategory === null}
                onPress={() => setSelectedCategory(null)}
                style={styles.categoryChip}
                showSelectedOverlay
              >
                Kategorisiz
              </Chip>
              
              {categories.map(category => (
                <Chip
                  key={category.id}
                  selected={selectedCategory === category.id}
                  onPress={() => setSelectedCategory(category.id)}
                  style={styles.categoryChip}
                  showSelectedOverlay
                >
                  {category.name}
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
            <Button onPress={handleUpdateProduct} disabled={loading}>Güncelle</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Ürün Silme Dialog */}
      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>Ürün Sil</Dialog.Title>
          <Dialog.Content>
            <Text>
              "{selectedProduct?.name}" ürününü silmek istediğinizden emin misiniz?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>İptal</Button>
            <Button onPress={handleDeleteProduct} disabled={loading} textColor={theme.colors.error}>Sil</Button>
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
    flexWrap: 'wrap',
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
    marginBottom: 8,
  },
  sortButtonText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 8,
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
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 14,
    color: '#6B7280',
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
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  categoryChip: {
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