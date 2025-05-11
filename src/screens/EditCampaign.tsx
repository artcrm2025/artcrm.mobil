import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Card, Divider, Chip, ActivityIndicator, useTheme, HelperText } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { SafeAreaWrapper } from '../components/SafeAreaWrapper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isValid, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { RootStackNavigationProp } from '../types/navigation';

type EditCampaignRouteProp = {
  params: {
    campaignId: number;
  };
  key: string;
  name: string;
  path?: string;
};

const EditCampaign = () => {
  const navigation = useNavigation<RootStackNavigationProp<'EditCampaign'>>();
  const route = useRoute<EditCampaignRouteProp>();
  const theme = useTheme();
  const { campaignId } = route.params;
  
  // Form değerleri
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [status, setStatus] = useState('active');
  const [discountPercentage, setDiscountPercentage] = useState('0');
  const [selectedRegions, setSelectedRegions] = useState<number[]>([]);
  const [allRegions, setAllRegions] = useState<any[]>([]);
  
  // Date picker durumları
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  // Yükleme ve hata durumları
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState('');
  const [regionError, setRegionError] = useState('');
  
  useEffect(() => {
    fetchCampaignData();
    fetchRegions();
  }, [campaignId]);

  const fetchCampaignData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setName(data.name || '');
        setDescription(data.description || '');
        
        // Tarih formatını işle
        if (data.start_date) {
          const parsedStartDate = parseISO(data.start_date);
          if (isValid(parsedStartDate)) {
            setStartDate(parsedStartDate);
          }
        }
        
        if (data.end_date) {
          const parsedEndDate = parseISO(data.end_date);
          if (isValid(parsedEndDate)) {
            setEndDate(parsedEndDate);
          }
        }
        
        setStatus(data.status || 'active');
        setDiscountPercentage(data.discount_percentage?.toString() || '0');
        
        // Bölgeleri işle
        if (data.regions) {
          if (data.regions === 'all') {
            // Tüm bölgeler seçilecek, ancak allRegions dolduktan sonra yapılacak
          } else {
            try {
              const regions = JSON.parse(data.regions);
              if (Array.isArray(regions)) {
                setSelectedRegions(regions);
              }
            } catch (e) {
              console.error('Bölge bilgisi parse edilemedi:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Kampanya bilgisi alınamadı:', error);
      Alert.alert('Hata', 'Kampanya bilgisi yüklenemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRegions = async () => {
    try {
      const { data, error } = await supabase
        .from('regions')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setAllRegions(data || []);
    } catch (error) {
      console.error('Bölge bilgisi alınamadı:', error);
      Alert.alert('Hata', 'Bölge bilgisi yüklenemedi.');
    }
  };

  const toggleRegion = (regionId: number) => {
    setSelectedRegions(prevRegions => {
      if (prevRegions.includes(regionId)) {
        return prevRegions.filter(id => id !== regionId);
      } else {
        return [...prevRegions, regionId];
      }
    });
    setRegionError('');
  };

  const toggleAllRegions = () => {
    if (selectedRegions.length === allRegions.length) {
      setSelectedRegions([]);
    } else {
      setSelectedRegions(allRegions.map(region => region.id));
    }
    setRegionError('');
  };

  const validateForm = () => {
    let isValid = true;
    
    // İsim kontrolü
    if (!name.trim()) {
      setNameError('Kampanya adı gereklidir');
      isValid = false;
    } else {
      setNameError('');
    }
    
    // Bölge kontrolü
    if (selectedRegions.length === 0) {
      setRegionError('En az bir bölge seçilmelidir');
      isValid = false;
    } else {
      setRegionError('');
    }
    
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      setSubmitting(true);
      
      const updateData = {
        name,
        description,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status,
        discount_percentage: parseFloat(discountPercentage) || 0,
        regions: selectedRegions.length === allRegions.length ? 'all' : JSON.stringify(selectedRegions),
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', campaignId);
      
      if (error) throw error;
      
      Alert.alert('Başarılı', 'Kampanya başarıyla güncellendi.', [
        { text: 'Tamam', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Kampanya güncellenemedi:', error);
      Alert.alert('Hata', 'Kampanya güncellenirken bir sorun oluştu. Lütfen tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return format(date, 'dd.MM.yyyy', { locale: tr });
  };

  if (loading) {
    return (
      <SafeAreaWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Kampanya bilgileri yükleniyor...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView style={styles.scrollContainer}>
          <Card style={styles.card}>
            <Card.Title title="Kampanya Düzenle" />
            <Card.Content>
              <TextInput
                label="Kampanya Adı"
                value={name}
                onChangeText={text => {
                  setName(text);
                  setNameError('');
                }}
                style={styles.input}
                error={!!nameError}
              />
              {nameError ? <HelperText type="error">{nameError}</HelperText> : null}
              
              <TextInput
                label="Açıklama"
                value={description}
                onChangeText={setDescription}
                style={styles.input}
                multiline
                numberOfLines={3}
              />
              
              <View style={styles.datePickerContainer}>
                <Text style={styles.label}>Başlangıç Tarihi:</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text>{formatDate(startDate)}</Text>
                </TouchableOpacity>
                
                {showStartDatePicker && (
                  <DateTimePicker
                    value={startDate}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowStartDatePicker(false);
                      if (selectedDate) {
                        setStartDate(selectedDate);
                      }
                    }}
                  />
                )}
              </View>
              
              <View style={styles.datePickerContainer}>
                <Text style={styles.label}>Bitiş Tarihi:</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Text>{formatDate(endDate)}</Text>
                </TouchableOpacity>
                
                {showEndDatePicker && (
                  <DateTimePicker
                    value={endDate}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowEndDatePicker(false);
                      if (selectedDate) {
                        setEndDate(selectedDate);
                      }
                    }}
                  />
                )}
              </View>
              
              <TextInput
                label="İndirim Oranı (%)"
                value={discountPercentage}
                onChangeText={text => {
                  // Sadece sayıları kabul et
                  const filteredText = text.replace(/[^0-9.]/g, '');
                  setDiscountPercentage(filteredText);
                }}
                style={styles.input}
                keyboardType="numeric"
              />
              
              <View style={styles.statusContainer}>
                <Text style={styles.label}>Durum:</Text>
                <View style={styles.chipContainer}>
                  <Chip
                    selected={status === 'active'}
                    onPress={() => setStatus('active')}
                    style={styles.statusChip}
                    textStyle={{ color: status === 'active' ? 'white' : theme.colors.primary }}
                  >
                    Aktif
                  </Chip>
                  <Chip
                    selected={status === 'inactive'}
                    onPress={() => setStatus('inactive')}
                    style={styles.statusChip}
                    textStyle={{ color: status === 'inactive' ? 'white' : '#6B7280' }}
                  >
                    Pasif
                  </Chip>
                </View>
              </View>
              
              <Divider style={styles.divider} />
              
              <Text style={styles.regionsTitle}>Kampanyanın Geçerli Olduğu Bölgeler:</Text>
              {regionError ? <HelperText type="error">{regionError}</HelperText> : null}
              
              <Chip
                selected={selectedRegions.length === allRegions.length}
                onPress={toggleAllRegions}
                style={styles.allRegionsChip}
              >
                {selectedRegions.length === allRegions.length ? 'Tüm Bölgeler (Seçili)' : 'Tüm Bölgeleri Seç'}
              </Chip>
              
              <View style={styles.regionsContainer}>
                {allRegions.map(region => (
                  <Chip
                    key={region.id}
                    selected={selectedRegions.includes(region.id)}
                    onPress={() => toggleRegion(region.id)}
                    style={styles.regionChip}
                  >
                    {region.name}
                  </Chip>
                ))}
              </View>
            </Card.Content>
          </Card>
          
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting}
              style={styles.submitButton}
            >
              Kampanyayı Güncelle
            </Button>
            
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={styles.cancelButton}
              disabled={submitting}
            >
              İptal
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  datePickerContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#4B5563',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    padding: 12,
    backgroundColor: 'white',
  },
  statusContainer: {
    marginVertical: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  statusChip: {
    marginRight: 8,
  },
  divider: {
    marginVertical: 16,
  },
  regionsTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
    color: '#4B5563',
  },
  regionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  regionChip: {
    margin: 4,
  },
  allRegionsChip: {
    marginBottom: 8,
  },
  buttonContainer: {
    marginBottom: 24,
  },
  submitButton: {
    marginBottom: 12,
  },
  cancelButton: {
    borderColor: '#6B7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
});

export default EditCampaign; 