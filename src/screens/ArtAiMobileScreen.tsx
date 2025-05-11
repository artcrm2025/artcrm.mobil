import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Platform,
  Keyboard,
  FlatList
} from 'react-native';
import {
  Appbar,
  Text,
  Surface,
  TextInput,
  Divider,
  ActivityIndicator,
  useTheme,
  Chip,
  Menu
} from 'react-native-paper';
import { SafeAreaWrapper } from '../components/SafeAreaWrapper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getCurrentUser } from '../services/authService';
import { User } from '../types';
import { chatWithAI, PromptType, Message as AIMessage } from '../services/aiService';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

// Sohbet ekranı ana bileşeni
export const ArtAiMobileScreen: React.FC = () => {
  const theme = useTheme();
  const [messages, setMessages] = useState<AIMessage[]>([
    { 
      id: Date.now().toString(), 
      sender: 'ai', 
      text: 'Merhaba! Ben ART AI. Size nasıl yardımcı olabilirim?',
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedMode, setSelectedMode] = useState<PromptType>('chat');
  const scrollViewRef = useRef<FlatList>(null);
  
  // Sisteme yüklenen verileri takip etmek için bilgi
  const [systemInfo, setSystemInfo] = useState({
    loadedData: true,
    clinicsCount: 0,
    usersCount: 0,
    proposalsCount: 0
  });

  // Kullanıcı bilgilerini yükle
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Kullanıcı bilgisi alınamadı:', error);
      }
    };
    fetchUser();
  }, []);

  // Mesaj göndermeyi işle
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date().toISOString(),
      type: selectedMode
    };

    // Kullanıcı mesajını ekle ve input'u temizle
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    Keyboard.dismiss();
    setIsLoading(true);

    try {
      // Mevcut mesajları AI'a gönder
      const allMessages = [...messages, userMessage];
      const response = await chatWithAI(allMessages, getSystemPromptForMode(selectedMode));

      // AI yanıtını ekle
      if (response && response.result) {
        const aiMessage: AIMessage = {
          id: Date.now().toString(),
          text: response.result,
          sender: 'ai',
          timestamp: new Date().toISOString(),
          type: selectedMode
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('AI hatası:', error);
      // Hata mesajı ekle
      const errorMessage: AIMessage = {
        id: Date.now().toString(),
        text: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
        sender: 'ai',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // Mesaj listesinin en altına kaydır
      setTimeout(() => scrollToBottom(), 100);
    }
  };

  // Seçilen moda göre sistem prompt'u al
  const getSystemPromptForMode = (mode: PromptType): string => {
    switch (mode) {
      case 'crm_analysis':
        return 'CRM sistemlerini derinlemesine analiz edebilen bir uzman AI asistansın. Müşteri ilişkileri, satış süreçleri ve veri analizi konusunda geniş bilgiye sahipsin.';
      case 'customer_behavior':
        return 'Müşteri davranışları konusunda uzmanlaşmış bir AI asistansın. Davranış psikolojisi, motivasyon faktörleri ve satın alma eğilimleri hakkında bilgi verebilirsin.';
      case 'sales_forecast':
        return 'Satış tahminleri ve trend analizi konusunda uzmanlaşmış bir AI asistansın. Veri modellemesi, tahmin algoritmaları ve pazar analizi yapabilirsin.';
      case 'clinic_analysis':
        return 'Klinik performansı ve sağlık sektörü analizi konusunda uzmanlaşmış bir AI asistansın. Verimlilik, hasta memnuniyeti ve operasyonel iyileştirmeler önerebilirsin.';
      case 'product_recommendation':
        return 'Medikal ürün uzmanı bir AI asistansın. Hastalar ve klinikler için en uygun ürünleri önerebilir, detaylı karşılaştırmalar yapabilirsin.';
      case 'proposal_draft':
        return 'Profesyonel teklif yazarı bir AI asistansın. İkna edici, kapsamlı ve net teklifler hazırlayabilirsin.';
      case 'meeting_summary':
        return 'Toplantı notlarını özetleme konusunda uzmanlaşmış bir AI asistansın. Karmaşık konuları net, kısa ve anlaşılır özetlere dönüştürebilirsin.';
      default:
        return 'ART CRM sisteminde bir yardımcı AI asistansın. Kullanıcılara CRM, satış, pazarlama ve müşteri ilişkileri konularında yardımcı olabilirsin.';
    }
  };

  // Mesaj listesinin en altına kaydır
  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  // Mod değiştirmeyi işle
  const handleModeChange = (mode: PromptType) => {
    setSelectedMode(mode);
    setMenuVisible(false);
    
    // Mod değişikliği mesajı
    const modeChangeMessage: AIMessage = {
      id: Date.now().toString(),
      text: `Mod değiştirildi: ${getModeDisplayName(mode)}. Bu modda size nasıl yardımcı olabilirim?`,
      sender: 'ai',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, modeChangeMessage]);
  };

  // Mod adını görüntüleme metni olarak al
  const getModeDisplayName = (mode: PromptType): string => {
    switch (mode) {
      case 'crm_analysis': return 'CRM Analizi';
      case 'customer_behavior': return 'Müşteri Davranışı';
      case 'sales_forecast': return 'Satış Tahmini';
      case 'meeting_summary': return 'Toplantı Özeti';
      case 'clinic_analysis': return 'Klinik Analizi';
      case 'product_recommendation': return 'Ürün Tavsiyesi';
      case 'proposal_draft': return 'Teklif Taslağı';
      case 'chat': return 'Genel Sohbet';
      default: return 'Varsayılan';
    }
  };

  // Sohbeti temizle
  const clearChat = () => {
    const welcomeMessage: AIMessage = {
      id: Date.now().toString(),
      text: 'Sohbet temizlendi. Size nasıl yardımcı olabilirim?',
      sender: 'ai',
      timestamp: new Date().toISOString()
    };
    setMessages([welcomeMessage]);
  };

  // Mesaj zamanını formatlayın
  const formatMessageTime = (timestamp: string): string => {
    try {
      return format(new Date(timestamp), 'HH:mm', { locale: tr });
    } catch (e) {
      return '';
    }
  };

  // Renderla
  return (
    <SafeAreaWrapper backgroundColor={theme.colors.background}>
      <View style={styles.container}>
        {/* Üst Araç Çubuğu */}
        <Appbar.Header>
          <Appbar.BackAction onPress={() => {}} />
          <Appbar.Content 
            title="ART AI Asistanı" 
            subtitle={`Mod: ${getModeDisplayName(selectedMode)}`} 
          />
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <Appbar.Action 
                icon="tune" 
                onPress={() => setMenuVisible(true)} 
                color={theme.colors.onSurface}
              />
            }
          >
            <Menu.Item onPress={() => handleModeChange('chat')} title="Genel Sohbet" />
            <Menu.Item onPress={() => handleModeChange('crm_analysis')} title="CRM Analizi" />
            <Menu.Item onPress={() => handleModeChange('customer_behavior')} title="Müşteri Davranışı" />
            <Menu.Item onPress={() => handleModeChange('sales_forecast')} title="Satış Tahmini" />
            <Menu.Item onPress={() => handleModeChange('meeting_summary')} title="Toplantı Özeti" />
            <Menu.Item onPress={() => handleModeChange('clinic_analysis')} title="Klinik Analizi" />
            <Menu.Item onPress={() => handleModeChange('product_recommendation')} title="Ürün Tavsiyesi" />
            <Menu.Item onPress={() => handleModeChange('proposal_draft')} title="Teklif Taslağı" />
            <Divider />
            <Menu.Item onPress={clearChat} title="Sohbeti Temizle" />
          </Menu>
        </Appbar.Header>
        
        {/* Mod bilgisi */}
        <View style={styles.modeBanner}>
          <Chip 
            icon={() => <MaterialCommunityIcons name="robot" size={16} color={theme.colors.primary} />}
            mode="outlined"
            style={styles.modeChip}
          >
            {getModeDisplayName(selectedMode)}
          </Chip>
          
          {systemInfo.loadedData && (
            <Text style={styles.systemInfo}>
              Sistem yüklendi: {systemInfo.clinicsCount} klinik, {systemInfo.proposalsCount} teklif
            </Text>
          )}
        </View>

        {/* Mesaj Listesi */}
        <FlatList
          ref={scrollViewRef}
          data={messages}
          keyExtractor={(item) => item.id}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesList}
          renderItem={({item}) => (
            <Surface 
              style={[
                styles.messageBubble, 
                item.sender === 'user' ? styles.userMessage : styles.aiMessage
              ]}
              elevation={1}
            >
              <Text style={styles.messageText}>{item.text}</Text>
              <Text style={styles.timestampText}>{formatMessageTime(item.timestamp)}</Text>
            </Surface>
          )}
          onContentSizeChange={scrollToBottom}
        />
        
        {/* Yükleniyor Göstergesi */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator animating size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>AI düşünüyor...</Text>
          </View>
        )}
        
        {/* Mesaj Giriş Alanı */}
        <View style={styles.inputContainer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Bir mesaj yazın..."
            style={styles.input}
            mode="outlined"
            right={
              isLoading ? (
                <TextInput.Icon icon="loading" color={theme.colors.primary} />
              ) : (
                input.trim() ? (
                  <TextInput.Icon 
                    icon="send-circle" 
                    color={theme.colors.primary}
                    onPress={handleSendMessage} 
                  />
                ) : null
              )
            }
            disabled={isLoading}
            onSubmitEditing={handleSendMessage}
            blurOnSubmit={false}
            multiline
          />
        </View>
      </View>
    </SafeAreaWrapper>
  );
};

// Stil tanımları
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  modeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modeChip: {
    height: 36,
  },
  systemInfo: {
    fontSize: 12,
    color: '#757575',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  userMessage: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
    backgroundColor: '#E1F5FE',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    backgroundColor: '#F5F5F5',
  },
  messageText: {
    fontSize: 16,
  },
  timestampText: {
    fontSize: 10,
    color: '#9E9E9E',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#757575',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    backgroundColor: '#fff',
  },
}); 