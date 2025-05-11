import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, Button, TextInput, Appbar, Chip, Divider, Portal, Modal, List, useTheme, ActivityIndicator, HelperText } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Clinic, Product, User } from '../types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCurrentUser } from '../services/authService';
import DateTimePicker from '@react-native-community/datetimepicker';

export const CreateSurgeryReportScreen = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [patientName, setPatientName] = useState('');
  const [surgeryType, setSurgeryType] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [status, setStatus] = useState<'scheduled' | 'completed' | 'cancelled'>('completed');
  
  // Modal state
  const [clinicModalVisible, setClinicModalVisible] = useState(false);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [searchClinic, setSearchClinic] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  const navigation = useNavigation();
  const theme = useTheme();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Kullanıcı bilgilerini al
      const user = await getCurrentUser();
      setCurrentUser(user);
      
      if (user) {
        // Klinikler ve ürünler verisini çek
        await Promise.all([
          fetchClinics(user),
          fetchProducts()
        ]);
      }
    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
      Alert.alert('Hata', 'Veriler yüklenirken bir sorun oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchClinics = async (user: User) => {
    try {
      let query = supabase
        .from('clinics')
        .select('*')
        .eq('status', 'active');
      
      // Eğer kullanıcı saha kullanıcısı veya bölge müdürü ise, sadece kendi bölgesindeki klinikleri göster
      if (user.role === 'field_user' || user.role === 'regional_manager') {
        if (user.region_id) {
          query = query.eq('region_id', user.region_id);
        }
      }
      
      const { data, error } = await query.order('name');
      
      if (error) {
        console.error('Klinikler yüklenirken hata:', error);
        return;
      }
      
      setClinics(data || []);
    } catch (error) {
      console.error('Klinikler çekilirken hata:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('name');
        
      if (error) {
        console.error('Ürünler yüklenirken hata:', error);
        return;
      }
      
      setProducts(data || []);
    } catch (error) {
      console.error('Ürünler çekilirken hata:', error);
    }
  };

  const handleClinicSelect = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setClinicModalVisible(false);
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setProductModalVisible(false);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    const currentTime = selectedTime || time;
    setShowTimePicker(Platform.OS === 'ios');
    setTime(currentTime);
  };

  const validateForm = () => {
    if (!selectedClinic) {
      Alert.alert('Uyarı', 'Lütfen bir klinik seçin');
      return false;
    }
    
    if (!selectedProduct) {
      Alert.alert('Uyarı', 'Lütfen bir ürün seçin');
      return false;
    }
    
    if (!patientName.trim()) {
      Alert.alert('Uyarı', 'Lütfen hasta adını girin');
      return false;
    }
    
    if (!surgeryType.trim()) {
      Alert.alert('Uyarı', 'Lütfen ameliyat türünü girin');
      return false;
    }
    
    return true;
  };

  const formatDate = (dateObj: Date) => {
    return dateObj.toISOString().split('T')[0];
  };

  const formatTime = (timeObj: Date) => {
    return timeObj.toTimeString().slice(0, 5);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!currentUser) {
      Alert.alert('Hata', 'Kullanıcı bilgileri alınamadı');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const { data, error } = await supabase
        .from('surgery_reports')
        .insert({
          user_id: currentUser.id,
          clinic_id: selectedClinic!.id,
          product_id: selectedProduct!.id,
          patient_name: patientName,
          surgery_type: surgeryType,
          date: formatDate(date),
          time: formatTime(time),
          notes: notes || null,
          status: status
        })
        .select()
        .single();
      
      if (error) {
        console.error('Ameliyat raporu kaydedilirken hata:', error);
        Alert.alert('Hata', 'Ameliyat raporu kaydedilirken bir sorun oluştu. Hata: ' + error.message);
        return;
      }
      
      Alert.alert(
        'Başarılı',
        'Ameliyat raporu başarıyla kaydedildi',
        [
          { 
            text: 'Tamam', 
            onPress: () => navigation.goBack() 
          }
        ]
      );
    } catch (error) {
      console.error('Ameliyat raporu kaydedilirken hata:', error);
      Alert.alert('Hata', 'Ameliyat raporu kaydedilirken bir sorun oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredClinics = clinics.filter(clinic => 
    clinic.name.toLowerCase().includes(searchClinic.toLowerCase())
  );

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchProduct.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Yeni Ameliyat Raporu" />
      </Appbar.Header>

      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Klinik Bilgileri</Text>
          
          <Button
            mode={selectedClinic ? "outlined" : "contained"}
            icon="hospital-building"
            onPress={() => setClinicModalVisible(true)}
            style={styles.clinicButton}
          >
            {selectedClinic ? selectedClinic.name : 'Klinik Seç'}
          </Button>
          
          {selectedClinic && (
            <View style={styles.clinicInfo}>
              <Text style={styles.clinicName}>{selectedClinic.name}</Text>
              <Text style={styles.clinicDetail}>
                {selectedClinic.contact_person ? `İlgili Kişi: ${selectedClinic.contact_person}` : ''}
              </Text>
              <Text style={styles.clinicDetail}>
                {selectedClinic.contact_info ? `İletişim: ${selectedClinic.contact_info}` : ''}
              </Text>
              <Text style={styles.clinicDetail}>
                {selectedClinic.address ? `Adres: ${selectedClinic.address}` : ''}
              </Text>
            </View>
          )}
        </View>

        <Divider style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ameliyat Detayları</Text>
          
          <Button
            mode={selectedProduct ? "outlined" : "contained"}
            icon="package-variant"
            onPress={() => setProductModalVisible(true)}
            style={styles.button}
          >
            {selectedProduct ? selectedProduct.name : 'Ürün Seç'}
          </Button>
          
          <View style={styles.row}>
            <Text style={styles.inputLabel}>Hasta Adı</Text>
            <TextInput
              mode="outlined"
              value={patientName}
              onChangeText={setPatientName}
              style={styles.input}
              placeholder="Hasta adını girin"
            />
          </View>
          
          <View style={styles.row}>
            <Text style={styles.inputLabel}>Ameliyat Türü</Text>
            <TextInput
              mode="outlined"
              value={surgeryType}
              onChangeText={setSurgeryType}
              style={styles.input}
              placeholder="Ameliyat türünü girin"
            />
          </View>
          
          <View style={styles.row}>
            <Text style={styles.inputLabel}>Tarih</Text>
            <Button 
              mode="outlined" 
              onPress={() => setShowDatePicker(true)}
              style={styles.dateButton}
              icon="calendar"
            >
              {formatDate(date)}
            </Button>
            
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
              />
            )}
          </View>
          
          <View style={styles.row}>
            <Text style={styles.inputLabel}>Saat</Text>
            <Button 
              mode="outlined" 
              onPress={() => setShowTimePicker(true)}
              style={styles.dateButton}
              icon="clock-outline"
            >
              {formatTime(time)}
            </Button>
            
            {showTimePicker && (
              <DateTimePicker
                value={time}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
              />
            )}
          </View>
          
          <View style={styles.row}>
            <Text style={styles.inputLabel}>Durum</Text>
            <View style={styles.chipContainer}>
              <Chip
                selected={status === 'scheduled'}
                onPress={() => setStatus('scheduled')}
                style={[styles.chip, status === 'scheduled' && { backgroundColor: theme.colors.primaryContainer }]}
              >
                Planlandı
              </Chip>
              <Chip
                selected={status === 'completed'}
                onPress={() => setStatus('completed')}
                style={[styles.chip, status === 'completed' && { backgroundColor: theme.colors.tertiaryContainer }]}
              >
                Tamamlandı
              </Chip>
              <Chip
                selected={status === 'cancelled'}
                onPress={() => setStatus('cancelled')}
                style={[styles.chip, status === 'cancelled' && { backgroundColor: theme.colors.errorContainer }]}
              >
                İptal Edildi
              </Chip>
            </View>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.inputLabel}>Notlar</Text>
            <TextInput
              mode="outlined"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              style={styles.textArea}
              placeholder="Ameliyat ile ilgili notlar"
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.submitButton}
          >
            İptal
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.submitButton}
            loading={submitting}
            disabled={submitting}
          >
            Raporu Kaydet
          </Button>
        </View>
      </ScrollView>

      {/* Klinik Seçme Modal */}
      <Portal>
        <Modal
          visible={clinicModalVisible}
          onDismiss={() => setClinicModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text style={styles.modalTitle}>Klinik Seç</Text>
          <TextInput
            mode="outlined"
            placeholder="Klinik Ara..."
            value={searchClinic}
            onChangeText={setSearchClinic}
            style={styles.searchInput}
            left={<TextInput.Icon icon="magnify" />}
          />
          <ScrollView style={styles.modalList}>
            {filteredClinics.length > 0 ? (
              filteredClinics.map(clinic => (
                <List.Item
                  key={clinic.id}
                  title={clinic.name}
                  description={clinic.contact_person}
                  onPress={() => handleClinicSelect(clinic)}
                  left={props => <List.Icon {...props} icon="hospital-building" />}
                  style={styles.listItem}
                />
              ))
            ) : (
              <View style={styles.emptyList}>
                <Text>Hiç klinik bulunamadı</Text>
              </View>
            )}
          </ScrollView>
          <Button 
            mode="outlined"
            onPress={() => setClinicModalVisible(false)}
            style={styles.modalButton}
          >
            İptal
          </Button>
        </Modal>
      </Portal>

      {/* Ürün Seçme Modal */}
      <Portal>
        <Modal
          visible={productModalVisible}
          onDismiss={() => setProductModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text style={styles.modalTitle}>Ürün Seç</Text>
          <TextInput
            mode="outlined"
            placeholder="Ürün Ara..."
            value={searchProduct}
            onChangeText={setSearchProduct}
            style={styles.searchInput}
            left={<TextInput.Icon icon="magnify" />}
          />
          <ScrollView style={styles.modalList}>
            {filteredProducts.length > 0 ? (
              filteredProducts.map(product => (
                <List.Item
                  key={product.id}
                  title={product.name}
                  onPress={() => handleProductSelect(product)}
                  left={props => <List.Icon {...props} icon="package-variant" />}
                  style={styles.listItem}
                />
              ))
            ) : (
              <View style={styles.emptyList}>
                <Text>Hiç ürün bulunamadı</Text>
              </View>
            )}
          </ScrollView>
          <Button 
            mode="outlined"
            onPress={() => setProductModalVisible(false)}
            style={styles.modalButton}
          >
            İptal
          </Button>
        </Modal>
      </Portal>
    </KeyboardAvoidingView>
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
    fontSize: 16,
    color: '#6B7280',
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#111827',
  },
  clinicButton: {
    marginBottom: 12,
  },
  button: {
    marginBottom: 16,
  },
  clinicInfo: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
  },
  clinicName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#111827',
  },
  clinicDetail: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 2,
  },
  divider: {
    marginVertical: 8,
  },
  row: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    color: '#4B5563',
  },
  input: {
    backgroundColor: 'white',
  },
  textArea: {
    backgroundColor: 'white',
    height: 100,
  },
  dateButton: {
    justifyContent: 'flex-start',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
  },
  submitButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#111827',
  },
  searchInput: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  modalList: {
    maxHeight: 300,
  },
  listItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  emptyList: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButton: {
    marginTop: 16,
  },
}); 