import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import { Appbar, Card, Title, Paragraph, Text, Chip, Button, Searchbar, useTheme, FAB, Portal, Modal, ActivityIndicator, Divider, Avatar, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { RootStackNavigationProp } from '../types/navigation';
import { ScreenWrapper } from '../components/ScreenWrapper';

type SurgeryReport = {
  id: string;
  user_id: string;
  clinic_id: string;
  date: string;
  time: string;
  product_id: string | null;
  patient_name: string | null;
  surgery_type: string | null;
  notes: string | null;
  status: 'completed' | 'scheduled' | 'cancelled';
  created_at: string;
  updated_at: string;
  // İlişkili veriler
  users?: { name: string; email: string };
  clinics?: { name: string };
  products?: { name: string; category?: string };
};

export const SurgeryReportsScreen = () => {
  const [reports, setReports] = useState<SurgeryReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const theme = useTheme();
  const navigation = useNavigation<RootStackNavigationProp>();

  useEffect(() => {
    fetchReports();
  }, [filterStatus, selectedDate]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      
      let query = supabase.from('surgery_reports').select(`
        *,
        users:user_id(name, email),
        clinics:clinic_id(name),
        products:product_id(name)
      `);

      if (filterStatus) {
        query = query.eq('status', filterStatus);
      }
      
      if (selectedDate) {
        const formattedDate = format(selectedDate, 'yyyy-MM-dd');
        query = query.eq('date', formattedDate);
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) {
        console.error('Ameliyat raporları yüklenirken hata:', error);
        setReports([]);
        return;
      }

      console.log('Çekilen ameliyat raporları:', data?.length || 0);
      setReports(data || []);
    } catch (error) {
      console.error('Ameliyat raporları çekilirken hata:', error);
      setReports([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchReports();
  }, [filterStatus, selectedDate]);

  const handleFilter = (status: string | null) => {
    setFilterStatus(status);
    setShowFilterModal(false);
  };

  const filteredReports = reports.filter(report => {
    // Arama sorgusu filtresi
    const patientNameMatch = report.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const clinicNameMatch = report.clinics?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const surgeryTypeMatch = report.surgery_type?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    
    // Durum filtresi
    const statusMatch = filterStatus ? report.status === filterStatus : true;
    
    // Tarih filtresi
    let dateMatch = true;
    if (selectedDate) {
      const reportDate = new Date(report.date);
      dateMatch = reportDate.toDateString() === selectedDate.toDateString();
    }
    
    return (patientNameMatch || clinicNameMatch || surgeryTypeMatch) && statusMatch && dateMatch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#43A047'; // Yeşil
      case 'scheduled': return '#FB8C00'; // Turuncu
      case 'cancelled': return '#E53935'; // Kırmızı
      default: return '#757575'; 
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Tamamlandı';
      case 'scheduled': return 'Planlandı';
      case 'cancelled': return 'İptal Edildi';
      default: return 'Bilinmiyor';
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: tr });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };

  const renderReport = ({ item }: { item: SurgeryReport }) => (
    <TouchableOpacity 
      onPress={() => navigation.navigate('SurgeryReportDetail', { reportId: Number(item.id) })}
      style={styles.cardContainer}
    >
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <Surface style={[styles.iconContainer, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                <MaterialCommunityIcons name="medical-bag" size={24} color={getStatusColor(item.status)} />
              </Surface>
              <View style={styles.cardTitleTextContainer}>
                <Title style={styles.cardTitle}>{item.surgery_type}</Title>
                <Paragraph style={styles.cardSubtitle}>{item.clinics?.name}</Paragraph>
              </View>
            </View>
            <Chip 
              mode="outlined" 
              style={[styles.statusChip, { borderColor: getStatusColor(item.status) }]}
              textStyle={{ color: getStatusColor(item.status) }}
            >
              {getStatusText(item.status)}
            </Chip>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="calendar" size={18} color="#757575" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Tarih:</Text>
                <Text style={styles.detailValue}>{formatDate(item.date)}</Text>
              </View>
              
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="clock-outline" size={18} color="#757575" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Saat:</Text>
                <Text style={styles.detailValue}>{formatTime(item.time)}</Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="account" size={18} color="#757575" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Hasta:</Text>
                <Text style={styles.detailValue}>{item.patient_name || 'Belirtilmemiş'}</Text>
              </View>
              
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="package-variant" size={18} color="#757575" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Ürün:</Text>
                <Text style={styles.detailValue}>{item.products?.name || 'Belirtilmemiş'}</Text>
              </View>
            </View>
          </View>
          
          {item.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Notlar:</Text>
              <Text style={styles.notesText}>{item.notes}</Text>
            </View>
          )}
        </Card.Content>
        
        <Card.Actions style={styles.cardActions}>
          <Button 
            mode="text" 
            icon="eye" 
            onPress={() => navigation.navigate('SurgeryReportDetail', { reportId: Number(item.id) })}
          >
            Görüntüle
          </Button>
          
          {item.status === 'scheduled' && (
            <>
              <Button 
                mode="text" 
                icon="check-circle" 
                textColor="#43A047"
                onPress={() => console.log('Tamamlandı olarak işaretle:', item.id)}
              >
                Tamamlandı
              </Button>
              
              <Button 
                mode="text" 
                icon="close-circle" 
                textColor="#E53935"
                onPress={() => console.log('İptal Et:', item.id)}
              >
                İptal Et
              </Button>
            </>
          )}
        </Card.Actions>
      </Card>
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper
      loading={loading && !refreshing}
      refreshing={refreshing}
      onRefresh={onRefresh}
      loadingText="Ameliyat raporları yükleniyor..."
      scrollEnabled={false}
    >
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Hasta adı, klinik veya ameliyat türü ara..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
          />
        </View>

        <ScrollableFilters 
          selectedStatus={filterStatus}
          onSelectStatus={handleFilter}
          selectedDate={selectedDate}
          onClearDate={() => setSelectedDate(null)}
          onShowDatePicker={() => setShowDatePicker(true)}
        />

        <FlatList
          data={filteredReports}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderReport}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Henüz ameliyat raporu bulunmuyor</Text>
              <Button 
                mode="contained" 
                onPress={() => navigation.navigate('CreateSurgeryReport' as any)}
                style={{ marginTop: 16 }}
              >
                Yeni Ameliyat Raporu Oluştur
              </Button>
            </View>
          }
        />

        <FAB
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          icon="plus"
          onPress={() => navigation.navigate('CreateSurgeryReport' as any)}
          color="#fff"
        />
      </View>

      <Portal>
        <Modal
          visible={showFilterModal}
          onDismiss={() => setShowFilterModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Title style={styles.modalTitle}>Filtreleme Seçenekleri</Title>
          <Divider style={styles.divider} />
          
          <TouchableOpacity
            style={[styles.filterOption, filterStatus === null && styles.selectedFilter]}
            onPress={() => handleFilter(null)}
          >
            <Text style={styles.filterText}>Tümü</Text>
            {filterStatus === null && <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterOption, filterStatus === 'completed' && styles.selectedFilter]}
            onPress={() => handleFilter('completed')}
          >
            <Text style={styles.filterText}>Tamamlanan</Text>
            {filterStatus === 'completed' && <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterOption, filterStatus === 'scheduled' && styles.selectedFilter]}
            onPress={() => handleFilter('scheduled')}
          >
            <Text style={styles.filterText}>Planlanan</Text>
            {filterStatus === 'scheduled' && <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterOption, filterStatus === 'cancelled' && styles.selectedFilter]}
            onPress={() => handleFilter('cancelled')}
          >
            <Text style={styles.filterText}>İptal Edilen</Text>
            {filterStatus === 'cancelled' && <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />}
          </TouchableOpacity>
          
          <Button 
            mode="contained" 
            onPress={() => setShowFilterModal(false)}
            style={styles.closeButton}
          >
            Kapat
          </Button>
        </Modal>
      </Portal>
    </ScreenWrapper>
  );
};

import { ScrollView } from 'react-native';

const ScrollableFilters = ({ 
  selectedStatus, 
  onSelectStatus,
  selectedDate,
  onClearDate,
  onShowDatePicker
}: { 
  selectedStatus: string | null, 
  onSelectStatus: (status: string | null) => void,
  selectedDate: Date | null,
  onClearDate: () => void,
  onShowDatePicker: () => void
}) => {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScrollView}>
      <Chip
        selected={selectedStatus === null}
        onPress={() => onSelectStatus(null)}
        style={styles.filterChip}
        showSelectedOverlay
      >
        Tüm Durumlar
      </Chip>
      <Chip
        selected={selectedStatus === 'completed'}
        onPress={() => onSelectStatus('completed')}
        style={styles.filterChip}
        showSelectedOverlay
      >
        Tamamlanan
      </Chip>
      <Chip
        selected={selectedStatus === 'scheduled'}
        onPress={() => onSelectStatus('scheduled')}
        style={styles.filterChip}
        showSelectedOverlay
      >
        Planlanan
      </Chip>
      <Chip
        selected={selectedStatus === 'cancelled'}
        onPress={() => onSelectStatus('cancelled')}
        style={styles.filterChip}
        showSelectedOverlay
      >
        İptal Edilen
      </Chip>
      
      <Divider style={styles.chipDivider} />
      
      <Chip
        mode="outlined"
        onPress={onShowDatePicker}
        style={styles.filterChip}
        icon="calendar"
      >
        {selectedDate ? format(selectedDate, 'dd MMM yyyy', { locale: tr }) : "Tarih Seç"}
      </Chip>
      
      {selectedDate && (
        <Chip
          mode="outlined"
          onPress={onClearDate}
          style={styles.filterChip}
          icon="close"
          closeIcon="close"
        >
          Tarihi Temizle
        </Chip>
      )}
    </ScrollView>
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
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    padding: 8,
    borderRadius: 8,
  },
  cardTitleTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#757575',
  },
  statusChip: {
    height: 28,
  },
  divider: {
    marginVertical: 12,
  },
  detailsContainer: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailIcon: {
    marginRight: 4,
  },
  detailLabel: {
    color: '#757575',
    fontWeight: '500',
    marginRight: 4,
  },
  detailValue: {
    fontWeight: 'bold',
  },
  notesContainer: {
    marginTop: 4,
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  notesLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notesText: {
    color: '#424242',
  },
  cardActions: {
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectedFilter: {
    backgroundColor: '#f5f5f5',
  },
  filterText: {
    fontSize: 16,
  },
  closeButton: {
    marginTop: 20,
  },
  filtersScrollView: {
    flexGrow: 0,
  },
  filterChip: {
    marginRight: 8,
  },
  chipDivider: {
    height: '60%',
    width: 1,
    marginHorizontal: 8,
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
  },
}); 