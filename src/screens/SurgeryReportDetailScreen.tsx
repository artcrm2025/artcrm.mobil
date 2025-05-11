import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Appbar, Card, Text, Title, Paragraph, Divider, Chip, Button, useTheme, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../types/navigation';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

type SurgeryReportDetailScreenRouteProp = RouteProp<RootStackParamList, 'SurgeryReportDetail'>;

type SurgeryReport = {
  id: number;
  user_id: string;
  clinic_id: number;
  date: string;
  time: string;
  product_id: number | null;
  patient_name: string | null;
  surgery_type: string | null;
  notes: string | null;
  status: 'completed' | 'scheduled' | 'cancelled';
  created_at: string;
  updated_at: string;
  users?: { name: string; email: string };
  clinics?: { name: string; contact_person?: string; contact_info?: string; address?: string };
  products?: { name: string; category?: string };
};

export const SurgeryReportDetailScreen = () => {
  const [report, setReport] = useState<SurgeryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const route = useRoute<SurgeryReportDetailScreenRouteProp>();
  const { reportId } = route.params;
  const theme = useTheme();

  useEffect(() => {
    fetchReportDetails();
  }, [reportId]);

  const fetchReportDetails = async () => {
    try {
      setLoading(true);
      
      if (!reportId || isNaN(Number(reportId))) {
        console.error('Geçersiz rapor ID:', reportId);
        Alert.alert('Hata', 'Geçersiz ameliyat raporu ID\'si');
        navigation.goBack();
        return;
      }
      
      const { data, error } = await supabase
        .from('surgery_reports')
        .select(`
          *,
          users (name, email),
          clinics (name, contact_person, contact_info, address),
          products (name, category)
        `)
        .eq('id', reportId)
        .single();
      
      if (error) {
        console.error('Ameliyat raporu detayları alınırken hata:', error);
        Alert.alert('Hata', 'Ameliyat raporu bilgileri alınamadı');
        navigation.goBack();
        return;
      }
      
      setReport(data);
    } catch (error) {
      console.error('Ameliyat raporu işlenirken hata:', error);
      Alert.alert('Hata', 'Bir sorun oluştu');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#43A047'; // Yeşil
      case 'scheduled': return '#FB8C00'; // Turuncu
      case 'cancelled': return '#E53935'; // Kırmızı
      default: return '#757575'; // Gri
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

  const updateStatus = async (newStatus: 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('surgery_reports')
        .update({ status: newStatus })
        .eq('id', reportId);
      
      if (error) {
        console.error('Durum güncellenirken hata:', error);
        Alert.alert('Hata', 'Durum güncellenirken bir sorun oluştu');
        return;
      }
      
      // Başarılı güncelleme sonrası raporu yeniden yükle
      setReport(prev => prev ? { ...prev, status: newStatus } : null);
      Alert.alert('Başarılı', `Ameliyat raporu ${newStatus === 'completed' ? 'tamamlandı' : 'iptal edildi'} olarak işaretlendi`);
    } catch (error) {
      console.error('Durum güncellenirken beklenmeyen hata:', error);
      Alert.alert('Hata', 'Bir sorun oluştu');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Ameliyat raporu yükleniyor...</Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#E53935" />
        <Text style={styles.errorText}>Ameliyat raporu bulunamadı</Text>
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
        <Appbar.Content title="Ameliyat Raporu Detayı" />
      </Appbar.Header>
      
      <ScrollView style={styles.scrollContainer}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.headerContainer}>
              <View style={styles.titleSection}>
                <Title style={styles.reportTitle}>{report.surgery_type}</Title>
                <Paragraph style={styles.clinicName}>{report.clinics?.name}</Paragraph>
              </View>
              
              <Chip 
                mode="outlined" 
                style={[styles.statusChip, { borderColor: getStatusColor(report.status) }]}
                textStyle={{ color: getStatusColor(report.status) }}
              >
                {getStatusText(report.status)}
              </Chip>
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.infoSection}>
              <Title style={styles.sectionTitle}>Ameliyat Bilgileri</Title>
              
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
              
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="account" size={20} color="#757575" style={styles.infoIcon} />
                  <Text style={styles.infoLabel}>Hasta:</Text>
                  <Text style={styles.infoValue}>{report.patient_name || 'Belirtilmemiş'}</Text>
                </View>
                
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="package-variant" size={20} color="#757575" style={styles.infoIcon} />
                  <Text style={styles.infoLabel}>Ürün:</Text>
                  <Text style={styles.infoValue}>{report.products?.name || 'Belirtilmemiş'}</Text>
                </View>
              </View>
              
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
          
          {report.status === 'scheduled' && (
            <Card.Actions style={styles.cardActions}>
              <Button 
                mode="outlined" 
                icon="check-circle" 
                textColor="#43A047"
                onPress={() => updateStatus('completed')}
              >
                Tamamlandı Olarak İşaretle
              </Button>
              
              <Button 
                mode="outlined" 
                icon="close-circle" 
                textColor="#E53935"
                onPress={() => updateStatus('cancelled')}
              >
                İptal Et
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
  statusChip: {
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