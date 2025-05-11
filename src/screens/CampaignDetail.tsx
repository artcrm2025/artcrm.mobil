import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert, FlatList } from 'react-native';
import { Text, Card, Button, Divider, ActivityIndicator, useTheme, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { format, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';
import { SafeAreaWrapper } from '../components/SafeAreaWrapper';
import { RootStackNavigationProp } from '../types/navigation';

type CampaignDetailRouteProp = {
  params: {
    campaignId: number;
  };
  key: string;
  name: string;
  path?: string;
};

const CampaignDetail = () => {
  const navigation = useNavigation<RootStackNavigationProp<'CampaignDetail'>>();
  const route = useRoute<CampaignDetailRouteProp>();
  const theme = useTheme();
  const { campaignId } = route.params;
  const [campaign, setCampaign] = useState<any>(null);
  const [campaignItems, setCampaignItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [regions, setRegions] = useState<any[]>([]);

  useEffect(() => {
    fetchCampaignData();
    fetchRegions();
  }, [campaignId]);

  const fetchCampaignData = async () => {
    try {
      setLoading(true);
      
      // Kampanya verisini getir
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();
      
      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      // Kampanya öğelerini getir
      const { data: itemsData, error: itemsError } = await supabase
        .from('campaign_items')
        .select(`
          *,
          products:product_id (id, name, price, currency, category)
        `)
        .eq('campaign_id', campaignId);
      
      if (itemsError) throw itemsError;
      setCampaignItems(itemsData || []);
      
    } catch (error) {
      console.error('Kampanya verisi alınamadı:', error);
      Alert.alert('Hata', 'Kampanya detayları yüklenemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRegions = async () => {
    try {
      const { data, error } = await supabase
        .from('regions')
        .select('*');
      
      if (error) throw error;
      setRegions(data || []);
    } catch (error) {
      console.error('Bölge verisi alınamadı:', error);
    }
  };

  const getRegionNames = (regionIds: string) => {
    if (!regions.length || !regionIds) return 'Belirtilmemiş';
    
    // "all" kontrolü
    if (regionIds === 'all') return 'Tüm Bölgeler';
    
    try {
      // String'i JSON array'e dönüştür
      const ids = JSON.parse(regionIds);
      if (!Array.isArray(ids) || ids.length === 0) return 'Belirtilmemiş';
      
      // Bölge isimlerini al
      const regionNames = ids.map(id => {
        const region = regions.find(r => r.id === id);
        return region ? region.name : `Bölge ${id}`;
      });
      
      return regionNames.join(', ');
    } catch (e) {
      console.error('Bölge bilgisi parse edilemedi:', e);
      return 'Belirtilmemiş';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Belirtilmemiş';
    const date = new Date(dateString);
    if (!isValid(date)) return 'Geçersiz Tarih';
    return format(date, 'dd.MM.yyyy', { locale: tr });
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Aktif';
      case 'inactive': return 'Pasif';
      case 'completed': return 'Tamamlandı';
      case 'cancelled': return 'İptal Edildi';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return theme.colors.primary;
      case 'inactive': return '#9CA3AF';
      case 'completed': return '#10B981';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const handleEdit = () => {
    navigation.navigate('EditCampaign', { campaignId });
  };

  const handleDelete = async () => {
    Alert.alert(
      'Kampanya Silme',
      'Bu kampanyayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Önce kampanya öğelerini sil
              const { error: itemsError } = await supabase
                .from('campaign_items')
                .delete()
                .eq('campaign_id', campaignId);
              
              if (itemsError) throw itemsError;
              
              // Sonra kampanyayı sil
              const { error: campaignError } = await supabase
                .from('campaigns')
                .delete()
                .eq('id', campaignId);
              
              if (campaignError) throw campaignError;
              
              Alert.alert('Başarılı', 'Kampanya başarıyla silindi.');
              navigation.goBack();
            } catch (error) {
              console.error('Kampanya silinemedi:', error);
              Alert.alert('Hata', 'Kampanya silinemedi. Lütfen tekrar deneyin.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Kampanya detayları yükleniyor...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  if (!campaign) {
    return (
      <SafeAreaWrapper>
        <View style={styles.container}>
          <Text style={styles.errorText}>Kampanya bulunamadı.</Text>
          <Button mode="contained" onPress={() => navigation.goBack()} style={styles.backButton}>
            Geri Dön
          </Button>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <ScrollView style={styles.container}>
        <Card style={styles.headerCard}>
          <Card.Content>
            <Text style={styles.campaignName}>{campaign.name}</Text>
            <View style={styles.statusContainer}>
              <Chip 
                mode="outlined" 
                style={[styles.statusChip, { borderColor: getStatusColor(campaign.status) }]}
                textStyle={{ color: getStatusColor(campaign.status) }}
              >
                {getStatusText(campaign.status)}
              </Chip>
            </View>
            
            <Text style={styles.description}>{campaign.description}</Text>
            
            <Divider style={styles.divider} />
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Başlangıç Tarihi:</Text>
              <Text style={styles.detailValue}>{formatDate(campaign.start_date)}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Bitiş Tarihi:</Text>
              <Text style={styles.detailValue}>{formatDate(campaign.end_date)}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>İndirim Oranı:</Text>
              <Text style={styles.detailValue}>%{parseFloat(campaign.discount_percentage).toFixed(2)}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Bölgeler:</Text>
              <Text style={styles.detailValue}>{getRegionNames(campaign.regions)}</Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.itemsCard}>
          <Card.Title title="Kampanya Ürünleri" />
          <Card.Content>
            {campaignItems.length > 0 ? (
              campaignItems.map((item, index) => (
                <View key={item.id} style={styles.itemContainer}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName}>
                      {item.products?.name || 'Bilinmeyen Ürün'}
                    </Text>
                    {item.excess && (
                      <Chip mode="outlined" style={styles.excessChip}>
                        %{item.excess_percentage} Mal Fazlası
                      </Chip>
                    )}
                  </View>
                  
                  <View style={styles.itemDetails}>
                    <View style={styles.itemDetail}>
                      <Text style={styles.itemDetailLabel}>Miktar:</Text>
                      <Text style={styles.itemDetailValue}>{item.quantity}</Text>
                    </View>
                    
                    <View style={styles.itemDetail}>
                      <Text style={styles.itemDetailLabel}>Birim Fiyat:</Text>
                      <Text style={styles.itemDetailValue}>
                        {item.unit_price} {item.products?.currency || 'TRY'}
                      </Text>
                    </View>
                    
                    <View style={styles.itemDetail}>
                      <Text style={styles.itemDetailLabel}>Toplam:</Text>
                      <Text style={styles.itemDetailValue}>
                        {item.total_price} {item.products?.currency || 'TRY'}
                      </Text>
                    </View>
                  </View>
                  
                  {index < campaignItems.length - 1 && <Divider style={styles.itemDivider} />}
                </View>
              ))
            ) : (
              <Text style={styles.noItemsText}>Bu kampanyada ürün bulunmuyor.</Text>
            )}
          </Card.Content>
        </Card>

        <View style={styles.actionsContainer}>
          <Button 
            mode="contained" 
            onPress={handleEdit}
            style={[styles.actionButton, styles.editButton]}
            icon="pencil"
          >
            Düzenle
          </Button>
          
          <Button 
            mode="outlined" 
            onPress={handleDelete}
            style={[styles.actionButton, styles.deleteButton]}
            textColor="#EF4444"
            icon="delete"
          >
            Sil
          </Button>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f7fa',
  },
  headerCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  campaignName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statusChip: {
    height: 30,
  },
  description: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  itemsCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  itemContainer: {
    marginBottom: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  excessChip: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  itemDetails: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  itemDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  itemDetailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  itemDivider: {
    marginVertical: 16,
  },
  noItemsText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginVertical: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  editButton: {
    backgroundColor: '#3B82F6',
  },
  deleteButton: {
    borderColor: '#EF4444',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    textAlign: 'center',
    marginVertical: 24,
  },
  backButton: {
    marginTop: 16,
    alignSelf: 'center',
  },
});

export default CampaignDetail; 