import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Dimensions, RefreshControl, TouchableOpacity } from 'react-native';
import { Appbar, Text, Card, ActivityIndicator, useTheme, Chip, Button, Divider, Title, Paragraph, List, Avatar } from 'react-native-paper';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../services/authService';
import { User } from '../types';
import { SafeAreaWrapper } from '../components/SafeAreaWrapper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Veri tipleri
interface BaseAnalyticData {
  value: number;
  color: string;
}

interface PieChartData extends BaseAnalyticData {
  name: string;
  legendFontColor?: string;
  legendFontSize?: number;
}

interface BarChartData {
  label: string;
  value: number;
}

interface MonthlyData {
  name: string;
  value: number;
}

interface PerformanceData {
  id: string | number;
  name: string;
  count: number;
}

interface ProductPerformanceData extends PieChartData {}

// Navigasyon Parametre Tipleri
type AnalyticsNavigationProp = NativeStackNavigationProp<any>;

// Ekran boyutları
const screenWidth = Dimensions.get('window').width;

// Yardımcı Fonksiyonlar
const getStatusName = (status: string): string => {
  switch (status) {
    case 'pending': return 'Bekleyen';
    case 'approved': return 'Onaylanan';
    case 'rejected': return 'Reddedilen';
    case 'expired': return 'Süresi Dolmuş';
    case 'contract_received': return 'Sözleşme Alındı';
    case 'in_transfer': return 'Transfer Edildi';
    case 'delivered': return 'Teslim Edildi';
    default: return status;
  }
};

const formatCurrency = (value: number, currency = 'TRY') => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercentage = (value: number) => {
  return `${value.toFixed(1)}%`;
};

// Durum renkleri (react-native-chart-kit için)
const statusColors: Record<string, string> = {
  pending: '#f1c40f',     // Sarı
  approved: '#2ecc71',    // Yeşil
  rejected: '#e74c3c',    // Kırmızı
  expired: '#95a5a6',     // Gri
  contract_received: '#3498db', // Mavi
  in_transfer: '#9b59b6', // Mor
  delivered: '#1abc9c',   // Turkuaz
  default: '#34495e',     // Koyu Gri
};

// Bölge renkleri (Bar chart için)
const regionColors = ['#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#f1c40f', '#e67e22', '#e74c3c', '#34495e', '#7f8c8d', '#2c3e50'];

// Renk Paletleri
const categoryColors = ['#1abc9c', '#3498db', '#9b59b6', '#e67e22', '#f1c40f', '#e74c3c', '#7f8c8d', '#2ecc71', '#34495e', '#16a085']; // Ürün kategorileri için renkler

// Hedefler (Örnek)
const TARGETS = {
  monthlyRevenueTRY: 150000, // Aylık TRY gelir hedefi
};

const AnalyticsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<AnalyticsNavigationProp>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  // Analitik veri state'leri
  const [totalProposals, setTotalProposals] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0); 
  const [conversionRate, setConversionRate] = useState(0);
  const [avgProcessingTime, setAvgProcessingTime] = useState(0);
  const [proposalsByStatusData, setProposalsByStatusData] = useState<PieChartData[]>([]);
  const [monthlyProposalsData, setMonthlyProposalsData] = useState<MonthlyData[]>([]);
  const [monthlyRevenueData, setMonthlyRevenueData] = useState<MonthlyData[]>([]);
  const [proposalsByRegionData, setProposalsByRegionData] = useState<BarChartData[]>([]);
  const [topClinicsData, setTopClinicsData] = useState<PerformanceData[]>([]);
  const [topUsersData, setTopUsersData] = useState<PerformanceData[]>([]);
  const [productCategoryData, setProductCategoryData] = useState<ProductPerformanceData[]>([]);
  const [latestMonthRevenue, setLatestMonthRevenue] = useState(0);

  // Ana veri yükleme fonksiyonu
  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      if (currentUser) {
        await fetchAnalytics(currentUser, timeRange);
      }
    } catch (error) {
      console.error('Analytics data loading error:', error);
    } finally {
      if (!isRefresh) setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [loadData]);

  // Analitik verilerini çekme ve işleme fonksiyonu
  const fetchAnalytics = async (currentUser: User, range: 'week' | 'month' | 'year') => {
    try {
      let dateThreshold = new Date();
      const endDate = new Date(); 

      switch (range) {
        case 'week': dateThreshold.setDate(dateThreshold.getDate() - 7); break;
        case 'month': dateThreshold.setMonth(dateThreshold.getMonth() - 1); break;
        case 'year': dateThreshold.setFullYear(dateThreshold.getFullYear() - 1); break;
      }
      
      // 1. Teklifleri Çek (Klinik ve Kullanıcı Bilgileri ile)
      let proposalsQuery = supabase
        .from('proposals')
        .select(`
          id, status, total_amount, currency, created_at, approved_at, 
          clinic_id, clinics!proposals_clinic_id_fkey (id, name, region_id),
          user_id, users!proposals_user_id_fkey (id, name, role)
        `)
        .gte('created_at', dateThreshold.toISOString())
        .lte('created_at', endDate.toISOString());

      // 2. Rol Bazlı Filtreleme
      if (currentUser.role === 'regional_manager' && currentUser.region_id) {
         // Direkt proposals.clinics.region_id üzerinden filtreleme Supabase'de zor olabilir.
         // Alternatif: Önce bölgedeki klinik ID'lerini al, sonra teklifleri filtrele.
         const { data: regionClinicIds, error: regionClinicsError } = await supabase
            .from('clinics')
            .select('id')
            .eq('region_id', currentUser.region_id);
         
         if(regionClinicsError) console.error("Bölge klinikleri çekilirken hata:", regionClinicsError);

         if (regionClinicIds && regionClinicIds.length > 0) {
             proposalsQuery = proposalsQuery.in('clinic_id', regionClinicIds.map(c => c.id));
         } else {
             // Bölgede klinik yoksa veya hata varsa, hiçbir teklifi getirme
             proposalsQuery = proposalsQuery.limit(0);
         }
      } else if (currentUser.role === 'field_user') {
        proposalsQuery = proposalsQuery.eq('user_id', currentUser.id);
      }
      
      const { data: proposalsData, error: proposalsError } = await proposalsQuery;

      if (proposalsError) throw proposalsError;

      // Gelen veriyi tip kontrolü yaparak işle
      const proposals = proposalsData as any[] || []; // Gelen veriyi `any[]` olarak ele alalım

      if (proposals.length === 0) {
        // Tüm state'leri sıfırla
        setTotalProposals(0); setTotalRevenue(0); setConversionRate(0);
        setAvgProcessingTime(0); setProposalsByStatusData([]); setMonthlyProposalsData([]);
        setMonthlyRevenueData([]); setProposalsByRegionData([]); setTopClinicsData([]); setTopUsersData([]);
        setProductCategoryData([]);
        setLatestMonthRevenue(0);
        return;
      }
      
      // 3. Bölgeleri Çek (Gerekliyse)
      const allClinicsFromProposals = proposals.map(p => p.clinics).filter(c => c && typeof c === 'object' && c.region_id);
      const regionIds = [...new Set(allClinicsFromProposals.map(c => c.region_id))];
      let regions: { id: number; name: string }[] = [];
      if (regionIds.length > 0) {
          const { data: regionData, error: regionsError } = await supabase
            .from('regions')
            .select('id, name')
            .in('id', regionIds);
          if (regionsError) console.error("Bölgeler çekilirken hata:", regionsError);
          else regions = regionData || [];
      }

      // 4. Hesaplamalar ve State Güncellemeleri
      setTotalProposals(proposals.length);

      // --- KPI'lar --- 
      const approvedStatuses = ['approved', 'contract_received', 'in_transfer', 'delivered'];
      const approvedCount = proposals.filter(p => approvedStatuses.includes(p.status)).length;
      setConversionRate(proposals.length > 0 ? (approvedCount / proposals.length) * 100 : 0);

      const proposalsWithApproval = proposals.filter(p => p.status === 'approved' && p.approved_at && p.created_at);
      let totalProcessingDays = 0;
      if (proposalsWithApproval.length > 0) {
        proposalsWithApproval.forEach(p => {
          const diffTime = Math.abs(new Date(p.approved_at).getTime() - new Date(p.created_at).getTime());
          totalProcessingDays += Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        });
        setAvgProcessingTime(totalProcessingDays / proposalsWithApproval.length);
      } else {
        setAvgProcessingTime(0);
      }

      // --- Teklif Durumları (PieChart) --- 
      const statusGroups: Record<string, number> = {};
      proposals.forEach(p => { statusGroups[p.status] = (statusGroups[p.status] || 0) + 1; });
      setProposalsByStatusData(Object.entries(statusGroups).map(([status, count]) => ({
        name: getStatusName(status),
        value: count,
        color: statusColors[status] || statusColors.default,
        legendFontColor: theme.colors.onSurface,
        legendFontSize: 12,
      })));

      // --- Aylık Veriler (LineChart & BarChart) --- 
      const monthlyCounts: Record<string, number> = {};
      const monthlyRevenues: Record<string, number> = {};
      const monthFormat = range === 'year' ? 'MMM' : 'dd MMM';

      proposals.forEach(p => {
        const monthKey = format(new Date(p.created_at), monthFormat, { locale: tr });
        monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
        // Gelir hesaplaması (TRY varsayımı, dönüşüm eklenebilir)
        if (p.currency === 'TRY') {
            monthlyRevenues[monthKey] = (monthlyRevenues[monthKey] || 0) + (p.total_amount || 0);
        }
        // Farklı para birimleri için dönüşüm? - Şimdilik sadece TRY
      });
      
      // Aylara göre sırala (Tarihsel)
      const sortedMonthKeys = Object.keys(monthlyCounts).sort((a, b) => {
         try {
             // Format dd MMM ise tarihe çevirip sırala
             const dateA = range !== 'year' ? new Date(`${a.split(' ')[0]} ${a.split(' ')[1]} ${endDate.getFullYear()}`) : new Date(`${a} 1, ${endDate.getFullYear()}`);
             const dateB = range !== 'year' ? new Date(`${b.split(' ')[0]} ${b.split(' ')[1]} ${endDate.getFullYear()}`) : new Date(`${b} 1, ${endDate.getFullYear()}`);
             return dateA.getTime() - dateB.getTime();
         } catch (e) { return a.localeCompare(b); }
      });

      setMonthlyProposalsData(sortedMonthKeys.map(key => ({ name: key, value: monthlyCounts[key] })));
      setMonthlyRevenueData(sortedMonthKeys.map(key => ({ name: key, value: monthlyRevenues[key] || 0 })));
      setTotalRevenue(Object.values(monthlyRevenues).reduce((sum, rev) => sum + rev, 0));

      // --- Bölge Performansı (BarChart) --- 
      const regionGroups: Record<string, number> = {};
      proposals.forEach(p => {
          const clinic = p.clinics;
          if (clinic && typeof clinic === 'object' && clinic.region_id) { // Daha güvenli kontrol
              const regionIdStr = clinic.region_id.toString();
              regionGroups[regionIdStr] = (regionGroups[regionIdStr] || 0) + 1;
          }
      });
      setProposalsByRegionData(Object.entries(regionGroups).map(([regionId, count]) => ({
          label: regions.find(r => r.id.toString() === regionId)?.name || `Bölge ${regionId}`,
          value: count,
      })));

      // --- Klinik & Kullanıcı Performansı (List) --- 
      const clinicCounts: Record<string, { name: string, count: number }> = {};
      const userCounts: Record<string, { name: string, count: number }> = {};

      proposals.forEach(p => {
          const clinic = p.clinics;
          const user = p.users;
          if (clinic && typeof clinic === 'object' && clinic.id) { // Daha güvenli kontrol
              clinicCounts[clinic.id.toString()] = {
                  name: clinic.name || `Klinik ${clinic.id}`,
                  count: (clinicCounts[clinic.id.toString()]?.count || 0) + 1
              };
          }
          if (user && typeof user === 'object' && user.id) { // Daha güvenli kontrol
              userCounts[user.id.toString()] = {
                  name: user.name || `Kullanıcı ${user.id}`,
                  count: (userCounts[user.id.toString()]?.count || 0) + 1
              };
          }
      });

      setTopClinicsData(
          Object.entries(clinicCounts)
                .sort(([, a], [, b]) => b.count - a.count)
                .slice(0, 5) 
                .map(([id, data]) => ({ id, ...data }))
      );
       setTopUsersData(
          Object.entries(userCounts)
                .sort(([, a], [, b]) => b.count - a.count)
                .slice(0, 5) 
                .map(([id, data]) => ({ id, ...data }))
      );

      // --- YENİ: Teklif Öğelerini ve Ürünleri Çek --- 
      let productsFromItems: { category: string; count: number }[] = [];
      if(proposals.length > 0) {
        const { data: proposalItems, error: itemsError } = await supabase
          .from('proposal_items')
          .select(`
            id,
            product_id,
            products (id, name, category)
          `)
          .in('proposal_id', proposals.map(p => p.id));

        if (itemsError) {
          console.error("Teklif öğeleri çekilirken hata:", itemsError);
        } else if (proposalItems) {
          const categoryCounts: Record<string, number> = {};
          proposalItems.forEach(item => {
            // products ilişkisi tekil nesne olarak gelmeli
            const product = item.products as { category?: string } | null; // Tip ataması
            const category = product?.category; // Güvenli erişim
            if (category) {
              categoryCounts[category] = (categoryCounts[category] || 0) + 1;
            }
          });
          productsFromItems = Object.entries(categoryCounts).map(([category, count]) => ({ category, count }));
        }
      }
      // ----------------------------------------------

      // En son ayın gelirini state'e ata
      setLatestMonthRevenue(monthlyRevenueData[monthlyRevenueData.length - 1]?.value || 0);

      // Ürün Kategorisi Verisi (PieChart)
      setProductCategoryData(
        productsFromItems
          .sort((a, b) => b.count - a.count)
          .slice(0, 7) // İlk 7 kategori
          .map((item, index) => ({
            name: item.category || 'Diğer',
            value: item.count,
            color: categoryColors[index % categoryColors.length],
            legendFontColor: theme.colors.onSurface,
            legendFontSize: 12,
          }))
      );
      
    } catch (error) {
      console.error('Analitik verileri işlenirken hata:', error);
      // Hata state'i ile kullanıcıya bilgi verilebilir
    }
  };

  // Grafik yapılandırmaları
  const chartConfig = {
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: theme.colors.surface,
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => theme.colors.primary,
    labelColor: (opacity = 1) => theme.colors.onSurfaceVariant,
    strokeWidth: 2,
    barPercentage: 0.7, // Bar chart için genişlik yüzdesi
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
  };

  return (
    <SafeAreaWrapper>
      <Appbar.Header>
        <Appbar.Content title="Analitik" />
        <Appbar.Action icon="refresh" onPress={onRefresh} disabled={loading || refreshing} />
      </Appbar.Header>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]}/>
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
        ) : (
          <>
            {/* Zaman Aralığı Seçimi */}
            <View style={styles.timeRangeContainer}>
               <Chip 
                    icon="calendar-week" 
                    selected={timeRange === 'week'}
            onPress={() => setTimeRange('week')}
                    style={styles.timeChip}
          >
            Hafta
                </Chip>
                 <Chip 
                    icon="calendar-month"
                    selected={timeRange === 'month'}
            onPress={() => setTimeRange('month')}
                    style={styles.timeChip}
                 >
                     Ay
                 </Chip>
                 <Chip 
                    icon="calendar-blank-multiple" 
                    selected={timeRange === 'year'}
            onPress={() => setTimeRange('year')}
                    style={styles.timeChip}
          >
            Yıl
                </Chip>
      </View>
      
            {/* KPI Kartları */}
            <View style={styles.kpiContainer}>
                <Card style={styles.kpiCard}>
                    <Card.Content style={styles.kpiContent}>
                        <MaterialCommunityIcons name="file-document-multiple" size={28} color={theme.colors.primary} />
                        <Title style={styles.kpiValue}>{totalProposals}</Title>
                        <Paragraph style={styles.kpiLabel}>Toplam Teklif</Paragraph>
                    </Card.Content>
                </Card>
                <Card style={styles.kpiCard}>
                    <Card.Content style={styles.kpiContent}>
                        <MaterialCommunityIcons name="check-decagram" size={28} color={statusColors.approved} />
                        <Title style={styles.kpiValue}>{formatPercentage(conversionRate)}</Title>
                        <Paragraph style={styles.kpiLabel}>Dönüşüm Oranı</Paragraph>
                    </Card.Content>
                </Card>
                <Card style={styles.kpiCard}>
                    <Card.Content style={styles.kpiContent}>
                        <MaterialCommunityIcons name="cash-multiple" size={28} color={theme.colors.tertiary} />
                        <Title style={styles.kpiValue}>{formatCurrency(totalRevenue)}</Title>
                        <Paragraph style={styles.kpiLabel}>Toplam Gelir (TRY)</Paragraph>
            </Card.Content>
          </Card>
                <Card style={styles.kpiCard}>
                    <Card.Content style={styles.kpiContent}>
                        <MaterialCommunityIcons name="timer-sand" size={28} color="#f39c12" />
                        <Title style={styles.kpiValue}>{avgProcessingTime.toFixed(1)}</Title>
                        <Paragraph style={styles.kpiLabel}>Ort. İşlem Süresi (Gün)</Paragraph>
            </Card.Content>
          </Card>
      </View>
      
            {/* YENİ: Hedef Karşılaştırma Kartı */}
            <Card style={styles.targetCard}>
              <Card.Title title="Aylık Gelir Hedefi (TRY)" />
              <Card.Content style={styles.targetContent}>
                 <View style={styles.targetValueContainer}>
                     <Text style={styles.targetValueActual}>{formatCurrency(latestMonthRevenue)}</Text>
                     <Text style={styles.targetValueSeparator}>/</Text>
                     <Text style={styles.targetValueGoal}>{formatCurrency(TARGETS.monthlyRevenueTRY)}</Text>
          </View>
                 {/* İlerleme çubuğu eklenebilir */} 
                 <Paragraph style={styles.targetPercentage}>
                     Hedefin %{TARGETS.monthlyRevenueTRY > 0 ? 
                                ((latestMonthRevenue / TARGETS.monthlyRevenueTRY) * 100).toFixed(1) 
                                : 0}'ına ulaşıldı.
                 </Paragraph>
        </Card.Content>
      </Card>
      
            <Divider style={styles.divider}/>

            {/* Teklif Durumları Grafiği */}
        <Card style={styles.chartCard}>
                <Card.Title title="Teklif Durum Dağılımı" />
          <Card.Content>
                    {proposalsByStatusData.length > 0 ? (
              <PieChart
                        data={proposalsByStatusData}
                        width={screenWidth - 64} 
            height={220}
            chartConfig={{
                           ...chartConfig, 
                           color: (opacity = 1) => theme.colors.primary, // Pie chart için ana renk yeterli olabilir
                        }}
                        accessor={"value"}
                        backgroundColor={"transparent"}
                        paddingLeft={"15"}
                        center={[10, 0]}
                        absolute
                        style={styles.chartStyle}
                    />
                    ) : (
                    <Text style={styles.noDataText}>Durum verisi bulunamadı.</Text>
                    )}
        </Card.Content>
      </Card>
      
            {/* Aylık Teklif Sayısı Grafiği */}
      <Card style={styles.chartCard}>
              <Card.Title title="Teklif Sayısı Trendi" />
        <Card.Content>
                {monthlyProposalsData.length > 0 ? (
          <LineChart
            data={{
                      labels: monthlyProposalsData.map(d => d.name),
                      datasets: [{ data: monthlyProposalsData.map(d => d.value) }],
                    }}
                    width={screenWidth - 64}
                    height={250}
                    chartConfig={chartConfig}
            bezier
                    style={styles.chartStyle}
          />
                ) : (
                  <Text style={styles.noDataText}>Aylık teklif verisi bulunamadı.</Text>
                )}
        </Card.Content>
      </Card>
      
            {/* Aylık Gelir Grafiği */}
        <Card style={styles.chartCard}>
              <Card.Title title="Gelir Trendi (TRY)" />
          <Card.Content>
                {monthlyRevenueData.length > 0 ? (
              <BarChart
                data={{
                          labels: monthlyRevenueData.map(d => d.name),
                          datasets: [{ data: monthlyRevenueData.map(d => d.value) }],
                      }}
                      width={screenWidth - 64}
                      height={250}
                      chartConfig={chartConfig}
                      style={styles.chartStyle}
                      yAxisLabel="₺"
                yAxisSuffix=""
                      verticalLabelRotation={30}
                  />
                ) : (
                  <Text style={styles.noDataText}>Aylık gelir verisi bulunamadı.</Text>
                )}
          </Card.Content>
        </Card>
      
            {/* Bölgelere Göre Teklif Sayısı */}
        <Card style={styles.chartCard}>
              <Card.Title title="Bölgelere Göre Teklifler" />
          <Card.Content>
                {proposalsByRegionData.length > 0 ? (
              <BarChart
                data={{
                          labels: proposalsByRegionData.map(d => d.label.substring(0, 10)), // Etiketleri kısalt
                          datasets: [{ data: proposalsByRegionData.map(d => d.value) }],
                      }}
                      width={screenWidth - 64}
                      height={300} // Daha fazla bölge için yüksekliği artır
                chartConfig={{
                        ...chartConfig,
                         // Renkleri dinamik atama (regionColors dizisinden)
                         // Not: `color` prop'u dataset'in kendisine eklenmeli, chartConfig'e değil.
                         // Şimdilik varsayılan rengi kullanacak.
                         // color: (opacity = 1, index?: number) => regionColors[index ?? 0 % regionColors.length] || theme.colors.primary,
                      }}
                      style={styles.chartStyle}
                      yAxisLabel="" // Zorunlu prop eklendi
                      yAxisSuffix="" // Zorunlu prop eklendi
                      verticalLabelRotation={45} // Etiketleri döndür
                  />
                ) : (
                  <Text style={styles.noDataText}>Bölge verisi bulunamadı.</Text>
                )}
              </Card.Content>
            </Card>

            {/* En İyi Performans Gösterenler */}
            <View style={styles.performanceContainer}>
                <Card style={styles.performanceCard}>
                    <List.Section title="En Aktif Klinikler (Top 5)">
                        {topClinicsData.length > 0 ? topClinicsData.map(item => (
                            <List.Item
                                key={item.id}
                                title={item.name}
                                description={`${item.count} teklif`}
                                left={props => <List.Icon {...props} icon="hospital-building" />}
                            />
                        )) : <Text style={styles.noDataText}>Klinik performans verisi yok.</Text>}
                    </List.Section>
                </Card>
                <Card style={styles.performanceCard}>
                     <List.Section title="En Aktif Kullanıcılar (Top 5)">
                        {topUsersData.length > 0 ? topUsersData.map(item => (
                            <List.Item
                                key={item.id}
                                title={item.name}
                                description={`${item.count} teklif`}
                                left={props => <List.Icon {...props} icon="account" />}
                            />
                        )) : <Text style={styles.noDataText}>Kullanıcı performans verisi yok.</Text>}
                    </List.Section>
                </Card>
            </View>
      
            {/* YENİ: Ürün Kategorisi Dağılımı */}
      <Card style={styles.chartCard}>
              <Card.Title title="Popüler Ürün Kategorileri" />
        <Card.Content>
                {productCategoryData.length > 0 ? (
            <PieChart
                    data={productCategoryData}
                    width={screenWidth - 64}
                    height={220}
              chartConfig={{
                       ...chartConfig,
                       color: (opacity = 1) => theme.colors.secondary, // Farklı bir renk
                    }}
                    accessor={"value"}
                    backgroundColor={"transparent"}
                    paddingLeft={"15"}
                    center={[10, 0]}
                    absolute
                    style={styles.chartStyle}
                  />
                ) : (
                  <Text style={styles.noDataText}>Ürün kategori verisi bulunamadı.</Text>
                )}
        </Card.Content>
      </Card>
      
          </>
        )}
    </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6', // theme.colors.surfaceVariant yerine statik renk
  },
  timeChip: {
     marginHorizontal: 4,
  },
  kpiContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    padding: 16, // Kenar boşlukları
    paddingBottom: 0,
  },
  kpiCard: {
    width: '48%', // Genişliği ayarla
    marginBottom: 16,
    elevation: 3,
    borderRadius: 12, // Daha yuvarlak kenarlar
  },
  kpiContent: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 15,
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
    color: '#6366F1', // theme.colors.primary yerine statik renk
  },
  kpiLabel: {
    fontSize: 14,
    textAlign: 'center',
    color: '#4B5563', // theme.colors.onSurfaceVariant yerine statik renk
  },
   kpiSubLabel: {
    fontSize: 11,
    textAlign: 'center',
    color: 'rgba(0, 0, 0, 0.5)', // theme.colors.backdrop yerine statik renk
  },
  divider: {
    marginVertical: 10,
    marginHorizontal: 16,
    height: 1,
    backgroundColor: '#D1D5DB', // theme.colors.outline yerine statik renk
  },
  chartCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    elevation: 2,
    borderRadius: 12, // Yuvarlak kenarlar
    overflow: 'hidden', // Grafik taşmasını önle
  },
  chartStyle: {
    marginVertical: 10,
    paddingRight: 20, // Sağdan boşluk (etiketler için)
    // borderRadius: 16, // Card zaten yuvarlak
  },
   noDataText: {
    textAlign: 'center',
    paddingVertical: 30,
    fontStyle: 'italic',
    color: '#9CA3AF', // theme.colors.onSurfaceDisabled yerine statik renk
  },
  performanceContainer: {
    paddingHorizontal: 16,
    marginTop: 10,
  },
  performanceCard: {
    marginBottom: 20,
    elevation: 2,
    borderRadius: 12,
  },
  targetCard: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 10,
    elevation: 2,
    borderRadius: 12,
    backgroundColor: '#FFFFFF', // theme.colors.surface yerine statik renk
  },
  targetContent: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  targetValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 5,
  },
  targetValueActual: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6366F1', // theme.colors.primary yerine statik renk
  },
   targetValueSeparator: {
    fontSize: 24,
    marginHorizontal: 5,
    color: '#4B5563', // theme.colors.onSurfaceVariant yerine statik renk
  },
  targetValueGoal: {
     fontSize: 20,
     color: '#4B5563', // theme.colors.onSurfaceVariant yerine statik renk
  },
  targetPercentage: {
    fontSize: 14,
    color: '#4B5563', // theme.colors.onSurfaceVariant yerine statik renk
    fontStyle: 'italic',
  },
});

export default AnalyticsScreen; 