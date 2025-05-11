import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { Appbar, Text, Searchbar, Card, Paragraph, Chip, Button, FAB, Portal, Modal, Title, Divider, useTheme, ActivityIndicator, Menu, IconButton, TextInput, Badge } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../services/authService';
import { User } from '../types';

// Birleştirilmiş Aktivite Tipi
type CombinedActivity = {
  id: string; // Teklif veya rapor ID'si (string olarak birleştirelim)
  type: 'proposal' | 'visit_report';
  title: string; // Teklif için "Teklif #ID", Ziyaret için "Ziyaret: Konu"
  date: string; // Teklif için created_at, Ziyaret için date
  status: string; // Teklif durumu veya ziyaret için "Tamamlandı"
  clinic_id: number;
  clinic_name?: string;
  user_id: string;
  user_name?: string;
  user_role?: string;
  details: any; // Orijinal teklif veya rapor verisi
};

// Navigasyon parametrelerini tanımla
type RootStackParamList = {
  ProposalDetail: { id: string };
  VisitReportDetail: { id: string };
  CreateProposal: undefined;
  CreateVisitReport: undefined;
  UserLocation: { userId: string };
  UserProfile: { userId: string };
};

// Navigasyon tipini tanımla
type ActivitiesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ActivitiesScreen = () => {
  const [combinedActivities, setCombinedActivities] = useState<CombinedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortOption, setSortOption] = useState<string>('date_desc');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const theme = useTheme();
  const navigation = useNavigation<ActivitiesScreenNavigationProp>();

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (currentUser) { // currentUser yüklendikten sonra fetch et
      fetchCombinedActivities();
    }
  }, [sortOption, currentUser, filterType]); // filterType eklendi

  const loadUserData = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Kullanıcı bilgileri yüklenirken hata:', error);
      setLoading(false); // Hata durumunda loading'i kapat
    }
  };

  const fetchCombinedActivities = async () => {
    if (!currentUser) return; // currentUser yoksa çık

    try {
      setLoading(true);
      
      // Teklifleri çek
      let proposalsQuery = supabase
        .from('proposals')
        .select(`
          id,
          created_at,
          status,
          clinic_id,
          clinics!proposals_clinic_id_fkey (name),
          user_id,
          users!proposals_user_id_fkey (name, role),
          notes,
          total_amount,
          currency
        `);

      // Ziyaret Raporlarını çek
      let visitReportsQuery = supabase
        .from('visit_reports')
        .select(`
          id,
          date,
          clinic_id,
          clinics!visit_reports_clinic_id_fkey (name),
          user_id,
          users!visit_reports_user_id_fkey (name, role),
          subject,
          notes
        `);

      // Rol tabanlı filtreleme
      if (currentUser.role === 'regional_manager') {
        proposalsQuery = proposalsQuery.eq('users.region_id', currentUser.region_id);
        visitReportsQuery = visitReportsQuery.eq('users.region_id', currentUser.region_id);
      } else if (currentUser.role === 'field_user') {
        proposalsQuery = proposalsQuery.eq('user_id', currentUser.id);
        visitReportsQuery = visitReportsQuery.eq('user_id', currentUser.id);
      }
      
      // Tip filtresi
      let fetchProposals = filterType === null || filterType === 'proposal';
      let fetchVisits = filterType === null || filterType === 'visit_report';

      const [proposalsResult, visitReportsResult] = await Promise.all([
        fetchProposals ? proposalsQuery : Promise.resolve({ data: [], error: null }),
        fetchVisits ? visitReportsQuery : Promise.resolve({ data: [], error: null }),
      ]);

      if (proposalsResult.error) {
        console.error('Teklifler çekilirken hata:', proposalsResult.error);
      }
      if (visitReportsResult.error) {
        console.error('Ziyaret Raporları çekilirken hata:', visitReportsResult.error);
      }

      const proposalsData = proposalsResult.data || [];
      const visitReportsData = visitReportsResult.data || [];

      // Verileri CombinedActivity formatına dönüştür
      const combined: CombinedActivity[] = [
        ...proposalsData.map((p: any) => ({
          id: p.id.toString(),
          type: 'proposal' as const,
          title: `Teklif #${p.id}: ${p.total_amount?.toFixed(2)} ${p.currency}`,
          date: p.created_at,
          status: p.status,
          clinic_id: p.clinic_id,
          clinic_name: p.clinics?.name,
          user_id: p.user_id,
          user_name: p.users?.name,
          user_role: p.users?.role,
          details: p,
        })),
        ...visitReportsData.map((v: any) => ({
          id: v.id.toString(),
          type: 'visit_report' as const,
          title: `Ziyaret: ${v.subject}`,
          date: v.date,
          status: 'completed', // Ziyaret raporları her zaman tamamlanmış kabul edilebilir
          clinic_id: v.clinic_id,
          clinic_name: v.clinics?.name,
          user_id: v.user_id,
          user_name: v.users?.name,
          user_role: v.users?.role,
          details: v,
        })),
      ];

      // Sıralama uygula
      combined.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (sortOption === 'date_desc') {
          return dateB - dateA;
        } else if (sortOption === 'date_asc') {
          return dateA - dateB;
        } else if (sortOption === 'title_asc') {
          return a.title.localeCompare(b.title);
        } else if (sortOption === 'title_desc') {
          return b.title.localeCompare(a.title);
        }
        return 0;
      });

      setCombinedActivities(combined);

    } catch (error) {
      console.error('Aktiviteler çekilirken genel hata:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCombinedActivities();
  }, [currentUser, sortOption, filterType]); // filterType eklendi

  // İkon ve metin fonksiyonları aktivite tipine göre
  const getActivityIcon = (type: CombinedActivity['type']) => {
    return type === 'proposal' ? 'file-document' : 'clipboard-text';
  };

  const getActivityText = (type: CombinedActivity['type']) => {
    return type === 'proposal' ? 'Teklif' : 'Ziyaret Raporu';
  };

  // Durum renkleri teklif durumuna göre
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'contract_received':
      case 'delivered':
      case 'completed': // Ziyaret raporu için
        return { bg: '#D1FAE5', text: '#065F46' }; // Yeşil
      case 'rejected':
      case 'expired':
        return { bg: '#FEE2E2', text: '#991B1B' }; // Kırmızı
      case 'pending':
      case 'in_transfer':
      default:
        return { bg: '#FEF3C7', text: '#92400E' }; // Sarı
    }
  };
  
  // Durum metinleri
  const getStatusText = (status: string, type: CombinedActivity['type']) => {
    if (type === 'visit_report') return 'Tamamlandı';
    switch (status) {
      case 'approved': return 'Onaylandı';
      case 'contract_received': return 'Sözleşme Alındı';
      case 'delivered': return 'Teslim Edildi';
      case 'rejected': return 'Reddedildi';
      case 'expired': return 'Süresi Doldu';
      case 'pending': return 'Beklemede';
      case 'in_transfer': return 'Transferde';
      default: return status;
    }
  };

  const renderActivity = ({ item }: { item: CombinedActivity }) => (
    <TouchableOpacity 
      onPress={() => {
        if (item.type === 'proposal') {
          navigation.navigate('ProposalDetail', { id: item.id });
        } else {
          navigation.navigate('VisitReportDetail', { id: item.id });
        }
      }}
      style={styles.cardContainer}
    >
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.activityType}>
              <MaterialCommunityIcons 
                name={getActivityIcon(item.type)} 
                size={24} 
                color={theme.colors.primary} 
              />
              <Text style={styles.activityTypeText}>
                {getActivityText(item.type)}
              </Text>
            </View>
            <Chip 
              mode="flat"
              style={[
                styles.statusChip, 
                { backgroundColor: getStatusColor(item.status).bg }
              ]}
              textStyle={{ color: getStatusColor(item.status).text, fontWeight: 'bold' }}
            >
              {getStatusText(item.status, item.type)}
            </Chip>
          </View>
          
          <Title style={styles.cardTitle}>{item.title}</Title>
          
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="calendar" size={18} color="#757575" style={styles.detailIcon} />
            <Text style={styles.detailLabel}>Tarih:</Text>
            <Text style={styles.detailValue}>
              {new Date(item.date).toLocaleDateString('tr-TR')}
              {item.type === 'visit_report' && item.details?.time ? ` ${item.details.time}` : ''}
            </Text>
          </View>
          
          {item.clinic_name && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="hospital" size={18} color="#757575" style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Klinik:</Text>
              <Text style={styles.detailValue}>{item.clinic_name}</Text>
            </View>
          )}
          
          {item.user_name && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="account" size={18} color="#757575" style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Kullanıcı:</Text>
              <Text style={styles.detailValue}>{item.user_name} ({item.user_role})</Text>
            </View>
          )}
          
          {item.details?.notes && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionLabel}>Notlar:</Text>
              <Paragraph style={styles.descriptionText} numberOfLines={2}>{item.details.notes}</Paragraph>
            </View>
          )}
        </Card.Content>
        
        <Card.Actions style={styles.cardActions}>
          <Button 
            mode="text" 
            icon="eye" 
            onPress={() => {
              if (item.type === 'proposal') {
                navigation.navigate('ProposalDetail', { id: item.id });
              } else {
                navigation.navigate('VisitReportDetail', { id: item.id });
              }
            }}
          >
            Detaylar
          </Button>
          
          {/* Konum ve Profil butonları şimdilik kaldırıldı, 
              çünkü teklif ve ziyaret raporları doğrudan kullanıcı konumuyla ilişkili olmayabilir. 
              Gerekirse user_id üzerinden tekrar eklenebilir. */}
          
          {/* Düzenleme butonu sadece yetkili kullanıcılar için */} 
          {/* Düzenleme mantığı teklif ve ziyarete göre farklı olmalı, şimdilik kaldırıldı */}
          {/* {(currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.id === item.user_id) && ( ... )} */}
        </Card.Actions>
      </Card>
    </TouchableOpacity>
  );

  // Arama filtresi
  const filteredActivities = combinedActivities.filter(activity => 
    activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (activity.clinic_name && activity.clinic_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (activity.user_name && activity.user_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (activity.details?.notes && activity.details.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Aktiviteler (Teklifler & Raporlar)" />
        <Appbar.Action icon="filter" onPress={() => setShowFilterModal(true)} />
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
            onPress={() => { setSortOption('date_desc'); setShowSortMenu(false); }} 
            title="Tarihe Göre (Yeni-Eski)" 
          />
          <Menu.Item 
            onPress={() => { setSortOption('date_asc'); setShowSortMenu(false); }} 
            title="Tarihe Göre (Eski-Yeni)" 
          />
          <Menu.Item 
            onPress={() => { setSortOption('title_asc'); setShowSortMenu(false); }} 
            title="Başlığa Göre (A-Z)" 
          />
          <Menu.Item 
            onPress={() => { setSortOption('title_desc'); setShowSortMenu(false); }} 
            title="Başlığa Göre (Z-A)" 
          />
        </Menu>
      </Appbar.Header>

      <Searchbar
        placeholder="Aktivite, klinik, kullanıcı veya not ara..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredActivities} // Filtrelenmiş veriyi kullan
          renderItem={renderActivity}
          keyExtractor={(item) => `${item.type}_${item.id}`}
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
              <MaterialCommunityIcons name="calendar-multiple-check" size={48} color="#9E9E9E" />
              <Text style={styles.emptyText}>Filtrelere uygun aktivite bulunamadı</Text>
            </View>
          }
        />
      )}

      {/* FAB Butonları - Teklif veya Ziyaret Raporu eklemek için - KALDIRILDI */}
      {/* 
      <Portal>
          <FAB.Group
            open={false} // Şimdilik FAB Group kapalı, gerekirse açılabilir
            visible={true}
            icon={'plus'}
            actions={[
              {
                icon: 'file-document',
                label: 'Yeni Teklif',
                onPress: () => navigation.navigate('CreateProposal'),
                // small: false, // Kaldırıldı
              },
              {
                icon: 'clipboard-text',
                label: 'Yeni Ziyaret Raporu',
                onPress: () => navigation.navigate('CreateVisitReport'),
                // small: false, // Kaldırıldı
              },
            ]}
            onStateChange={() => {}}
            onPress={() => {}}
            fabStyle={styles.fab} // Pozisyonu ayarla
          />
        </Portal>
      */}

      <Portal>
        <Modal
          visible={showFilterModal}
          onDismiss={() => setShowFilterModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Title style={styles.modalTitle}>Filtreler</Title>
          <Divider style={styles.modalDivider} />
          
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Aktivite Tipi</Text>
            <View style={styles.filterOptions}>
              <Chip
                selected={filterType === null}
                onPress={() => setFilterType(null)}
                style={styles.filterChip}
              >
                Tümü
              </Chip>
              <Chip
                selected={filterType === 'proposal'}
                onPress={() => setFilterType('proposal')}
                style={styles.filterChip}
              >
                Teklifler
              </Chip>
              <Chip
                selected={filterType === 'visit_report'}
                onPress={() => setFilterType('visit_report')}
                style={styles.filterChip}
              >
                Ziyaret Raporları
              </Chip>
            </View>
          </View>
          
          {/* Durum filtresi daha karmaşık olacağı için şimdilik kaldırıldı */}
          
          <Button
            mode="contained"
            onPress={() => {
              setShowFilterModal(false);
              // Filtre zaten useEffect içinde fetch'i tetikliyor
            }}
            style={styles.applyButton}
          >
            Kapat
          </Button>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb', // Tema arka plan rengi
  },
  searchBar: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    elevation: 1,
    borderRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 80, // FAB butonları için boşluk
  },
  cardContainer: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 12, // Tema ile uyumlu
    elevation: 2,
    backgroundColor: '#ffffff',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  activityType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityTypeText: {
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 16,
    color: '#374151',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1f2937',
  },
  statusChip: {
    height: 28,
    justifyContent: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailIcon: {
    marginRight: 10,
  },
  detailLabel: {
    color: '#6b7280',
    marginRight: 4,
    width: 60,
    fontSize: 14,
  },
  detailValue: {
    flex: 1,
    color: '#374151',
    fontSize: 14,
  },
  descriptionContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  descriptionLabel: {
    color: '#6b7280',
    marginBottom: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  descriptionText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  cardActions: {
    justifyContent: 'flex-end',
    paddingTop: 8,
    paddingBottom: 4,
    paddingHorizontal: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6366F1', // theme.colors.primary yerine doğrudan renk kodu
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 24,
    marginHorizontal: 20,
    borderRadius: 16,
    elevation: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalDivider: {
    marginBottom: 20,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#374151',
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8, // Çipler arası boşluk
  },
  filterChip: {
    // Chip stilleri burada ayarlanabilir
  },
  applyButton: {
    marginTop: 24,
    paddingVertical: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
  },
}); 