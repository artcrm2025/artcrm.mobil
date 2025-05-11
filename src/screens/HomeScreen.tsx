import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, RefreshControl, Platform, ImageBackground, Animated, Dimensions, Modal, FlatList, Alert } from 'react-native';
import { Text, Card, Avatar, Button, Divider, ActivityIndicator, useTheme, Surface, Chip, Portal, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../services/authService';
import { User } from '../types';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { format, subDays, subMonths, subYears, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { tr } from 'date-fns/locale';
import { SafeAreaWrapper, SafeContentContainer } from '../components/SafeAreaWrapper';
import { ProposalStatusChart } from '../components/ProposalStatusChart';
import { useUser } from '../hooks/useUser';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, RootStackNavigationProp } from '../types/navigation';

// Globalde ReactNavigation namespace'i genişletelim
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

// Tip tanımları
interface VisitReportItem {
  id: number;
  date: string;
  subject: string;
  clinics?: { id: number; name: string };
  users?: { id: string; name: string };
}

interface SurgeryReportItem {
  id: number;
  date: string;
  status: string;
  patient_name: string;
  clinics?: { id: number; name: string };
  users?: { id: string; name: string };
  products?: { id: number; name: string };
}

// Navigasyon tipini tanımla
type HomeScreenNavigationProp = RootStackNavigationProp<'Home'>;

// Ekran genişliğini ve yüksekliğini al
const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

const statsRowColors = {
  proposals: '#6366F1',
  pending: '#F59E0B',
  approved: '#10B981',
  rejected: '#EF4444',
  surgeries: '#7B1FA2',
  visits: '#388E3C',
  clinics: '#1976D2'
};

// Stats interface
interface Stats {
  pendingCount: number;
  inTransferCount: number;
  approvedCount: number;
  deliveredCount: number;
  contractReceivedCount: number;
  rejectedCount: number;
  expiredCount: number;
  totalSurgeries: number;
  totalVisits: number;
  totalClinics: number;
}

// Başlangıç istatistik değerleri
const initialStats: Stats = {
  pendingCount: 0,
  inTransferCount: 0,
  approvedCount: 0,
  deliveredCount: 0,
  contractReceivedCount: 0,
  rejectedCount: 0,
  expiredCount: 0,
  totalSurgeries: 0,
  totalVisits: 0,
  totalClinics: 0
};

export const HomeScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const theme = useTheme();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [scrollY] = useState(new Animated.Value(0));
  const { user, loading: userLoading, error: userError, refreshUser } = useUser();
  const [timeFilter, setTimeFilter] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [filteredStats, setFilteredStats] = useState({
    totalProposals: 0,
    pendingProposals: 0,
    approvedProposals: 0,
    rejectedProposals: 0
  });

  // Rol kontrol değişkenleri user nesnesinden türetilecek
  const isAdmin = user?.role === 'admin';
  const isRegionalManager = user?.role === 'regional_manager';

  // Son 5 Ziyaret Raporu ve Son 5 Ameliyat Raporu
  const [recentVisitReports, setRecentVisitReports] = useState<any[]>([]);
  const [recentSurgeryReports, setRecentSurgeryReports] = useState<any[]>([]);

  // Ziyaret raporları için durum değişkenleri
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [allVisitReports, setAllVisitReports] = useState<any[]>([]);
  const [visitPage, setVisitPage] = useState(1);
  const [loadingMoreVisits, setLoadingMoreVisits] = useState(false);
  const [hasMoreVisits, setHasMoreVisits] = useState(true);

  // Ameliyat raporları için durum değişkenleri
  const [showSurgeryModal, setShowSurgeryModal] = useState(false);
  const [allSurgeryReports, setAllSurgeryReports] = useState<any[]>([]);
  const [surgeryPage, setSurgeryPage] = useState(1);
  const [loadingMoreSurgeries, setLoadingMoreSurgeries] = useState(false);
  const [hasMoreSurgeries, setHasMoreSurgeries] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Kullanıcı bilgilerini al
      const user = await getCurrentUser();
      setCurrentUser(user);
      
      // İstatistikleri getir
      await Promise.all([
        fetchStats()
      ]);
      
      // Son aktiviteleri ve raporları da yükle
      await Promise.all([
        fetchRecentActivities(user),
        fetchRecentReports(user)
      ]);
      
      // Filtrelenmiş istatistikleri de getir
      await fetchFilteredStats(timeFilter);
      
      console.log('Veriler başarıyla yüklendi');
    } catch (error) {
      console.error('Ana sayfa verileri yüklenirken hata:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Veritabanından doğrudan sayıları sorgulayalım
      
      // Teklif sayıları
      const { count: totalProposalsCount, error: totalCountError } = await supabase
        .from('proposals')
        .select('*', { count: 'exact', head: true });
      
      const { count: pendingCount, error: pendingError } = await supabase
        .from('proposals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      const { count: approvedCount, error: approvedError } = await supabase
        .from('proposals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');
      
      const { count: rejectedCount, error: rejectedError } = await supabase
        .from('proposals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected');
      
      // Diğer teklif durumları
      const { count: inTransferCount, error: inTransferError } = await supabase
        .from('proposals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_transfer');
      
      const { count: deliveredCount, error: deliveredError } = await supabase
        .from('proposals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'delivered');
      
      const { count: contractReceivedCount, error: contractError } = await supabase
        .from('proposals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'contract_received');
      
      const { count: expiredCount, error: expiredError } = await supabase
        .from('proposals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'expired');
      
      // Rapor ve klinik sayıları
      const { count: totalSurgeries, error: surgeriesError } = await supabase
        .from('surgery_reports')
        .select('*', { count: 'exact', head: true });
      
      const { count: totalVisits, error: visitsError } = await supabase
        .from('visit_reports')
        .select('*', { count: 'exact', head: true });
      
      const { count: totalClinics, error: clinicsError } = await supabase
        .from('clinics')
        .select('*', { count: 'exact', head: true });
      
      // Hataları kontrol et
      if (totalCountError) console.error('Toplam teklif sayısı alınamadı:', totalCountError);
      if (pendingError) console.error('Bekleyen teklif sayısı alınamadı:', pendingError);
      if (approvedError) console.error('Onaylanan teklif sayısı alınamadı:', approvedError);
      if (rejectedError) console.error('Reddedilen teklif sayısı alınamadı:', rejectedError);
      if (surgeriesError) console.error('Ameliyat raporu sayısı alınamadı:', surgeriesError);
      if (visitsError) console.error('Ziyaret raporu sayısı alınamadı:', visitsError);
      if (clinicsError) console.error('Klinik sayısı alınamadı:', clinicsError);
      
      // İstatistikleri güncelle
      setStats({
        pendingCount: pendingCount || 0,
        inTransferCount: inTransferCount || 0,
        approvedCount: approvedCount || 0,
        deliveredCount: deliveredCount || 0,
        contractReceivedCount: contractReceivedCount || 0,
        rejectedCount: rejectedCount || 0,
        expiredCount: expiredCount || 0,
        totalSurgeries: totalSurgeries || 0,
        totalVisits: totalVisits || 0,
        totalClinics: totalClinics || 0
      });
      
      // filteredStats'ı da güncelle
      setFilteredStats({
        totalProposals: totalProposalsCount || 0,
        pendingProposals: pendingCount || 0,
        approvedProposals: approvedCount || 0,
        rejectedProposals: rejectedCount || 0
      });
      
      console.log('İstatistikler güncellendi:', {
        totalProposals: totalProposalsCount || 0,
        pendingCount: pendingCount || 0,
        approvedCount: approvedCount || 0,
        rejectedCount: rejectedCount || 0
      });
      
    } catch (error) {
      console.error('İstatistik verilerini alırken hata oluştu:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivities = async (user: User | null) => {
    if (!user) return;
    
    try {
      // Son teklifler
      let proposalsQuery = supabase
        .from('proposals')
        .select(`
          id, 
          created_at, 
          status,
          total_amount,
          clinics:clinic_id (id, name),
          user_id
        `)
        .order('created_at', { ascending: false })
        .limit(3);
      
      // Rol tabanlı erişim kontrolü
      if (user.role === 'admin' || user.role === 'manager') {
        // Admin ve Manager tüm verileri görebilir
        // Mevcut sorgu tüm verileri getirecek
      } else if (user.role === 'regional_manager' && user.region_id) {
        // Bölge müdürü kendi bölgesindeki kliniklere ait verileri görebilir
        const { data: clinics } = await supabase
          .from('clinics')
          .select('id')
          .eq('region_id', user.region_id);
          
        if (clinics && clinics.length > 0) {
          const ids = clinics.map(c => c.id);
          proposalsQuery = proposalsQuery.in('clinic_id', ids);
        }
      } else {
        // Saha kullanıcıları sadece kendi verilerini görebilir
        proposalsQuery = proposalsQuery.eq('user_id', user.id);
      }
      
      const { data: proposals } = await proposalsQuery;
      
      // Son ameliyat raporları
      let surgeriesQuery = supabase
        .from('surgery_reports')
        .select(`
          id, 
          created_at,
          date,
          clinics:clinic_id (id, name),
          products:product_id (id, name),
          user_id
        `)
        .order('created_at', { ascending: false })
        .limit(3);
      
      // Rol tabanlı erişim kontrolü
      if (user.role === 'admin' || user.role === 'manager') {
        // Admin ve Manager tüm verileri görebilir
        // Mevcut sorgu tüm verileri getirecek
      } else if (user.role === 'regional_manager' && user.region_id) {
        // Bölge müdürü kendi bölgesindeki kliniklere ait verileri görebilir
        const { data: clinics } = await supabase
          .from('clinics')
          .select('id')
          .eq('region_id', user.region_id);
          
        if (clinics && clinics.length > 0) {
          const ids = clinics.map(c => c.id);
          surgeriesQuery = surgeriesQuery.in('clinic_id', ids);
        }
      } else {
        // Saha kullanıcıları sadece kendi verilerini görebilir
        surgeriesQuery = surgeriesQuery.eq('user_id', user.id);
      }
      
      const { data: surgeries } = await surgeriesQuery;
      
      // Son ziyaret raporları
      let visitsQuery = supabase
        .from('visit_reports')
        .select(`
          id, 
          created_at,
          date,
          subject,
          clinics:clinic_id (id, name),
          user_id
        `)
        .order('created_at', { ascending: false })
        .limit(3);
      
      // Rol tabanlı erişim kontrolü
      if (user.role === 'admin' || user.role === 'manager') {
        // Admin ve Manager tüm verileri görebilir
        // Mevcut sorgu tüm verileri getirecek
      } else if (user.role === 'regional_manager' && user.region_id) {
        // Bölge müdürü kendi bölgesindeki kliniklere ait verileri görebilir
        const { data: clinics } = await supabase
          .from('clinics')
          .select('id')
          .eq('region_id', user.region_id);
          
        if (clinics && clinics.length > 0) {
          const ids = clinics.map(c => c.id);
          visitsQuery = visitsQuery.in('clinic_id', ids);
        }
      } else {
        // Saha kullanıcıları sadece kendi verilerini görebilir
        visitsQuery = visitsQuery.eq('user_id', user.id);
      }
      
      const { data: visits } = await visitsQuery;
      
      // Tüm aktiviteleri birleştir
      const allActivities = [
        ...(proposals || []).map(p => ({
          id: `proposal-${p.id}`,
          type: 'proposal',
          title: `${p.clinics && typeof p.clinics === 'object' && 'name' in p.clinics ? p.clinics.name : 'Bilinmeyen Klinik'} için Teklif`,
          description: `${p.total_amount} TL tutarında ${getStatusText(p.status)}`,
          date: p.created_at,
          status: p.status,
          iconName: 'file-document-outline',
          iconColor: '#6366F1', // Indigo
          onPress: () => navigation.navigate('ProposalDetail', { id: p.id })
        })),
        ...(surgeries || []).map(s => ({
          id: `surgery-${s.id}`,
          type: 'surgery',
          title: `${s.clinics && typeof s.clinics === 'object' && 'name' in s.clinics ? s.clinics.name : 'Bilinmeyen Klinik'} Ameliyatı`,
          description: `${s.products && typeof s.products === 'object' && 'name' in s.products ? s.products.name : 'Bilinmeyen Ürün'} - ${formatDate(s.date)}`,
          date: s.created_at,
          iconName: 'medical-bag',
          iconColor: '#EF4444', // Kırmızı
          onPress: () => navigation.navigate('SurgeryReportDetail', { reportId: s.id })
        })),
        ...(visits || []).map(v => ({
          id: `visit-${v.id}`,
          type: 'visit',
          title: v.subject || 'Ziyaret',
          description: `${v.clinics && typeof v.clinics === 'object' && 'name' in v.clinics ? v.clinics.name : 'Bilinmeyen Klinik'} - ${formatDate(v.date)}`,
          date: v.created_at,
          iconName: 'clipboard-text-outline',
          iconColor: '#10B981', // Yeşil
          onPress: () => navigation.navigate('VisitReportDetail', { reportId: v.id })
        }))
      ];
      
      // Tarihe göre sırala
      allActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setRecentActivities(allActivities.slice(0, 6)); // En son 6 aktivite
      
      console.log('Son aktiviteler yüklendi:', allActivities.length);
      
    } catch (error) {
      console.error('Son aktiviteler alınırken hata:', error);
    }
  };

  const fetchRecentReports = async (user: User | null) => {
    if (!user) return;
    
    try {
      // Son 5 ziyaret raporu
      let visitsQuery = supabase
        .from('visit_reports')
        .select(`
          id, 
          date,
          subject,
          clinics:clinic_id (id, name),
          users:user_id (id, name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      // Rol tabanlı erişim kontrolü
      if (user.role === 'admin' || user.role === 'manager') {
        // Admin ve Manager tüm verileri görebilir
      } else if (user.role === 'regional_manager' && user.region_id) {
        // Bölge müdürü kendi bölgesindeki kliniklere ait verileri görebilir
        const { data: clinics } = await supabase
          .from('clinics')
          .select('id')
          .eq('region_id', user.region_id);
          
        if (clinics && clinics.length > 0) {
          const ids = clinics.map(c => c.id);
          visitsQuery = visitsQuery.in('clinic_id', ids);
        }
      } else {
        // Saha kullanıcıları sadece kendi verilerini görebilir
        visitsQuery = visitsQuery.eq('user_id', user.id);
      }
      
      const { data: visitReports } = await visitsQuery;
      setRecentVisitReports(visitReports || []);
      
      // Son 5 ameliyat raporu sorgusu düzeltildi - doctor_name kaldırıldı
      let surgeriesQuery = supabase
        .from('surgery_reports')
        .select(`
          id, 
          date,
          status,
          patient_name,
          clinics:clinic_id (id, name),
          users:user_id (id, name),
          products:product_id (id, name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      // Rol tabanlı erişim kontrolü - ameliyat raporları için geçici olarak kaldıralım
      /* Rol tabanlı kontrolleri test amaçlı yorum satırına alıyoruz
      if (user.role === 'admin' || user.role === 'manager') {
        // Admin ve Manager tüm verileri görebilir
      } else if (user.role === 'regional_manager' && user.region_id) {
        // Bölge müdürü kendi bölgesindeki kliniklere ait verileri görebilir
        const { data: clinics } = await supabase
          .from('clinics')
          .select('id')
          .eq('region_id', user.region_id);
          
        if (clinics && clinics.length > 0) {
          const ids = clinics.map(c => c.id);
          surgeriesQuery = surgeriesQuery.in('clinic_id', ids);
        }
      } else {
        // Saha kullanıcıları sadece kendi verilerini görebilir
        surgeriesQuery = surgeriesQuery.eq('user_id', user.id);
      }
      */
      
      const { data: surgeryReports, error } = await surgeriesQuery;
      if (error) {
        console.error('Ameliyat raporları alınırken hata:', error);
      }
      console.log('Ameliyat raporları:', surgeryReports?.length || 0);
      setRecentSurgeryReports(surgeryReports || []);
      
    } catch (error) {
      console.error('Son raporlar alınırken hata:', error);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Bekleyen Teklif';
      case 'in_transfer': return 'Transfer Edilen Teklif';
      case 'approved': return 'Onaylanan Teklif';
      case 'delivered': return 'Teslim Edilen Teklif';
      case 'contract_received': return 'Sözleşmesi Alınan Teklif';
      case 'rejected': return 'Reddedilen Teklif';
      case 'expired': return 'Süresi Dolan Teklif';
      default: return 'Teklif';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', { 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Günaydın';
    if (hour < 18) return 'İyi Günler';
    return 'İyi Akşamlar';
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const getIconForUserRole = (role: string) => {
    switch (role) {
      case 'admin': return 'shield-account';
      case 'manager': return 'account-tie';
      case 'regional_manager': return 'map-marker-account';
      case 'field_user': return 'account-hard-hat';
      default: return 'account';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'Yönetici';
      case 'manager': return 'Genel Müdür';
      case 'regional_manager': return 'Bölge Müdürü';
      case 'field_user': return 'Saha Personeli';
      default: return 'Kullanıcı';
    }
  };

  // Teklif pasta grafiği verileri
  const chartData = useMemo(() => [
    {
      name: 'Bekleyen',
      population: filteredStats.pendingProposals,
      color: '#F59E0B',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
      id: 'pending-proposals'
    },
    {
      name: 'Onaylanan',
      population: filteredStats.approvedProposals,
      color: '#10B981',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
      id: 'approved-proposals'
    },
    {
      name: 'Reddedilen',
      population: filteredStats.rejectedProposals,
      color: '#EF4444',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
      id: 'rejected-proposals'
    }
  ].filter(item => item.population > 0), [filteredStats]);

  // Grafik için yapılandırma
  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false
  };

  // iPhone için padding ayarlamaları
  const isIOS = Platform.OS === 'ios';
  const containerPadding = {
    paddingTop: isIOS ? 10 : 0,
    paddingBottom: isIOS ? 20 : 0
  };

  // Kart tıklama fonksiyonları
  const handleStatCardPress = (statType: string) => {
    switch (statType) {
      case 'totalProposals':
        navigation.navigate('Proposals' as any);
        break;
      case 'pendingProposals':
      case 'bekleyen':
        navigation.navigate('Proposals' as any, { filter: 'pending' });
        break;
      case 'approvedProposals':
      case 'onaylanan':
        navigation.navigate('Proposals' as any, { filter: 'approved' });
        break;
      case 'rejectedProposals':
      case 'reddedilen':
        navigation.navigate('Proposals' as any, { filter: 'rejected' });
        break;
      case 'totalSurgeries':
        navigation.navigate('Reports' as any, { screen: 'SurgeryReports' });
        break;
      case 'totalVisits':
        navigation.navigate('Reports' as any, { screen: 'VisitReports' });
        break;
      case 'totalClinics':
        navigation.navigate('Clinics' as any);
        break;
      default:
        break;
    }
  };

  // Tüm ziyaret raporlarını yükle
  const loadAllVisitReports = async (initialLoad = false) => {
    try {
      setLoadingMoreVisits(true);
      
      const user = await getCurrentUser();
      if (!user) return;
      
      console.log('Tüm ziyaret raporları yükleniyor...');

      // Sayfa boyutu
      const pageSize = initialLoad ? 30 : 10;
      const from = (visitPage - 1) * pageSize;
      const to = from + pageSize - 1;
      
      console.log(`Ziyaret raporları yükleniyor... Sayfa: ${visitPage}, aralık: ${from}-${to}`);

      // Veritabanı sorgusu
      const { data, error } = await supabase
        .from('visit_reports')
        .select(`
          id, 
          date,
          subject,
          clinics:clinic_id (id, name),
          users:user_id (id, name)
        `)
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (error) {
        console.error('Ziyaret raporları alınırken hata:', error);
        return;
      }
      
      console.log(`Yüklenen ziyaret raporu sayısı: ${data?.length || 0}`);
      
      if (data && data.length > 0) {
        // Eğer mevcut veriler varsa, yenileri ekle
        setAllVisitReports(prevReports => initialLoad ? data : [...prevReports, ...data]);
        setHasMoreVisits(data.length === pageSize);
      } else {
        if (initialLoad) {
          setAllVisitReports([]);
        }
        setHasMoreVisits(false);
      }
    } catch (error) {
      console.error('Tüm ziyaret raporları alınırken hata:', error);
    } finally {
      setLoadingMoreVisits(false);
    }
  };
  
  // Ameliyat raporları için benzer fonksiyonlar
  const loadAllSurgeryReports = async (initialLoad = false) => {
    try {
      setLoadingMoreSurgeries(true);
      
      const user = await getCurrentUser();
      if (!user) return;
      
      console.log('Tüm ameliyat raporları yükleniyor...');
      
      // Sayfa boyutu
      const pageSize = initialLoad ? 30 : 10;
      const from = (surgeryPage - 1) * pageSize;
      const to = from + pageSize - 1;
      
      console.log(`Ameliyat raporları yükleniyor... Sayfa: ${surgeryPage}, aralık: ${from}-${to}`);
      
      // Veritabanı sorgusu
      const { data, error } = await supabase
        .from('surgery_reports')
        .select(`
          id, 
          date,
          status,
          patient_name,
          clinics:clinic_id (id, name),
          users:user_id (id, name),
          products:product_id (id, name)
        `)
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (error) {
        console.error('Ameliyat raporları alınırken hata:', error);
        return;
      }
      
      console.log(`Yüklenen ameliyat raporu sayısı: ${data?.length || 0}`);
      
      if (data && data.length > 0) {
        // Eğer mevcut veriler varsa, yenileri ekle
        setAllSurgeryReports(prevReports => initialLoad ? data : [...prevReports, ...data]);
        setHasMoreSurgeries(data.length === pageSize);
      } else {
        if (initialLoad) {
          setAllSurgeryReports([]);
        }
        setHasMoreSurgeries(false);
      }
    } catch (error) {
      console.error('Tüm ameliyat raporları alınırken hata:', error);
    } finally {
      setLoadingMoreSurgeries(false);
    }
  };
  
  // Visit modalını aç
  const openVisitModal = async () => {
    setAllVisitReports([]);
    setVisitPage(1);
    setHasMoreVisits(true);
    setShowVisitModal(true);
    // Tüm verileri getir
    await loadAllVisitReports(true);
  };
  
  // Ameliyat modalını aç
  const openSurgeryModal = async () => {
    setAllSurgeryReports([]);
    setSurgeryPage(1);
    setHasMoreSurgeries(true);
    setShowSurgeryModal(true);
    // Tüm verileri getir
    await loadAllSurgeryReports(true);
  };

  // Tarih aralığını belirleyen yardımcı fonksiyon
  const getStartDate = (now: Date, filter: 'weekly' | 'monthly' | 'yearly'): string => {
    const startDate = new Date(now);
    
    if (filter === 'weekly') {
      startDate.setDate(now.getDate() - 7);
    } else if (filter === 'monthly') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (filter === 'yearly') {
      startDate.setFullYear(now.getFullYear() - 1);
    }
    
    return startDate.toISOString();
  };

  // Zaman filtresine göre istatistikleri getir
  const fetchFilteredStats = async (filter: 'weekly' | 'monthly' | 'yearly') => {
    try {
      setLoading(true);
      const now = new Date();
      const startDate = getStartDate(now, filter);
      
      // Doğrudan filtrelenmiş sorgu ve sayı alma
      const { count: totalProposals, error: totalError } = await supabase
        .from('proposals')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate);
      
      const { count: pendingProposals, error: pendingError } = await supabase
        .from('proposals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .gte('created_at', startDate);
      
      const { count: approvedProposals, error: approvedError } = await supabase
        .from('proposals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .gte('created_at', startDate);
      
      const { count: rejectedProposals, error: rejectedError } = await supabase
        .from('proposals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected')
        .gte('created_at', startDate);
      
      if (totalError) console.error('Filtrelenmiş toplam teklif sayısı alınamadı:', totalError);
      if (pendingError) console.error('Filtrelenmiş bekleyen teklif sayısı alınamadı:', pendingError);
      if (approvedError) console.error('Filtrelenmiş onaylanan teklif sayısı alınamadı:', approvedError);
      if (rejectedError) console.error('Filtrelenmiş reddedilen teklif sayısı alınamadı:', rejectedError);
      
      // Filtrelenmiş istatistikleri güncelle
      setFilteredStats({
        totalProposals: totalProposals || 0,
        pendingProposals: pendingProposals || 0,
        approvedProposals: approvedProposals || 0,
        rejectedProposals: rejectedProposals || 0
      });
      
      console.log('Filtrelenmiş istatistikler güncellendi:', {
        totalProposals,
        pendingProposals,
        approvedProposals,
        rejectedProposals
      });
      
    } catch (error) {
      console.log('Filtrelenmiş istatistikler getirilirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtre butonuna tıklama işleyicisi
  const handleFilterChange = (filter: 'weekly' | 'monthly' | 'yearly') => {
    setTimeFilter(filter);
    fetchFilteredStats(filter);
  };

  // Durum rengi alma fonksiyonu
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'approved':
      case 'success':
      case 'done':
        return '#4CAF50';
      case 'pending':
      case 'in_progress':
      case 'scheduled':
        return '#2196F3';
      case 'cancelled':
      case 'rejected':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaWrapper backgroundColor="#f5f7fa">
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  // Header animasyon değerleri
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [200, 120],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60, 90],
    outputRange: [1, 0.3, 0],
    extrapolate: 'clamp',
  });

  // Ayarlar sayfasına git
  const navigateToSettings = () => {
    navigation.navigate('Settings');
  };

  // Yardım ve destek sayfasına git
  const navigateToHelpSupport = () => {
    navigation.navigate('HelpSupport');
  };

  // Aktivite tipine göre yönlendirme
  const navigateToActivity = (type: string, id: number) => {
    if (type === 'proposal') {
      navigation.navigate('ProposalDetail', { id });
    } else if (type === 'surgery') {
      navigation.navigate('SurgeryReportDetail', { reportId: id });
    } else if (type === 'visit') {
      navigation.navigate('VisitReportDetail', { reportId: id });
    }
  };

  // Ameliyat raporuna git
  const navigateToSurgeryReport = (reportId: number) => {
    navigation.navigate('SurgeryReportDetail', { reportId });
  };

  // Ziyaret raporuna git
  const navigateToVisitReport = (reportId: number) => {
    navigation.navigate('VisitReportDetail', { reportId });
  };

  // ReportsTab ekranına gitmek için
  const navigateToReportsScreen = (screenName: string) => {
    navigation.navigate('ReportsTab', { screen: screenName });
  };

  // Kliniğe gitmek için
  const navigateToClinic = (clinicId: number) => {
    navigation.navigate('EditClinic', { clinicId });
  };

  // Teklif detayına gitmek için
  const navigateToProposal = (id: number) => {
    navigation.navigate('ProposalDetail', { id });
  };

  // Navigasyon fonksiyonlarını düzeltelim
  const navigateToClinicDetail = (clinicId: number) => {
    navigation.navigate('ClinicDetail', { clinicId });
  };

  const navigateToProposalDetail = (id: number) => {
    navigation.navigate('ProposalDetail', { id });
  };

  const navigateToVisitReportDetail = (reportId: number) => {
    navigation.navigate('Reports', {
      screen: 'VisitReportDetail',
      params: { reportId }
    });
  };

  const navigateToSurgeryReportDetail = (reportId: number) => {
    navigation.navigate('Reports', {
      screen: 'SurgeryReportDetail',
      params: { reportId }
    });
  };

  const handleSeeAllVisitsPress = () => {
    navigation.navigate('VisitReports');
  };

  const handleSeeAllSurgeriesPress = () => {
    navigation.navigate('SurgeryReports');
  };

  const handleReportPress = (report: VisitReportItem) => {
    navigation.navigate('VisitReportDetail', { reportId: report.id });
  };

  const handleSurgeryReportPress = (report: SurgeryReportItem) => {
    navigation.navigate('Reports', {
      screen: 'SurgeryReportDetail',
      params: { reportId: report.id }
    });
  };

  const handleVisitReportPress = (report: VisitReportItem) => {
    navigation.navigate('Reports', {
      screen: 'VisitReportDetail',
      params: { reportId: report.id }
    });
  };

  const handleProposalPress = (proposalId: number) => {
    navigation.navigate('ProposalDetail', { id: proposalId });
  };

  const handleClinicPress = (clinicId: number) => {
    navigation.navigate('ClinicDetail', { clinicId });
  };

  const navigateToArtAi = () => {
    navigation.navigate('ArtAiMobileScreen');
  };

  const handleNavigationPress = (screen: keyof RootStackParamList) => {
    if (screen === 'Reports' || screen === 'ReportsTab') {
      navigation.navigate('Reports', { screen: 'ReportsHome' });
    } else {
      navigation.navigate(screen);
    }
  };

  return (
    <SafeAreaWrapper backgroundColor="#f5f7fa">
      <StatusBar style="light" />
      
      <Animated.ScrollView
        style={styles.scrollViewWithoutHeader}
        contentContainerStyle={styles.contentContainerWithoutHeader}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Özet Kartları - Gölge ve yuvarlatılmış kenarlarla modern tasarım */}
        <Card style={styles.summaryCard}>
          <Card.Content>
            <View style={styles.summaryHeaderContainer}>
              <MaterialCommunityIcons name="chart-box-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Özet</Text>
              
              {/* Tarih filtre butonları */}
              <View style={styles.filterButtonsContainer}>
                <Chip 
                  selected={timeFilter === 'weekly'} 
                  onPress={() => handleFilterChange('weekly')} 
                  style={styles.filterChip}
                  textStyle={{fontSize: 12}}
                >
                  Haftalık
                </Chip>
                <Chip 
                  selected={timeFilter === 'monthly'} 
                  onPress={() => handleFilterChange('monthly')} 
                  style={styles.filterChip}
                  textStyle={{fontSize: 12}}
                >
                  Aylık
                </Chip>
                <Chip 
                  selected={timeFilter === 'yearly'} 
                  onPress={() => handleFilterChange('yearly')} 
                  style={styles.filterChip}
                  textStyle={{fontSize: 12}}
                >
                  Yıllık
                </Chip>
              </View>
            </View>
            
            <View style={styles.statsGrid}>
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => handleStatCardPress('totalProposals')}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#6366F1', '#4F46E5']}
                  style={styles.statGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialCommunityIcons name="file-document-outline" size={28} color="white" />
                  <Text style={styles.statNumberLight}>{filteredStats.totalProposals}</Text>
                  <Text style={styles.statLabelLight}>Toplam Teklif</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => handleStatCardPress('pendingProposals')}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#F59E0B', '#FBBF24']}
                  style={styles.statGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialCommunityIcons name="timer-sand" size={28} color="white" />
                  <Text style={styles.statNumberLight}>{filteredStats.pendingProposals}</Text>
                  <Text style={styles.statLabelLight}>Bekleyen</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => handleStatCardPress('approvedProposals')}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#10B981', '#34D399']}
                  style={styles.statGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialCommunityIcons name="check-circle-outline" size={28} color="white" />
                  <Text style={styles.statNumberLight}>{filteredStats.approvedProposals}</Text>
                  <Text style={styles.statLabelLight}>Onaylanan</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => handleStatCardPress('rejectedProposals')}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#EF4444', '#F87171']}
                  style={styles.statGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialCommunityIcons name="close-circle-outline" size={28} color="white" />
                  <Text style={styles.statNumberLight}>{filteredStats.rejectedProposals}</Text>
                  <Text style={styles.statLabelLight}>Reddedilen</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            
            <Divider style={{ marginVertical: 16 }} />
            
            <View style={styles.statsRow}>
              <View style={styles.statGroup}>
                <TouchableOpacity 
                  style={styles.smallStatItem}
                  onPress={() => handleStatCardPress('totalSurgeries')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconCircle, { backgroundColor: '#7B1FA230' }]}>
                    <MaterialCommunityIcons name="medical-bag" size={24} color="#7B1FA2" />
                  </View>
                  <View style={styles.smallStatContent}>
                    <Text style={styles.smallStatNumber}>{stats.totalSurgeries}</Text>
                  </View>
                </TouchableOpacity>
              </View>
              
              <View style={styles.statGroup}>
                <TouchableOpacity 
                  style={styles.smallStatItem}
                  onPress={() => handleStatCardPress('totalVisits')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconCircle, { backgroundColor: '#388E3C30' }]}>
                    <MaterialCommunityIcons name="clipboard-text-outline" size={24} color="#388E3C" />
                  </View>
                  <View style={styles.smallStatContent}>
                    <Text style={styles.smallStatNumber}>{stats.totalVisits}</Text>
                  </View>
                </TouchableOpacity>
              </View>
              
              <View style={styles.statGroup}>
                <TouchableOpacity 
                  style={styles.smallStatItem}
                  onPress={() => handleStatCardPress('totalClinics')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconCircle, { backgroundColor: '#1976D230' }]}>
                    <MaterialCommunityIcons name="hospital-building" size={24} color="#1976D2" />
                  </View>
                  <View style={styles.smallStatContent}>
                    <Text style={styles.smallStatNumber}>{stats.totalClinics}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </Card.Content>
        </Card>
        
        {/* Son 5 Ameliyat Raporu */}
        <Card style={styles.reportsCard}>
          <Card.Content>
            <View style={styles.summaryHeaderContainer}>
              <MaterialCommunityIcons name="medical-bag" size={24} color="#7B1FA2" />
              <Text style={styles.sectionTitle}>Son Ameliyatlar</Text>
              <Button 
                mode="text" 
                onPress={openSurgeryModal}
                labelStyle={{ fontSize: 12 }}
                style={{ marginLeft: 'auto' }}
              >
                Tümünü Gör
              </Button>
            </View>
            
            {recentSurgeryReports.length > 0 ? (
              <View style={styles.reportsContainer}>
                {recentSurgeryReports.map((report, index) => (
                  <TouchableOpacity
                    key={`surgery-report-${report.id}-${index}`}
                    style={styles.reportItem}
                    onPress={() => navigateToSurgeryReportDetail(Number(report.id))}
                  >
                    <View style={[styles.reportIcon, {backgroundColor: '#7B1FA220'}]}>
                      <MaterialCommunityIcons name="medical-bag" size={22} color="#7B1FA2" />
                    </View>
                    <View style={styles.reportContent}>
                      <Text style={styles.reportTitle}>
                        {report.patient_name || 'İsimsiz Hasta'} - {(report.clinics && typeof report.clinics === 'object' && 'name' in report.clinics) ? report.clinics.name : 'Bilinmeyen Klinik'}
                      </Text>
                      <View style={styles.reportInfoRow}>
                        <Text style={styles.reportDescription}>
                          {(report.users && typeof report.users === 'object' && 'name' in report.users) ? report.users.name : 'Doktor bilgisi yok'} - {(report.products && typeof report.products === 'object' && 'name' in report.products) ? report.products.name : 'Ürün belirtilmemiş'}
                        </Text>
                      </View>
                      <View style={styles.reportMetaRow}>
                        <Text style={styles.reportDate}>{formatDate(report.date)}</Text>
                        <View style={[
                          styles.reportStatusBadge,
                          { 
                            backgroundColor: report.status === 'completed' || report.status === 'done' ? '#D1FAE5' : '#FEF3C7',
                            borderColor: report.status === 'completed' || report.status === 'done' ? '#10B981' : '#F59E0B'
                          }
                        ]}>
                          <Text style={[
                            styles.reportStatusText,
                            {
                              color: report.status === 'completed' || report.status === 'done' ? '#10B981' : '#F59E0B'
                            }
                          ]}>
                            {report.status === 'completed' || report.status === 'done' ? 'Tamamlandı' : 'Planlandı'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {index < recentSurgeryReports.length - 1 && <Divider style={styles.reportDivider} />}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyReports}>
                <MaterialCommunityIcons name="calendar-blank-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>Henüz ameliyat raporu bulunmuyor</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Son 5 Ziyaret Raporu */}
        <Card style={styles.reportsCard}>
          <Card.Content>
            <View style={styles.summaryHeaderContainer}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={24} color="#388E3C" />
              <Text style={styles.sectionTitle}>Son Ziyaretler</Text>
              <Button 
                mode="text" 
                onPress={openVisitModal}
                labelStyle={{ fontSize: 12 }}
                style={{ marginLeft: 'auto' }}
              >
                Tümünü Gör
              </Button>
            </View>
            
            {recentVisitReports.length > 0 ? (
              <View style={styles.reportsContainer}>
                {recentVisitReports.map((report, index) => (
                  <TouchableOpacity
                    key={`visit-report-${report.id}-${index}`}
                    style={styles.reportItem}
                    onPress={() => navigateToVisitReportDetail(Number(report.id))}
                  >
                    <View style={[styles.reportIcon, {backgroundColor: '#388E3C20'}]}>
                      <MaterialCommunityIcons name="clipboard-text-outline" size={22} color="#388E3C" />
                    </View>
                    <View style={styles.reportContent}>
                      <Text style={styles.reportTitle}>
                        {report.subject || 'Konu belirtilmemiş'}
                      </Text>
                      <Text style={styles.reportDescription}>
                        {(report.clinics && typeof report.clinics === 'object' && 'name' in report.clinics) ? report.clinics.name : 'Bilinmeyen Klinik'} - {(report.users && typeof report.users === 'object' && 'name' in report.users) ? report.users.name : 'Bilinmeyen Kullanıcı'}
                      </Text>
                      <Text style={styles.reportDate}>{formatDate(report.date)}</Text>
                    </View>
                    {index < recentVisitReports.length - 1 && <Divider style={styles.reportDivider} />}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyReports}>
                <MaterialCommunityIcons name="calendar-blank-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>Henüz ziyaret raporu bulunmuyor</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Hızlı Erişim */}
        <View style={styles.quickAccessContainer}>
          <Text style={styles.sectionTitleLarge}>Hızlı Erişim</Text>
          
          <View style={styles.quickAccessGrid}>
            {[
              {
                id: 'create-proposal',
                title: 'Yeni Teklif',
                icon: 'file-plus-outline' as const,
                colors: ['#6366F1', '#4F46E5'] as [string, string],
                onPress: () => navigation.navigate('CreateProposal' as any)
              },
              {
                id: 'create-surgery',
                title: 'Ameliyat Raporu',
                icon: 'medical-bag' as const,
                colors: ['#EF4444', '#F87171'] as [string, string],
                onPress: () => navigation.navigate('CreateSurgeryReport' as any)
              },
              {
                id: 'create-visit',
                title: 'Ziyaret Raporu',
                icon: 'clipboard-plus-outline' as const,
                colors: ['#10B981', '#34D399'] as [string, string],
                onPress: () => navigation.navigate('CreateVisitReport' as any)
              },
              {
                id: 'clinics',
                title: 'Klinikler',
                icon: 'hospital-building' as const,
                colors: ['#F59E0B', '#FBBF24'] as [string, string],
                onPress: () => navigation.navigate('Clinics' as any)
              },
              {
                id: 'team-performance',
                title: 'Takım Performansı',
                icon: 'account-group' as const,
                colors: ['#9C27B0', '#673AB7'] as [string, string],
                onPress: () => navigation.navigate('TeamPerformanceScreen' as any)
              },
              {
                id: 'settings',
                title: 'Ayarlar',
                icon: 'cog-outline' as const,
                colors: ['#4F46E5', '#6366F1'] as [string, string],
                onPress: () => navigateToSettings()
              },
              {
                id: 'help-support',
                title: 'Yardım ve Destek',
                icon: 'help-circle-outline' as const,
                colors: ['#8B5CF6', '#A78BFA'] as [string, string],
                onPress: () => navigateToHelpSupport()
              }
            ].map((button) => (
              <TouchableOpacity 
                key={button.id}
                style={styles.quickAccessButton}
                onPress={button.onPress}
              >
                <LinearGradient
                  colors={button.colors}
                  style={styles.quickAccessIconBg}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialCommunityIcons name={button.icon} size={28} color="white" />
                </LinearGradient>
                <Text style={styles.quickAccessText}>{button.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Son Aktiviteler */}
        <View style={styles.activitiesContainer}>
          <View style={styles.activitiesHeader}>
            <Text style={styles.sectionTitleLarge}>Son Aktiviteler</Text>
            <Button 
              mode="text" 
              onPress={() => {}}
              icon="chevron-right"
            >
              Tümünü Gör
            </Button>
          </View>
          
          {recentActivities.length === 0 ? (
            <Card style={styles.emptyActivitiesCard}>
              <Card.Content style={styles.emptyActivities}>
                <MaterialCommunityIcons name="calendar-blank-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>Henüz aktivite bulunmuyor</Text>
              </Card.Content>
            </Card>
          ) : (
            <Card style={styles.activitiesCard}>
              <Card.Content style={styles.activitiesList}>
                {recentActivities.map((activity, index) => (
      <TouchableOpacity 
                    key={activity.id}
                    style={styles.activityItem}
                    onPress={activity.onPress}
                  >
                    <View style={[styles.activityIcon, {backgroundColor: `${activity.iconColor}20`}]}>
                      <MaterialCommunityIcons name={activity.iconName} size={24} color={activity.iconColor} />
        </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>{activity.title || ''}</Text>
                      <Text style={styles.activityDescription}>{activity.description || ''}</Text>
                      <Text style={styles.activityDate}>{formatDateTime(activity.date)}</Text>
                    </View>
                    {activity.status && (
                      <View style={[
                        styles.activityStatusBadge,
                        { 
                          backgroundColor: activity.status === 'approved' ? '#D1FAE5' : 
                                          activity.status === 'rejected' ? '#FEE2E2' : '#FEF3C7',
                          borderColor: activity.status === 'approved' ? '#10B981' : 
                                      activity.status === 'rejected' ? '#EF4444' : '#F59E0B'
                        }
                      ]}>
                        <Text style={[
                          styles.activityStatusText,
                          {
                            color: activity.status === 'approved' ? '#10B981' : 
                                  activity.status === 'rejected' ? '#EF4444' : '#F59E0B' 
                        }
                      ]}>
                          {activity.status === 'approved' ? 'Onaylandı' : 
                          activity.status === 'rejected' ? 'Reddedildi' : 'Beklemede'}
                        </Text>
                      </View>
                    )}
                    {index < recentActivities.length - 1 && <Divider style={styles.activityDivider} />}
      </TouchableOpacity>
                ))}
              </Card.Content>
            </Card>
          )}
        </View>
      </Animated.ScrollView>

      {/* Ziyaret Raporları Modal */}
      <Modal
        visible={showVisitModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVisitModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tüm Ziyaret Raporları</Text>
              <TouchableOpacity onPress={() => setShowVisitModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={allVisitReports}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalCard}
                  onPress={() => {
                    setShowVisitModal(false);
                    navigateToVisitReportDetail(item.id);
                  }}
                >
                  <View style={styles.modalCardContent}>
                    <Text style={styles.modalCardTitle}>{item.subject}</Text>
                    <Text style={styles.modalCardSubtitle}>
                      {item.users?.name} - {item.clinics?.name}
                    </Text>
                    <Text style={styles.modalCardDate}>
                      {formatDate(item.date)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#6c757d" />
                </TouchableOpacity>
              )}
              onEndReached={() => hasMoreVisits && loadAllVisitReports()}
              onEndReachedThreshold={0.1}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Henüz ziyaret raporu bulunmuyor</Text>
                </View>
              }
              ListFooterComponent={
                loadingMoreVisits ? (
                  <ActivityIndicator size="small" color="#0066CC" style={{ marginVertical: 15 }} />
                ) : !hasMoreVisits && allVisitReports.length > 0 ? (
                  <Text style={styles.footerText}>Tüm ziyaretler yüklendi</Text>
                ) : null
              }
            />
          </View>
        </View>
      </Modal>

      {/* Ameliyat Raporları Modal */}
      <Modal
        visible={showSurgeryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSurgeryModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tüm Ameliyat Raporları</Text>
              <TouchableOpacity onPress={() => setShowSurgeryModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={allSurgeryReports}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalCard}
                  onPress={() => {
                    setShowSurgeryModal(false);
                    navigateToSurgeryReportDetail(item.id);
                  }}
                >
                  <View style={styles.modalCardContent}>
                    <Text style={styles.modalCardTitle}>{item.patient_name}</Text>
                    <View style={styles.statusContainer}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                      <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                    <Text style={styles.modalCardSubtitle}>
                      {item.users?.name} - {item.clinics?.name}
                    </Text>
                    <Text style={styles.modalCardSubtitle}>
                      {item.products?.name}
                    </Text>
                    <Text style={styles.modalCardDate}>
                      {formatDate(item.date)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#6c757d" />
                </TouchableOpacity>
              )}
              onEndReached={() => hasMoreSurgeries && loadAllSurgeryReports()}
              onEndReachedThreshold={0.1}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Henüz ameliyat raporu bulunmuyor</Text>
                </View>
              }
              ListFooterComponent={
                loadingMoreSurgeries ? (
                  <ActivityIndicator size="small" color="#0066CC" style={{ marginVertical: 15 }} />
                ) : !hasMoreSurgeries && allSurgeryReports.length > 0 ? (
                  <Text style={styles.footerText}>Tüm ameliyat raporları yüklendi</Text>
                ) : null
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  headerAnimatedContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    zIndex: 10,
  },
  headerGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scrollView: {
    flex: 1,
    marginTop: 120, // Başlangıç header yüksekliğine bağlı
  },
  scrollViewWithoutHeader: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingTop: 80, // Headerdan dolayı ekstra padding
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80, // iPhone için daha fazla alt boşluk
  },
  contentContainerWithoutHeader: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80, 
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userTextContainer: {
    marginLeft: 15,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  roleText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    marginBottom: 16,
    elevation: 4,
    borderRadius: 16,
    backgroundColor: 'white',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  summaryHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    marginLeft: 8,
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
  },
  sectionTitleLarge: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statGradient: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumberLight: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 10,
  },
  statLabelLight: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -4,
  },
  statGroup: {
    flex: 1,
    marginHorizontal: 4,
  },
  smallStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    height: 70,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  smallStatContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallStatNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 4,
    textAlign: 'center',
  },
  smallStatLabel: {
    fontSize: 12,
    color: '#4B5563',
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  quickAccessContainer: {
    marginBottom: 16,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -4,
  },
  quickAccessButton: {
    width: '31%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickAccessIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickAccessText: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
    fontWeight: '500',
  },
  activitiesContainer: {
    marginBottom: 16,
  },
  activitiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activitiesCard: {
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  activitiesList: {
    padding: 0,
  },
  activityItem: {
    padding: 16,
    flexDirection: 'row',
    position: 'relative',
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  activityDescription: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 3,
  },
  activityDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  activityStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginLeft: 8,
    alignSelf: 'flex-start',
  },
  activityStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activityDivider: {
    position: 'absolute',
    bottom: 0,
    left: 68,
    right: 16,
  },
  emptyActivitiesCard: {
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emptyActivities: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
  },
  chartCard: {
    marginBottom: 16,
    elevation: 4,
    borderRadius: 16,
    backgroundColor: 'white',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  proposalStatusChart: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  totalProposalContainer: {
    position: 'absolute',
    top: '45%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -30 }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalProposalLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  totalProposalValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  reportsCard: {
    marginBottom: 16,
    elevation: 4,
    borderRadius: 16,
    backgroundColor: 'white',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  reportsContainer: {
    marginTop: 8,
  },
  reportItem: {
    flexDirection: 'row',
    padding: 12,
    position: 'relative',
  },
  reportIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reportContent: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  reportInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  reportMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  reportDescription: {
    fontSize: 13,
    color: '#4B5563',
  },
  reportDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  reportStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  reportStatusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  reportDivider: {
    position: 'absolute',
    bottom: 0,
    left: 56,
    right: 0,
  },
  emptyReports: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Ziyaret modalı için stiller
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '80%',
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  modalScrollView: {
    flex: 1,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingMoreText: {
    marginLeft: 8,
    color: '#6B7280',
    fontSize: 14,
  },
  endOfListText: {
    textAlign: 'center',
    padding: 16,
    color: '#6B7280',
    fontSize: 14,
  },
  modalCard: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalCardContent: {
    flex: 1,
  },
  modalCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  modalCardSubtitle: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 3,
  },
  modalCardDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    textAlign: 'center',
    padding: 16,
    color: '#6B7280',
    fontSize: 14,
  },
  filterButtonsContainer: {
    flexDirection: 'row',
    marginLeft: 'auto',
    alignItems: 'center',
  },
  filterChip: {
    marginLeft: 4,
    height: 28,
  },
}); 