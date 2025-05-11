import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { 
  Text, 
  TextInput, 
  Button, 
  Card, 
  Title, 
  Paragraph, 
  Divider,
  Chip,
  Switch,
  useTheme,
  RadioButton,
  ActivityIndicator
} from 'react-native-paper';
import { analyzeWithAI, PromptType, AIParameters, ContextData } from '../services/aiService';
import { SafeAreaWrapper } from '../components/SafeAreaWrapper';

export const AITestScreen: React.FC = () => {
  const theme = useTheme();
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [rawResult, setRawResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [promptType, setPromptType] = useState<PromptType>('default');
  const [temperature, setTemperature] = useState(0.7);
  const [showRaw, setShowRaw] = useState(false);
  const [contextData, setContextData] = useState('');
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const handleAnalyze = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult('');
    setRawResult(null);
    
    try {
      let parsedContextData: ContextData = {};
      if (contextData.trim()) {
        try {
          parsedContextData = JSON.parse(contextData);
        } catch (e) {
          setError('Bağlam verisi geçerli JSON formatında değil!');
          return;
        }
      }
      
      const startTime = Date.now();
      const response = await analyzeWithAI(
        prompt, 
        promptType, 
        { temperature } as AIParameters, 
        parsedContextData
      );
      const endTime = Date.now();
      
      setResponseTime(endTime - startTime);
      
      if (response.error) {
        setError(response.error);
        return;
      }
      
      setResult(response.result);
      setRawResult(response.raw);
    } catch (error: any) {
      console.error('AI test hatası:', error);
      setError(error.message || 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  };
  
  const promptTypes = [
    { label: 'Varsayılan', value: 'default' },
    { label: 'CRM Analizi', value: 'crm_analysis' },
    { label: 'Müşteri Davranışı', value: 'customer_behavior' },
    { label: 'Satış Tahmini', value: 'sales_forecast' },
    { label: 'Toplantı Özeti', value: 'meeting_summary' },
    { label: 'Klinik Analizi', value: 'clinic_analysis' },
    { label: 'Ürün Tavsiyesi', value: 'product_recommendation' },
    { label: 'Teklif Taslağı', value: 'proposal_draft' },
  ];
  
  const getPromptTypeDescription = (type: PromptType): string => {
    switch(type) {
      case 'crm_analysis':
        return 'CRM verilerini analiz eder ve önerilerde bulunur';
      case 'customer_behavior':
        return 'Müşteri davranışlarını analiz eder ve motivasyonlarını açıklar';
      case 'sales_forecast':
        return 'Satış verilerini analiz eder ve tahminler yapar';
      case 'meeting_summary':
        return 'Toplantı notlarını özetler ve aksiyon maddelerini belirler';
      case 'clinic_analysis':
        return 'Klinik performansını değerlendirir ve iyileştirme önerileri sunar';
      case 'product_recommendation':
        return 'Belirli bir duruma uygun ürün önerileri verir';
      case 'proposal_draft':
        return 'Teklif taslağı oluşturur';
      default:
        return 'Genel metin analizi ve yanıtı';
    }
  };
  
  const getExamplePrompt = (type: PromptType): string => {
    switch(type) {
      case 'crm_analysis':
        return 'Son 3 ayda müşteri kaybı %15 arttı ve ortalama sipariş değeri %10 düştü.';
      case 'customer_behavior':
        return 'Müşteri ürünümüzü 2 kere inceledi ama satın almadı. Web sitesinde 10 dakika geçirdi.';
      case 'sales_forecast':
        return 'Son 6 ayda satışlar: Ocak 120K, Şubat 125K, Mart 130K, Nisan 118K, Mayıs 140K, Haziran 145K';
      case 'meeting_summary':
        return 'Toplantıda yeni ürün lansmanı, fiyatlandırma stratejisi ve pazarlama bütçesi konuşuldu. Ali sosyal medya kampanyasını hazırlayacak. Metin ürün özelliklerini tamamlayacak. Lansman tarihi 15 Ekim olarak belirlendi.';
      case 'clinic_analysis':
        return 'Kliniğimiz ayda ortalama 250 hasta görüyor. Randevu iptal oranı %20. Hasta memnuniyeti puanı 4.2/5. En çok talep gören tedavi implant (%40).';
      case 'product_recommendation':
        return 'Hastamız 45 yaşında, diyabet hastası, diş eti problemleri var. Uygun bir ağız bakım ürünü arıyoruz.';
      case 'proposal_draft':
        return 'ABC Diş Kliniği için 3 ünitlik implant sistemi, 2 adet dijital tarayıcı ve yıllık bakım hizmeti içeren bir teklif hazırlanacak.';
      default:
        return 'Bu ürünün en önemli özellikleri nelerdir?';
    }
  };
  
  const getExampleContextData = (type: PromptType): string => {
    switch(type) {
      case 'customer_behavior':
        return JSON.stringify({
          customerHistory: "Bu müşteri 2 yıldır sistemimizde, toplam 5 sipariş verdi.",
          productInfo: "İncelediği ürün yüksek fiyatlı premium kategoride."
        }, null, 2);
      case 'clinic_analysis':
        return JSON.stringify({
          region: "İstanbul Anadolu Yakası",
          performance: "Geçen yıla göre %10 büyüme"
        }, null, 2);
      default:
        return '';
    }
  };
  
  useEffect(() => {
    // Prompt tipi değiştiğinde örnek metni ver
    if (prompt === '' || prompt === getExamplePrompt(promptType as PromptType)) {
      setPrompt(getExamplePrompt(promptType as PromptType));
    }
    
    // Bağlam verisini güncelle
    const exampleContext = getExampleContextData(promptType as PromptType);
    if (exampleContext && contextData === '') {
      setContextData(exampleContext);
    }
  }, [promptType]);
  
  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setResult('');
    setRawResult(null);
    
    try {
      let parsedContextData: ContextData = {};
      if (contextData.trim()) {
        try {
          parsedContextData = JSON.parse(contextData);
        } catch (e) {
          setError('Bağlam verisi geçerli JSON formatında değil!');
          return;
        }
      }
      
      const startTime = Date.now();
      const response = await analyzeWithAI(
        input, 
        promptType, 
        { temperature } as AIParameters, 
        parsedContextData
      );
      const endTime = Date.now();
      
      setResponseTime(endTime - startTime);
      
      if (response.error) {
        setError(response.error);
        return;
      }
      
      setResult(response.result);
      setRawResult(response.raw);
    } catch (error: any) {
      console.error('AI test hatası:', error);
      setError(error.message || 'Bilinmeyen hata');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <SafeAreaWrapper backgroundColor={theme.colors.background}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <Card style={styles.card}>
          <Card.Content>
            <Title>AI Test Aracı</Title>
            <Paragraph>Bu ekranda AI servisini test edebilirsiniz.</Paragraph>
            
            <Text style={styles.label}>Prompt Tipi:</Text>
            <RadioButton.Group 
              onValueChange={value => setPromptType(value as PromptType)} 
              value={promptType}
            >
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promptTypeContainer}>
                {promptTypes.map(type => (
                  <Chip
                    key={type.value}
                    selected={promptType === type.value}
                    onPress={() => setPromptType(type.value as PromptType)}
                    style={styles.promptTypeChip}
                    mode={promptType === type.value ? 'flat' : 'outlined'}
                  >
                    {type.label}
                  </Chip>
                ))}
              </ScrollView>
            </RadioButton.Group>
            
            <Paragraph style={styles.promptDescription}>
              {getPromptTypeDescription(promptType as PromptType)}
            </Paragraph>
            
            <Text style={styles.label}>Sıcaklık (Yaratıcılık):</Text>
            <View style={styles.temperatureContainer}>
              <Text>0.1</Text>
              <TextInput
                value={temperature.toString()}
                onChangeText={(text) => {
                  const value = parseFloat(text);
                  if (!isNaN(value) && value >= 0 && value <= 1) {
                    setTemperature(value);
                  }
                }}
                keyboardType="numeric"
                style={styles.temperatureInput}
                mode="outlined"
              />
              <Text>1.0</Text>
            </View>
            
            <Text style={styles.label}>Bağlam Verileri (JSON):</Text>
            <TextInput
              value={contextData}
              onChangeText={setContextData}
              placeholder='{"key": "value"}'
              multiline
              numberOfLines={4}
              style={styles.jsonInput}
              mode="outlined"
            />
            
            <Text style={styles.label}>Prompt Metni:</Text>
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              placeholder="Prompt metnini buraya girin..."
              multiline
              numberOfLines={4}
              style={styles.input}
              mode="outlined"
            />
            
            <Button 
              mode="contained" 
              onPress={handleAnalyze} 
              style={styles.button}
              loading={loading}
              disabled={loading || !prompt.trim()}
            >
              {loading ? 'AI Yanıtlıyor...' : 'AI\'ya Gönder'}
            </Button>
          </Card.Content>
        </Card>
        
        {error && (
          <Card style={[styles.card, styles.errorCard]}>
            <Card.Content>
              <Title>Hata</Title>
              <Paragraph>{error}</Paragraph>
            </Card.Content>
          </Card>
        )}
        
        {(result || loading) && (
          <Card style={styles.card}>
            <Card.Content>
              <Title>AI Yanıtı</Title>
              {responseTime !== null && <Paragraph style={styles.responseTime}>Yanıt süresi: {responseTime}ms</Paragraph>}
              <Divider style={styles.divider} />
              
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>AI düşünüyor...</Text>
                </View>
              ) : (
                <View>
                  <Paragraph style={styles.resultText}>{result}</Paragraph>
                  
                  <View style={styles.showRawContainer}>
                    <Text>Ham yanıtı göster</Text>
                    <Switch
                      value={showRaw}
                      onValueChange={setShowRaw}
                    />
                  </View>
                  
                  {showRaw && rawResult && (
                    <ScrollView style={styles.rawResultContainer}>
                      <Paragraph style={styles.rawResultText}>
                        {JSON.stringify(rawResult, null, 2)}
                      </Paragraph>
                    </ScrollView>
                  )}
                </View>
              )}
            </Card.Content>
          </Card>
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
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  errorCard: {
    backgroundColor: '#FFEBEE',
  },
  label: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  jsonInput: {
    marginBottom: 8,
    backgroundColor: '#F5F5F5',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  button: {
    marginTop: 16,
  },
  divider: {
    marginVertical: 16,
  },
  resultText: {
    lineHeight: 24,
  },
  rawResultContainer: {
    maxHeight: 300,
    marginTop: 16,
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 4,
  },
  rawResultText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
  showRawContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  temperatureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  temperatureInput: {
    flex: 1,
    marginHorizontal: 8,
    height: 40,
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  promptTypeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  promptTypeChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  promptDescription: {
    fontStyle: 'italic',
    marginBottom: 16,
  },
  responseTime: {
    fontStyle: 'italic',
    fontSize: 12,
    color: '#757575',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
}); 