import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { Appbar, Text, Divider, ActivityIndicator, useTheme, Chip, Badge, Menu, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../services/authService';
import { User } from '../types';

// Bildirim tipi tanımı
type NotificationType = 'proposal' | 'surgery' | 'visit' | 'system' | 'approval';

// Bildirim veri modeli
interface Notification {
  id: number;
  title: string;
  body: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
  related_id?: number;
  related_type?: string;
}

export const NotificationsScreen = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all');
  const [showMenu, setShowMenu] = useState(false);
  
  // Demo bildirimler - gerçek uygulamada veritabanından gelecek
  const demoNotifications: Notification[] = [
    {
      id: 1,
      title: 'Yeni Teklif Onaylandı',
      body: 'Özel Akdeniz Hastanesi için oluşturduğunuz teklif onaylandı.',
      type: 'approval',
      is_read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 dakika önce
      related_id: 123,
      related_type: 'proposal'
    },
    {
      id: 2,
      title: 'Ameliyat Raporu Hatırlatması',
      body: 'Bugün gerçekleştirilen ameliyatın raporunu doldurmayı unutmayın.',
      type: 'surgery',
      is_read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 saat önce
      related_id: 45,
      related_type: 'surgery'
    },
    {
      id: 3,
      title: 'Sistem Bakımı',
      body: 'Sistem bakımı nedeniyle yarın saat 03:00-05:00 arasında hizmet verilmeyecektir.',
      type: 'system',
      is_read: true,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // 1 gün önce
    },
    {
      id: 4,
      title: 'Ziyaret Planı Oluşturuldu',
      body: 'Önümüzdeki hafta için 3 ziyaret planı oluşturuldu.',
      type: 'visit',
      is_read: true,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() // 2 gün önce
    },
    {
      id: 5,
      title: 'Yeni Teklif Reddedildi',
      body: 'Marmara Üniversitesi Hastanesi için oluşturduğunuz teklif reddedildi.',
      type: 'approval',
      is_read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 saat önce
      related_id: 124,
      related_type: 'proposal'
    },
    {
      id: 6,
      title: 'Yeni Ürün Eklendi',
      body: 'Ürün kataloğuna yeni implant modelleri eklenmiştir.',
      type: 'system',
      is_read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 saat önce
    },
    {
      id: 7,
      title: 'Ameliyat Takvimi Güncellendi',
      body: 'Önümüzdeki haftaya ait ameliyat takvimi güncellenmiştir.',
      type: 'surgery',
      is_read: true,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(), // 1.5 gün önce
    }
  ];
  
  useEffect(() => {
    loadData();
  }, []);
  
  useEffect(() => {
    applyFilters();
  }, [filterType, notifications]);
  
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Kullanıcı bilgilerini al
      const user = await getCurrentUser();
      setCurrentUser(user);
      
      // Gerçek uygulamada burada kullanıcının bildirimlerini alacağız
      // Şu an için demo verileri kullanıyoruz
      setNotifications(demoNotifications);
      
    } catch (error) {
      console.error('Bildirimler yüklenirken hata:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const applyFilters = () => {
    if (filterType === 'all') {
      setFilteredNotifications(notifications);
    } else {
      setFilteredNotifications(notifications.filter(notif => notif.type === filterType));
    }
  };
  
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);
  
  const markAllAsRead = () => {
    // Tüm bildirimleri okundu olarak işaretle
    const updatedNotifications = notifications.map(notif => ({
      ...notif,
      is_read: true
    }));
    
    setNotifications(updatedNotifications);
    setShowMenu(false);
  };
  
  const clearAllNotifications = () => {
    Alert.alert(
      'Bildirimleri Temizle',
      'Tüm bildirimleri silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Temizle', 
          onPress: () => {
            setNotifications([]);
            setShowMenu(false);
          },
          style: 'destructive' 
        }
      ]
    );
  };
  
  const markAsRead = (id: number) => {
    // İlgili bildirimi okundu olarak işaretle
    const updatedNotifications = notifications.map(notif => 
      notif.id === id ? { ...notif, is_read: true } : notif
    );
    
    setNotifications(updatedNotifications);
  };
  
  const handleNotificationPress = (notification: Notification) => {
    // Bildirimi okundu olarak işaretle
    markAsRead(notification.id);
    
    // İlgili ekrana yönlendir
    if (notification.related_type === 'proposal' && notification.related_id) {
      navigation.navigate('ProposalDetail', { id: notification.related_id });
    } else if (notification.type === 'surgery') {
      navigation.navigate('SurgeryReports');
    } else if (notification.type === 'visit') {
      navigation.navigate('VisitReports');
    }
  };
  
  const getNotificationIcon = (type: NotificationType): string => {
    switch (type) {
      case 'proposal': return 'file-document-outline';
      case 'surgery': return 'medical-bag';
      case 'visit': return 'clipboard-text-outline';
      case 'system': return 'information-outline';
      case 'approval': return 'check-circle-outline';
      default: return 'bell-outline';
    }
  };
  
  const getNotificationColor = (type: NotificationType): string => {
    switch (type) {
      case 'proposal': return '#6366F1'; // Indigo
      case 'surgery': return '#EF4444'; // Kırmızı
      case 'visit': return '#10B981'; // Yeşil
      case 'system': return '#F59E0B'; // Turuncu
      case 'approval': return '#8B5CF6'; // Mor
      default: return '#6B7280'; // Gri
    }
  };
  
  const getNotificationTypeText = (type: NotificationType): string => {
    switch (type) {
      case 'proposal': return 'Teklif';
      case 'surgery': return 'Ameliyat';
      case 'visit': return 'Ziyaret';
      case 'system': return 'Sistem';
      case 'approval': return 'Onay';
      default: return 'Bildirim';
    }
  };
  
  const formatTime = (dateString: string): string => {
    const now = new Date();
    const notifDate = new Date(dateString);
    const diffMs = now.getTime() - notifDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) {
      return `${diffMins} dakika önce`;
    }
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours} saat önce`;
    }
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) {
      return `${diffDays} gün önce`;
    }
    
    return notifDate.toLocaleDateString('tr-TR');
  };
  
  const getUnreadCount = (): number => {
    return notifications.filter(n => !n.is_read).length;
  };
  
  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        { backgroundColor: item.is_read ? 'white' : '#F9FAFE' }
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationContent}>
        <View 
          style={[
            styles.notificationIcon, 
            { backgroundColor: `${getNotificationColor(item.type)}15` }
          ]}
        >
          <MaterialCommunityIcons 
            name={getNotificationIcon(item.type) as any} 
            size={20} 
            color={getNotificationColor(item.type)} 
          />
        </View>
        
        <View style={styles.notificationTextContainer}>
          <View style={styles.notificationHeader}>
            <Text 
              style={[
                styles.notificationTitle,
                { fontWeight: item.is_read ? 'normal' : 'bold' }
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={styles.notificationTime}>{formatTime(item.created_at)}</Text>
          </View>
          
          <Text style={styles.notificationBody} numberOfLines={2}>
            {item.body}
          </Text>
          
          <View style={styles.notificationFooter}>
            <Chip 
              style={{ backgroundColor: `${getNotificationColor(item.type)}10` }}
              textStyle={{ color: getNotificationColor(item.type), fontSize: 12 }}
              compact
            >
              {getNotificationTypeText(item.type)}
            </Chip>
          </View>
        </View>
        
        {!item.is_read && (
          <View style={styles.unreadIndicator} />
        )}
      </View>
    </TouchableOpacity>
  );
  
  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Bildirimler" />
        <Menu
          visible={showMenu}
          onDismiss={() => setShowMenu(false)}
          anchor={
            <Appbar.Action 
              icon="dots-vertical" 
              onPress={() => setShowMenu(true)} 
            />
          }
        >
          <Menu.Item 
            onPress={markAllAsRead} 
            title="Tümünü Okundu İşaretle"
            leadingIcon="check-all"
          />
          <Menu.Item 
            onPress={clearAllNotifications} 
            title="Bildirimleri Temizle"
            leadingIcon="delete-sweep-outline"
          />
        </Menu>
      </Appbar.Header>
      
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip
            selected={filterType === 'all'}
            onPress={() => setFilterType('all')}
            style={styles.filterChip}
          >
            Tümü
            {getUnreadCount() > 0 && (
              <Badge style={styles.badge} size={16}>{getUnreadCount()}</Badge>
            )}
          </Chip>
          
          <Chip
            selected={filterType === 'proposal'}
            onPress={() => setFilterType('proposal')}
            style={styles.filterChip}
          >
            Teklifler
          </Chip>
          
          <Chip
            selected={filterType === 'surgery'}
            onPress={() => setFilterType('surgery')}
            style={styles.filterChip}
          >
            Ameliyatlar
          </Chip>
          
          <Chip
            selected={filterType === 'visit'}
            onPress={() => setFilterType('visit')}
            style={styles.filterChip}
          >
            Ziyaretler
          </Chip>
          
          <Chip
            selected={filterType === 'system'}
            onPress={() => setFilterType('system')}
            style={styles.filterChip}
          >
            Sistem
          </Chip>
          
          <Chip
            selected={filterType === 'approval'}
            onPress={() => setFilterType('approval')}
            style={styles.filterChip}
          >
            Onaylar
          </Chip>
        </ScrollView>
      </View>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Bildirimler yükleniyor...</Text>
        </View>
      ) : filteredNotifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="bell-off-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Bildirim Yok</Text>
          <Text style={styles.emptyText}>
            {filterType === 'all' 
              ? 'Henüz bildiriminiz bulunmuyor.' 
              : `${getNotificationTypeText(filterType as NotificationType)} kategorisinde bildirim bulunmuyor.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotificationItem}
          keyExtractor={item => item.id.toString()}
          ItemSeparatorComponent={() => <Divider />}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
};

import { ScrollView } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  filterContainer: {
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterChip: {
    marginRight: 8,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  listContainer: {
    flexGrow: 1,
  },
  notificationItem: {
    padding: 16,
  },
  notificationContent: {
    flexDirection: 'row',
    position: 'relative',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  notificationBody: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
  },
  notificationFooter: {
    flexDirection: 'row',
  },
  unreadIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6366F1',
    position: 'absolute',
    top: 0,
    right: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4B5563',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
}); 