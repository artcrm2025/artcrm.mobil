import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Button, ActivityIndicator, Chip } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { AntDesign, Feather } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaWrapper } from '../components/SafeAreaWrapper';
import { RootStackParamList } from '../types/navigation';

type ActivityType = 'visit' | 'proposal' | 'surgery' | 'other';

type ActivityItem = {
  id: string;
  created_at: string;
  type: ActivityType;
  title: string;
  description: string;
  status: string;
  user_id: string;
  user_name?: string;
  clinic_id?: string;
  clinic_name?: string;
  proposal_id?: string;
  visit_id?: string;
  surgery_id?: string;
};

const ActivityFeedScreen = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ActivityType | null>(null);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    fetchActivities();
  }, [filter]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      
      // Ziyaretleri getir
      const { data: visits, error: visitsError } = await supabase
        .from('visit_reports')
        .select(`
          id, 
          created_at, 
          user_id, 
          clinic_id, 
          subject, 
          date, 
          time,
          contact_person, 
          follow_up_required
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (visitsError) throw visitsError;

      // Teklifleri getir
      const { data: proposals, error: proposalsError } = await supabase
        .from('proposals')
        .select('id, created_at, status, user_id, clinic_id, notes')
        .order('created_at', { ascending: false })
        .limit(10);

      if (proposalsError) throw proposalsError;

      // Ameliyatları getir
      const { data: surgeries, error: surgeriesError } = await supabase
        .from('surgery_reports')
        .select('id, created_at, user_id, clinic_id, patient_name')
        .order('created_at', { ascending: false })
        .limit(10);

      if (surgeriesError) throw surgeriesError;

      // Kullanıcı bilgilerini getir
      const userIds = [
        ...visits.map(v => v.user_id), 
        ...proposals.map(p => p.user_id), 
        ...surgeries.map(s => s.user_id)
      ];
      
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name')
        .in('id', userIds);
      
      if (usersError) throw usersError;
      
      // Klinik bilgilerini getir
      const clinicIds = [
        ...visits.filter(v => v.clinic_id).map(v => v.clinic_id), 
        ...proposals.filter(p => p.clinic_id).map(p => p.clinic_id), 
        ...surgeries.filter(s => s.clinic_id).map(s => s.clinic_id)
      ];
      
      const { data: clinics, error: clinicsError } = await supabase
        .from('clinics')
        .select('id, name')
        .in('id', clinicIds);
      
      if (clinicsError) throw clinicsError;

      // Kullanıcı ve klinik isimlerini eşleştir
      const userMap: Record<string, string> = {};
      users.forEach(user => {
        userMap[user.id] = user.name;
      });
      
      const clinicMap: Record<string, string> = {};
      clinics.forEach(clinic => {
        clinicMap[clinic.id] = clinic.name;
      });

      // Aktiviteleri düzenle
      const visitActivities: ActivityItem[] = visits.map(visit => {
        // follow_up_required durumuna göre status belirleme
        let statusText = 'tamamlandı';
        if (visit.follow_up_required === true) {
          statusText = 'takip gerekli';
        }

        return {
          id: `visit-${visit.id}`,
          created_at: visit.created_at,
          type: 'visit',
          title: 'Ziyaret: ' + (visit.subject || 'Başlıksız Ziyaret'),
          description: `${visit.contact_person ? visit.contact_person + ' ile görüşme' : 'Ziyaret kaydı'} - ${new Date(visit.date).toLocaleDateString('tr-TR')} ${visit.time || ''}`,
          status: statusText,
          user_id: visit.user_id,
          user_name: userMap[visit.user_id],
          clinic_id: visit.clinic_id,
          clinic_name: visit.clinic_id ? clinicMap[visit.clinic_id] : 'Bilinmeyen Klinik',
          visit_id: visit.id
        };
      });
      
      const proposalActivities: ActivityItem[] = proposals.map(proposal => ({
        id: `proposal-${proposal.id}`,
        created_at: proposal.created_at,
        type: 'proposal',
        title: 'Yeni Teklif',
        description: proposal.notes || 'Teklif kaydı oluşturuldu',
        status: proposal.status,
        user_id: proposal.user_id,
        user_name: userMap[proposal.user_id],
        clinic_id: proposal.clinic_id,
        clinic_name: proposal.clinic_id ? clinicMap[proposal.clinic_id] : 'Bilinmeyen Klinik',
        proposal_id: proposal.id
      }));
      
      const surgeryActivities: ActivityItem[] = surgeries.map(surgery => ({
        id: `surgery-${surgery.id}`,
        created_at: surgery.created_at,
        type: 'surgery',
        title: 'Yeni Ameliyat',
        description: surgery.patient_name || 'Ameliyat kaydı oluşturuldu',
        status: 'completed',
        user_id: surgery.user_id,
        user_name: userMap[surgery.user_id],
        clinic_id: surgery.clinic_id,
        clinic_name: surgery.clinic_id ? clinicMap[surgery.clinic_id] : 'Bilinmeyen Klinik',
        surgery_id: surgery.id
      }));

      // Tüm aktiviteleri birleştir ve tarih sırasına göre sırala
      let allActivities = [...visitActivities, ...proposalActivities, ...surgeryActivities];
      
      // Filtre uygula
      if (filter) {
        allActivities = allActivities.filter(activity => activity.type === filter);
      }
      
      allActivities.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setActivities(allActivities);
    } catch (error) {
      console.error('Aktivite verisi getirilirken hata oluştu:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivityPress = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'visit':
        if (activity.visit_id && activity.visit_id !== 'undefined') {
          // reportId integer olarak geçilmeli
          const visitId = Number(activity.visit_id);
          if (!isNaN(visitId)) {
            navigation.navigate('VisitReportDetail', { reportId: visitId });
          } else {
            console.log('Geçersiz ziyaret ID formatı:', activity.visit_id);
          }
        } else {
          console.log('Geçersiz ziyaret ID:', activity.visit_id);
        }
        break;
      case 'proposal':
        if (activity.proposal_id && activity.proposal_id !== 'undefined') {
          // id integer olarak geçilmeli
          const proposalId = Number(activity.proposal_id);
          if (!isNaN(proposalId)) {
            navigation.navigate('ProposalDetail', { id: proposalId });
          } else {
            console.log('Geçersiz teklif ID formatı:', activity.proposal_id);
          }
        } else {
          console.log('Geçersiz teklif ID:', activity.proposal_id);
        }
        break;
      case 'surgery':
        if (activity.surgery_id && activity.surgery_id !== 'undefined') {
          // reportId integer olarak geçilmeli
          const surgeryId = Number(activity.surgery_id);
          if (!isNaN(surgeryId)) {
            navigation.navigate('SurgeryReportDetail', { reportId: surgeryId });
          } else {
            console.log('Geçersiz ameliyat ID formatı:', activity.surgery_id);
          }
        } else {
          console.log('Geçersiz ameliyat ID:', activity.surgery_id);
        }
        break;
    }
  };

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'visit':
        return <AntDesign name="calendar" size={24} color="#2196F3" />;
      case 'proposal':
        return <Feather name="file-text" size={24} color="#4CAF50" />;
      case 'surgery':
        return <Feather name="activity" size={24} color="#F44336" />;
      default:
        return <Feather name="bell" size={24} color="#9E9E9E" />;
    }
  };

  const getActivityTypeText = (type: ActivityType) => {
    switch (type) {
      case 'visit':
        return 'Ziyaret';
      case 'proposal':
        return 'Teklif';
      case 'surgery':
        return 'Ameliyat';
      default:
        return 'Diğer';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'approved':
      case 'success':
      case 'tamamlandı':
        return '#4CAF50'; // Yeşil
      case 'pending':
      case 'in_progress':
      case 'takip gerekli':
      case 'bekliyor':
        return '#2196F3'; // Mavi
      case 'cancelled':
      case 'rejected':
      case 'iptal':
      case 'reddedildi':
        return '#F44336'; // Kırmızı
      default:
        return '#9E9E9E'; // Gri
    }
  };

  const renderItem = ({ item }: { item: ActivityItem }) => (
    <TouchableOpacity onPress={() => handleActivityPress(item)}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            {getActivityIcon(item.type)}
            <View style={styles.headerTextContainer}>
              <Title style={styles.title}>{item.title}</Title>
              <View style={styles.metaContainer}>
                <Chip 
                  style={[styles.typeChip, { backgroundColor: '#E0E0E0' }]} 
                  textStyle={{ fontSize: 12 }}
                >
                  {getActivityTypeText(item.type)}
                </Chip>
                <Chip 
                  style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + '20' }]} 
                  textStyle={{ color: getStatusColor(item.status), fontSize: 12 }}
                >
                  {item.status}
                </Chip>
              </View>
            </View>
          </View>
          
          <Paragraph style={styles.description}>{item.description}</Paragraph>
          
          <View style={styles.footerContainer}>
            <Text style={styles.timeText}>
              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: tr })}
            </Text>
            <Text style={styles.userClinicText}>
              {item.user_name} {item.clinic_name ? `• ${item.clinic_name}` : ''}
            </Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filter === null ? styles.filterActive : {}]}
            onPress={() => setFilter(null)}
          >
            <Text style={[styles.filterText, filter === null ? {color: 'white'} : {}]}>Tümü</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'visit' ? styles.filterActive : {}]}
            onPress={() => setFilter('visit')}
          >
            <Text style={[styles.filterText, filter === 'visit' ? {color: 'white'} : {}]}>Ziyaretler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'proposal' ? styles.filterActive : {}]}
            onPress={() => setFilter('proposal')}
          >
            <Text style={[styles.filterText, filter === 'proposal' ? {color: 'white'} : {}]}>Teklifler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'surgery' ? styles.filterActive : {}]}
            onPress={() => setFilter('surgery')}
          >
            <Text style={[styles.filterText, filter === 'surgery' ? {color: 'white'} : {}]}>Ameliyatlar</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Aktiviteler yükleniyor...</Text>
          </View>
        ) : (
          <FlatList
            data={activities}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            refreshing={loading}
            onRefresh={fetchActivities}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Feather name="inbox" size={48} color="#9E9E9E" />
                <Text style={styles.emptyText}>Henüz aktivite bulunmuyor</Text>
                <Button mode="contained" onPress={fetchActivities} style={styles.refreshButton}>
                  Yenile
                </Button>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
  },
  filterActive: {
    backgroundColor: '#2196F3',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#757575',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeChip: {
    height: 24,
    marginRight: 8,
  },
  statusChip: {
    height: 24,
  },
  description: {
    fontSize: 14,
    color: '#757575',
    marginVertical: 8,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  userClinicText: {
    fontSize: 12,
    color: '#616161',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
  },
  emptyContainer: {
    paddingVertical: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    color: '#757575',
  },
  refreshButton: {
    backgroundColor: '#2196F3',
  },
});

export default ActivityFeedScreen; 