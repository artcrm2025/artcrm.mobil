import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import { Text, Card, Avatar, Button, Divider, TextInput, Dialog, Portal, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCurrentUser, signOut, resetPassword } from '../services/authService';
import { supabase } from '../lib/supabase';
import { User, Region } from '../types';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaWrapper, SafeContentContainer } from '../components/SafeAreaWrapper';

// Navigasyon parametrelerini tanımla
type RootStackParamList = {
  Settings: undefined;
  HelpSupport: undefined;
  Profile: undefined;
  // Diğer rotaları da burada tanımlayabilirsiniz
};

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ProfileScreen = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRegion, setUserRegion] = useState<Region | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPasswordResetDialog, setShowPasswordResetDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editedName, setEditedName] = useState('');
  
  const theme = useTheme();
  const navigation = useNavigation<ProfileScreenNavigationProp>();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Kullanıcı bilgilerini al
      const user = await getCurrentUser();
      setCurrentUser(user);
      
      if (user?.region_id) {
        // Bölge bilgilerini çek
        const { data: regionData, error: regionError } = await supabase
          .from('regions')
          .select('*')
          .eq('id', user.region_id)
          .single();
          
        if (regionError) {
          console.error('Bölge bilgileri alınırken hata:', regionError);
        } else {
          setUserRegion(regionData);
        }
      }
    } catch (error) {
      console.error('Kullanıcı verileri yüklenirken hata:', error);
      Alert.alert('Hata', 'Kullanıcı bilgileri yüklenirken bir sorun oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUserData();
  };

  const handleEditProfile = () => {
    if (!currentUser) return;
    
    setEditedName(currentUser.name);
    setShowEditDialog(true);
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('users')
        .update({ name: editedName })
        .eq('id', currentUser.id);
        
      if (error) {
        console.error('Profil güncellenirken hata:', error);
        Alert.alert('Hata', 'Profil güncellenirken bir sorun oluştu');
        return;
      }
      
      setShowEditDialog(false);
      Alert.alert('Başarılı', 'Profil bilgileriniz güncellendi');
      loadUserData();
    } catch (error) {
      console.error('Profil güncellenirken hata:', error);
      Alert.alert('Hata', 'Profil güncellenirken bir sorun oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!currentUser?.email) return;
    
    try {
      setLoading(true);
      await resetPassword(currentUser.email);
      setShowPasswordResetDialog(false);
      Alert.alert(
        'Şifre Sıfırlama',
        'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen e-postanızı kontrol edin.'
      );
    } catch (error) {
      console.error('Şifre sıfırlanırken hata:', error);
      Alert.alert('Hata', 'Şifre sıfırlanırken bir sorun oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await signOut();
      setShowLogoutDialog(false);
    } catch (error) {
      console.error('Çıkış yapılırken hata:', error);
      Alert.alert('Hata', 'Çıkış yapılırken bir sorun oluştu');
      setLoading(false);
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'Yönetici';
      case 'manager': return 'Genel Müdür';
      case 'regional_manager': return 'Bölge Müdürü';
      case 'field_user': return 'Saha Kullanıcısı';
      default: return 'Bilinmeyen';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#7C3AED'; // Mor
      case 'manager': return '#2563EB'; // Mavi
      case 'regional_manager': return '#059669'; // Yeşil
      case 'field_user': return '#F59E0B'; // Turuncu
      default: return '#6B7280'; // Gri
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  if (!currentUser) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="account-alert" size={64} color="#D1D5DB" />
        <Text style={styles.errorText}>Kullanıcı bilgileri bulunamadı</Text>
        <Button 
          mode="contained" 
          onPress={() => navigation.goBack()}
          style={{ marginTop: 16 }}
        >
          Geri Dön
        </Button>
      </View>
    );
  }

  return (
    <SafeAreaWrapper>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.profileHeader}>
          <Avatar.Icon 
            size={80} 
            icon="account" 
            style={styles.avatar} 
            color="#fff" 
          />
          <Text style={styles.userName}>{currentUser?.name || 'Kullanıcı'}</Text>
          <Text style={styles.userEmail}>{currentUser?.email || 'kullanici@example.com'}</Text>
          <View style={styles.roleChip}>
            <Text style={styles.roleText}>
              {currentUser?.role === 'admin' ? 'Yönetici' : 
              currentUser?.role === 'manager' ? 'Müdür' : 
              currentUser?.role === 'regional_manager' ? 'Bölge Müdürü' : 'Saha Kullanıcısı'}
            </Text>
          </View>
        </View>

        <Card style={styles.card}>
          <Card.Title title="Kullanıcı Bilgileri" />
          <Card.Content>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Adı:</Text>
              <Text style={styles.infoValue}>{currentUser?.name || '-'}</Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>E-posta:</Text>
              <Text style={styles.infoValue}>{currentUser?.email || '-'}</Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Durum:</Text>
              <Text style={[
                styles.infoValue, 
                { color: currentUser?.status === 'active' ? '#10B981' : '#EF4444' }
              ]}>
                {currentUser?.status === 'active' ? 'Aktif' : 'Pasif'}
              </Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Bölge:</Text>
              <Text style={styles.infoValue}>{userRegion?.name || '-'}</Text>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => setShowEditDialog(true)}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
              <MaterialCommunityIcons name="account-edit-outline" size={24} color="#6366F1" />
            </View>
            <Text style={styles.actionText}>Bilgileri Düzenle</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => setShowPasswordResetDialog(true)}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#F0FDF4' }]}>
              <MaterialCommunityIcons name="lock-reset" size={24} color="#22C55E" />
            </View>
            <Text style={styles.actionText}>Şifre Sıfırla</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => setShowLogoutDialog(true)}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#FEF2F2' }]}>
              <MaterialCommunityIcons name="logout" size={24} color="#EF4444" />
            </View>
            <Text style={styles.actionText}>Çıkış Yap</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => navigation.navigate('HelpSupport')}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#F0F9FF' }]}>
              <MaterialCommunityIcons name="help-circle-outline" size={24} color="#0EA5E9" />
            </View>
            <Text style={styles.actionText}>Yardım ve Destek</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <Portal>
        <Dialog visible={showEditDialog} onDismiss={() => setShowEditDialog(false)}>
          <Dialog.Title>Profil Bilgilerini Düzenle</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Ad Soyad"
              value={editedName}
              onChangeText={setEditedName}
              mode="outlined"
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowEditDialog(false)}>İptal</Button>
            <Button onPress={handleSaveProfile}>Kaydet</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog visible={showPasswordResetDialog} onDismiss={() => setShowPasswordResetDialog(false)}>
          <Dialog.Title>Şifre Sıfırlama</Dialog.Title>
          <Dialog.Content>
            <Text>
              {currentUser?.email} adresine şifre sıfırlama bağlantısı gönderilecektir. Devam etmek istiyor musunuz?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowPasswordResetDialog(false)}>İptal</Button>
            <Button onPress={handleResetPassword}>Gönder</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog visible={showLogoutDialog} onDismiss={() => setShowLogoutDialog(false)}>
          <Dialog.Title>Çıkış Yap</Dialog.Title>
          <Dialog.Content>
            <Text>Hesabınızdan çıkış yapmak istediğinize emin misiniz?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowLogoutDialog(false)}>İptal</Button>
            <Button onPress={handleLogout}>Çıkış Yap</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: Platform.OS === 'ios' ? 100 : 80, // iPhone için daha fazla padding
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'white',
  },
  avatar: {
    backgroundColor: '#6366F1', // Sabit bir renk kullanıyoruz
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
  },
  userEmail: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  roleChip: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
  },
  roleText: {
    color: '#4F46E5',
    fontWeight: '500',
  },
  card: {
    margin: 16,
    elevation: 2,
    borderRadius: 12,
  },
  divider: {
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  infoLabel: {
    fontSize: 16,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
  },
  actionButton: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 2,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
}); 