import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Card, Title, Paragraph, Button, useTheme, Divider, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BarChart, PieChart, LineChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../services/authService';
import { User, UserRole, Proposal, SurgeryReport, VisitReport } from '../types';

type DashboardScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

const DashboardScreen = () => {
  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const theme = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalProposals: 0,
    pendingProposals: 0,
    approvedProposals: 0,
    rejectedProposals: 0,
    totalSurgeries: 0,
    upcomingSurgeries: 0,
    completedSurgeries: 0,
    totalVisits: 0,
    upcomingVisits: 0,
    completedVisits: 0,
    totalClinics: 0,
    activeClinics: 0,
    totalProducts: 0,
    totalRevenue: 0,
    monthlyProposals: [0, 0, 0, 0, 0, 0],
    categoryDistribution: [
      { name: 'Kategori A', count: 0, color: '#FF6384' },
      { name: 'Kategori B', count: 0, color: '#36A2EB' },
      { name: 'Kategori C', count: 0, color: '#FFCE56' },
      { name: 'Kategori D', count: 0, color: '#4BC0C0' },
    ],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      if (currentUser) {
        await fetchStats(currentUser);
      }
    } catch (error) {
      console.error('Dashboard veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const fetchStats = async (currentUser: User) => {
    try {
      // Temel sorgu oluşturma
      let proposalsQuery = supabase.from('proposals').select('*');
      let surgeriesQuery = supabase.from('surgery_reports').select('*');
      let visitsQuery = supabase.from('visit_reports').select('*');
      let clinicsQuery = supabase.from('clinics').select('*');
      
      // Rol tabanlı erişim kontrolü
      if (currentUser.role === 'regional_manager') {
        proposalsQuery = proposalsQuery.eq('region_id', currentUser.region_id);
        surgeriesQuery = surgeriesQuery.eq('region_id', currentUser.region_id);
        visitsQuery = visitsQuery.eq('region_id', currentUser.region_id);
        clinicsQuery = clinicsQuery.eq('region_id', currentUser.region_id);
      } else if (currentUser.role === 'field_user') {
        proposalsQuery = proposalsQuery.eq('user_id', currentUser.id);
        surgeriesQuery = surgeriesQuery.eq('user_id', currentUser.id);
        visitsQuery = visitsQuery.eq('user_id', currentUser.id);
        clinicsQuery = clinicsQuery.eq('region_id', currentUser.region_id);
      }

      // İstatistikleri çekme
      const { count: totalProposals } = await proposalsQuery;
      
      let pendingQuery = proposalsQuery.filter('status', 'eq', 'pending');
      const { count: pendingProposals } = await pendingQuery;
      
      let approvedQuery = proposalsQuery.filter('status', 'eq', 'approved');
      const { count: approvedProposals } = await approvedQuery;
      
      let rejectedQuery = proposalsQuery.filter('status', 'eq', 'rejected');
      const { count: rejectedProposals } = await rejectedQuery;
      
      const { count: totalSurgeries } = await surgeriesQuery;
      const { count: upcomingSurgeries } = await surgeriesQuery.gt('date', new Date().toISOString());
      const { count: completedSurgeries } = await surgeriesQuery.eq('status', 'completed');
      
      const { count: totalVisits } = await visitsQuery;
      const { count: upcomingVisits } = await visitsQuery.gt('date', new Date().toISOString());
      
      const { count: totalClinics } = await clinicsQuery;
      const { count: activeClinics } = await clinicsQuery.eq('status', 'active');
      
      const { data: products } = await supabase.from('products').select('*');
      
      // Aylık teklif verisi
      const today = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(today.getMonth() - 5);
      
      const { data: monthlyData } = await proposalsQuery
        .gte('created_at', sixMonthsAgo.toISOString())
        .lte('created_at', today.toISOString());
      
      // Aylar bazında veri gruplandırma
      const monthlyProposals = [0, 0, 0, 0, 0, 0];
      if (monthlyData) {
        monthlyData.forEach((proposal) => {
          const createdAt = new Date(proposal.created_at);
          const monthIndex = today.getMonth() - createdAt.getMonth();
          if (monthIndex >= 0 && monthIndex < 6) {
            monthlyProposals[5 - monthIndex]++;
          }
        });
      }
      
      // Kategori dağılımı
      const { data: categoryData } = await supabase
        .from('products')
        .select('category, id');
      
      const categoryCount: Record<string, number> = {};
      if (categoryData) {
        categoryData.forEach((product) => {
          if (product.category) {
            categoryCount[product.category] = (categoryCount[product.category] || 0) + 1;
          }
        });
      }
      
      const categoryDistribution = Object.keys(categoryCount).map((category, index) => ({
        name: category,
        count: categoryCount[category],
        color: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'][index % 4],
      }));
      
      // Toplam gelir hesaplama (onaylanmış teklifler)
      const { data: approvedProposalsData } = await proposalsQuery.eq('status', 'approved');
      const totalRevenue = approvedProposalsData ? 
        approvedProposalsData.reduce((sum, proposal) => sum + (proposal.total_amount || 0), 0) : 0;
      
      setStats({
        totalProposals: totalProposals || 0,
        pendingProposals: pendingProposals || 0,
        approvedProposals: approvedProposals || 0,
        rejectedProposals: rejectedProposals || 0,
        totalSurgeries: totalSurgeries || 0,
        upcomingSurgeries: upcomingSurgeries || 0,
        completedSurgeries: completedSurgeries || 0,
        totalVisits: totalVisits || 0,
        upcomingVisits: upcomingVisits || 0,
        completedVisits: 0, // API'den çekilebilir
        totalClinics: totalClinics || 0,
        activeClinics: activeClinics || 0,
        totalProducts: products ? products.length : 0,
        totalRevenue,
        monthlyProposals,
        categoryDistribution: categoryDistribution.slice(0, 4),
      });
    } catch (error) {
      console.error('İstatistik verileri çekme hatası:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Dashboard yükleniyor...</Text>
      </View>
    );
  }

  const renderRoleBasedContent = () => {
    if (!user) return null;

    return (
      <>
        <View style={styles.headerContainer}>
          <LinearGradient
            colors={['#4e54c8', '#8f94fb']}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.headerContent}>
              <View>
                <Text style={styles.welcomeText}>Hoş Geldiniz,</Text>
                <Text style={styles.nameText}>{user.name}</Text>
                <Text style={styles.roleText}>
                  {user.role === 'admin' ? 'Admin' : 
                   user.role === 'manager' ? 'Yönetim' : 
                   user.role === 'regional_manager' ? 'Bölge Müdürü' : 'Saha Kullanıcısı'}
                </Text>
              </View>
              <View style={styles.profileIconContainer}>
                <TouchableOpacity 
                  style={styles.profileIcon}
                  onPress={() => navigation.navigate('Profile')}
                >
                  <Ionicons name="person" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>
        
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Özet İstatistikler</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.statsScrollView}
          >
            <StatCard
              title="Toplam Teklif"
              value={stats.totalProposals}
              icon="file-document-outline"
              color="#4e54c8"
            />
            <StatCard
              title="Onaylanan"
              value={stats.approvedProposals}
              icon="check-circle-outline"
              color="#4CAF50"
            />
            <StatCard
              title="Bekleyen"
              value={stats.pendingProposals}
              icon="timer-sand"
              color="#FF9800"
            />
            <StatCard
              title="Reddedilen"
              value={stats.rejectedProposals}
              icon="close-circle-outline"
              color="#F44336"
            />
          </ScrollView>
        </View>
        
        <View style={styles.chartsContainer}>
          <Text style={styles.sectionTitle}>Performans Grafikleri</Text>
          
          <Card style={styles.chartCard}>
            <Card.Content>
              <Title style={styles.chartTitle}>Aylık Teklif Sayısı</Title>
              <LineChart
                data={{
                  labels: ['5 ay önce', '4 ay önce', '3 ay önce', '2 ay önce', 'Geçen ay', 'Bu ay'],
                  datasets: [
                    {
                      data: stats.monthlyProposals,
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
                }}
                bezier
                style={{
                  marginVertical: 8,
                  borderRadius: 16,
                }}
              />
            </Card.Content>
          </Card>
          
          {(user.role === 'admin' || user.role === 'manager') && (
            <Card style={styles.chartCard}>
              <Card.Content>
                <Title style={styles.chartTitle}>Ürün Kategorileri</Title>
                <View style={styles.pieChartContainer}>
                  <PieChart
                    data={stats.categoryDistribution.map(item => ({
                      name: item.name,
                      population: item.count,
                      color: item.color,
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
                  />
                </View>
              </Card.Content>
            </Card>
          )}
        </View>
        
        <View style={styles.activityContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Yaklaşan Etkinlikler</Text>
            <TouchableOpacity onPress={() => navigation.navigate('CalendarScreen')}>
              <Text style={styles.viewAllText}>Tümünü Gör</Text>
            </TouchableOpacity>
          </View>
          
          <Card style={styles.activityCard}>
            <Card.Content>
              <View style={styles.activityItem}>
                <View style={[styles.activityDot, { backgroundColor: '#4CAF50' }]} />
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>Yaklaşan Ameliyatlar</Text>
                  <Text style={styles.activityCount}>{stats.upcomingSurgeries} ameliyat planlandı</Text>
                </View>
                <TouchableOpacity 
                  style={styles.viewButton}
                  onPress={() => navigation.navigate('SurgeryReports')}
                >
                  <Text style={styles.viewButtonText}>Görüntüle</Text>
                </TouchableOpacity>
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.activityItem}>
                <View style={[styles.activityDot, { backgroundColor: '#2196F3' }]} />
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>Yaklaşan Ziyaretler</Text>
                  <Text style={styles.activityCount}>{stats.upcomingVisits} ziyaret planlandı</Text>
                </View>
                <TouchableOpacity 
                  style={styles.viewButton}
                  onPress={() => navigation.navigate('VisitReports')}
                >
                  <Text style={styles.viewButtonText}>Görüntüle</Text>
                </TouchableOpacity>
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.activityItem}>
                <View style={[styles.activityDot, { backgroundColor: '#FF9800' }]} />
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>Bekleyen Teklifler</Text>
                  <Text style={styles.activityCount}>{stats.pendingProposals} teklif incelemede</Text>
                </View>
                <TouchableOpacity 
                  style={styles.viewButton}
                  onPress={() => navigation.navigate('ProposalsTab', { filter: 'pending' })}
                >
                  <Text style={styles.viewButtonText}>Görüntüle</Text>
                </TouchableOpacity>
              </View>
            </Card.Content>
          </Card>
        </View>
        
        {(user.role === 'admin' || user.role === 'manager') && (
          <View style={styles.businessMetricsContainer}>
            <Text style={styles.sectionTitle}>İş Metrikleri</Text>
            <View style={styles.metricsRow}>
              <Card style={[styles.metricCard, { backgroundColor: '#E3F2FD' }]}>
                <Card.Content>
                  <Ionicons name="business-outline" size={24} color="#2196F3" style={styles.metricIcon} />
                  <Text style={styles.metricValue}>{stats.activeClinics}</Text>
                  <Text style={styles.metricTitle}>Aktif Klinik</Text>
                </Card.Content>
              </Card>
              
              <Card style={[styles.metricCard, { backgroundColor: '#E8F5E9' }]}>
                <Card.Content>
                  <MaterialCommunityIcons name="currency-usd" size={24} color="#4CAF50" style={styles.metricIcon} />
                  <Text style={styles.metricValue}>{new Intl.NumberFormat('tr-TR').format(stats.totalRevenue)} ₺</Text>
                  <Text style={styles.metricTitle}>Toplam Gelir</Text>
                </Card.Content>
              </Card>
            </View>
            
            <View style={styles.metricsRow}>
              <Card style={[styles.metricCard, { backgroundColor: '#FFF3E0' }]}>
                <Card.Content>
                  <MaterialCommunityIcons name="package-variant-closed" size={24} color="#FF9800" style={styles.metricIcon} />
                  <Text style={styles.metricValue}>{stats.totalProducts}</Text>
                  <Text style={styles.metricTitle}>Ürün Sayısı</Text>
                </Card.Content>
              </Card>
              
              <Card style={[styles.metricCard, { backgroundColor: '#E1F5FE' }]}>
                <Card.Content>
                  <MaterialCommunityIcons name="chart-line" size={24} color="#03A9F4" style={styles.metricIcon} />
                  <Text style={styles.metricValue}>{(stats.approvedProposals / (stats.totalProposals || 1) * 100).toFixed(0)}%</Text>
                  <Text style={styles.metricTitle}>Onay Oranı</Text>
                </Card.Content>
              </Card>
            </View>

            <View style={styles.metricsRow}>
              <TouchableOpacity 
                style={styles.fullWidthButton}
                onPress={() => navigation.navigate('TeamPerformanceScreen')}
              >
                <LinearGradient
                  colors={['#9C27B0', '#673AB7']}
                  style={[styles.fullWidthGradient, { paddingVertical: 16, borderRadius: 12 }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <MaterialCommunityIcons name="account-group" size={28} color="white" />
                  <Text style={[styles.fullWidthButtonText, { fontSize: 18 }]}>Takım Performansını Görüntüle</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('CreateProposal', {})}
            >
              <LinearGradient
                colors={['#4e54c8', '#8f94fb']}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="document-text-outline" size={24} color="white" />
              </LinearGradient>
              <Text style={styles.actionText}>Yeni Teklif</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('CreateSurgeryReport', {})}
            >
              <LinearGradient
                colors={['#00b09b', '#96c93d']}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="medkit-outline" size={24} color="white" />
              </LinearGradient>
              <Text style={styles.actionText}>Ameliyat Raporu</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('CreateVisitReport', {})}
            >
              <LinearGradient
                colors={['#ff9966', '#ff5e62']}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="calendar-outline" size={24} color="white" />
              </LinearGradient>
              <Text style={styles.actionText}>Ziyaret Raporu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {renderRoleBasedContent()}
      <View style={styles.footer} />
    </ScrollView>
  );
};

const StatCard = ({ title, value, icon, color }: { 
  title: string; 
  value: number; 
  icon: string; 
  color: string 
}) => {
  return (
    <Card style={[styles.statCard, { borderLeftColor: color }]}>
      <Card.Content style={styles.statCardContent}>
        <MaterialCommunityIcons name={icon as any} size={28} color={color} style={styles.statIcon} />
        <View>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statTitle}>{title}</Text>
        </View>
      </Card.Content>
    </Card>
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
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  nameText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  roleText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
  },
  profileIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statsScrollView: {
    flexDirection: 'row',
  },
  statCard: {
    marginRight: 12,
    borderLeftWidth: 4,
    width: 150,
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    marginRight: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
  },
  chartsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  chartCard: {
    marginBottom: 16,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  pieChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    color: '#4e54c8',
    fontSize: 14,
  },
  activityCard: {
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  activityCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  viewButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  viewButtonText: {
    fontSize: 12,
    color: '#333',
  },
  divider: {
    marginVertical: 8,
  },
  businessMetricsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricCard: {
    width: '48%',
    elevation: 1,
  },
  metricIcon: {
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  metricTitle: {
    fontSize: 12,
    color: '#666',
  },
  actionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    width: '30%',
  },
  actionGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    textAlign: 'center',
  },
  footer: {
    height: 20,
  },
  fullWidthButton: {
    width: '100%',
    marginTop: 8,
  },
  fullWidthGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  fullWidthButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default DashboardScreen; 