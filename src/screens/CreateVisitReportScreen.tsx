import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, Button, TextInput, Appbar, Chip, Divider, Portal, Modal, List, useTheme, ActivityIndicator, Switch } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Clinic, User } from '../types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCurrentUser } from '../services/authService';

export const CreateVisitReportScreen = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [subject, setSubject] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [notes, setNotes] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  
  // Modal state
  const [clinicModalVisible, setClinicModalVisible] = useState(false);
  const [searchClinic, setSearchClinic] = useState('');
  
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
        // Klinikler verisini çek
        await fetchClinics(user);
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

  const handleClinicSelect = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setClinicModalVisible(false);
    
    // Varsayılan olarak klinik iletişim kişisini al
    if (clinic.contact_person) {
      setContactPerson(clinic.contact_person);
    }
  };

  const validateForm = () => {
    if (!selectedClinic) {
      Alert.alert('Uyarı', 'Lütfen bir klinik seçin');
      return false;
    }
    
    if (!subject.trim()) {
      Alert.alert('Uyarı', 'Lütfen konu başlığı girin');
      return false;
    }
    
    if (!visitDate) {
      Alert.alert('Uyarı', 'Lütfen ziyaret tarihi girin');
      return false;
    }
    
    if (!visitTime) {
      Alert.alert('Uyarı', 'Lütfen ziyaret saati girin');
      return false;
    }
    
    // Tarih formatını kontrol et (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(visitDate)) {
      Alert.alert('Uyarı', 'Lütfen geçerli bir tarih girin (YYYY-AA-GG)');
      return false;
    }
    
    // Saat formatını kontrol et (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(visitTime)) {
      Alert.alert('Uyarı', 'Lütfen geçerli bir saat girin (SS:DD)');
      return false;
    }
    
    // Takip gerekli ise tarih kontrolü
    if (followUpRequired && !followUpDate) {
      Alert.alert('Uyarı', 'Takip gerekli ise takip tarihini de giriniz');
      return false;
    }
    
    if (followUpRequired && followUpDate) {
      if (!dateRegex.test(followUpDate)) {
        Alert.alert('Uyarı', 'Lütfen geçerli bir takip tarihi girin (YYYY-AA-GG)');
        return false;
      }
    }
    
    return true;
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
        .from('visit_reports')
        .insert({
          user_id: currentUser.id,
          clinic_id: selectedClinic!.id,
          subject,
          contact_person: contactPerson || null,
          date: visitDate,
          time: visitTime,
          notes: notes || null,
          follow_up_required: followUpRequired,
          follow_up_date: followUpRequired ? followUpDate : null
        })
        .select()
        .single();
      
      if (error) {
        console.error('Ziyaret raporu kaydedilirken hata:', error);
        Alert.alert('Hata', 'Ziyaret raporu kaydedilirken bir sorun oluştu');
        return;
      }
      
      Alert.alert(
        'Başarılı',
        'Ziyaret raporu başarıyla kaydedildi',
        [
          { 
            text: 'Tamam', 
            onPress: () => navigation.goBack() 
          }
        ]
      );
    } catch (error) {
      console.error('Ziyaret raporu kaydedilirken hata:', error);
      Alert.alert('Hata', 'Ziyaret raporu kaydedilirken bir sorun oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredClinics = clinics.filter(clinic => 
    clinic.name.toLowerCase().includes(searchClinic.toLowerCase())
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
        <Appbar.Content title="Yeni Ziyaret Raporu" />
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
          <Text style={styles.sectionTitle}>Ziyaret Detayları</Text>
          
          <View style={styles.row}>
            <Text style={styles.inputLabel}>Konu</Text>
            <TextInput
              mode="outlined"
              value={subject}
              onChangeText={setSubject}
              style={styles.input}
              placeholder="Ziyaret konusu"
            />
          </View>
          
          <View style={styles.row}>
            <Text style={styles.inputLabel}>İlgili Kişi</Text>
            <TextInput
              mode="outlined"
              value={contactPerson}
              onChangeText={setContactPerson}
              style={styles.input}
              placeholder="Görüşme yapılan kişi"
            />
          </View>
          
          <View style={styles.row}>
            <Text style={styles.inputLabel}>Tarih (YYYY-AA-GG)</Text>
            <TextInput
              mode="outlined"
              value={visitDate}
              onChangeText={setVisitDate}
              style={styles.input}
              placeholder="Örn: 2025-03-15"
              keyboardType="numbers-and-punctuation"
            />
          </View>
          
          <View style={styles.row}>
            <Text style={styles.inputLabel}>Saat (SS:DD)</Text>
            <TextInput
              mode="outlined"
              value={visitTime}
              onChangeText={setVisitTime}
              style={styles.input}
              placeholder="Örn: 14:30"
              keyboardType="numbers-and-punctuation"
            />
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
              placeholder="Ziyaret ile ilgili notlar"
            />
          </View>
          
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Takip Gerekli mi?</Text>
            <Switch
              value={followUpRequired}
              onValueChange={setFollowUpRequired}
              color={theme.colors.primary}
            />
          </View>
          
          {followUpRequired && (
            <View style={styles.row}>
              <Text style={styles.inputLabel}>Takip Tarihi (YYYY-AA-GG)</Text>
              <TextInput
                mode="outlined"
                value={followUpDate}
                onChangeText={setFollowUpDate}
                style={styles.input}
                placeholder="Örn: 2025-04-15"
                keyboardType="numbers-and-punctuation"
              />
            </View>
          )}
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 14,
    color: '#4B5563',
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