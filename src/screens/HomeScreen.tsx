import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Card, Avatar, useTheme, Button, ActivityIndicator } from 'react-native-paper';
import { SafeAreaWrapper } from '../components/SafeAreaWrapper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { User, Proposal, VisitReport, SurgeryReport, Clinic } from '../types';
import { getCurrentUser } from '../services/authService';
import { useNavigation } from '@react-navigation/native';

export const HomeScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({
    pendingProposals: 0,
    recentVisits: 0,
    recentSurgeries: 0,
    totalClinics: 0,
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  useEffect(() => {
    loadUserData();
    loadStats();
    loadRecentActivities();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Kullanıcı bilgileri alınamadı:', error);
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Bekleyen teklifler
      const { data: proposals, error: proposalsError } = await supabase
        .from('proposals')
        .select('id')
        .eq('status', 'pending')
        .limit(100);
      
      if (proposalsError) throw proposalsError;
      
      // Son 30 gündeki ziyaretler
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: visits, error: visitsError } = await supabase
        .from('visit_reports')
        .select('id')
        .gte('visit_date', thirtyDaysAgo.toISOString().split('T')[0])
        .limit(100);
        
      if (visitsError) throw visitsError;
      
      // Son 30 gündeki ameliyatlar
      const { data: surgeries, error: surgeriesError } = await supabase
        .from('surgery_reports')
        .select('id')
        .gte('operation_date', thirtyDaysAgo.toISOString().split('T')[0])
        .limit(100);
        
      if (surgeriesError) throw surgeriesError;
      
      // Toplam klinikler
      const { data: clinics, error: clinicsError } = await supabase
        .from('clinics')
        .select('id')
        .eq('status', 'active')
        .limit(100);
        
      if (clinicsError) throw clinicsError;
      
      setStats({
        pendingProposals: proposals?.length || 0,
        recentVisits: visits?.length || 0,
        recentSurgeries: surgeries?.length || 0,
        totalClinics: clinics?.length || 0,
      });
    } catch (error) {
      console.error('İstatistikler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivities = async () => {
    try {
      // Son aktiviteleri getir (teklifler, ziyaretler, ameliyatlar)
      const recentLimit = 5;
      
      // Son teklifler
      const { data: proposals, error: proposalsError } = await supabase
        .from('proposals')
        .select('id, title, created_at, status, clinic:clinics(name)')
        .order('created_at', { ascending: false })
        .limit(recentLimit);
        
      if (proposalsError) throw proposalsError;
      
      // Son ziyaretler
      const { data: visits, error: visitsError } = await supabase
        .from('visit_reports')
        .select('id, visit_date, created_at, clinic:clinics(name), purpose')
        .order('created_at', { ascending: false })
        .limit(recentLimit);
        
      if (visitsError) throw visitsError;
      
      // Son ameliyatlar
      const { data: surgeries, error: surgeriesError } = await supabase
        .from('surgery_reports')
        .select('id, title, operation_date, created_at, clinic:clinics(name)')
        .order('created_at', { ascending: false })
        .limit(recentLimit);
        
      if (surgeriesError) throw surgeriesError;
      
      // Tüm aktiviteleri birleştir, tarihlerine göre sırala
      const activities = [
        ...(proposals || []).map(p => ({ 
          ...p, 
          type: 'proposal',
          date: p.created_at,
          title: p.title,
          location: p.clinic?.name || 'Bilinmeyen Klinik'
        })),
        ...(visits || []).map(v => ({ 
          ...v, 
          type: 'visit',
          date: v.created_at,
          title: v.purpose,
          location: v.clinic?.name || 'Bilinmeyen Klinik'
        })),
        ...(surgeries || []).map(s => ({ 
          ...s, 
          type: 'surgery',
          date: s.created_at,
          title: s.title,
          location: s.clinic?.name || 'Bilinmeyen Klinik'
        }))
      ];
      
      // Tarihe göre sırala (en yeni en üstte)
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Sadece son 5 aktiviteyi al
      setRecentActivities(activities.slice(0, 5));
    } catch (error) {
      console.error('Son aktiviteler yüklenirken hata:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadUserData(),
      loadStats(),
      loadRecentActivities()
    ]);
    setRefreshing(false);
  };

  // Aktivite tipine göre simge seç
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'proposal':
        return <MaterialCommunityIcons name="file-document-outline" size={20} color={theme.colors.primary} />;
      case 'visit':
        return <MaterialCommunityIcons name="clipboard-text" size={20} color={theme.colors.secondary} />;
      case 'surgery':
        return <MaterialCommunityIcons name="medical-bag" size={20} color="#10B981" />;
      default:
        return <MaterialCommunityIcons name="information-outline" size={20} color={theme.colors.primary} />;
    }
  };

  // Aktivite tipine göre başlık
  const getActivityTypeTitle = (type: string) => {
    switch (type) {
      case 'proposal': return 'Teklif';
      case 'visit': return 'Ziyaret';
      case 'surgery': return 'Ameliyat';
      default: return 'Aktivite';
    }
  };

  // İlgili detay sayfasına yönlendirme
  const navigateToDetail = (item: any) => {
    if (item.type === 'proposal') {
      // @ts-ignore
      navigation.navigate('ProposalDetail', { id: item.id });
    } else if (item.type === 'visit') {
      // @ts-ignore
      navigation.navigate('VisitReportDetail', { id: item.id });
    } else if (item.type === 'surgery') {
      // @ts-ignore
      navigation.navigate('SurgeryReportDetail', { reportId: item.id });
    }
  };

  if (loading) {
    return (
      <SafeAreaWrapper>
        <View style={[styles.container, styles.loadingContainer]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{marginTop: 10}}>Yükleniyor...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Karşılama */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Hoş Geldin,</Text>
          <Text style={styles.nameText}>{user?.name || 'Kullanıcı'}</Text>
        </View>
        
        {/* İstatistikler */}
        <View style={styles.statsContainer}>
          <Card style={[styles.statsCard, { backgroundColor: theme.colors.primaryContainer }]}>
            <Card.Content style={styles.statsCardContent}>
              <MaterialCommunityIcons name="file-document-outline" size={28} color={theme.colors.primary} />
              <View style={styles.statsTextContainer}>
                <Text style={styles.statValue}>{stats.pendingProposals}</Text>
                <Text style={styles.statLabel}>Bekleyen Teklif</Text>
              </View>
            </Card.Content>
          </Card>
          
          <Card style={[styles.statsCard, { backgroundColor: theme.colors.secondaryContainer }]}>
            <Card.Content style={styles.statsCardContent}>
              <MaterialCommunityIcons name="clipboard-text" size={28} color={theme.colors.secondary} />
              <View style={styles.statsTextContainer}>
                <Text style={styles.statValue}>{stats.recentVisits}</Text>
                <Text style={styles.statLabel}>Ziyaret (30 gün)</Text>
              </View>
            </Card.Content>
          </Card>
          
          <Card style={[styles.statsCard, { backgroundColor: '#D1FAE5' }]}>
            <Card.Content style={styles.statsCardContent}>
              <MaterialCommunityIcons name="medical-bag" size={28} color="#10B981" />
              <View style={styles.statsTextContainer}>
                <Text style={styles.statValue}>{stats.recentSurgeries}</Text>
                <Text style={styles.statLabel}>Ameliyat (30 gün)</Text>
              </View>
            </Card.Content>
          </Card>
          
          <Card style={[styles.statsCard, { backgroundColor: '#FEF3C7' }]}>
            <Card.Content style={styles.statsCardContent}>
              <MaterialCommunityIcons name="hospital-building" size={28} color="#D97706" />
              <View style={styles.statsTextContainer}>
                <Text style={styles.statValue}>{stats.totalClinics}</Text>
                <Text style={styles.statLabel}>Aktif Klinik</Text>
              </View>
            </Card.Content>
          </Card>
        </View>
        
        {/* Hızlı işlemler */}
        <Card style={styles.actionsCard}>
          <Card.Title title="Hızlı İşlemler" />
          <Card.Content style={styles.actionsContainer}>
            <TouchableOpacity 
              style={styles.actionButton}
              // @ts-ignore
              onPress={() => navigation.navigate('CreateProposal')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                <MaterialCommunityIcons name="file-plus-outline" size={24} color={theme.colors.primary} />
              </View>
              <Text style={styles.actionText}>Yeni Teklif</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              // @ts-ignore
              onPress={() => navigation.navigate('CreateVisitReport')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: theme.colors.secondaryContainer }]}>
                <MaterialCommunityIcons name="clipboard-plus-outline" size={24} color={theme.colors.secondary} />
              </View>
              <Text style={styles.actionText}>Ziyaret Raporu</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              // @ts-ignore
              onPress={() => navigation.navigate('CreateSurgeryReport')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#D1FAE5' }]}>
                <MaterialCommunityIcons name="medical-bag" size={24} color="#10B981" />
              </View>
              <Text style={styles.actionText}>Ameliyat Raporu</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              // @ts-ignore
              onPress={() => navigation.navigate('Clinics')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#FEF3C7' }]}>
                <MaterialCommunityIcons name="hospital-building" size={24} color="#D97706" />
              </View>
              <Text style={styles.actionText}>Klinikler</Text>
            </TouchableOpacity>
          </Card.Content>
        </Card>
        
        {/* Son Aktiviteler */}
        <Card style={styles.recentActivitiesCard}>
          <Card.Title title="Son Aktiviteler" />
          <Card.Content>
            {recentActivities.length > 0 ? (
              recentActivities.map((item, index) => (
                <TouchableOpacity 
                  key={`${item.type}-${item.id}`}
                  style={[
                    styles.activityItem,
                    index !== recentActivities.length - 1 && styles.activityItemBorder
                  ]}
                  onPress={() => navigateToDetail(item)}
                >
                  <View style={styles.activityIconContainer}>
                    {getActivityIcon(item.type)}
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>{item.title}</Text>
                    <Text style={styles.activitySubtitle}>{item.location}</Text>
                    <View style={styles.activityMeta}>
                      <Text style={styles.activityType}>{getActivityTypeTitle(item.type)}</Text>
                      <Text style={styles.activityDate}>
                        {new Date(item.date).toLocaleDateString('tr-TR')}
                      </Text>
                    </View>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noActivitiesText}>Henüz aktivite bulunmuyor</Text>
            )}
            
            <Button 
              mode="outlined" 
              style={styles.viewAllButton}
              // @ts-ignore
              onPress={() => navigation.navigate('ActivityFeed')}
            >
              Tümünü Görüntüle
            </Button>
          </Card.Content>
        </Card>
        
        {/* Alt boşluk */}
        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeSection: {
    padding: 16,
    paddingTop: 24,
  },
  welcomeText: {
    fontSize: 16,
    color: '#64748B',
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 0,
  },
  statsCard: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 12,
    elevation: 1,
  },
  statsCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  statsTextContainer: {
    marginLeft: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  actionsCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  actionIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 13,
    textAlign: 'center',
    color: '#1F2937',
  },
  recentActivitiesCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  activityItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  activitySubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  activityMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  activityType: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '500',
  },
  activityDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  noActivitiesText: {
    textAlign: 'center',
    padding: 16,
    color: '#64748B',
  },
  viewAllButton: {
    marginTop: 16,
    borderRadius: 8,
  },
  bottomSpace: {
    height: 50,
  },
});