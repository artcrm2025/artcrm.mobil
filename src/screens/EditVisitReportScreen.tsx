import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Appbar, TextInput, Button, Switch, Text, Modal, Portal, Provider, List, Divider, ActivityIndicator, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { RootStackParamList, RootStackNavigationProp } from '../types/navigation';
import { Clinic, User } from '../types';
import { getCurrentUser } from '../services/authService';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

type EditVisitReportScreenRouteProp = RouteProp<RootStackParamList, 'EditVisitReport'>;

type VisitReport = {
  id: number;
  user_id: string;
  clinic_id: number;
  subject: string;
  date: string;
  time: string;
  contact_person: string | null;
  notes: string | null;
  follow_up_required: boolean;
  follow_up_date: string | null;
  clinics?: { 
    id: number;
    name: string;
    contact_person?: string;
    contact_info?: string;
    address?: string;
  };
};

export const EditVisitReportScreen = () => {
  // Rapor detayları
  const [report, setReport] = useState<VisitReport | null>(null);
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [contactPerson, setContactPerson] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState<Date | null>(null);
  
  // UI durumları
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showFollowUpDatePicker, setShowFollowUpDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');
  const [clinicModalVisible, setClinicModalVisible] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [searchClinic, setSearchClinic] = useState('');
  
  // Kullanıcı ve yetki kontrolü
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<EditVisitReportScreenRouteProp>();
  const { reportId } = route.params;
  const theme = useTheme();
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      setLoading(true);
      await loadCurrentUser();
      await fetchReportDetails();
      await fetchClinics();
    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
      Alert.alert('Hata', 'Ziyaret raporu bilgileri yüklenirken bir sorun oluştu.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      
      // Admin veya manager ise yetkilidir
      if (user) {
        const isAdmin = user.role === 'admin' || user.role === 'manager';
        setHasPermission(isAdmin);
      }
    } catch (error) {
      console.error('Kullanıcı bilgileri yüklenirken hata:', error);
    }
  };

  const fetchReportDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('visit_reports')
        .select(`
          *,
          clinics:clinic_id (id, name, contact_person, contact_info, address)
        `)
        .eq('id', reportId)
        .single();
      
      if (error) {
        console.error('Ziyaret raporu detayları alınırken hata:', error);
        Alert.alert('Hata', 'Ziyaret raporu bilgileri alınamadı');
        navigation.goBack();
        return;
      }
      
      setReport(data);
      
      // Form değerlerini doldur
      setSubject(data.subject || '');
      setDate(new Date(data.date));
      
      const [hours, minutes] = data.time.split(':');
      const timeObj = new Date();
      timeObj.setHours(parseInt(hours));
      timeObj.setMinutes(parseInt(minutes));
      setTime(timeObj);
      
      setContactPerson(data.contact_person || '');
      setNotes(data.notes || '');
      setFollowUpRequired(data.follow_up_required || false);
      
      if (data.follow_up_date) {
        setFollowUpDate(new Date(data.follow_up_date));
      }
      
      // Klinik bilgisini ayarla
      if (data.clinics) {
        setSelectedClinic({
          id: data.clinics.id,
          name: data.clinics.name,
          contact_person: data.clinics.contact_person || '',
          contact_info: data.clinics.contact_info || '',
          address: data.clinics.address || '',
          region_id: null,
          status: 'active',
          created_at: '',
          updated_at: ''
        });
      }
      
      // Kendi raporu mu kontrol et
      if (currentUser && data.user_id === currentUser.id) {
        setHasPermission(true);
      }
    } catch (error) {
      console.error('Rapor detayları işlenirken hata:', error);
      throw error;
    }
  };

  const fetchClinics = async () => {
    try {
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('status', 'active')
        .order('name');
      
      if (error) {
        console.error('Klinik verileri çekilirken hata:', error);
        return;
      }
      
      setClinics(data || []);
    } catch (error) {
      console.error('Klinikler yüklenirken hata:', error);
    }
  };

  const validateForm = () => {
    if (!selectedClinic) {
      Alert.alert('Uyarı', 'Lütfen bir klinik seçin');
      return false;
    }
    
    if (!subject.trim()) {
      Alert.alert('Uyarı', 'Lütfen ziyaret konusu girin');
      return false;
    }
    
    if (followUpRequired && !followUpDate) {
      Alert.alert('Uyarı', 'Takip gerekli seçildiğinde takip tarihi belirtilmelidir');
      return false;
    }
    
    return true;
  };

  const handleClinicSelect = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setClinicModalVisible(false);
  };

  const handleDateChange = (selectedDate: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      if (datePickerMode === 'date') {
        setDate(selectedDate);
      } else {
        setTime(selectedDate);
      }
    }
  };

  const handleFollowUpDateChange = (selectedDate: Date) => {
    setShowFollowUpDatePicker(false);
    if (selectedDate) {
      setFollowUpDate(selectedDate);
    }
  };

  const formatDate = (dateObj: Date) => {
    return format(dateObj, 'yyyy-MM-dd');
  };
  
  const formatTime = (timeObj: Date) => {
    return `${timeObj.getHours().toString().padStart(2, '0')}:${timeObj.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleUpdate = async () => {
    if (!validateForm()) return;
    
    try {
      setSubmitting(true);
      
      const { error } = await supabase
        .from('visit_reports')
        .update({
          subject,
          date: formatDate(date),
          time: formatTime(time),
          contact_person: contactPerson || null,
          notes: notes || null,
          follow_up_required: followUpRequired,
          follow_up_date: followUpRequired && followUpDate ? formatDate(followUpDate) : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId);
      
      if (error) {
        console.error('Ziyaret raporu güncellenirken hata:', error);
        Alert.alert('Hata', 'Ziyaret raporu güncellenirken bir sorun oluştu');
        return;
      }
      
      Alert.alert(
        'Başarılı',
        'Ziyaret raporu başarıyla güncellendi',
        [{ text: 'Tamam', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Rapor güncellenirken beklenmeyen hata:', error);
      Alert.alert('Hata', 'Bir sorun oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  // Yükleme durumu
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Ziyaret raporu yükleniyor...</Text>
      </View>
    );
  }

  // Yetki durumu
  if (!hasPermission) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={64} color="#E53935" />
        <Text style={styles.errorText}>Bu raporu düzenleme yetkiniz yok.</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Geri Dön
        </Button>
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
        <Appbar.Content title="Ziyaret Raporu Düzenle" />
      </Appbar.Header>
      
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Klinik Bilgileri</Text>
          
          <Button
            mode="outlined"
            icon="hospital-building"
            onPress={() => setClinicModalVisible(true)}
            style={styles.clinicButton}
            disabled={true} // Klinik değiştirmeye izin vermiyoruz
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
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ziyaret Bilgileri</Text>
          
          <TextInput
            label="Ziyaret Konusu"
            value={subject}
            onChangeText={setSubject}
            style={styles.input}
            mode="outlined"
          />
          
          <View style={styles.row}>
            <TouchableOpacity 
              style={styles.dateButton} 
              onPress={() => {
                setDatePickerMode('date');
                setShowDatePicker(true);
              }}
            >
              <TextInput
                label="Tarih"
                value={format(date, 'dd MMMM yyyy', { locale: tr })}
                editable={false}
                style={styles.input}
                mode="outlined"
                right={<TextInput.Icon icon="calendar" />}
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.dateButton} 
              onPress={() => {
                setDatePickerMode('time');
                setShowDatePicker(true);
              }}
            >
              <TextInput
                label="Saat"
                value={formatTime(time)}
                editable={false}
                style={styles.input}
                mode="outlined"
                right={<TextInput.Icon icon="clock-outline" />}
              />
            </TouchableOpacity>
          </View>
          
          <TextInput
            label="İlgili Kişi"
            value={contactPerson}
            onChangeText={setContactPerson}
            style={styles.input}
            mode="outlined"
          />
          
          <TextInput
            label="Notlar"
            value={notes}
            onChangeText={setNotes}
            style={styles.textArea}
            mode="outlined"
            multiline
            numberOfLines={4}
          />
          
          <View style={styles.switchContainer}>
            <Text>Takip Gerekli</Text>
            <Switch
              value={followUpRequired}
              onValueChange={setFollowUpRequired}
              color={theme.colors.primary}
            />
          </View>
          
          {followUpRequired && (
            <TouchableOpacity 
              onPress={() => setShowFollowUpDatePicker(true)}
              style={styles.followUpDateContainer}
            >
              <TextInput
                label="Takip Tarihi"
                value={followUpDate ? format(followUpDate, 'dd MMMM yyyy', { locale: tr }) : 'Seçilmedi'}
                editable={false}
                style={styles.input}
                mode="outlined"
                right={<TextInput.Icon icon="calendar" />}
              />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.button}
          >
            İptal
          </Button>
          
          <Button
            mode="contained"
            onPress={handleUpdate}
            style={styles.button}
            loading={submitting}
            disabled={submitting}
          >
            Güncelle
          </Button>
        </View>
      </ScrollView>
      
      {/* Tarih Seçici */}
      <DateTimePickerModal
        isVisible={showDatePicker}
        mode={datePickerMode}
        date={datePickerMode === 'date' ? date : time}
        onConfirm={handleDateChange}
        onCancel={() => setShowDatePicker(false)}
        locale="tr"
      />
      
      {/* Takip Tarihi Seçici */}
      <DateTimePickerModal
        isVisible={showFollowUpDatePicker}
        mode="date"
        date={followUpDate || new Date()}
        onConfirm={handleFollowUpDateChange}
        onCancel={() => setShowFollowUpDatePicker(false)}
        locale="tr"
        minimumDate={new Date()}
      />
      
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
          
          <ScrollView style={styles.clinicListContainer}>
            {clinics
              .filter(clinic => clinic.name.toLowerCase().includes(searchClinic.toLowerCase()))
              .map(clinic => (
                <TouchableOpacity
                  key={clinic.id}
                  onPress={() => handleClinicSelect(clinic)}
                  style={[
                    styles.clinicListItem,
                    selectedClinic?.id === clinic.id && styles.selectedClinic
                  ]}
                >
                  <List.Item
                    title={clinic.name}
                    description={clinic.address}
                    left={props => <List.Icon {...props} icon="hospital-building" />}
                    right={props => 
                      selectedClinic?.id === clinic.id ? 
                      <List.Icon {...props} icon="check" color={theme.colors.primary} /> : null
                    }
                  />
                  <Divider />
                </TouchableOpacity>
              ))}
          </ScrollView>
          
          <Button
            mode="contained"
            onPress={() => setClinicModalVisible(false)}
            style={styles.closeButton}
          >
            Kapat
          </Button>
        </Modal>
      </Portal>
    </KeyboardAvoidingView>
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
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginVertical: 20,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  textArea: {
    marginBottom: 16,
    backgroundColor: 'white',
    height: 100,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateButton: {
    flex: 1,
    marginRight: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  followUpDateContainer: {
    marginBottom: 16,
  },
  clinicButton: {
    marginBottom: 16,
  },
  clinicInfo: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  clinicName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  clinicDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 24,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    height: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  searchInput: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  clinicListContainer: {
    flex: 1,
    marginBottom: 16,
  },
  clinicListItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedClinic: {
    backgroundColor: '#f0f7ff',
  },
  closeButton: {
    marginTop: 8,
  },
}); 