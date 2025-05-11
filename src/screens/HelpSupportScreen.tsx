import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Appbar, Text, List, Divider, Button, Card, TextInput, useTheme, Chip, ActivityIndicator, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getCurrentUser } from '../services/authService';
import { Linking } from 'react-native';

// SSS veri yapısı
interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
}

// SSS listesi
const faqs: FAQ[] = [
  {
    id: 1,
    question: 'Şifremi unuttum, ne yapmalıyım?',
    answer: 'Giriş ekranında "Şifremi Unuttum" bağlantısını tıklayarak e-posta adresinize sıfırlama bağlantısı gönderebilirsiniz.',
    category: 'hesap'
  },
  {
    id: 2,
    question: 'Yeni bir teklif nasıl oluşturabilirim?',
    answer: 'Teklifler ekranında sağ alt köşedeki + butonuna tıklayarak yeni bir teklif oluşturabilirsiniz. Gerekli alanları doldurduktan sonra "Kaydet" düğmesine basın.',
    category: 'teklif'
  },
  {
    id: 3,
    question: 'Bildirim ayarlarımı nasıl değiştirebilirim?',
    answer: 'Ayarlar ekranında "Bildirimler" bölümünden tüm bildirim tercihlerinizi düzenleyebilirsiniz.',
    category: 'ayarlar'
  },
  {
    id: 4,
    question: 'Ziyaret/ameliyat raporuna fotoğraf nasıl eklerim?',
    answer: 'Rapor oluşturma veya düzenleme ekranında "Fotoğraf Ekle" butonuna tıklayarak galeriden seçim yapabilir veya kamera ile yeni bir fotoğraf çekebilirsiniz.',
    category: 'raporlar'
  },
  {
    id: 5,
    question: 'Klinik bilgilerini nasıl güncelleyebilirim?',
    answer: 'Klinik Yönetimi ekranında güncellemek istediğiniz kliniğin üzerine tıklayarak düzenleme moduna geçebilirsiniz.',
    category: 'klinik'
  },
  {
    id: 6,
    question: 'Farklı bir bölgeye nasıl geçiş yapabilirim?',
    answer: 'Bölge değişikliği için yöneticinizle iletişime geçmeniz gerekmektedir. Bölge atamaları yönetici tarafından yapılmaktadır.',
    category: 'hesap'
  },
  {
    id: 7,
    question: 'Ürün kataloğuna nasıl erişebilirim?',
    answer: 'Ana ekranda "Ürün Kataloğu" bölümüne tıklayarak tüm ürünlerimizi görüntüleyebilirsiniz.',
    category: 'ürünler'
  },
  {
    id: 8,
    question: 'Raporlarımı PDF olarak nasıl indirebilirim?',
    answer: 'Herhangi bir rapor detay sayfasında "PDF İndir" seçeneğini kullanarak raporu dışa aktarabilirsiniz.',
    category: 'raporlar'
  }
];

export const HelpSupportScreen = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  
  // Destek formu için state
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [contactName, setContactName] = useState('');
  
  // Filtre için state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Snackbar için state
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Kategori listesi
  const categories = ['hesap', 'teklif', 'raporlar', 'klinik', 'ürünler', 'ayarlar'];
  
  // Kullanım kılavuzu linkleri
  const userGuideLinks = [
    { title: 'Başlangıç Rehberi', icon: 'book-open-variant', url: 'https://art-meets.com/docs/guide' },
    { title: 'Video Eğitimleri', icon: 'video', url: 'https://art-meets.com/docs/videos' },
    { title: 'Sistem Gereksinimleri', icon: 'laptop', url: 'https://art-meets.com/docs/requirements' },
    { title: 'API Dokümantasyonu', icon: 'code-json', url: 'https://art-meets.com/docs/api' }
  ];
  
  React.useEffect(() => {
    loadUserData();
  }, []);
  
  const loadUserData = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        setEmail(user.email);
        setContactName(user.name);
      }
    } catch (error) {
      console.error('Kullanıcı bilgileri yüklenirken hata:', error);
    }
  };
  
  const toggleFaq = (id: number) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };
  
  const filterFaqsByCategory = (faqs: FAQ[]) => {
    if (!selectedCategory) return faqs;
    return faqs.filter(faq => faq.category === selectedCategory);
  };
  
  const sendSupportRequest = async () => {
    if (!subject.trim()) {
      Alert.alert('Uyarı', 'Lütfen bir konu belirtiniz');
      return;
    }
    
    if (!message.trim()) {
      Alert.alert('Uyarı', 'Lütfen mesajınızı yazınız');
      return;
    }
    
    try {
      setLoading(true);
      
      // Burada gerçek uygulamada API'ye istek gönderilecek
      // Demo amaçlı gecikme ekliyoruz
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Form alanlarını temizle
      setSubject('');
      setMessage('');
      
      // Başarı mesajı göster
      showSnackbar('Destek talebiniz başarıyla gönderildi. En kısa sürede sizinle iletişime geçeceğiz.');
    } catch (error) {
      console.error('Destek talebi gönderilirken hata:', error);
      Alert.alert('Hata', 'Destek talebi gönderilirken bir sorun oluştu');
    } finally {
      setLoading(false);
    }
  };
  
  const openUserGuide = (url: string) => {
    Linking.openURL(url).catch(err => {
      console.error('URL açılırken hata oluştu:', err);
      Alert.alert('Hata', 'Bağlantı açılamadı');
    });
  };
  
  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };
  
  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'hesap': return 'Hesap';
      case 'teklif': return 'Teklif';
      case 'raporlar': return 'Raporlar';
      case 'klinik': return 'Klinik';
      case 'ürünler': return 'Ürünler';
      case 'ayarlar': return 'Ayarlar';
      default: return category;
    }
  };
  
  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'hesap': return 'account';
      case 'teklif': return 'file-document';
      case 'raporlar': return 'clipboard-text';
      case 'klinik': return 'hospital-building';
      case 'ürünler': return 'package-variant';
      case 'ayarlar': return 'cog';
      default: return 'help-circle';
    }
  };
  
  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Yardım ve Destek" />
      </Appbar.Header>
      
      <ScrollView>
        {/* SSS Bölümü */}
        <Card style={styles.sectionCard}>
          <Card.Title title="Sık Sorulan Sorular" />
          <Card.Content>
            <Text style={styles.sectionDescription}>
              En çok sorulan soruların yanıtlarını aşağıda bulabilirsiniz.
            </Text>
            
            {/* Kategori filtreleri */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
              <Chip 
                mode={selectedCategory === null ? 'flat' : 'outlined'}
                selected={selectedCategory === null}
                onPress={() => setSelectedCategory(null)}
                style={styles.categoryChip}
              >
                Tümü
              </Chip>
              {categories.map(category => (
                <Chip 
                  key={category}
                  mode={selectedCategory === category ? 'flat' : 'outlined'}
                  selected={selectedCategory === category}
                  onPress={() => setSelectedCategory(category)}
                  style={styles.categoryChip}
                  icon={() => <MaterialCommunityIcons name={getCategoryIcon(category)} size={16} color={theme.colors.primary} />}
                >
                  {getCategoryLabel(category)}
                </Chip>
              ))}
            </ScrollView>
            
            {/* FAQ Listesi */}
            {filterFaqsByCategory(faqs).map(faq => (
              <View key={faq.id} style={styles.faqItem}>
                <TouchableOpacity
                  style={styles.faqQuestion}
                  onPress={() => toggleFaq(faq.id)}
                >
                  <View style={styles.faqTitleRow}>
                    <MaterialCommunityIcons 
                      name={getCategoryIcon(faq.category)} 
                      size={20} 
                      color={theme.colors.primary} 
                      style={styles.faqIcon}
                    />
                    <Text style={styles.faqQuestionText}>{faq.question}</Text>
                  </View>
                  <MaterialCommunityIcons 
                    name={expandedFaq === faq.id ? 'chevron-up' : 'chevron-down'} 
                    size={24} 
                    color={theme.colors.primary} 
                  />
                </TouchableOpacity>
                
                {expandedFaq === faq.id && (
                  <View style={styles.faqAnswer}>
                    <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                  </View>
                )}
                
                <Divider style={styles.faqDivider} />
              </View>
            ))}
          </Card.Content>
        </Card>
        
        {/* Kullanım Kılavuzu Bölümü */}
        <Card style={styles.sectionCard}>
          <Card.Title title="Kullanım Kılavuzu" />
          <Card.Content>
            <Text style={styles.sectionDescription}>
              Uygulama kullanımı hakkında detaylı bilgi için aşağıdaki kaynaklara göz atabilirsiniz.
            </Text>
            
            <View style={styles.guideLinksContainer}>
              {userGuideLinks.map((guide, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.guideItem}
                  onPress={() => openUserGuide(guide.url)}
                >
                  <MaterialCommunityIcons name={guide.icon} size={24} color={theme.colors.primary} />
                  <Text style={styles.guideItemText}>{guide.title}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </View>
          </Card.Content>
        </Card>
        
        {/* Destek Talebi Formu */}
        <Card style={styles.sectionCard}>
          <Card.Title title="Destek Talebi" />
          <Card.Content>
            <Text style={styles.sectionDescription}>
              Sorularınız veya sorunlarınız için aşağıdaki formu doldurarak bize ulaşabilirsiniz.
            </Text>
            
            <TextInput
              mode="outlined"
              label="Ad Soyad"
              value={contactName}
              onChangeText={setContactName}
              style={styles.input}
              disabled
            />
            
            <TextInput
              mode="outlined"
              label="E-posta"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              disabled
            />
            
            <TextInput
              mode="outlined"
              label="Konu"
              value={subject}
              onChangeText={setSubject}
              style={styles.input}
            />
            
            <TextInput
              mode="outlined"
              label="Mesajınız"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              style={styles.textArea}
            />
            
            <Button 
              mode="contained" 
              onPress={sendSupportRequest}
              loading={loading}
              disabled={loading}
              style={styles.submitButton}
              icon="send"
            >
              Gönder
            </Button>
          </Card.Content>
        </Card>
        
        {/* İletişim Bilgileri */}
        <Card style={styles.sectionCard}>
          <Card.Title title="İletişim Bilgileri" />
          <Card.Content>
            <View style={styles.contactItem}>
              <MaterialCommunityIcons name="email" size={24} color={theme.colors.primary} style={styles.contactIcon} />
              <View>
                <Text style={styles.contactLabel}>E-posta</Text>
                <Text style={styles.contactValue}>destek@art-meets.com</Text>
              </View>
            </View>
            
            <View style={styles.contactItem}>
              <MaterialCommunityIcons name="phone" size={24} color={theme.colors.primary} style={styles.contactIcon} />
              <View>
                <Text style={styles.contactLabel}>Telefon</Text>
                <Text style={styles.contactValue}>+90 212 123 4567</Text>
              </View>
            </View>
            
            <View style={styles.contactItem}>
              <MaterialCommunityIcons name="clock" size={24} color={theme.colors.primary} style={styles.contactIcon} />
              <View>
                <Text style={styles.contactLabel}>Çalışma Saatleri</Text>
                <Text style={styles.contactValue}>Pazartesi - Cuma, 09:00 - 18:00</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
      
      {/* Bildirim Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={5000}
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
  sectionCard: {
    margin: 12,
    elevation: 2,
  },
  sectionDescription: {
    color: '#6B7280',
    marginBottom: 16,
  },
  categoriesContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  categoryChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  faqItem: {
    marginBottom: 4,
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  faqTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  faqIcon: {
    marginRight: 8,
  },
  faqQuestionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
  faqAnswer: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 8,
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#4B5563',
  },
  faqDivider: {
    marginVertical: 4,
  },
  guideLinksContainer: {
    marginTop: 8,
  },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  guideItemText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  textArea: {
    marginBottom: 16,
    backgroundColor: 'white',
    height: 120,
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  contactIcon: {
    marginRight: 16,
  },
  contactLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  contactValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
}); 