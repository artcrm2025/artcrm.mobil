import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Text, Card, Title, Paragraph, Button, Avatar, Divider, ProgressBar, useTheme, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { RootStackParamList } from '../types/navigation';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../services/authService';
import { User, UserRole } from '../types';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { format, formatDistance } from 'date-fns';
import { tr } from 'date-fns/locale';

type TeamPerformanceScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'TeamPerformanceScreen'>;

interface PerformanceData {
  userId: string;
  userName: string;
  role: string;
  proposalsCreated: number;
  proposalsApproved: number;
  proposalsRejected: number;
  surgeryReportsCreated: number;
  visitReportsCreated: number;
  totalActions: number;
  conversionRate: number;
  regionId?: number;
  regionName?: string;
  lastActive?: string;
  avatar?: string;
}

interface TimeRangeOption {
  label: string;
  value: 'week' | 'month' | 'quarter' | 'year';
  days: number;
}

const TeamPerformanceScreen = () => {
  const navigation = useNavigation<TeamPerformanceScreenNavigationProp>();
  const theme = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [topPerformers, setTopPerformers] = useState<PerformanceData[]>([]);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [regionFilter, setRegionFilter] = useState<number | null>(null);
  const [regions, setRegions] = useState<{ id: number; name: string }[]>([]);
  const [chartData, setChartData] = useState({
    proposalsByUser: [] as { name: string; count: number }[],
    activitiesByRegion: [] as { name: string; count: number }[],
    performanceOverTime: [] as number[]
  });
  
  const timeRangeOptions: TimeRangeOption[] = [
    { label: 'Son 7 Gün', value: 'week', days: 7 },
    { label: 'Son 30 Gün', value: 'month', days: 30 },
    { label: 'Son 90 Gün', value: 'quarter', days: 90 },
    { label: 'Son 365 Gün', value: 'year', days: 365 },
  ];

  const chartWidth = Dimensions.get('window').width - 64;

  useEffect(() => {
    loadData();
  }, [timeRange, regionFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      if (currentUser) {
        await Promise.all([
          fetchRegions(),
          fetchPerformanceData(currentUser)
        ]);
      }
    } catch (error) {
      console.error('Performans verileri yükleme hatası:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchRegions = async () => {
    try {
      const { data, error } = await supabase.from('regions').select('*');
      
      if (error) {
        console.error('Bölge verisi çekme hatası:', error);
        return;
      }
      
      if (data) {
        setRegions(data);
      }
    } catch (error) {
      console.error('Bölge verisi işleme hatası:', error);
    }
  };

  const fetchPerformanceData = async (currentUser: User) => {
    try {
      // Tarih aralığı için filtreleme
      const now = new Date();
      const startDate = new Date();
      const selectedTimeRange = timeRangeOptions.find(option => option.value === timeRange);
      
      if (selectedTimeRange) {
        startDate.setDate(now.getDate() - selectedTimeRange.days);
      }
      
      // Temel kullanıcı sorgusu
      let usersQuery = supabase.from('users')
        .select('*, regions(name)')
        .eq('status', 'active');
      
      // Rol bazlı filtreleme
      if (currentUser.role === 'regional_manager') {
        usersQuery = usersQuery.eq('region_id', currentUser.region_id);
      }
      
      // Bölge filtresi
      if (regionFilter !== null) {
        usersQuery = usersQuery.eq('region_id', regionFilter);
      }
      
      const { data: users, error: usersError } = await usersQuery;
      
      if (usersError) {
        console.error('Kullanıcı verisi çekme hatası:', usersError);
        return;
      }
      
      if (!users || users.length === 0) {
        return;
      }
      
      // Performans verilerini topla
      const performancePromises = users.map(async (teamUser) => {
        // Teklif istatistikleri
        const { count: proposalsCreated } = await supabase.from('proposals')
          .select('*', { count: 'exact' })
          .eq('user_id', teamUser.id)
          .gte('created_at', startDate.toISOString());
          
        const { count: proposalsApproved } = await supabase.from('proposals')
          .select('*', { count: 'exact' })
          .eq('user_id', teamUser.id)
          .eq('status', 'approved')
          .gte('created_at', startDate.toISOString());
          
        const { count: proposalsRejected } = await supabase.from('proposals')
          .select('*', { count: 'exact' })
          .eq('user_id', teamUser.id)
          .eq('status', 'rejected')
          .gte('created_at', startDate.toISOString());
          
        // Ameliyat rapor istatistikleri
        const { count: surgeryReportsCreated } = await supabase.from('surgery_reports')
          .select('*', { count: 'exact' })
          .eq('user_id', teamUser.id)
          .gte('created_at', startDate.toISOString());
          
        // Ziyaret rapor istatistikleri
        const { count: visitReportsCreated } = await supabase.from('visit_reports')
          .select('*', { count: 'exact' })
          .eq('user_id', teamUser.id)
          .gte('created_at', startDate.toISOString());
          
        // Son aktif zaman
        const { data: lastActiveData } = await supabase
          .from('user_activities')
          .select('timestamp')
          .eq('user_id', teamUser.id)
          .order('timestamp', { ascending: false })
          .limit(1);
        
        const lastActive = lastActiveData && lastActiveData.length > 0 
          ? lastActiveData[0].timestamp 
          : null;
        
        // Toplam aktivite
        const totalActions = (proposalsCreated || 0) + 
                            (surgeryReportsCreated || 0) + 
                            (visitReportsCreated || 0);
        
        // Dönüşüm oranı
        const conversionRate = (proposalsCreated || 0) > 0 
          ? (proposalsApproved || 0) / (proposalsCreated || 0) * 100 
          : 0;
          
        return {
          userId: teamUser.id,
          userName: teamUser.name,
          role: teamUser.role,
          proposalsCreated: proposalsCreated || 0,
          proposalsApproved: proposalsApproved || 0,
          proposalsRejected: proposalsRejected || 0,
          surgeryReportsCreated: surgeryReportsCreated || 0,
          visitReportsCreated: visitReportsCreated || 0,
          totalActions,
          conversionRate,
          regionId: teamUser.region_id,
          regionName: teamUser.regions ? teamUser.regions.name : undefined,
          lastActive: lastActive,
          avatar: teamUser.avatar_url
        };
      });
      
      const performanceResults = await Promise.all(performancePromises);
      
      // Toplam aksiyona göre sırala
      const sortedPerformance = [...performanceResults].sort((a, b) => 
        b.totalActions - a.totalActions
      );
      
      setPerformanceData(sortedPerformance);
      setTopPerformers(sortedPerformance.slice(0, 3));
      
      // Grafik verileri hazırla
      prepareChartData(sortedPerformance);
      
    } catch (error) {
      console.error('Performans verisi işleme hatası:', error);
    }
  };

  const prepareChartData = (performanceData: PerformanceData[]) => {
    // Kullanıcı başına teklif sayısı
    const proposalsByUser = performanceData
      .filter(user => user.proposalsCreated > 0)
      .map(user => ({
        name: user.userName.split(' ')[0], // Sadece adını göster
        count: user.proposalsCreated
      }))
      .slice(0, 5); // En çok teklif oluşturan 5 kullanıcı
    
    // Bölge bazlı aktiviteler
    const activitiesByRegion: Record<string, number> = {};
    
    performanceData.forEach(user => {
      if (user.regionName) {
        activitiesByRegion[user.regionName] = (activitiesByRegion[user.regionName] || 0) + user.totalActions;
      }
    });
    
    const activitiesData = Object.entries(activitiesByRegion).map(([name, count]) => ({ name, count }));
    
    // Zaman içindeki performans
    // Burada örnek veri kullanıyoruz, gerçek veride tarih bazlı analiz yapılmalı
    const performanceOverTime = [25, 40, 35, 50, 45, 60];
    
    setChartData({
      proposalsByUser,
      activitiesByRegion: activitiesData,
      performanceOverTime
    });
  };

  const getCriteriaScore = (value: number, maxValue: number) => {
    return Math.min(value / maxValue, 1);
  };
  
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'proposals': return 'file-document-outline';
      case 'surgeries': return 'medical-bag';
      case 'visits': return 'calendar-check';
      default: return 'star';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'proposals': return '#4e54c8';
      case 'surgeries': return '#4CAF50';
      case 'visits': return '#FF9800';
      default: return '#9C27B0';
    }
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Belirsiz';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      return 'Son 1 saat içinde';
    } else if (diffHours < 24) {
      return `${diffHours} saat önce`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} gün önce`;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Performans verileri yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={['#4e54c8', '#8f94fb']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.headerTitle}>Takım Performansı</Text>
          <Text style={styles.headerSubtitle}>
            Ekip performansını izleyin ve analiz edin
          </Text>
        </LinearGradient>
      </View>
      
      <View style={styles.filtersContainer}>
        <Text style={styles.sectionTitle}>Zaman Aralığı</Text>
        <View style={styles.timeRangeButtons}>
          {timeRangeOptions.map(option => (
            <Button 
              key={option.value}
              mode={timeRange === option.value ? 'contained' : 'outlined'} 
              onPress={() => setTimeRange(option.value)}
              style={styles.timeButton}
              labelStyle={styles.timeButtonLabel}
            >
              {option.label}
            </Button>
          ))}
        </View>
        
        {user?.role === 'admin' || user?.role === 'manager' ? (
          <View style={styles.regionFilter}>
            <Text style={styles.sectionTitle}>Bölge Filtreleme</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Button 
                mode={regionFilter === null ? 'contained' : 'outlined'} 
                onPress={() => setRegionFilter(null)}
                style={styles.regionButton}
              >
                Tümü
              </Button>
              {regions.map(region => (
                <Button 
                  key={region.id}
                  mode={regionFilter === region.id ? 'contained' : 'outlined'} 
                  onPress={() => setRegionFilter(region.id)}
                  style={styles.regionButton}
                >
                  {region.name}
                </Button>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>
      
      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Performans Özeti</Text>
        <Card style={styles.summaryCard}>
          <Card.Content style={styles.summaryContent}>
            <View style={styles.summaryItem}>
              <MaterialCommunityIcons name="account-group" size={24} color="#4e54c8" />
              <Text style={styles.summaryValue}>{performanceData.length}</Text>
              <Text style={styles.summaryLabel}>Aktif Kullanıcı</Text>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryItem}>
              <MaterialCommunityIcons name="file-document-outline" size={24} color="#4CAF50" />
              <Text style={styles.summaryValue}>
                {performanceData.reduce((sum, user) => sum + user.proposalsCreated, 0)}
              </Text>
              <Text style={styles.summaryLabel}>Teklifler</Text>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryItem}>
              <MaterialCommunityIcons name="medical-bag" size={24} color="#FF9800" />
              <Text style={styles.summaryValue}>
                {performanceData.reduce((sum, user) => sum + user.surgeryReportsCreated, 0)}
              </Text>
              <Text style={styles.summaryLabel}>Ameliyatlar</Text>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryItem}>
              <MaterialCommunityIcons name="calendar-check" size={24} color="#F44336" />
              <Text style={styles.summaryValue}>
                {performanceData.reduce((sum, user) => sum + user.visitReportsCreated, 0)}
              </Text>
              <Text style={styles.summaryLabel}>Ziyaretler</Text>
            </View>
          </Card.Content>
        </Card>
      </View>
      
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>En Çok Teklif Oluşturanlar</Text>
        <Card style={styles.chartCard}>
          <Card.Content>
            <View style={styles.barChartContainer}>
              {chartData.proposalsByUser.length > 0 ? (
                <BarChart
                  data={{
                    labels: chartData.proposalsByUser.map(item => item.name),
                    datasets: [{ data: chartData.proposalsByUser.map(item => item.count) }]
                  }}
                  width={Dimensions.get('window').width - 64}
                  height={220}
                  yAxisLabel=""
                  yAxisSuffix=""
                  chartConfig={{
                    backgroundGradientFrom: '#7388e4',
                    backgroundGradientTo: '#4e54c8',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    style: {
                      borderRadius: 16,
                    },
                    barPercentage: 0.8
                  }}
                  style={{
                    marginVertical: 8,
                    borderRadius: 16,
                  }}
                  showValuesOnTopOfBars={true}
                />
              ) : (
                <Text style={styles.noDataText}>Görüntülenecek veri yok</Text>
              )}
            </View>
          </Card.Content>
        </Card>
      </View>
      
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Bölge Bazlı Aktiviteler</Text>
        <Card style={styles.chartCard}>
          <Card.Content>
            <View style={styles.pieChartContainer}>
              {chartData.activitiesByRegion.length > 0 ? (
                <PieChart
                  data={chartData.activitiesByRegion.map((item, index) => ({
                    name: item.name,
                    population: item.count,
                    color: ['#4e54c8', '#00b09b', '#FF9800', '#F44336', '#9C27B0'][index % 5],
                    legendFontColor: '#7F7F7F',
                    legendFontSize: 12,
                  }))}
                  width={Dimensions.get('window').width - 64}
                  height={180}
                  chartConfig={{
                    backgroundColor: '#fff',
                    backgroundGradientFrom: '#fff',
                    backgroundGradientTo: '#fff',
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  hasLegend={true}
                />
              ) : (
                <Text style={styles.noDataText}>Görüntülenecek veri yok</Text>
              )}
            </View>
          </Card.Content>
        </Card>
      </View>
      
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Zaman İçinde Aktivite</Text>
        <Card style={styles.chartCard}>
          <Card.Content>
            <LineChart
              data={{
                labels: ['5 h. önce', '4 h. önce', '3 h. önce', '2 h. önce', '1 h. önce', 'Şimdi'],
                datasets: [
                  {
                    data: chartData.performanceOverTime,
                    color: (opacity = 1) => `rgba(78, 84, 200, ${opacity})`,
                    strokeWidth: 2,
                  },
                ],
              }}
              width={Dimensions.get('window').width - 64}
              height={220}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(78, 84, 200, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '6',
                  strokeWidth: '2',
                  stroke: '#8f94fb',
                },
              }}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
            />
          </Card.Content>
        </Card>
      </View>
      
      <View style={styles.topPerformersSection}>
        <Text style={styles.sectionTitle}>En İyi Performans Gösterenler</Text>
        {topPerformers.length > 0 ? (
          topPerformers.map((performer, index) => (
            <Card key={performer.userId} style={styles.performerCard}>
              <Card.Content>
                <View style={styles.performerHeader}>
                  <View style={styles.performerAvatar}>
                    {performer.avatar ? (
                      <Avatar.Image size={50} source={{ uri: performer.avatar }} />
                    ) : (
                      <Avatar.Text 
                        size={50} 
                        label={performer.userName.split(' ').map(n => n[0]).join('')} 
                        color="#fff"
                        style={{ backgroundColor: ['#4e54c8', '#00b09b', '#FF9800'][index % 3] }}
                      />
                    )}
                    <Chip style={styles.rankingChip}>#{index + 1}</Chip>
                  </View>
                  
                  <View style={styles.performerInfo}>
                    <Text style={styles.performerName}>{performer.userName}</Text>
                    <Text style={styles.performerRole}>
                      {performer.role === 'admin' ? 'Yönetici' : 
                       performer.role === 'manager' ? 'Yönetim' : 
                       performer.role === 'regional_manager' ? 'Bölge Müdürü' : 'Saha Kullanıcısı'}
                    </Text>
                    <Text style={styles.performerRegion}>
                      {performer.regionName ? performer.regionName : 'Bölge Bilgisi Yok'}
                    </Text>
                  </View>
                  
                  <View style={styles.performerStats}>
                    <Text style={styles.statsValue}>{performer.totalActions}</Text>
                    <Text style={styles.statsLabel}>Toplam İşlem</Text>
                    <Text style={styles.lastActive}>
                      {formatTimeAgo(performer.lastActive)}
                    </Text>
                  </View>
                </View>
                
                <Divider style={styles.divider} />
                
                <View style={styles.metricsSection}>
                  <View style={styles.metricRow}>
                    <View style={styles.metricLabelContainer}>
                      <MaterialCommunityIcons 
                        name={getActivityIcon('proposals')} 
                        size={18} 
                        color={getActivityColor('proposals')} 
                        style={styles.metricIcon}
                      />
                      <Text style={styles.metricLabel}>Teklifler</Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <ProgressBar 
                        progress={getCriteriaScore(performer.proposalsCreated, 10)} 
                        color={getActivityColor('proposals')}
                        style={styles.progressBar}
                      />
                      <Text style={styles.metricValue}>{performer.proposalsCreated}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.metricRow}>
                    <View style={styles.metricLabelContainer}>
                      <MaterialCommunityIcons 
                        name={getActivityIcon('surgeries')} 
                        size={18} 
                        color={getActivityColor('surgeries')}
                        style={styles.metricIcon}
                      />
                      <Text style={styles.metricLabel}>Ameliyatlar</Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <ProgressBar 
                        progress={getCriteriaScore(performer.surgeryReportsCreated, 5)} 
                        color={getActivityColor('surgeries')}
                        style={styles.progressBar}
                      />
                      <Text style={styles.metricValue}>{performer.surgeryReportsCreated}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.metricRow}>
                    <View style={styles.metricLabelContainer}>
                      <MaterialCommunityIcons 
                        name={getActivityIcon('visits')} 
                        size={18} 
                        color={getActivityColor('visits')}
                        style={styles.metricIcon}
                      />
                      <Text style={styles.metricLabel}>Ziyaretler</Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <ProgressBar 
                        progress={getCriteriaScore(performer.visitReportsCreated, 8)} 
                        color={getActivityColor('visits')}
                        style={styles.progressBar}
                      />
                      <Text style={styles.metricValue}>{performer.visitReportsCreated}</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Onaylanan Teklifler</Text>
                    <Text style={styles.statValue}>{performer.proposalsApproved}</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Reddedilen Teklifler</Text>
                    <Text style={styles.statValue}>{performer.proposalsRejected}</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Dönüşüm Oranı</Text>
                    <Text style={styles.statValue}>{performer.conversionRate.toFixed(0)}%</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>Gösterilecek performans verisi bulunamadı.</Text>
            </Card.Content>
          </Card>
        )}
      </View>
      
      <View style={styles.footer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  headerContainer: {
    marginBottom: 16,
  },
  headerGradient: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  timeRangeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  timeButtonLabel: {
    fontSize: 12,
  },
  regionFilter: {
    marginTop: 8,
  },
  regionButton: {
    marginRight: 8,
    marginBottom: 8,
  },
  summarySection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  summaryCard: {
    marginBottom: 8,
  },
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
  },
  summaryDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#e0e0e0',
  },
  chartSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  chartCard: {
    marginBottom: 8,
  },
  barChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 40,
  },
  topPerformersSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  performerCard: {
    marginBottom: 12,
  },
  performerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  performerAvatar: {
    marginRight: 16,
    position: 'relative',
  },
  rankingChip: {
    position: 'absolute',
    bottom: -5,
    right: -10,
    backgroundColor: '#4CAF50',
    height: 24,
  },
  performerInfo: {
    flex: 1,
  },
  performerName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  performerRole: {
    fontSize: 14,
    color: '#666',
  },
  performerRegion: {
    fontSize: 12,
    color: '#888',
  },
  performerStats: {
    alignItems: 'flex-end',
  },
  statsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4e54c8',
  },
  statsLabel: {
    fontSize: 12,
    color: '#666',
  },
  lastActive: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
  },
  divider: {
    marginVertical: 12,
  },
  metricsSection: {
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
  },
  metricIcon: {
    marginRight: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: '#333',
  },
  progressBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
  },
  metricValue: {
    width: 30,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyCard: {
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
  footer: {
    height: 20,
  }
});

export default TeamPerformanceScreen; 