import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Modal } from 'react-native';
import { Text, Card, Title, Paragraph, Button, Chip, Searchbar, FAB, IconButton, Divider } from 'react-native-paper';
import { SafeAreaWrapper } from '../components/SafeAreaWrapper';
import { supabase } from '../lib/supabase';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { getCurrentUser } from '../services/authService';

interface Campaign {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'planned';
  target_clinics: number;
  current_clinics: number;
}

// Gezinme tipi
type NavigationParams = {
  CampaignDetail: { campaignId: number };
  CreateCampaign: undefined;
  EditCampaign: { campaignId: number };
};

export const CampaignsScreen = () => {
  const navigation = useNavigation<NavigationProp<NavigationParams>>();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    fetchCampaigns();
    checkUserRole();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [campaigns, searchQuery, statusFilter, sortBy]);

  const checkUserRole = async () => {
    try {
      const user = await getCurrentUser();
      setIsAdmin(user?.role === 'admin');
      setIsManager(user?.role === 'manager' || user?.role === 'regional_manager');
    } catch (error) {
      console.error('Kullanıcı rolü kontrol edilirken hata:', error);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
      setFilteredCampaigns(data || []);
    } catch (error) {
      console.error('Kampanyalar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...campaigns];

    // Arama filtreleme
    if (searchQuery) {
      result = result.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Durum filtreleme
    if (statusFilter) {
      result = result.filter(item => item.status === statusFilter);
    }

    // Sıralama
    if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'date') {
      result.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
    }

    setFilteredCampaigns(result);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#10B981'; // Yeşil
      case 'completed':
        return '#6B7280'; // Gri
      case 'planned':
        return '#3B82F6'; // Mavi
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Aktif';
      case 'completed':
        return 'Tamamlandı';
      case 'planned':
        return 'Planlandı';
      default:
        return status;
    }
  };

  const renderCampaign = ({ item }: { item: Campaign }) => (
    <TouchableOpacity onPress={() => navigation.navigate('CampaignDetail', { campaignId: Number(item.id) })}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>{item.name}</Title>
          <Paragraph>{item.description}</Paragraph>
          <View style={styles.campaignInfo}>
            <View style={styles.dateContainer}>
              <Text>Başlangıç: {new Date(item.start_date).toLocaleDateString('tr-TR')}</Text>
              <Text>Bitiş: {new Date(item.end_date).toLocaleDateString('tr-TR')}</Text>
            </View>
            <View style={styles.statsContainer}>
              <Text>Hedef: {item.target_clinics} Klinik</Text>
              <Text>Mevcut: {item.current_clinics} Klinik</Text>
            </View>
            <Chip
              style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
              textStyle={styles.statusText}
            >
              {getStatusText(item.status)}
            </Chip>
          </View>
        </Card.Content>
        <Card.Actions>
          <Button onPress={() => navigation.navigate('CampaignDetail', { campaignId: Number(item.id) })}>Detaylar</Button>
          {(isAdmin || isManager) && (
            <Button onPress={() => navigation.navigate('EditCampaign', { campaignId: Number(item.id) })}>Düzenle</Button>
          )}
        </Card.Actions>
      </Card>
    </TouchableOpacity>
  );

  const renderFilterModal = () => (
    <Modal
      visible={filterModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setFilterModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text variant="titleLarge">Filtreleme Seçenekleri</Text>
            <IconButton
              icon="close"
              size={24}
              onPress={() => setFilterModalVisible(false)}
            />
          </View>
          
          <Divider style={{ marginVertical: 10 }} />
          
          <Text variant="titleMedium" style={{ marginVertical: 10 }}>Durum</Text>
          <View style={styles.chipContainer}>
            <Chip
              selected={statusFilter === null}
              onPress={() => setStatusFilter(null)}
              style={[styles.filterChip, statusFilter === null ? styles.selectedChip : null]}
            >
              Tümü
            </Chip>
            <Chip
              selected={statusFilter === 'active'}
              onPress={() => setStatusFilter('active')}
              style={[styles.filterChip, statusFilter === 'active' ? { ...styles.selectedChip, backgroundColor: getStatusColor('active') } : null]}
            >
              Aktif
            </Chip>
            <Chip
              selected={statusFilter === 'planned'}
              onPress={() => setStatusFilter('planned')}
              style={[styles.filterChip, statusFilter === 'planned' ? { ...styles.selectedChip, backgroundColor: getStatusColor('planned') } : null]}
            >
              Planlandı
            </Chip>
            <Chip
              selected={statusFilter === 'completed'}
              onPress={() => setStatusFilter('completed')}
              style={[styles.filterChip, statusFilter === 'completed' ? { ...styles.selectedChip, backgroundColor: getStatusColor('completed') } : null]}
            >
              Tamamlandı
            </Chip>
          </View>
          
          <Text variant="titleMedium" style={{ marginVertical: 10 }}>Sıralama</Text>
          <View style={styles.chipContainer}>
            <Chip
              selected={sortBy === 'date'}
              onPress={() => setSortBy('date')}
              style={[styles.filterChip, sortBy === 'date' ? styles.selectedChip : null]}
            >
              Tarih
            </Chip>
            <Chip
              selected={sortBy === 'name'}
              onPress={() => setSortBy('name')}
              style={[styles.filterChip, sortBy === 'name' ? styles.selectedChip : null]}
            >
              İsim
            </Chip>
          </View>

          <Button
            mode="contained"
            onPress={() => setFilterModalVisible(false)}
            style={styles.applyButton}
          >
            Uygula
          </Button>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Kampanyalar
          </Text>
          <IconButton
            icon="filter-variant"
            size={24}
            onPress={() => setFilterModalVisible(true)}
          />
        </View>

        <Searchbar
          placeholder="Kampanya ara..."
          onChangeText={text => setSearchQuery(text)}
          value={searchQuery}
          style={styles.searchBar}
        />

        {loading ? (
          <Text>Yükleniyor...</Text>
        ) : (
          <>
            <FlatList
              data={filteredCampaigns}
              renderItem={renderCampaign}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
            />
          </>
        )}

        {(isAdmin || isManager) && (
          <FAB
            style={styles.fab}
            icon="plus"
            onPress={() => navigation.navigate('CreateCampaign')}
          />
        )}

        {renderFilterModal()}
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    marginBottom: 0,
  },
  searchBar: {
    marginBottom: 16,
    elevation: 2,
  },
  list: {
    paddingBottom: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  campaignInfo: {
    marginTop: 8,
  },
  dateContainer: {
    marginBottom: 8,
  },
  statsContainer: {
    marginBottom: 8,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  statusText: {
    color: 'white',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  selectedChip: {
    backgroundColor: '#6366F1',
  },
  applyButton: {
    marginTop: 16,
  },
}); 