import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { 
  Appbar, 
  Text, 
  Button, 
  Card, 
  Title, 
  Paragraph, 
  Divider, 
  useTheme, 
  ActivityIndicator, 
  Chip,
  DataTable,
  Badge,
  Surface,
  SegmentedButtons,
  Menu,
  Searchbar,
  ProgressBar,
  List,
  Avatar,
  TextInput,
  IconButton
} from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { supabase } from '../lib/supabase';
import { SafeAreaWrapper } from '../components/SafeAreaWrapper';

// Veri tipleri
interface PerformanceData {
  id: string | number;
  name: string;
  proposalCount: number;
  visitCount: number;
  surgeryCount?: number;
  activityScore?: number; // Toplam aktivite puanı
  revenue?: number; // Toplam teklif tutarı
  approvedProposalCount?: number; // Onaylanan teklif sayısı
  visitedClinicCount?: number; // Ziyaret edilen klinik sayısı
  region?: string; // Bölge
  dailyAvgVisit?: number; // Günlük ortalama ziyaret
}

interface MonthlyActivityData {
  month: string;
  visits: number;
  proposals: number;
  surgeries: number;
}

export const ActivitiesPage = () => {
  const theme = useTheme();
  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [employeePerformance, setEmployeePerformance] = useState<PerformanceData[]>([]);
  const [clinicPerformance, setClinicPerformance] = useState<PerformanceData[]>([]);
  const [timeFilter, setTimeFilter] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  
  // Yeni eklenen state'ler
  const [selectedRegion, setSelectedRegion] = useState('Tüm Bölgeler');
  const [regions, setRegions] = useState(['Tüm Bölgeler', 'İzmir Bölgesi', 'İstanbul Bölgesi', 'Ankara Bölgesi', 'Antalya Bölgesi']);
  const [showRegionMenu, setShowRegionMenu] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<PerformanceData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [monthlyData, setMonthlyData] = useState<MonthlyActivityData[]>([]);
  const [mostVisitedClinics, setMostVisitedClinics] = useState<{name: string, count: number}[]>([]);

  const handleTabChange = (index: number | string) => {
    setTabIndex(typeof index === 'string' ? parseInt(index) : index);
  };

  // Arama fonksiyonu
  const onChangeSearch = (query: string) => setSearchQuery(query);
  
  // Filtrelenmiş çalışanlar
  const filteredEmployees = employeePerformance.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Veri yükleme
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Çalışan verileri
      const { data: employees, error: employeeError } = await supabase
        .from('users')
        .select(`
          id,
          name,
          region_id,
          proposals!proposals_user_id_fkey(id, status),
          visit_reports(id, clinic_id),
          surgery_reports(id)
        `)
        .neq('role', 'admin');
      
      if (employeeError) {
        console.error('Çalışan verisi yükleme hatası:', employeeError);
        throw employeeError;
      }
      
      if (!employees) {
        console.log('Çalışan verisi bulunamadı');
        setEmployeePerformance([]);
      } else {
        const formattedEmployees = employees.map(employee => {
          const proposals = employee.proposals || [];
          const visits = employee.visit_reports || [];
          const surgeries = employee.surgery_reports || [];
          
          // Onaylanan teklifler
          const approvedProposals = proposals.filter((p: any) => p.status === 'approved');
          
          // Toplam teklif tutarı - sabit bir değer kullanıyoruz çünkü amount alanı yok
          const totalRevenue = approvedProposals.length * 5000; // Örnek: Her teklif ortalama 5000 TL
          
          // Ziyaret edilen benzersiz klinikler
          const uniqueClinics = [...new Set(visits.map((v: any) => v.clinic_id))];
          
          // Günlük ortalama ziyaret hesaplama (aylık ziyaretleri 30'a bölüyoruz)
          const dailyAvgVisit = visits.length > 0 ? (visits.length / 30) : 0;
          
          // Bölge adını belirle - region_id değerine göre
          let regionName = 'Belirtilmemiş';
          
          const regionMap: Record<string, string> = {
            '1': 'İzmir Bölgesi',
            '2': 'İstanbul Bölgesi',
            '3': 'Ankara Bölgesi',
            '4': 'Antalya Bölgesi',
            '5': 'Adana Bölgesi',
            '6': 'Bursa Bölgesi',
            '7': 'Trabzon Bölgesi'
          };
          
          if (employee.region_id && regionMap[employee.region_id]) {
            regionName = regionMap[employee.region_id];
          }
          
          return {
            id: employee.id,
            name: employee.name,
            region: regionName,
            proposalCount: proposals.length,
            visitCount: visits.length,
            surgeryCount: surgeries.length,
            activityScore: proposals.length * 2 + visits.length + surgeries.length * 3,
            revenue: totalRevenue,
            approvedProposalCount: approvedProposals.length,
            visitedClinicCount: uniqueClinics.length,
            dailyAvgVisit: parseFloat(dailyAvgVisit.toFixed(2))
          };
        }).sort((a, b) => (b.activityScore || 0) - (a.activityScore || 0));
        
        setEmployeePerformance(formattedEmployees);
        
        // İlk çalışanı otomatik seç
        if (formattedEmployees.length > 0 && !selectedEmployee) {
          setSelectedEmployee(formattedEmployees[0]);
          generateMonthlyData(formattedEmployees[0]);
          generateMostVisitedClinics(formattedEmployees[0]);
        }
      }
      
      // Klinik verileri
      const { data: clinics, error: clinicError } = await supabase
        .from('clinics')
        .select(`
          id,
          name,
          region_id,
          proposals!proposals_clinic_id_fkey(id, status),
          visit_reports!visit_reports_clinic_id_fkey(id),
          surgery_reports!surgery_reports_clinic_id_fkey(id)
        `);
      
      if (clinicError) {
        console.error('Klinik verisi yükleme hatası:', clinicError);
        throw clinicError;
      }
      
      if (!clinics) {
        console.log('Klinik verisi bulunamadı');
        setClinicPerformance([]);
      } else {
        const formattedClinics = clinics.map(clinic => {
          const proposals = clinic.proposals || [];
          const visits = clinic.visit_reports || [];
          const surgeries = clinic.surgery_reports || [];
          
          // Bölge adını belirle - region_id'ye göre
          let regionName = 'Belirtilmemiş';
          
          const regionMap: Record<string, string> = {
            '1': 'İzmir Bölgesi',
            '2': 'İstanbul Bölgesi',
            '3': 'Ankara Bölgesi',
            '4': 'Antalya Bölgesi',
            '5': 'Adana Bölgesi',
            '6': 'Bursa Bölgesi',
            '7': 'Trabzon Bölgesi'
          };
          
          if (clinic.region_id && regionMap[clinic.region_id]) {
            regionName = regionMap[clinic.region_id];
          }
          
          return {
            id: clinic.id,
            name: clinic.name,
            region: regionName,
            proposalCount: proposals.length,
            visitCount: visits.length,
            surgeryCount: surgeries.length,
            activityScore: proposals.length + visits.length + surgeries.length * 2
          };
        }).sort((a, b) => (b.activityScore || 0) - (a.activityScore || 0));
        
        setClinicPerformance(formattedClinics);
      }
      
    } catch (error: any) {
      console.error('Veri yükleme hatası:', error);
      
      // Test verileri
      const testEmployees = [
        { 
          id: 1, 
          name: 'Ahmet Yılmaz', 
          region: 'İzmir Bölgesi',
          proposalCount: 15, 
          visitCount: 8, 
          surgeryCount: 4, 
          activityScore: 42,
          revenue: 25000,
          approvedProposalCount: 8,
          visitedClinicCount: 5,
          dailyAvgVisit: 0.27
        },
        { 
          id: 2, 
          name: 'Ayşe Demir', 
          region: 'İstanbul Bölgesi',
          proposalCount: 12, 
          visitCount: 10, 
          surgeryCount: 3, 
          activityScore: 37,
          revenue: 18000,
          approvedProposalCount: 7,
          visitedClinicCount: 6,
          dailyAvgVisit: 0.33
        },
        { 
          id: 3, 
          name: 'SERKAN', 
          region: 'İzmir Bölgesi',
          proposalCount: 0, 
          visitCount: 0, 
          surgeryCount: 0, 
          activityScore: 0,
          revenue: 0,
          approvedProposalCount: 0,
          visitedClinicCount: 0,
          dailyAvgVisit: 0.00
        },
      ];
      
      setEmployeePerformance(testEmployees);
      
      // İlk çalışanı otomatik seç veya SERKAN'ı bul ve seç
      const serkan = testEmployees.find(e => e.name === 'SERKAN');
      if (serkan) {
        setSelectedEmployee(serkan);
        generateMonthlyData(serkan);
        generateMostVisitedClinics(serkan);
      } else if (testEmployees.length > 0 && !selectedEmployee) {
        setSelectedEmployee(testEmployees[0]);
        generateMonthlyData(testEmployees[0]);
        generateMostVisitedClinics(testEmployees[0]);
      }
      
      const testClinics = [
        { id: 1, name: 'Özel Anadolu Hastanesi', region: 'İzmir Bölgesi', proposalCount: 22, visitCount: 18, surgeryCount: 8, activityScore: 56 },
        { id: 2, name: 'Medilife Tıp Merkezi', region: 'İstanbul Bölgesi', proposalCount: 18, visitCount: 20, surgeryCount: 6, activityScore: 50 },
        { id: 3, name: 'Denta Plus Ağız ve Diş Sağlığı', region: 'Ankara Bölgesi', proposalCount: 15, visitCount: 16, surgeryCount: 7, activityScore: 45 },
      ];
      
      setClinicPerformance(testClinics);
    } finally {
      setLoading(false);
    }
  }, [timeFilter, selectedRegion, selectedEmployee]);
  
  // Seçilen çalışan için aylık verileri oluştur
  const generateMonthlyData = (employee: PerformanceData) => {
    // Son 6 ayın verilerini oluştur
    const months = ['Kas 24', 'Ara 24', 'Oca 25', 'Şub 25', 'Mar 25', 'Nis 25'];
    
    // Rastgele veriler (gerçek uygulamada bu veriler veritabanından gelecek)
    // SERKAN için tüm değerleri 0 yap
    if (employee.name === 'SERKAN') {
      setMonthlyData(months.map(month => ({
        month,
        visits: 0,
        proposals: 0,
        surgeries: 0
      })));
    } else {
      setMonthlyData(months.map(month => ({
        month,
        visits: Math.floor(Math.random() * 2),
        proposals: Math.floor(Math.random() * 2),
        surgeries: Math.floor(Math.random() * 1)
      })));
    }
  };
  
  // Seçilen çalışan için en çok ziyaret edilen klinikleri oluştur
  const generateMostVisitedClinics = (employee: PerformanceData) => {
    // SERKAN için boş liste yap
    if (employee.name === 'SERKAN') {
      setMostVisitedClinics([]);
      return;
    }
    
    // Rastgele klinikler (gerçek uygulamada bu veriler veritabanından gelecek)
    const clinics = [
      { name: 'Özel Anadolu Hastanesi', count: 3 },
      { name: 'Medilife Tıp Merkezi', count: 2 },
      { name: 'Denta Plus Ağız ve Diş Sağlığı', count: 2 },
      { name: 'Hayat Cerrahi Tıp Merkezi', count: 1 },
    ];
    
    setMostVisitedClinics(clinics);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData, timeFilter, selectedRegion]);
  
  useEffect(() => {
    if (selectedEmployee) {
      generateMonthlyData(selectedEmployee);
      generateMostVisitedClinics(selectedEmployee);
    }
  }, [selectedEmployee]);

  const handleTimeFilterChange = (filter: 'weekly' | 'monthly' | 'yearly') => {
    setTimeFilter(filter);
  };
  
  const handleEmployeeSelect = (employee: PerformanceData) => {
    setSelectedEmployee(employee);
    setSearchQuery('');
  };

  // Madalya rengini belirleme
  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return '#FFD700'; // Altın
      case 1: return '#C0C0C0'; // Gümüş
      case 2: return '#CD7F32'; // Bronz
      default: return theme.colors.primary;
    }
  };

  // Çalışan sekmesi içeriği
  const renderEmployeeTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.filterRow}>
        <View style={styles.filterItem}>
          <Text variant="titleMedium" style={styles.filterLabel}>Bölge Filtresi</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowRegionMenu(!showRegionMenu)}
          >
            <Text>{selectedRegion}</Text>
            <MaterialCommunityIcons name="chevron-down" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          
          {showRegionMenu && (
            <Menu
              visible={showRegionMenu}
              onDismiss={() => setShowRegionMenu(false)}
              anchor={{ x: 0, y: 0 }}
              style={styles.menu}
            >
              {regions.map((region) => (
                <Menu.Item
                  key={region}
                  onPress={() => {
                    setSelectedRegion(region);
                    setShowRegionMenu(false);
                  }}
                  title={region}
                />
              ))}
            </Menu>
          )}
        </View>
        
        <View style={styles.filterItem}>
          <Text variant="titleMedium" style={styles.filterLabel}>Çalışan Seçimi</Text>
          <Searchbar
            placeholder="Çalışan Ara"
            onChangeText={onChangeSearch}
            value={searchQuery}
            style={styles.searchBar}
          />
          
          {searchQuery !== '' && (
            <Card style={styles.searchResults}>
              <ScrollView style={{ maxHeight: 200 }}>
                {filteredEmployees.map((employee) => (
                  <TouchableOpacity
                    key={employee.id.toString()}
                    style={styles.searchResultItem}
                    onPress={() => handleEmployeeSelect(employee)}
                  >
                    <Text>{employee.name}</Text>
                    <Text variant="bodySmall">{employee.region}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Card>
          )}
        </View>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
        </View>
      ) : selectedEmployee ? (
        <View>
          <Surface style={styles.surface}>
            <Title style={styles.sectionTitle}>{selectedEmployee.name} için Aktiviteler</Title>
            
            <View style={styles.timeFilterContainer}>
              <Text variant="bodySmall">Zaman Aralığı</Text>
              <SegmentedButtons
                value={timeFilter}
                onValueChange={(value) => handleTimeFilterChange(value as any)}
                buttons={[
                  { value: 'weekly', label: 'Haftalık' },
                  { value: 'monthly', label: 'Aylık' },
                  { value: 'yearly', label: 'Yıllık' }
                ]}
                style={styles.timeFilterButtons}
              />
            </View>
            
            <View style={styles.metricsContainer}>
              <View style={styles.metricCard}>
                <MaterialCommunityIcons name="office-building" size={24} color={theme.colors.primary} />
                <Text variant="titleLarge">{selectedEmployee.visitedClinicCount}</Text>
                <Text variant="bodySmall">Ziyaret Edilen Klinik</Text>
              </View>
              
              <View style={styles.metricCard}>
                <MaterialCommunityIcons name="calendar-check" size={24} color={theme.colors.primary} />
                <Text variant="titleLarge">{selectedEmployee.visitCount}</Text>
                <Text variant="bodySmall">Toplam Ziyaret</Text>
              </View>
              
              <View style={styles.metricCard}>
                <MaterialCommunityIcons name="file-document-outline" size={24} color={theme.colors.primary} />
                <Text variant="titleLarge">{selectedEmployee.proposalCount}</Text>
                <Text variant="bodySmall">Toplam Teklif</Text>
              </View>
              
              <View style={styles.metricCard}>
                <MaterialCommunityIcons name="hospital" size={24} color={theme.colors.primary} />
                <Text variant="titleLarge">{selectedEmployee.surgeryCount}</Text>
                <Text variant="bodySmall">Katılınan Ameliyat</Text>
              </View>
              
              <View style={styles.metricCard}>
                <MaterialCommunityIcons name="currency-try" size={24} color={theme.colors.primary} />
                <Text variant="titleLarge">₺{selectedEmployee.revenue?.toLocaleString()}</Text>
                <Text variant="bodySmall">Toplam Teklif Tutarı</Text>
              </View>
              
              <View style={styles.metricCard}>
                <MaterialCommunityIcons name="check-circle" size={24} color={theme.colors.primary} />
                <Text variant="titleLarge">{selectedEmployee.approvedProposalCount}</Text>
                <Text variant="bodySmall">Onaylanan Teklif</Text>
              </View>
              
              <View style={styles.metricCard}>
                <MaterialCommunityIcons name="chart-timeline-variant" size={24} color={theme.colors.primary} />
                <Text variant="titleLarge">{selectedEmployee.dailyAvgVisit}</Text>
                <Text variant="bodySmall">Günlük Ortalama Ziyaret</Text>
              </View>
            </View>
          </Surface>
          
          <Surface style={styles.surface}>
            <Title style={styles.sectionTitle}>Aylık Aktivite Dağılımı</Title>
            
            {monthlyData.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <LineChart
                  data={{
                    labels: monthlyData.map(d => d.month),
                    datasets: [
                      {
                        data: monthlyData.map(d => d.visits),
                        color: () => 'rgba(54, 162, 235, 1)',
                        strokeWidth: 2
                      },
                      {
                        data: monthlyData.map(d => d.proposals),
                        color: () => 'rgba(255, 206, 86, 1)',
                        strokeWidth: 2
                      },
                      {
                        data: monthlyData.map(d => d.surgeries),
                        color: () => 'rgba(255, 99, 132, 1)',
                        strokeWidth: 2
                      }
                    ],
                    legend: ['Ziyaretler', 'Teklifler', 'Ameliyatlar']
                  }}
                  width={Dimensions.get('window').width - 40}
                  height={220}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: {
                      borderRadius: 16
                    },
                    propsForDots: {
                      r: '6',
                      strokeWidth: '2',
                    }
                  }}
                  bezier
                  style={styles.chart}
                />
              </ScrollView>
            ) : (
              <Text style={styles.noDataText}>Bu dönem için grafik verisi bulunamadı.</Text>
            )}
          </Surface>
          
          <Surface style={styles.surface}>
            <Title style={styles.sectionTitle}>Teklif Durumları</Title>
            
            {selectedEmployee.proposalCount > 0 ? (
              <View>
                <View style={styles.proposalStatusRow}>
                  <View style={styles.proposalStatusItem}>
                    <Text>Onaylanan</Text>
                    <ProgressBar 
                      progress={selectedEmployee.approvedProposalCount! / selectedEmployee.proposalCount} 
                      color={theme.colors.primary} 
                      style={styles.progressBar} 
                    />
                    <Text style={styles.progressText}>
                      {selectedEmployee.approvedProposalCount} / {selectedEmployee.proposalCount}
                    </Text>
                  </View>
                  
                  <View style={styles.proposalStatusItem}>
                    <Text>Bekleyen</Text>
                    <ProgressBar 
                      progress={(selectedEmployee.proposalCount - selectedEmployee.approvedProposalCount!) / selectedEmployee.proposalCount} 
                      color="#FFA000" 
                      style={styles.progressBar} 
                    />
                    <Text style={styles.progressText}>
                      {selectedEmployee.proposalCount - selectedEmployee.approvedProposalCount!} / {selectedEmployee.proposalCount}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <Text style={styles.noDataText}>Bu dönemde teklif bulunmamaktadır.</Text>
            )}
          </Surface>
          
          <Surface style={styles.surface}>
            <Title style={styles.sectionTitle}>En Çok Ziyaret Edilen Klinikler</Title>
            
            {mostVisitedClinics.length > 0 ? (
              <View>
                {mostVisitedClinics.map((clinic, index) => (
                  <List.Item
                    key={index}
                    title={clinic.name}
                    description={`${clinic.count} ziyaret`}
                    left={props => <Avatar.Icon {...props} icon="hospital-building" />}
                    right={props => <Text {...props} style={styles.visitCount}>{clinic.count}</Text>}
                  />
                ))}
              </View>
            ) : (
              <Text style={styles.noDataText}>Bu dönemde ziyaret edilen klinik bulunmamaktadır.</Text>
            )}
          </Surface>
        </View>
      ) : (
        <Text style={styles.noDataText}>Lütfen bir çalışan seçin.</Text>
      )}
    </View>
  );

  // Klinik sekmesi içeriği
  const renderClinicTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.filterContainer}>
        <Text variant="titleMedium" style={styles.filterTitle}>
          Klinik Aktivite Sıralaması
        </Text>
        
        <View style={styles.chipContainer}>
          <Chip 
            mode={timeFilter === 'weekly' ? 'flat' : 'outlined'} 
            selected={timeFilter === 'weekly'}
            onPress={() => handleTimeFilterChange('weekly')}
            style={styles.filterChip}
          >
            Haftalık
          </Chip>
          <Chip 
            mode={timeFilter === 'monthly' ? 'flat' : 'outlined'} 
            selected={timeFilter === 'monthly'}
            onPress={() => handleTimeFilterChange('monthly')}
            style={styles.filterChip}
          >
            Aylık
          </Chip>
          <Chip 
            mode={timeFilter === 'yearly' ? 'flat' : 'outlined'} 
            selected={timeFilter === 'yearly'}
            onPress={() => handleTimeFilterChange('yearly')}
            style={styles.filterChip}
          >
            Yıllık
          </Chip>
        </View>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
        </View>
      ) : clinicPerformance.length === 0 ? (
        <Text style={styles.noDataText}>Klinik verisi bulunamadı.</Text>
      ) : (
        <View>
          <Surface style={styles.surface}>
            <Title style={styles.sectionTitle}>En Aktif Klinikler</Title>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {clinicPerformance.slice(0, 3).map((clinic, index) => (
                <Card key={clinic.id.toString()} style={styles.topCard}>
                  <Badge
                    size={30}
                    style={[styles.medalBadge, { backgroundColor: getMedalColor(index) }]}
                  >
                    {index + 1}
                  </Badge>
                  <Card.Content>
                    <Title style={styles.cardTitle}>{clinic.name}</Title>
                    <View style={styles.statsContainer}>
                      <Text variant="labelLarge" style={styles.scoreText}>
                        Toplam Puan: {clinic.activityScore}
                      </Text>
                      <Text variant="bodySmall">
                        Teklifler: {clinic.proposalCount}
                      </Text>
                      <Text variant="bodySmall">
                        Ziyaretler: {clinic.visitCount}
                      </Text>
                      <Text variant="bodySmall">
                        Ameliyatlar: {clinic.surgeryCount || 0}
                      </Text>
                    </View>
                  </Card.Content>
                  <Card.Actions>
                    <Button>Detayları Gör</Button>
                  </Card.Actions>
                </Card>
              ))}
            </ScrollView>
          </Surface>
          
          <Surface style={styles.surface}>
            <Title style={styles.sectionTitle}>Tüm Klinikler</Title>
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Klinik Adı</DataTable.Title>
                <DataTable.Title numeric>Teklifler</DataTable.Title>
                <DataTable.Title numeric>Ziyaretler</DataTable.Title>
                <DataTable.Title numeric>Ameliyatlar</DataTable.Title>
                <DataTable.Title numeric>Puan</DataTable.Title>
              </DataTable.Header>

              {clinicPerformance.map((clinic) => (
                <DataTable.Row key={clinic.id.toString()}>
                  <DataTable.Cell>{clinic.name}</DataTable.Cell>
                  <DataTable.Cell numeric>{clinic.proposalCount}</DataTable.Cell>
                  <DataTable.Cell numeric>{clinic.visitCount}</DataTable.Cell>
                  <DataTable.Cell numeric>{clinic.surgeryCount || 0}</DataTable.Cell>
                  <DataTable.Cell numeric>
                    <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                      {clinic.activityScore}
                    </Text>
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          </Surface>
        </View>
      )}
    </View>
  );

  // Ana bileşen render
  return (
    <SafeAreaWrapper>
      <Appbar.Header>
        <Appbar.Content title="Aktivite Analizi" />
      </Appbar.Header>
      
      <ScrollView style={styles.container}>
        <View style={styles.introContainer}>
          <Text style={styles.introText}>
            Bu sayfada çalışanlar ve klinikler bazında gerçekleşen tüm aktivitelerin (teklifler, ziyaretler, ameliyatlar) analizini görebilirsiniz. Haftalık, aylık veya yıllık performansları karşılaştırabilirsiniz.
          </Text>
        </View>
        
        <SegmentedButtons
          value={tabIndex === 0 ? "employees" : "clinics"}
          onValueChange={(value) => handleTabChange(value === "employees" ? 0 : 1)}
          style={styles.segmentedButton}
          buttons={[
            {
              value: 'employees',
              label: 'Çalışan Aktiviteleri',
              icon: 'account-group',
            },
            {
              value: 'clinics',
              label: 'Klinik Aktiviteleri',
              icon: 'hospital-building',
            },
          ]}
        />
        
        {tabIndex === 0 ? renderEmployeeTab() : renderClinicTab()}
        
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  introContainer: {
    padding: 16,
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'justify',
  },
  segmentedButton: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  tabContent: {
    padding: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 16,
    flexWrap: 'wrap',
  },
  filterRow: {
    flexDirection: 'column',
    marginVertical: 8,
  },
  filterItem: {
    marginBottom: 16,
    position: 'relative',
  },
  filterLabel: {
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    padding: 10,
    backgroundColor: 'white',
  },
  menu: {
    marginTop: 40,
  },
  searchBar: {
    elevation: 0,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchResults: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterTitle: {
    flex: 1,
    marginRight: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterChip: {
    marginHorizontal: 4,
    marginBottom: 4,
  },
  surface: {
    elevation: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    backgroundColor: 'white',
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  timeFilterContainer: {
    marginBottom: 16,
  },
  timeFilterButtons: {
    marginTop: 8,
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    alignItems: 'center',
    width: '48%',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  proposalStatusRow: {
    flexDirection: 'column',
    marginTop: 8,
  },
  proposalStatusItem: {
    marginBottom: 16,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    marginVertical: 8,
  },
  progressText: {
    textAlign: 'right',
    fontSize: 12,
    color: '#666',
  },
  visitCount: {
    alignSelf: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  topCard: {
    width: 220,
    marginRight: 12,
    marginBottom: 8,
    position: 'relative',
  },
  medalBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  cardTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  statsContainer: {
    marginTop: 8,
  },
  scoreText: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
  },
  noDataText: {
    textAlign: 'center',
    padding: 24,
    color: '#757575',
  },
});

export default ActivitiesPage; 