import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Switch, Alert, TouchableOpacity } from 'react-native';
import { Appbar, Text, List, Divider, Button, Dialog, Portal, TextInput, Avatar, useTheme, ActivityIndicator, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { getCurrentUser, signOut, resetPassword } from '../services/authService';
import { User } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tema tipleri
type ThemeType = 'light' | 'dark' | 'system';

// Bildirim ayarları
interface NotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  proposalNotifications: boolean;
  visitNotifications: boolean;
  surgeryNotifications: boolean;
  systemNotifications: boolean;
}

export const SettingsScreen = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Profil bilgileri için state
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  // Şifre değiştirme dialogu için state
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // Tema seçimi için state
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>('light');
  const [showThemeDialog, setShowThemeDialog] = useState(false);
  
  // Bildirim ayarları için state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    pushEnabled: true,
    emailEnabled: true,
    proposalNotifications: true,
    visitNotifications: true,
    surgeryNotifications: true,
    systemNotifications: true
  });
  
  // Snackbar için state
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  useEffect(() => {
    loadUserData();
    loadSettings();
  }, []);
  
  const loadUserData = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      setCurrentUser(user);
      
      if (user) {
        setName(user.name);
        setEmail(user.email);
      }
    } catch (error) {
      console.error('Kullanıcı bilgileri yüklenirken hata:', error);
      Alert.alert('Hata', 'Kullanıcı bilgileri yüklenirken bir sorun oluştu');
    } finally {
      setLoading(false);
    }
  };
  
  const loadSettings = async () => {
    try {
      // Tema ayarını yükle
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme) {
        setSelectedTheme(savedTheme as ThemeType);
      }
      
      // Bildirim ayarlarını yükle
      const savedNotificationSettings = await AsyncStorage.getItem('notificationSettings');
      if (savedNotificationSettings) {
        setNotificationSettings(JSON.parse(savedNotificationSettings));
      }
    } catch (error) {
      console.error('Ayarlar yüklenirken hata:', error);
    }
  };
  
  const saveProfileChanges = async () => {
    if (!currentUser) return;
    
    if (!name.trim()) {
      Alert.alert('Uyarı', 'Lütfen isim alanını doldurun');
      return;
    }
    
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('users')
        .update({ name: name.trim() })
        .eq('id', currentUser.id);
      
      if (error) {
        console.error('Profil güncellenirken hata:', error);
        Alert.alert('Hata', 'Profil güncellenirken bir sorun oluştu');
        return;
      }
      
      // Profili yeniden yükle
      await loadUserData();
      setEditMode(false);
      
      // Başarı mesajı göster
      showSnackbar('Profil bilgileri başarıyla güncellendi');
    } catch (error) {
      console.error('Profil güncellenirken hata:', error);
      Alert.alert('Hata', 'Profil güncellenirken bir sorun oluştu');
    } finally {
      setSaving(false);
    }
  };
  
  const handleChangePassword = async () => {
    // Şifre doğrulama kontrolleri
    if (!currentPassword) {
      setPasswordError('Mevcut şifrenizi girin');
      return;
    }
    
    if (!newPassword) {
      setPasswordError('Yeni şifrenizi girin');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError('Yeni şifreniz en az 6 karakter olmalıdır');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Yeni şifreler eşleşmiyor');
      return;
    }
    
    try {
      setSaving(true);
      setPasswordError('');
      
      // Burada Supabase şifre değiştirme fonksiyonu kullanılır
      // Gerçek uygulamada bu işlev implemente edilmelidir
      
      // Demo amaçlı gecikme eklendi
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Dialog'u kapat
      setShowChangePasswordDialog(false);
      
      // Form alanlarını temizle
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Başarı mesajı göster
      showSnackbar('Şifreniz başarıyla değiştirildi');
    } catch (error) {
      console.error('Şifre değiştirilirken hata:', error);
      setPasswordError('Şifre değiştirilirken bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };
  
  const saveThemeSettings = async (theme: ThemeType) => {
    try {
      setSelectedTheme(theme);
      await AsyncStorage.setItem('theme', theme);
      setShowThemeDialog(false);
      
      showSnackbar('Tema ayarı kaydedildi');
    } catch (error) {
      console.error('Tema ayarı kaydedilirken hata:', error);
    }
  };
  
  const toggleNotificationSetting = async (setting: keyof NotificationSettings) => {
    try {
      const updatedSettings = {
        ...notificationSettings,
        [setting]: !notificationSettings[setting]
      };
      
      setNotificationSettings(updatedSettings);
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Bildirim ayarı kaydedilirken hata:', error);
    }
  };
  
  const handleSignOut = async () => {
    Alert.alert(
      'Çıkış',
      'Oturumu kapatmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Çıkış Yap', 
          onPress: async () => {
            try {
              await signOut();
              // Oturum kapatıldıktan sonra ana ekrana yönlendirilecek
              // Bu otomatik olarak gerçekleşir
            } catch (error) {
              console.error('Çıkış yapılırken hata:', error);
              Alert.alert('Hata', 'Çıkış yapılırken bir sorun oluştu');
            }
          },
          style: 'destructive' 
        }
      ]
    );
  };
  
  const handleResetPassword = async () => {
    if (!currentUser?.email) return;
    
    Alert.alert(
      'Şifre Sıfırlama',
      'Şifre sıfırlama bağlantısı e-posta adresinize gönderilecektir. Devam etmek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Gönder', 
          onPress: async () => {
            try {
              setSaving(true);
              await resetPassword(currentUser.email);
              showSnackbar('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi');
            } catch (error) {
              console.error('Şifre sıfırlama bağlantısı gönderilirken hata:', error);
              Alert.alert('Hata', 'Şifre sıfırlama bağlantısı gönderilirken bir sorun oluştu');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };
  
  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };
  
  const getInitials = (name: string): string => {
    if (!name) return '??';
    
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };
  
  const getRoleText = (role: string): string => {
    switch (role) {
      case 'admin': return 'Yönetici';
      case 'manager': return 'Genel Müdür';
      case 'regional_manager': return 'Bölge Müdürü';
      case 'field_user': return 'Saha Personeli';
      default: return 'Kullanıcı';
    }
  };
  
  const getThemeText = (themeType: ThemeType): string => {
    switch (themeType) {
      case 'light': return 'Açık Tema';
      case 'dark': return 'Koyu Tema';
      case 'system': return 'Sistem Teması';
      default: return 'Açık Tema';
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Ayarlar" />
      </Appbar.Header>
      
      <ScrollView>
        {/* Profil Bölümü */}
        <View style={styles.profileSection}>
          <Avatar.Text 
            size={80} 
            label={getInitials(currentUser?.name || '')} 
            style={styles.avatar}
          />
          
          {editMode ? (
            <View style={styles.editProfile}>
              <TextInput
                mode="outlined"
                label="Ad Soyad"
                value={name}
                onChangeText={setName}
                style={styles.input}
              />
              
              <TextInput
                mode="outlined"
                label="E-posta"
                value={email}
                disabled
                style={styles.input}
              />
              
              <View style={styles.buttonRow}>
                <Button 
                  mode="outlined" 
                  onPress={() => {
                    setEditMode(false);
                    loadUserData();
                  }}
                  style={styles.cancelButton}
                >
                  İptal
                </Button>
                
                <Button 
                  mode="contained" 
                  onPress={saveProfileChanges}
                  loading={saving}
                  disabled={saving}
                  style={styles.saveButton}
                >
                  Kaydet
                </Button>
              </View>
            </View>
          ) : (
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{currentUser?.name}</Text>
              <Text style={styles.profileEmail}>{currentUser?.email}</Text>
              <Text style={styles.profileRole}>{getRoleText(currentUser?.role || '')}</Text>
              
              <Button 
                mode="outlined"
                icon="account-edit"
                onPress={() => setEditMode(true)}
                style={styles.editButton}
              >
                Profili Düzenle
              </Button>
            </View>
          )}
        </View>
        
        <Divider />
        
        {/* Hesap Güvenliği */}
        <List.Section>
          <List.Subheader>Hesap Güvenliği</List.Subheader>
          
          <List.Item
            title="Şifre Değiştir"
            description="Hesabınızın şifresini güncelleyin"
            left={props => <List.Icon {...props} icon="lock-reset" />}
            onPress={() => setShowChangePasswordDialog(true)}
          />
          
          <List.Item
            title="Şifre Sıfırlama"
            description="Şifre sıfırlama bağlantısı gönder"
            left={props => <List.Icon {...props} icon="email-outline" />}
            onPress={handleResetPassword}
          />
        </List.Section>
        
        <Divider />
        
        {/* Görünüm Ayarları */}
        <List.Section>
          <List.Subheader>Görünüm</List.Subheader>
          
          <List.Item
            title="Tema"
            description={getThemeText(selectedTheme)}
            left={props => <List.Icon {...props} icon="theme-light-dark" />}
            onPress={() => setShowThemeDialog(true)}
          />
        </List.Section>
        
        <Divider />
        
        {/* Bildirim Ayarları */}
        <List.Section>
          <List.Subheader>Bildirimler</List.Subheader>
          
          <List.Item
            title="Push Bildirimleri"
            description="Anlık bildirimler alın"
            left={props => <List.Icon {...props} icon="bell-outline" />}
            right={props => 
              <Switch 
                value={notificationSettings.pushEnabled} 
                onValueChange={() => toggleNotificationSetting('pushEnabled')}
              />
            }
          />
          
          <List.Item
            title="E-posta Bildirimleri"
            description="Önemli bilgileri e-posta ile alın"
            left={props => <List.Icon {...props} icon="email-outline" />}
            right={props => 
              <Switch 
                value={notificationSettings.emailEnabled} 
                onValueChange={() => toggleNotificationSetting('emailEnabled')}
              />
            }
          />
          
          <List.Item
            title="Teklif Bildirimleri"
            description="Tekliflerle ilgili bildirimleri alın"
            left={props => <List.Icon {...props} icon="file-document-outline" />}
            right={props => 
              <Switch 
                value={notificationSettings.proposalNotifications} 
                onValueChange={() => toggleNotificationSetting('proposalNotifications')}
              />
            }
          />
          
          <List.Item
            title="Ziyaret Bildirimleri"
            description="Ziyaretlerle ilgili bildirimleri alın"
            left={props => <List.Icon {...props} icon="clipboard-text-outline" />}
            right={props => 
              <Switch 
                value={notificationSettings.visitNotifications} 
                onValueChange={() => toggleNotificationSetting('visitNotifications')}
              />
            }
          />
          
          <List.Item
            title="Ameliyat Bildirimleri"
            description="Ameliyatlarla ilgili bildirimleri alın"
            left={props => <List.Icon {...props} icon="medical-bag" />}
            right={props => 
              <Switch 
                value={notificationSettings.surgeryNotifications} 
                onValueChange={() => toggleNotificationSetting('surgeryNotifications')}
              />
            }
          />
          
          <List.Item
            title="Sistem Bildirimleri"
            description="Sistem güncellemeleri ile ilgili bildirimleri alın"
            left={props => <List.Icon {...props} icon="information-outline" />}
            right={props => 
              <Switch 
                value={notificationSettings.systemNotifications} 
                onValueChange={() => toggleNotificationSetting('systemNotifications')}
              />
            }
          />
        </List.Section>
        
        <Divider />
        
        {/* Uygulama Bilgileri */}
        <List.Section>
          <List.Subheader>Uygulama Hakkında</List.Subheader>
          
          <List.Item
            title="Uygulama Sürümü"
            description="v1.0.0"
            left={props => <List.Icon {...props} icon="information-outline" />}
          />
          
          <List.Item
            title="Yardım ve Destek"
            description="Destek talebinde bulunun"
            left={props => <List.Icon {...props} icon="help-circle-outline" />}
            onPress={() => {}}
          />
          
          <List.Item
            title="Gizlilik Politikası"
            description="Gizlilik politikamızı inceleyin"
            left={props => <List.Icon {...props} icon="shield-account" />}
            onPress={() => {}}
          />
        </List.Section>
        
        <Divider />
        
        {/* Çıkış */}
        <View style={styles.logoutSection}>
          <Button 
            mode="contained" 
            icon="logout" 
            onPress={handleSignOut}
            style={styles.logoutButton}
            buttonColor="#EF4444"
          >
            Oturumu Kapat
          </Button>
        </View>
      </ScrollView>
      
      {/* Şifre Değiştirme Dialogu */}
      <Portal>
        <Dialog visible={showChangePasswordDialog} onDismiss={() => setShowChangePasswordDialog(false)}>
          <Dialog.Title>Şifre Değiştir</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Mevcut Şifre"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              style={styles.input}
            />
            
            <TextInput
              mode="outlined"
              label="Yeni Şifre"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              style={styles.input}
            />
            
            <TextInput
              mode="outlined"
              label="Yeni Şifre (Tekrar)"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              style={styles.input}
            />
            
            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowChangePasswordDialog(false)}>İptal</Button>
            <Button 
              onPress={handleChangePassword}
              loading={saving}
              disabled={saving}
            >
              Değiştir
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Tema Seçimi Dialogu */}
      <Portal>
        <Dialog visible={showThemeDialog} onDismiss={() => setShowThemeDialog(false)}>
          <Dialog.Title>Tema Seçin</Dialog.Title>
          <Dialog.Content>
            <TouchableOpacity 
              style={[
                styles.themeOption,
                selectedTheme === 'light' && styles.selectedThemeOption
              ]}
              onPress={() => saveThemeSettings('light')}
            >
              <MaterialCommunityIcons name="white-balance-sunny" size={24} color="#6366F1" />
              <Text style={styles.themeOptionText}>Açık Tema</Text>
              {selectedTheme === 'light' && (
                <MaterialCommunityIcons name="check" size={20} color="#6366F1" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.themeOption,
                selectedTheme === 'dark' && styles.selectedThemeOption
              ]}
              onPress={() => saveThemeSettings('dark')}
            >
              <MaterialCommunityIcons name="moon-waning-crescent" size={24} color="#6366F1" />
              <Text style={styles.themeOptionText}>Koyu Tema</Text>
              {selectedTheme === 'dark' && (
                <MaterialCommunityIcons name="check" size={20} color="#6366F1" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.themeOption,
                selectedTheme === 'system' && styles.selectedThemeOption
              ]}
              onPress={() => saveThemeSettings('system')}
            >
              <MaterialCommunityIcons name="theme-light-dark" size={24} color="#6366F1" />
              <Text style={styles.themeOptionText}>Sistem Teması</Text>
              {selectedTheme === 'system' && (
                <MaterialCommunityIcons name="check" size={20} color="#6366F1" />
              )}
            </TouchableOpacity>
          </Dialog.Content>
        </Dialog>
      </Portal>
      
      {/* Bildirim Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: 'Tamam',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  profileSection: {
    backgroundColor: 'white',
    padding: 24,
    alignItems: 'center',
  },
  avatar: {
    marginBottom: 16,
    backgroundColor: '#6366F1',
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginVertical: 4,
  },
  profileRole: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
  },
  editButton: {
    marginTop: 8,
  },
  editProfile: {
    width: '100%',
    marginTop: 8,
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  saveButton: {
    flex: 1,
    marginLeft: 8,
  },
  errorText: {
    color: '#EF4444',
    marginTop: 8,
  },
  logoutSection: {
    padding: 24,
  },
  logoutButton: {
    marginBottom: 40,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  selectedThemeOption: {
    backgroundColor: '#EEF2FF',
  },
  themeOptionText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
}); 