import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Appbar, TextInput, Button, Surface, Text, HelperText, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCurrentUser } from '../services/authService';
import { clinicService } from '../services/apiService';
import { User, Clinic } from '../types';

export const CreateClinicScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Form alanları
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [regionId, setRegionId] = useState<number | null>(null);
  
  // Form doğrulama
  const [errors, setErrors] = useState({
    name: false,
  });
  
  useEffect(() => {
    loadCurrentUser();
  }, []);
  
  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      if (user?.region_id) {
        // Kullanıcının bölgesi otomatik olarak yeni kliniğe atanır
        setRegionId(user.region_id);
      }
    } catch (error) {
      console.error('Kullanıcı bilgileri yüklenirken hata:', error);
    }
  };
  
  const validateForm = () => {
    const newErrors = {
      name: name.trim() === '',
    };
    
    setErrors(newErrors);
    return !Object.values(newErrors).includes(true);
  };
  
  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Hata', 'Lütfen zorunlu alanları doldurun.');
      return;
    }
    
    if (!currentUser) {
      Alert.alert('Hata', 'Kullanıcı bilgileri bulunamadı, lütfen tekrar giriş yapın.');
      return;
    }
    
    if (!regionId && currentUser.role !== 'admin' && currentUser.role !== 'manager') {
      // Admin ve Manager olmayan kullanıcılarda regionId zorunlu
      Alert.alert('Hata', 'Bölge ID bulunamadı. Klinik eklenemez.');
      return;
    }
    
    setLoading(true);
    
    try {
      const clinicData: Partial<Clinic> = {
        name,
        address: address || undefined,
        contact_name: contactName || undefined,
        contact_phone: contactPhone || undefined,
        email: contactEmail || undefined,
        region_id: regionId || undefined,
        status: 'active',
      };
      
      // clinicService'e kullanıcı bilgisini de geçiyoruz
      const result = await clinicService.create(clinicData, currentUser);
      
      Alert.alert(
        'Başarılı', 
        'Klinik başarıyla eklendi.',
        [{ text: 'Tamam', onPress: () => navigation.goBack() }]
      );
      
    } catch (error) {
      console.error('Klinik eklenirken hata:', error);
      Alert.alert('Hata', 'Klinik eklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };
  
  // Sadece admin ve manager bölge seçebilir, diğer kullanıcılar otomatik olarak kendi bölgelerine ekler
  const canSelectRegion = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  
  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Yeni Klinik Ekle" />
      </Appbar.Header>
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Surface style={styles.formContainer} elevation={1}>
            <Text style={styles.sectionTitle}>Klinik Bilgileri</Text>
            
            <TextInput
              label="Klinik Adı *"
              value={name}
              onChangeText={setName}
              style={styles.input}
              error={errors.name}
              mode="outlined"
            />
            {errors.name && <HelperText type="error">Klinik adı zorunludur</HelperText>}
            
            <TextInput
              label="Adres"
              value={address}
              onChangeText={setAddress}
              style={styles.input}
              mode="outlined"
              multiline
              numberOfLines={3}
            />
            
            <Text style={styles.sectionTitle}>İletişim Bilgileri</Text>
            
            <TextInput
              label="İletişim Kişisi"
              value={contactName}
              onChangeText={setContactName}
              style={styles.input}
              mode="outlined"
            />
            
            <TextInput
              label="Telefon Numarası"
              value={contactPhone}
              onChangeText={setContactPhone}
              style={styles.input}
              mode="outlined"
              keyboardType="phone-pad"
            />
            
            <TextInput
              label="E-posta"
              value={contactEmail}
              onChangeText={setContactEmail}
              style={styles.input}
              mode="outlined"
              keyboardType="email-address"
            />
            
            {/* Bölge bilgisi */}
            <View style={styles.regionContainer}>
              <MaterialCommunityIcons name="map-marker" size={20} color={theme.colors.primary} />
              <Text style={styles.regionText}>
                Bölge: {currentUser?.region_id ? 'Kendi bölgenize eklenecek' : 'Belirtilmemiş'}
              </Text>
            </View>
            
            <View style={styles.buttonContainer}>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={loading}
                disabled={loading}
                style={styles.saveButton}
                labelStyle={styles.buttonLabel}
              >
                Klinik Ekle
              </Button>
              
              <Button
                mode="outlined"
                onPress={() => navigation.goBack()}
                style={styles.cancelButton}
                labelStyle={styles.buttonLabel}
              >
                İptal
              </Button>
            </View>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  formContainer: {
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  regionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  regionText: {
    marginLeft: 8,
    fontSize: 14,
  },
  buttonContainer: {
    marginTop: 16,
  },
  saveButton: {
    paddingVertical: 8,
    marginBottom: 12,
  },
  cancelButton: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '500',
  }
}); 