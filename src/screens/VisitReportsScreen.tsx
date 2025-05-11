import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Appbar, Card, Title, Paragraph, Text, Chip, Button, Searchbar, useTheme, FAB, Portal, Modal, ActivityIndicator, Divider, Avatar, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { RootStackNavigationProp } from '../types/navigation';
import { getCurrentUser } from '../services/authService';
import { User } from '../types';

type VisitReport = {
  id: number;
  user_id: string;
  clinic_id: number;
  subject: string;
  date: string;
  time: string;
  contact_person: string | null;
  notes: string | null;
  follow_up_required: boolean;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
  // İlişkili veriler
  users?: { name: string; email: string };
  clinics?: { name: string };
};

export const VisitReportsScreen = () => {
  const [reports, setReports] = useState<VisitReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFollowUp, setFilterFollowUp] = useState<boolean | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const theme = useTheme();
  const navigation = useNavigation<RootStackNavigationProp>();

  useEffect(() => {
    loadUserData();
    fetchReports();
  }, [filterFollowUp, selectedDate]);

  const loadUserData = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      
      // Admin veya manager ise düzenleme yetkisi var
      if (user) {
        const isAdmin = user.role === 'admin' || user.role === 'manager';
        setCanEdit(isAdmin);
      }
    } catch (error) {
      console.error('Kullanıcı bilgileri yüklenirken hata:', error);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      
      let query = supabase.from('visit_reports').select(`
        *,
        users:user_id(name, email),
        clinics:clinic_id(name)
      `);

      if (filterFollowUp !== null) {
        query = query.eq('follow_up_required', filterFollowUp);
      }
      
      if (selectedDate) {
        const formattedDate = format(selectedDate, 'yyyy-MM-dd');
        query = query.eq('date', formattedDate);
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) {
        console.error('Ziyaret raporları yüklenirken hata:', error);
        setReports([]);
        return;
      }

      console.log('Çekilen ziyaret raporları:', data?.length || 0);
      setReports(data || []);
    } catch (error) {
      console.error('Ziyaret raporları çekilirken hata:', error);
      setReports([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchReports();
  }, [filterFollowUp, selectedDate]);

  // Filtreleme işlemi
  const filteredReports = reports.filter(report => {
    const matchesSearch = searchQuery === '' || 
      report.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.contact_person && report.contact_person.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (report.clinics?.name && report.clinics.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (report.notes && report.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesSearch;
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: tr });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };

  const renderReport = ({ item }: { item: VisitReport }) => (
    <TouchableOpacity 
      onPress={() => navigation.navigate('VisitReportDetail', { reportId: item.id })}
      style={styles.cardContainer}
    >
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <Surface style={[styles.iconContainer, { backgroundColor: item.follow_up_required ? '#FFD54F30' : '#4FC3F730' }]}>
                <View style={{ overflow: 'hidden', borderRadius: 8 }}>
                  <MaterialCommunityIcons 
                    name={item.follow_up_required ? "clipboard-alert" : "clipboard-check"} 
                    size={24} 
                    color={item.follow_up_required ? '#F57F17' : '#0277BD'} 
                  />
                </View>
              </Surface>
              <View style={styles.cardTitleTextContainer}>
                <Title style={styles.cardTitle}>{item.subject}</Title>
                <Paragraph style={styles.cardSubtitle}>{item.clinics?.name}</Paragraph>
              </View>
            </View>
            {item.follow_up_required && (
              <Chip 
                mode="outlined" 
                style={[styles.followUpChip, { borderColor: '#F57F17' }]}
                textStyle={{ color: '#F57F17' }}
              >
                Takip Gerekli
              </Chip>
            )}
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
              {item.contact_person && (
                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="account" size={18} color="#757575" style={styles.detailIcon} />
                  <Text style={styles.detailLabel}>İlgili Kişi:</Text>
                  <Text style={styles.detailValue}>{item.contact_person}</Text>
                </View>
              )}
              
              {item.follow_up_required && item.follow_up_date && (
                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="calendar-clock" size={18} color="#757575" style={styles.detailIcon} />
                  <Text style={styles.detailLabel}>Takip Tarihi:</Text>
                  <Text style={styles.detailValue}>{formatDate(item.follow_up_date)}</Text>
                </View>
              )}
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
            onPress={() => navigation.navigate('VisitReportDetail', { reportId: item.id })}
          >
            Görüntüle
          </Button>
          
          {canEdit && (
            <Button 
              mode="text" 
              icon="pencil" 
              onPress={() => navigation.navigate('EditVisitReport', { reportId: item.id })}
            >
              Düzenle
            </Button>
          )}
          
          {canEdit && item.follow_up_required && (
            <Button 
              mode="text" 
              icon="check-circle" 
              textColor="#43A047"
              onPress={() => handleUpdateFollowUp(item.id)}
            >
              Tamamlandı
            </Button>
          )}
        </Card.Actions>
      </Card>
    </TouchableOpacity>
  );

  const handleUpdateFollowUp = async (reportId: number) => {
    try {
      const { error } = await supabase
        .from('visit_reports')
        .update({ follow_up_required: false })
        .eq('id', reportId);
      
      if (error) {
        console.error('Takip durumu güncellenirken hata:', error);
        Alert.alert('Hata', 'Takip durumu güncellenirken bir sorun oluştu');
        return;
      }
      
      // Listeyi güncelle
      setReports(reports.map(report => 
        report.id === reportId 
          ? { ...report, follow_up_required: false } 
          : report
      ));
      
      Alert.alert('Başarılı', 'Takip tamamlandı olarak işaretlendi');
    } catch (error) {
      console.error('Takip güncellenirken beklenmeyen hata:', error);
      Alert.alert('Hata', 'Bir sorun oluştu');
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Ziyaret Raporları" />
        <Appbar.Action icon="filter-variant" onPress={() => setShowFilterModal(true)} />
        <Appbar.Action icon="magnify" onPress={() => {}} />
      </Appbar.Header>
      
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Konu, ilgili kişi veya klinik ara"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        
        <View style={styles.chipContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Chip
              selected={filterFollowUp === null}
              onPress={() => setFilterFollowUp(null)}
              style={styles.chip}
              showSelectedOverlay
            >
              Tümü
            </Chip>
            <Chip
              selected={filterFollowUp === true}
              onPress={() => setFilterFollowUp(true)}
              style={styles.chip}
              showSelectedOverlay
            >
              Takip Gerektiren
            </Chip>
            <Chip
              selected={filterFollowUp === false}
              onPress={() => setFilterFollowUp(false)}
              style={styles.chip}
              showSelectedOverlay
            >
              Tamamlanan
            </Chip>
            <Chip
              mode="outlined"
              onPress={() => setSelectedDate(selectedDate ? null : new Date())}
              style={styles.chip}
              icon={selectedDate ? "close" : "calendar"}
            >
              {selectedDate ? "Tarihi Temizle" : "Bugünkü Ziyaretler"}
            </Chip>
          </ScrollView>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Ziyaret raporları yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredReports}
          renderItem={renderReport}
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
              <MaterialCommunityIcons name="clipboard-text-outline" size={80} color="#BDBDBD" />
              <Text style={styles.emptyText}>Hiç ziyaret raporu bulunamadı</Text>
              <Text style={styles.emptySubtext}>Yeni bir ziyaret raporu ekleyin veya filtreleri temizleyin</Text>
            </View>
          }
        />
      )}

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('CreateVisitReport', { prefillClinicId: undefined })}
        label="Yeni Rapor"
      />

      <Portal>
        <Modal
          visible={showFilterModal}
          onDismiss={() => setShowFilterModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Title style={styles.modalTitle}>Filtreleme Seçenekleri</Title>
          <Divider style={styles.divider} />
          
          <Text style={styles.modalSectionTitle}>Takip Durumu</Text>
          
          <TouchableOpacity
            style={[styles.filterOption, filterFollowUp === null && styles.selectedFilter]}
            onPress={() => {
              setFilterFollowUp(null);
              setShowFilterModal(false);
            }}
          >
            <Text style={styles.filterText}>Tümü</Text>
            {filterFollowUp === null && <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterOption, filterFollowUp === true && styles.selectedFilter]}
            onPress={() => {
              setFilterFollowUp(true);
              setShowFilterModal(false);
            }}
          >
            <Text style={styles.filterText}>Takip Gerektiren</Text>
            {filterFollowUp === true && <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterOption, filterFollowUp === false && styles.selectedFilter]}
            onPress={() => {
              setFilterFollowUp(false);
              setShowFilterModal(false);
            }}
          >
            <Text style={styles.filterText}>Tamamlanan</Text>
            {filterFollowUp === false && <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />}
          </TouchableOpacity>
          
          <Divider style={[styles.divider, {marginTop: 16}]} />
          <Text style={styles.modalSectionTitle}>Tarih Seçimi</Text>
          
          <View style={styles.dateOptionContainer}>
            <Button 
              mode="outlined" 
              onPress={() => {
                setSelectedDate(new Date());
                setShowFilterModal(false);
              }}
              style={styles.dateButton}
            >
              Bugün
            </Button>
            
            <Button 
              mode="outlined" 
              onPress={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setSelectedDate(tomorrow);
                setShowFilterModal(false);
              }}
              style={styles.dateButton}
            >
              Yarın
            </Button>
            
            <Button 
              mode="outlined" 
              onPress={() => {
                setSelectedDate(null);
                setShowFilterModal(false);
              }}
              style={styles.dateButton}
            >
              Tümü
            </Button>
          </View>
          
          <Button 
            mode="contained" 
            onPress={() => setShowFilterModal(false)}
            style={styles.closeButton}
          >
            Kapat
          </Button>
        </Modal>
      </Portal>
    </View>
  );
};

import { ScrollView } from 'react-native';

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
  chipContainer: {
    marginTop: 12,
  },
  chip: {
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
  followUpChip: {
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
    marginBottom: 6,
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
  followUpDate: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
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
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#616161',
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
  dateOptionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  dateButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  closeButton: {
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