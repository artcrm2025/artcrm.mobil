import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, RefreshControl, Alert, Platform } from 'react-native';
import { Text, Card, Button, FAB, Searchbar, Chip, ActivityIndicator, useTheme } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Proposal, User } from '../types';
import { getCurrentUser } from '../services/authService';
import { SafeAreaWrapper, SafeContentContainer } from '../components/SafeAreaWrapper';

export const ProposalsScreen = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const navigation = useNavigation();
  const theme = useTheme();

  // useFocusEffect kullanarak ekrana her gelindiğinde teklifleri yükleyelim
  useFocusEffect(
    React.useCallback(() => {
      loadCurrentUser();
      fetchProposals();
      return () => {
        // Temizleme işlemleri (gerekirse)
      };
    }, [])
  );

  // İlk yüklemeyi yapalım
  useEffect(() => {
    loadCurrentUser();
    fetchProposals();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Kullanıcı bilgileri yüklenirken hata:', error);
    }
  };

  const fetchProposals = async () => {
    try {
      setLoading(true);
      console.log('Teklifler yükleniyor...');
      
      // Kullanıcı bilgilerini yükleyelim ve güncel tuttuğumuzdan emin olalım
      const user = await getCurrentUser();
      if (!user) {
        console.error("Kullanıcı bilgileri yüklenemedi");
        setLoading(false);
        return;
      }
      
      // Kullanıcı bilgilerini her durumda güncelle (state güncellemesi)
      setCurrentUser(user);
      
      console.log("Teklifler için sorgu yapılıyor - Kullanıcı rolü:", user.role, "- ID:", user.id, "- Bölge ID:", user.region_id);
      
      // ----- ROL BAZLI FİLTRELEME KURALLARI -----
      // 1. Saha kullanıcıları sadece kendi oluşturdukları teklifleri görebilirler
      // 2. Bölge müdürleri kendi bölgelerindeki kliniklere ait teklifleri görebilirler
      // 3. Admin ve manager'lar tüm teklifleri görebilirler
      // --------------------------------------
      
      let query = supabase
        .from('proposals')
        .select(`
          *,
          clinics (
            name,
            region_id
          ),
          creator:users!proposals_user_id_fkey (
            name
          )
        `)
        .order('created_at', { ascending: false });
      
      // Rol bazlı filtreleme - Güncel user değişkenini kullan (state yerine)
      if (user.role === 'field_user') {
        // Saha kullanıcısı sadece kendi oluşturduğu teklifleri görebilir
        console.log("Saha kullanıcısı için filtreleme: user_id =", user.id);
        query = query.eq('user_id', user.id);
      } 
      else if (user.role === 'regional_manager' && user.region_id) {
        // Bölge müdürü kendi bölgesindeki kliniklere ait teklifleri görebilir
        console.log("Bölge müdürü için filtreleme: region_id =", user.region_id);
        
        // Sunucu tarafında filtreleme - RLS (Row Level Security) üzerinden veya JOIN ile
        query = query.eq('clinics.region_id', user.region_id);
      }
      // Admin ve manager tüm teklifleri görebilir (ek filtreleme yok)
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Teklifler yüklenirken hata:', error);
        Alert.alert('Hata', 'Teklifler yüklenirken bir sorun oluştu');
        return;
      }
      
      console.log(`${data?.length || 0} teklif yüklendi`);
      
      // Bölge müdürleri için ek istemci tarafı filtreleme (eğer sunucu tarafı filtreleme çalışmazsa)
      if (user.role === 'regional_manager' && user.region_id) {
        const filteredData = data?.filter(proposal => proposal.clinics?.region_id === user.region_id);
        console.log(`${filteredData?.length || 0} teklif bölge filtresinden sonra kaldı`);
        setProposals(filteredData || []);
      } else {
        setProposals(data || []);
      }
    } catch (error) {
      console.error('Teklifler çekilirken hata:', error);
      Alert.alert('Hata', 'Teklifler çekilirken bir sorun oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProposals();
  };

  const handleCreateProposal = () => {
    // @ts-ignore - Navigation tipi sorunlarını önlemek için
    navigation.navigate('CreateProposal');
  };

  const handleViewProposal = (proposal: Proposal) => {
    // @ts-ignore - Navigation tipi sorunlarını önlemek için
    navigation.navigate('ProposalDetail', { id: proposal.id });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B'; // Amber
      case 'approved': return '#10B981'; // Green
      case 'rejected': return '#EF4444'; // Red
      case 'expired': return '#6B7280'; // Gray
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Beklemede';
      case 'approved': return 'Onaylandı';
      case 'rejected': return 'Reddedildi';
      case 'expired': return 'Süresi Doldu';
      default: return 'Bilinmiyor';
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('tr-TR', { 
      style: 'currency', 
      currency: currency || 'TRY',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const renderProposalCard = ({ item }: { item: Proposal }) => (
    <Card style={styles.card} onPress={() => handleViewProposal(item)}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.clinicName}>{item.clinics?.name || 'Klinik Adı'}</Text>
            <Text style={styles.date}>{formatDate(item.created_at)}</Text>
          </View>
          <Chip 
            style={[styles.statusChip, { backgroundColor: `${getStatusColor(item.status)}20` }]}
            textStyle={{ color: getStatusColor(item.status) }}
          >
            {getStatusText(item.status)}
          </Chip>
        </View>
        
        <View style={styles.amountContainer}>
          <MaterialCommunityIcons name="cash-multiple" size={20} color="#6B7280" />
          <Text style={styles.amount}>
            {formatCurrency(item.total_amount, item.currency)}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.creatorContainer}>
            <MaterialCommunityIcons name="account" size={16} color="#6B7280" />
            <Text style={styles.creatorText}>
              {item.creator?.name || 'Bilinmeyen kullanıcı'}
            </Text>
          </View>
          
          {item.installment_count > 1 && (
            <View style={styles.installmentContainer}>
              <MaterialCommunityIcons name="calendar-clock" size={16} color="#6B7280" />
              <Text style={styles.creatorText}>
                {item.installment_count} Taksit
              </Text>
            </View>
          )}
        </View>
        
        {item.notes && (
          <Text style={styles.notes} numberOfLines={2}>
            {item.notes}
          </Text>
        )}
      </Card.Content>
      <Card.Actions style={styles.cardActions}>
        <Button 
          mode="text" 
          onPress={() => handleViewProposal(item)}
          icon="eye"
        >
          Detaylar
        </Button>
      </Card.Actions>
    </Card>
  );

  const filteredProposals = proposals.filter(proposal => {
    const clinicName = proposal.clinics?.name || '';
    const searchLower = searchQuery.toLowerCase();
    return clinicName.toLowerCase().includes(searchLower);
  });

  if (loading && !refreshing) {
    return (
      <SafeAreaWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Teklifler yükleniyor...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Klinik adına göre ara..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
          />
        </View>

        <FlatList
          data={filteredProposals}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProposalCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="file-document-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Henüz teklif bulunmuyor</Text>
              <Button 
                mode="contained" 
                onPress={handleCreateProposal}
                style={{ marginTop: 16 }}
              >
                Yeni Teklif Oluştur
              </Button>
            </View>
          }
        />

        <FAB
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          icon="plus"
          onPress={handleCreateProposal}
          color="#fff"
        />
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchbar: {
    elevation: 0,
    backgroundColor: '#F3F4F6',
  },
  listContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80, // iPhone için daha fazla alt boşluk
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: Platform.OS === 'ios' ? 40 : 16, // iPhone için daha yüksek konumlandırma
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  clinicName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  date: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  statusChip: {
    height: 28,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  creatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  installmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 6,
  },
  notes: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 8,
  },
  cardActions: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    justifyContent: 'flex-end',
  },
}); 