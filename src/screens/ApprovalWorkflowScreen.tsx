import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, Title, Paragraph, Button, Avatar, Divider, List, Chip, useTheme, IconButton, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../services/authService';
import { User, UserRole, Proposal } from '../types';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type ApprovalWorkflowScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ApprovalWorkflowScreen'>;

interface ExtendedProposal extends Omit<Proposal, 'clinics' | 'users' | 'regions'> {
  clinics?: {
    name: string;
    region_id: number;
  };
  users?: {
    name: string;
    role: UserRole;
  };
  regions?: {
    name: string;
  };
}

interface ApprovalStep {
  role: UserRole;
  name: string;
  description: string;
  order: number;
  isActive: boolean;
  iconName: string;
  color: string;
}

const ApprovalWorkflowScreen = () => {
  const navigation = useNavigation<ApprovalWorkflowScreenNavigationProp>();
  const theme = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingProposals, setPendingProposals] = useState<ExtendedProposal[]>([]);
  const [completedProposals, setCompletedProposals] = useState<ExtendedProposal[]>([]);
  const [expandedProposal, setExpandedProposal] = useState<number | null>(null);
  const [approvalWorkflow, setApprovalWorkflow] = useState<ApprovalStep[]>([
    {
      role: 'field_user',
      name: 'Oluşturma',
      description: 'Saha kullanıcısı teklifi oluşturur',
      order: 1,
      isActive: true,
      iconName: 'create-outline',
      color: '#4CAF50'
    },
    {
      role: 'regional_manager',
      name: 'Bölge Onayı',
      description: 'Bölge müdürü teklifi inceler',
      order: 2,
      isActive: true,
      iconName: 'checkbox-outline',
      color: '#2196F3'
    },
    {
      role: 'manager',
      name: 'Yönetim Onayı',
      description: 'Yönetim teklifi onaylar',
      order: 3,
      isActive: false,
      iconName: 'shield-checkmark-outline',
      color: '#9C27B0'
    }
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      if (currentUser) {
        await fetchProposals(currentUser);
      }
    } catch (error) {
      console.error('Approval workflow data loading error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProposals = async (currentUser: User) => {
    try {
      // Temel sorgu oluşturma
      let proposalsQuery = supabase.from('proposals')
        .select('*, clinics(*), users(*), regions(*)');
      
      // Rol tabanlı erişim kontrolü
      if (currentUser.role === 'regional_manager') {
        // Bölge müdürleri yalnızca kendi bölgelerindeki kliniklerin tekliflerini görüntüler
        proposalsQuery = proposalsQuery.eq('clinics.region_id', currentUser.region_id);
      } else if (currentUser.role === 'field_user') {
        // Saha kullanıcıları yalnızca kendi tekliflerini görüntüler
        proposalsQuery = proposalsQuery.eq('user_id', currentUser.id);
      }
      
      // Bekleyen teklifler
      const { data: pendingData } = await proposalsQuery
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      // Tamamlanan teklifler (onaylanan veya reddedilen)
      const { data: completedData } = await proposalsQuery
        .or('status.eq.approved,status.eq.rejected')
        .order('created_at', { ascending: false })
        .limit(10); // Son 10 tamamlanan teklif
      
      if (pendingData) {
        setPendingProposals(pendingData as ExtendedProposal[]);
      }
      
      if (completedData) {
        setCompletedProposals(completedData as ExtendedProposal[]);
      }
      
      // Kullanıcı rolüne göre iş akışı adımlarını ayarla
      let updatedWorkflow = [...approvalWorkflow];
      
      if (currentUser.role === 'admin' || currentUser.role === 'manager') {
        // Yöneticiler ve yöneticiler için 3 adımlı iş akışı
        updatedWorkflow[2].isActive = true;
      }
      
      setApprovalWorkflow(updatedWorkflow);
      
    } catch (error) {
      console.error('Teklif verileri çekme hatası:', error);
    }
  };

  const handleProposalAction = async (proposalId: number, action: 'approve' | 'reject') => {
    if (!user) return;
    
    try {
      const status = action === 'approve' ? 'approved' : 'rejected';
      const actionField = action === 'approve' ? 'approved_by' : 'rejected_by';
      const dateField = action === 'approve' ? 'approved_at' : 'rejected_at';
      
      const { error } = await supabase
        .from('proposals')
        .update({ 
          status, 
          [actionField]: user.id,
          [dateField]: new Date().toISOString()
        })
        .eq('id', proposalId);
      
      if (error) {
        Alert.alert('Hata', 'Teklif durumu güncellenirken bir hata oluştu.');
        console.error('Teklif güncelleme hatası:', error);
        return;
      }
      
      // Başarılı güncelleme sonrası verileri yeniden yükle
      await loadData();
      
      Alert.alert(
        'Başarılı', 
        `Teklif başarıyla ${action === 'approve' ? 'onaylandı' : 'reddedildi'}.`
      );
    } catch (error) {
      console.error('Teklif işleme hatası:', error);
      Alert.alert('Hata', 'İşlem sırasında bir sorun oluştu.');
    }
  };

  const toggleExpand = (proposalId: number) => {
    setExpandedProposal(expandedProposal === proposalId ? null : proposalId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'approved': return '#4CAF50';
      case 'rejected': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Beklemede';
      case 'approved': return 'Onaylandı';
      case 'rejected': return 'Reddedildi';
      default: return status;
    }
  };

  const renderProposalItem = (proposal: ExtendedProposal, canApprove: boolean) => {
    const isExpanded = expandedProposal === proposal.id;
    
    return (
      <Card key={proposal.id} style={styles.proposalCard}>
        <TouchableOpacity onPress={() => toggleExpand(proposal.id)}>
          <Card.Content>
            <View style={styles.proposalHeader}>
              <View style={styles.proposalInfo}>
                <Text style={styles.proposalId}>Teklif #{proposal.id}</Text>
                <Text style={styles.proposalDate}>
                  {new Date(proposal.created_at).toLocaleString('tr-TR')}
                </Text>
              </View>
              <Chip 
                style={[styles.statusChip, { backgroundColor: getStatusColor(proposal.status) + '20' }]}
                textStyle={{ color: getStatusColor(proposal.status) }}
              >
                {getStatusText(proposal.status)}
              </Chip>
            </View>
            
            <View style={styles.proposalDetails}>
              <Text style={styles.clinicName}>
                {proposal.clinics?.name || 'Klinik bilgisi yok'}
              </Text>
              <Text style={styles.proposalAmount}>
                {proposal.total_amount?.toLocaleString('tr-TR')} {proposal.currency || 'TL'}
              </Text>
            </View>
            
            <View style={styles.userInfo}>
              <Avatar.Icon 
                size={24} 
                icon="account" 
                style={styles.userAvatar} 
                color="#FFF" 
              />
              <Text style={styles.userName}>
                {proposal.users?.name || 'Kullanıcı bilgisi yok'}
              </Text>
            </View>
            
            {isExpanded && (
              <View style={styles.expandedContent}>
                <Divider style={styles.divider} />
                
                {proposal.notes && (
                  <View style={styles.notesSection}>
                    <Text style={styles.notesLabel}>Notlar:</Text>
                    <Text style={styles.notesText}>{proposal.notes}</Text>
                  </View>
                )}
                
                <View style={styles.detailsSection}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>İndirim:</Text>
                    <Text style={styles.detailValue}>%{proposal.discount || 0}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Bölge:</Text>
                    <Text style={styles.detailValue}>
                      {proposal.regions?.name || 'Belirtilmemiş'}
                    </Text>
                  </View>
                  
                  {proposal.status !== 'pending' && (
                    <>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>
                          {proposal.status === 'approved' ? 'Onaylayan:' : 'Reddeden:'}
                        </Text>
                        <Text style={styles.detailValue}>
                          {proposal.approved_by || proposal.rejected_by || 'Belirtilmemiş'}
                        </Text>
                      </View>
                      
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>
                          {proposal.status === 'approved' ? 'Onay Tarihi:' : 'Red Tarihi:'}
                        </Text>
                        <Text style={styles.detailValue}>
                          {proposal.approved_at || proposal.rejected_at 
                            ? new Date(proposal.approved_at || proposal.rejected_at || '').toLocaleString('tr-TR')
                            : 'Belirtilmemiş'
                          }
                        </Text>
                      </View>
                    </>
                  )}
                </View>
                
                {canApprove && proposal.status === 'pending' && (
                  <View style={styles.actionButtons}>
                    <Button 
                      mode="contained" 
                      buttonColor="#4CAF50"
                      style={styles.approveButton}
                      onPress={() => handleProposalAction(proposal.id, 'approve')}
                    >
                      Onayla
                    </Button>
                    
                    <Button 
                      mode="contained"
                      buttonColor="#F44336"
                      style={styles.rejectButton}
                      onPress={() => handleProposalAction(proposal.id, 'reject')}
                    >
                      Reddet
                    </Button>
                  </View>
                )}
                
                <Button 
                  mode="outlined"
                  onPress={() => navigation.navigate('ProposalDetail', { id: proposal.id })}
                  style={styles.viewDetailsButton}
                >
                  Detayları Görüntüle
                </Button>
              </View>
            )}
          </Card.Content>
        </TouchableOpacity>
      </Card>
    );
  };

  const canApproveProposals = () => {
    if (!user) return false;
    
    // Admin ve yöneticiler her zaman onaylayabilir
    if (user.role === 'admin' || user.role === 'manager') {
      return true;
    }
    
    // Bölge müdürleri kendi bölgelerindeki teklifleri onaylayabilir
    if (user.role === 'regional_manager') {
      return true;
    }
    
    return false;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
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
          <Text style={styles.headerTitle}>Onay İş Akışı</Text>
          <Text style={styles.headerSubtitle}>
            Teklif onay sürecini yönetin ve izleyin
          </Text>
        </LinearGradient>
      </View>
      
      <View style={styles.workflowContainer}>
        <Text style={styles.sectionTitle}>Onay Süreci</Text>
        <View style={styles.stepsContainer}>
          {approvalWorkflow.map((step, index) => (
            <View key={step.order} style={styles.stepItem}>
              <View style={[
                styles.stepIconContainer, 
                { backgroundColor: step.isActive ? step.color : '#9E9E9E' }
              ]}>
                <Ionicons 
                  name={step.iconName as any} 
                  size={20} 
                  color="white" 
                />
              </View>
              
              <Text style={styles.stepName}>{step.name}</Text>
              <Text style={styles.stepDescription}>{step.description}</Text>
              
              {index < approvalWorkflow.length - 1 && (
                <View style={styles.connector} />
              )}
            </View>
          ))}
        </View>
        
        {user?.role === 'admin' && (
          <Button 
            mode="outlined"
            icon="cog"
            onPress={() => {}}
            style={styles.configButton}
          >
            İş Akışını Yapılandır
          </Button>
        )}
      </View>
      
      <View style={styles.pendingContainer}>
        <Text style={styles.sectionTitle}>Bekleyen Teklifler</Text>
        {pendingProposals.length > 0 ? (
          pendingProposals.map(proposal => 
            renderProposalItem(proposal, canApproveProposals())
          )
        ) : (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>Bekleyen teklif bulunmamaktadır.</Text>
            </Card.Content>
          </Card>
        )}
      </View>
      
      <View style={styles.completedContainer}>
        <Text style={styles.sectionTitle}>Son İşlenen Teklifler</Text>
        {completedProposals.length > 0 ? (
          completedProposals.map(proposal => 
            renderProposalItem(proposal, false)
          )
        ) : (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>Tamamlanan teklif bulunmamaktadır.</Text>
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
  workflowContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 16,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepName: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  connector: {
    position: 'absolute',
    top: 20,
    right: '50%',
    left: '100%',
    height: 2,
    backgroundColor: '#e0e0e0',
  },
  configButton: {
    marginTop: 16,
  },
  pendingContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  completedContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  proposalCard: {
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4e54c8',
  },
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  proposalInfo: {
    flex: 1,
  },
  proposalId: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  proposalDate: {
    fontSize: 12,
    color: '#666',
  },
  statusChip: {
    height: 28,
  },
  proposalDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clinicName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  proposalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    backgroundColor: '#4e54c8',
    marginRight: 8,
  },
  userName: {
    fontSize: 12,
    color: '#555',
  },
  expandedContent: {
    marginTop: 12,
  },
  divider: {
    marginBottom: 12,
  },
  notesSection: {
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
  },
  detailsSection: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  approveButton: {
    flex: 1,
    marginRight: 8,
  },
  rejectButton: {
    flex: 1,
    marginLeft: 8,
  },
  viewDetailsButton: {
    marginBottom: 8,
  },
  emptyCard: {
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
  footer: {
    height: 20,
  },
});

export default ApprovalWorkflowScreen;