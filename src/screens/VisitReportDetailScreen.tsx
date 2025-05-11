import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Appbar, Card, Text, Title, Paragraph, Divider, Chip, Button, useTheme, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { RootStackParamList, RootStackNavigationProp } from '../types/navigation';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { getCurrentUser } from '../services/authService';
import { User } from '../types';

type VisitReportDetailScreenRouteProp = RouteProp<RootStackParamList, 'VisitReportDetail'>;

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
  users?: { name: string; email: string };
  clinics?: { name: string; contact_person?: string; contact_info?: string; address?: string };
};

export const VisitReportDetailScreen = () => {
  const [report, setReport] = useState<VisitReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<VisitReportDetailScreenRouteProp>();
  const { reportId: reportIdParam } = route.params;
  const reportId = typeof reportIdParam === 'string' ? Number(reportIdParam) : reportIdParam;
  const theme = useTheme();

  useEffect(() => {
    loadCurrentUser();
    fetchReportDetails();
  }, [reportId]);

  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      
      // Admin veya manager ise veya kendi raporu ise düzenleme yetkisi ver
      if (user) {
        const isAdmin = user.role === 'admin' || user.role === 'manager';
        setCanEdit(isAdmin);
      }
    } catch (error) {
      console.error('Kullanıcı bilgileri yüklenirken hata:', error);
    }
  };

  const fetchReportDetails = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('visit_reports')
        .select(`
          *,
          users (name, email),
          clinics (name, contact_person, contact_info, address)
        `)
        .eq('id', reportId)
        .single();
      
      if (error) {
        console.error('Ziyaret raporu detayları alınırken hata:', error);
        Alert.alert('Hata', 'Ziyaret raporu bilgileri alınamadı');
        navigation.goBack();
        return;
      }
      
      setReport(data);
      
      // Kendi raporu mu kontrol et
      if (currentUser && data.user_id === currentUser.id) {
        setCanEdit(true);
      }
    } catch (error) {
      console.error('Ziyaret raporu işlenirken hata:', error);
      Alert.alert('Hata', 'Bir sorun oluştu');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: tr });
  };
  
  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };

  const updateFollowUpStatus = async (completed: boolean) => {
    try {
      const { error } = await supabase
        .from('visit_reports')
        .update({ follow_up_required: !completed })
        .eq('id', reportId);
      
      if (error) {
        console.error('Takip durumu güncellenirken hata:', error);
        Alert.alert('Hata', 'Takip durumu güncellenirken bir sorun oluştu');
        return;
      }
      
      // Rapor durumunu güncelle
      setReport(prev => prev ? { ...prev, follow_up_required: !completed } : null);
      Alert.alert('Başarılı', completed ? 'Takip tamamlandı olarak işaretlendi' : 'Takip gerekli olarak işaretlendi');
    } catch (error) {
      console.error('Durum güncellenirken beklenmeyen hata:', error);
      Alert.alert('Hata', 'Bir sorun oluştu');
    }
  };

  const handleEdit = () => {
    navigation.navigate('EditVisitReport', { reportId });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Ziyaret raporu yükleniyor...</Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#E53935" />
        <Text style={styles.errorText}>Ziyaret raporu bulunamadı</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Geri Dön
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Ziyaret Raporu Detayı" />
        {canEdit && (
          <Appbar.Action icon="pencil" onPress={handleEdit} />
        )}
      </Appbar.Header>
      
      <ScrollView style={styles.scrollContainer}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.headerContainer}>
              <View style={styles.titleSection}>
                <Title style={styles.reportTitle}>{report.subject}</Title>
                <Paragraph style={styles.clinicName}>{report.clinics?.name}</Paragraph>
              </View>
              
              {report.follow_up_required && (
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
            
            <View style={styles.infoSection}>
              <Title style={styles.sectionTitle}>Ziyaret Bilgileri</Title>
              
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="calendar" size={20} color="#757575" style={styles.infoIcon} />
                  <Text style={styles.infoLabel}>Tarih:</Text>
                  <Text style={styles.infoValue}>{formatDate(report.date)}</Text>
                </View>
                
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="clock-outline" size={20} color="#757575" style={styles.infoIcon} />
                  <Text style={styles.infoLabel}>Saat:</Text>
                  <Text style={styles.infoValue}>{formatTime(report.time)}</Text>
                </View>
              </View>
              
              {report.contact_person && (
                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <MaterialCommunityIcons name="account" size={20} color="#757575" style={styles.infoIcon} />
                    <Text style={styles.infoLabel}>İlgili Kişi:</Text>
                    <Text style={styles.infoValue}>{report.contact_person}</Text>
                  </View>
                </View>
              )}
              
              {report.follow_up_date && (
                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <MaterialCommunityIcons name="calendar-clock" size={20} color="#757575" style={styles.infoIcon} />
                    <Text style={styles.infoLabel}>Takip Tarihi:</Text>
                    <Text style={styles.infoValue}>{formatDate(report.follow_up_date)}</Text>
                  </View>
                </View>
              )}
              
              {report.notes && (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesLabel}>Notlar:</Text>
                  <Text style={styles.notesText}>{report.notes}</Text>
                </View>
              )}
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.infoSection}>
              <Title style={styles.sectionTitle}>Klinik Bilgileri</Title>
              
              <View style={styles.clinicDetailContainer}>
                <Text style={styles.clinicDetailLabel}>Klinik Adı:</Text>
                <Text style={styles.clinicDetailValue}>{report.clinics?.name || 'Belirtilmemiş'}</Text>
              </View>
              
              {report.clinics?.contact_person && (
                <View style={styles.clinicDetailContainer}>
                  <Text style={styles.clinicDetailLabel}>İlgili Kişi:</Text>
                  <Text style={styles.clinicDetailValue}>{report.clinics.contact_person}</Text>
                </View>
              )}
              
              {report.clinics?.contact_info && (
                <View style={styles.clinicDetailContainer}>
                  <Text style={styles.clinicDetailLabel}>İletişim:</Text>
                  <Text style={styles.clinicDetailValue}>{report.clinics.contact_info}</Text>
                </View>
              )}
              
              {report.clinics?.address && (
                <View style={styles.clinicDetailContainer}>
                  <Text style={styles.clinicDetailLabel}>Adres:</Text>
                  <Text style={styles.clinicDetailValue}>{report.clinics.address}</Text>
                </View>
              )}
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.infoSection}>
              <Title style={styles.sectionTitle}>Sorumlu Kullanıcı</Title>
              
              <View style={styles.userContainer}>
                <Surface style={styles.userAvatar}>
                  <MaterialCommunityIcons name="account" size={32} color={theme.colors.primary} />
                </Surface>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{report.users?.name || 'Belirtilmemiş'}</Text>
                  <Text style={styles.userEmail}>{report.users?.email || 'Belirtilmemiş'}</Text>
                </View>
              </View>
            </View>
          </Card.Content>
          
          {canEdit && (
            <Card.Actions style={styles.cardActions}>
              {report.follow_up_required ? (
                <Button 
                  mode="outlined" 
                  icon="check-circle" 
                  textColor="#43A047"
                  onPress={() => updateFollowUpStatus(true)}
                >
                  Takibi Tamamlandı Olarak İşaretle
                </Button>
              ) : (
                <Button 
                  mode="outlined" 
                  icon="alert-circle" 
                  textColor="#F57F17"
                  onPress={() => updateFollowUpStatus(false)}
                >
                  Takip Gerekli Olarak İşaretle
                </Button>
              )}
              
              <Button 
                mode="outlined" 
                icon="pencil" 
                onPress={handleEdit}
              >
                Düzenle
              </Button>
            </Card.Actions>
          )}
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#616161'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20
  },
  errorText: {
    fontSize: 18,
    color: '#616161',
    marginVertical: 20,
    textAlign: 'center'
  },
  scrollContainer: {
    flex: 1
  },
  card: {
    margin: 16,
    borderRadius: 12,
    elevation: 2
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  titleSection: {
    flex: 1
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121'
  },
  clinicName: {
    fontSize: 16,
    color: '#616161'
  },
  followUpChip: {
    marginLeft: 8
  },
  divider: {
    marginVertical: 16
  },
  infoSection: {
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#212121'
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
    flex: 1,
    minWidth: '45%'
  },
  infoIcon: {
    marginRight: 4
  },
  infoLabel: {
    fontWeight: 'bold',
    color: '#616161',
    marginRight: 4
  },
  infoValue: {
    color: '#212121',
    flex: 1
  },
  notesContainer: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginTop: 8
  },
  notesLabel: {
    fontWeight: 'bold',
    color: '#616161',
    marginBottom: 4
  },
  notesText: {
    color: '#212121'
  },
  clinicDetailContainer: {
    marginBottom: 8
  },
  clinicDetailLabel: {
    fontWeight: 'bold',
    color: '#616161'
  },
  clinicDetailValue: {
    color: '#212121',
    marginTop: 2
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8EAF6',
    marginRight: 12
  },
  userInfo: {
    flex: 1
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121'
  },
  userEmail: {
    fontSize: 14,
    color: '#616161'
  },
  cardActions: {
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 8
  }
}); 