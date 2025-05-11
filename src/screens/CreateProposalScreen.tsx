import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert, FlatList, I18nManager, TouchableOpacity } from 'react-native';
import { Text, Button, TextInput, HelperText, Appbar, ActivityIndicator, List, Chip, Divider, Portal, Modal, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Clinic, Product, User, Campaign } from '../types';
import { getCurrentUser } from '../services/authService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import DropDownPicker from 'react-native-dropdown-picker';
import { DatePickerModal } from 'react-native-paper-dates';
import { SingleChange } from 'react-native-paper-dates/lib/typescript/Date/Calendar';
import { tr } from 'date-fns/locale';
import { registerTranslation } from 'react-native-paper-dates';

// Türkçe dil desteğini manuel olarak ekleyin
registerTranslation('tr', {
  save: 'Kaydet',
  selectSingle: 'Bir tarih seç',
  selectMultiple: 'Birden fazla tarih seç',
  selectRange: 'Aralık seç',
  notAccordingToDateFormat: (inputFormat: string) =>
    `Tarih formatı şu şekilde olmalıdır: ${inputFormat}`,
  mustBeHigherThan: (date: string) => `Şu tarihten büyük olmalı: ${date}`,
  mustBeLowerThan: (date: string) => `Şu tarihten küçük olmalı: ${date}`,
  mustBeBetween: (startDate: string, endDate: string) =>
    `Tarih şu aralıkta olmalıdır: ${startDate} - ${endDate}`,
  dateIsDisabled: 'Bu tarih seçilemez',
  previous: 'Önceki',
  next: 'Sonraki',
  typeInDate: 'Tarihi girin',
  pickDateFromCalendar: 'Takvimden tarih seç',
  close: 'Kapat',
  hour: 'Saat',
  minute: 'Dakika'
} as any);

// Sağa sola yazma yönünü ayarlayın (Türkçe için soldan sağa olmalı)
I18nManager.forceRTL(false);
I18nManager.allowRTL(false);

interface ProposalItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number; // Orijinal para birimindeki birim fiyat
  product_currency: Currency; // Orijinal para birimi
  excess_percentage: number;
  total: number; // Seçili *teklif* para birimi cinsinden toplam
  original_total: number; // Orijinal para birimi cinsinden toplam
  excess?: boolean;
}

// Döviz Kurları (Şimdilik Sabit)
const exchangeRates: Record<string, Record<string, number>> = {
  TRY: { USD: 1 / 37.92, EUR: 1 / 40.94, TRY: 1 },
  USD: { TRY: 37.92, EUR: 37.92 / 40.94, USD: 1 },
  EUR: { TRY: 40.94, USD: 40.94 / 37.92, EUR: 1 },
};

// Para Birimi Türleri
type Currency = 'TRY' | 'USD' | 'EUR';

// Para Birimi Seçenekleri
const currencyOptions: {label: string, value: Currency}[] = [
  { label: 'Türk Lirası (TRY)', value: 'TRY' },
  { label: 'ABD Doları (USD)', value: 'USD' },
  { label: 'Euro (EUR)', value: 'EUR' },
];

// Ödeme Yöntemi Seçenekleri (Örnek)
const paymentMethodOptions = [
  { label: 'Nakit', value: 'cash' },
  { label: 'Kredi Kartı', value: 'credit_card' },
  { label: 'Banka Havalesi', value: 'bank_transfer' },
];

// Para birimi dönüştürme fonksiyonu (kullanılmadan önce tanımlanmalı)
const convertPrice = (amount: number, fromCurrency: string | undefined, toCurrency: Currency): number => {
  if (!fromCurrency) return amount; // Kaynak para birimi yoksa dönüştürme
  const rate = exchangeRates[fromCurrency]?.[toCurrency];
  if (rate) {
    return amount * rate;
  }
  console.warn(`Dönüşüm oranı bulunamadı: ${fromCurrency} -> ${toCurrency}`);
  return amount; // Oran yoksa aynı miktarı dön
};

// Tarih seçici modalı için tip tanımı
interface DatePickerModalProps {
  visible: boolean;
  onDismiss: () => void;
  date: Date;
  onConfirm: (date: Date) => void;
  locale: string;
}

export const CreateProposalScreen = () => {
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [clinicModalVisible, setClinicModalVisible] = useState(false);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [searchClinic, setSearchClinic] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  
  // Form state
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [proposalItems, setProposalItems] = useState<ProposalItem[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('TRY');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | undefined>(undefined);
  const [generalDiscount, setGeneralDiscount] = useState('0');
  const [downPaymentPercentage, setDownPaymentPercentage] = useState('0');
  const [notes, setNotes] = useState('');
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('0');
  const [excessPercentage, setExcessPercentage] = useState('0');
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [openCurrencyPicker, setOpenCurrencyPicker] = useState(false);
  const [openCampaignPicker, setOpenCampaignPicker] = useState(false);
  const [openPaymentMethodPicker, setOpenPaymentMethodPicker] = useState(false);
  const [openInstallmentPicker, setOpenInstallmentPicker] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(1);
  const [firstPaymentDate, setFirstPaymentDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const navigation = useNavigation();
  const theme = useTheme();
  const scrollViewRef = React.useRef<ScrollView>(null);

  // Genel düzen ve stil ayarları
  const screenBgColor = '#F9FAFB';
  const sectionBgColor = '#FFFFFF';
  const accentColor = theme.colors.primary;
  
  // Dropdown açıldığında scroll pozisyonunu ayarla
  useEffect(() => {
    if (openInstallmentPicker) {
      // Dropdown açıldığında bekleme süresi koyarak scrollun çalışmasını sağla
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [openInstallmentPicker]);

  // Vade seçenekleri
  const installmentOptions = [
    { label: 'Peşin', value: 1 },
    { label: '2 Taksit', value: 2 },
    { label: '3 Taksit', value: 3 },
    { label: '6 Taksit', value: 6 },
    { label: '9 Taksit', value: 9 },
    { label: '12 Taksit', value: 12 }
  ];

  // Taksit tutarını hesapla
  const calculateInstallmentAmount = (total: number, count: number) => {
    return total / count;
  };

  useEffect(() => {
    loadCurrentUser();
  }, []);
  
  useEffect(() => {
    // currentUser yüklendiğinde veya değiştiğinde verileri yükle
    if (currentUser) {
      console.log("Kullanıcı yüklendi, veriler yükleniyor...");
      fetchAllInitialData();
    } else {
      loadCurrentUser(); // Eğer currentUser null ise tekrar yüklemeyi dene
    }
  }, [currentUser]);

  const loadCurrentUser = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      console.log("Kullanıcı bilgileri yüklendi:", user);
      setCurrentUser(user);
    } catch (error) {
      console.error('Kullanıcı bilgileri yüklenirken hata:', error);
      Alert.alert('Hata', 'Kullanıcı bilgileri yüklenirken bir sorun oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllInitialData = async () => {
    setDataLoading(true);
    try {
      await Promise.all([
        fetchClinics(),
        fetchProducts(),
        fetchCampaigns(),
      ]);
      console.log("Tüm başlangıç verileri yüklendi.");
    } catch (error) {
      console.error('Başlangıç verileri yüklenirken genel hata:', error);
      Alert.alert('Hata', 'Gerekli veriler yüklenirken bir sorun oluştu.');
    } finally {
      setDataLoading(false);
    }
  };

  const fetchClinics = async () => {
    try {
      setLoading(true);
      
      if (!currentUser) {
        console.log("Kullanıcı bilgisi henüz yüklenemedi, klinikler yüklenemiyor");
        return; // Kullanıcı bilgisi yoksa işlemi durdur
      }
      
      console.log("Klinikler yükleniyor - Kullanıcı rolü:", currentUser.role, "Bölge ID:", currentUser.region_id);
      
      let query = supabase
        .from('clinics')
        .select('*')
        .eq('status', 'active')
        .order('name', { ascending: true });
      
      // Rol bazlı filtreleme
      if (currentUser.role === 'field_user' || currentUser.role === 'regional_manager') {
        // Saha kullanıcısı veya Bölge müdürü ise, sadece kendi bölgesindeki klinikleri getir
        if (currentUser.region_id) {
          console.log("Bölge filtrelemesi uygulanıyor, Bölge ID:", currentUser.region_id);
          query = query.eq('region_id', currentUser.region_id);
        } else {
          console.log("Bölge ID'si olmayan kullanıcı için bölge filtresi uygulanmıyor");
        }
      } else {
        console.log("Admin veya Manager rolü için bölge filtrelemesi yapılmayacak");
        // Admin veya manager ise tüm klinikleri getir
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Klinikler alınırken hata:', error);
        throw error;
      }
      
      console.log(`Klinikler yüklendi, toplam: ${data?.length || 0}`);
      if (data && data.length > 0) {
        console.log('İlk klinik:', data[0].name, 'Bölge ID:', data[0].region_id);
        console.log('Tüm klinikler:', JSON.stringify(data.map(c => ({ id: c.id, name: c.name }))));
      } else {
        console.log('Hiç klinik bulunamadı');
      }
      
      // Klinikleri state'e kaydet ve bir debug log ekle
      setClinics(data || []);
      setTimeout(() => {
        console.log('Klinikler state güncellendi, mevcut state:', clinics.length);
      }, 100);
    } catch (error) {
      console.error('Klinikler alınırken hata:', error);
      Alert.alert('Hata', 'Klinikler yüklenirken bir sorun oluştu');
    } finally {
      setLoading(false);
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

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'active');
      
      if (error) {
        console.error('Kampanyalar yüklenirken hata:', error);
        throw error;
      }
      
      console.log(`Kampanyalar yüklendi, toplam: ${data?.length || 0}`);
      setCampaigns(data || []);
    } catch (error) {
      console.error('Kampanyalar alınırken hata:', error);
    }
  };

  // Kampanyaya ait ürünleri getiren fonksiyon
  const fetchCampaignItems = async (campaignId: number): Promise<ProposalItem[]> => {
    console.log(`Kampanya ürünleri getiriliyor: ${campaignId}`);
    try {
      const { data: campaignItemsData, error: campaignItemsError } = await supabase
        .from('campaign_items')
        .select(`
          quantity,
          unit_price,
          excess_percentage,
          product:product_id (
            id,
            name,
            price, 
            currency
          )
        `)
        .eq('campaign_id', campaignId);

      if (campaignItemsError) {
        console.error('Kampanya ürünleri alınırken hata:', campaignItemsError);
        throw campaignItemsError;
      }

      if (!campaignItemsData) {
        return [];
      }

      console.log(`Kampanya ürünleri bulundu: ${campaignItemsData.length}`);

      // Gelen veriyi ProposalItem formatına map et
      const formattedItems: ProposalItem[] = campaignItemsData.map((item: any) => {
        const product = item.product;
        if (!product) return null; 

        const qtyNum = item.quantity || 1;
        const priceNum = item.unit_price || product.price || 0; 
        const excessPctNum = item.excess_percentage || 0;
        const productCurrency = product.currency as Currency || 'TRY';
        
        // Orijinal toplamı hesapla (ürünün kendi para biriminde)
        const originalTotalAmount = qtyNum * priceNum;

        // Teklif para birimine göre toplamı hesapla
        const totalAmountInSelectedCurrency = calculateItemTotal(
          qtyNum,
          priceNum,
          productCurrency,
          selectedCurrency 
        );

        return {
          product_id: product.id,
          product_name: product.name,
          quantity: qtyNum,
          unit_price: priceNum, 
          product_currency: productCurrency,
          excess_percentage: excessPctNum,
          total: totalAmountInSelectedCurrency, // Teklif para birimindeki toplam
          original_total: originalTotalAmount, // Orijinal toplam
        };
      }).filter((item): item is ProposalItem => item !== null); 

      return formattedItems;

    } catch (error) {
      console.error('fetchCampaignItems hatası:', error);
      Alert.alert('Hata', 'Kampanya ürünleri yüklenirken bir sorun oluştu.');
      return []; // Hata durumunda boş dizi dön
    }
  };

  const handleClinicSelect = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setClinicModalVisible(false);
  };

  const handleAddItem = () => {
    setCurrentProduct(null);
    setQuantity('1');
    setUnitPrice('0');
    setExcessPercentage('0');
    setEditingItemIndex(null);
    setItemModalVisible(true);
  };

  const handleProductSelect = (product: Product) => {
    setCurrentProduct(product);
    
    if (product && product.price) {
      const productPrice = parseFloat(product.price.toString());
      setUnitPrice(productPrice.toString());
      console.log(`Ürün birim fiyatı ayarlandı: ${productPrice} ${product.currency}`);
    } else {
      setUnitPrice('0');
    }
    
    setProductModalVisible(false);
    setQuantity('1');
    setExcessPercentage('0');
    setEditingItemIndex(null);
    setItemModalVisible(true);
  };

  // Para birimi formatlama fonksiyonu
  const formatDisplayCurrency = (amount: number | undefined, currency: Currency) => {
    if (amount === undefined || isNaN(amount)) return `0,00 ${currency}`;
    return `${amount.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency}`;
  };

  const calculateItemTotal = (qty: number, price: number, productCurrency: Currency, proposalCurrency: Currency): number => {
    const baseTotal = qty * price;
    // Ürün fiyatını teklif para birimine dönüştür
    return convertPrice(baseTotal, productCurrency, proposalCurrency);
  };

  const calculateTotalQuantity = (qty: number, excessPct: number): number => {
    return qty + (qty * excessPct / 100);
  };

  const handleSaveItem = () => {
    if (!currentProduct || !currentProduct.currency) {
      Alert.alert('Hata', 'Lütfen geçerli bir ürün seçin (para birimi bilgisi eksik olabilir)');
      return;
    }
    
    const qtyNum = parseInt(quantity);
    const priceNum = parseFloat(unitPrice);
    const excessPctNum = parseFloat(excessPercentage || '0');
    
    if (isNaN(qtyNum) || qtyNum <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir miktar girin');
      return;
    }
    
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir fiyat girin');
      return;
    }
    
    if (isNaN(excessPctNum) || excessPctNum < 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir mal fazlası yüzdesi girin');
      return;
    }
    
    // Orijinal toplamı hesapla
    const originalTotalAmount = qtyNum * priceNum;
    
    // Toplam tutarı teklif para birimi cinsinden hesapla
    const totalAmountInProposalCurrency = calculateItemTotal(
      qtyNum, 
      priceNum, 
      currentProduct.currency, 
      selectedCurrency
    );
    
    const newItem: ProposalItem = {
      product_id: currentProduct.id,
      product_name: currentProduct.name,
      quantity: qtyNum,
      unit_price: priceNum, 
      product_currency: currentProduct.currency, 
      excess_percentage: excessPctNum,
      total: totalAmountInProposalCurrency, 
      original_total: originalTotalAmount, // Orijinal toplam eklendi
    };
    
    if (editingItemIndex !== null) {
      const updatedItems = [...proposalItems];
      updatedItems[editingItemIndex] = newItem;
      setProposalItems(updatedItems);
    } else {
      setProposalItems([...proposalItems, newItem]);
    }
    
    setItemModalVisible(false);
  };

  const handleEditItem = (index: number) => {
    const item = proposalItems[index];
    const originalProduct = products.find(p => p.id === item.product_id);
    
    if (originalProduct) {
      setCurrentProduct(originalProduct);
      setUnitPrice(item.unit_price.toString());
    } else {
      setCurrentProduct({
        id: item.product_id,
        name: item.product_name,
        price: item.unit_price,
        currency: item.product_currency || 'TRY',
        category: 'unknown',
        status: 'active',
        created_at: new Date().toISOString(),
      });
      setUnitPrice(item.unit_price.toString());
    }

    setQuantity(item.quantity.toString());
    setExcessPercentage(item.excess_percentage.toString());
    setEditingItemIndex(index);
    setItemModalVisible(true);
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = [...proposalItems];
    updatedItems.splice(index, 1);
    setProposalItems(updatedItems);
  };

  const calculatedTotals = useMemo(() => {
    const subtotal = proposalItems.reduce((sum, item) => sum + item.total, 0);
    const discountAmount = subtotal * (parseFloat(generalDiscount || '0') / 100);
    const totalAfterDiscount = subtotal - discountAmount;
    const downPaymentAmount = totalAfterDiscount * (parseFloat(downPaymentPercentage || '0') / 100);
    const remainingAmount = totalAfterDiscount - downPaymentAmount;
    const calculatedInstallmentAmount = installmentCount > 0 ? remainingAmount / installmentCount : 0;

    return {
      subtotal,
      discountAmount,
      totalAfterDiscount,
      downPaymentAmount,
      remainingAmount,
      installmentAmount: calculatedInstallmentAmount,
    };
  }, [proposalItems, generalDiscount, downPaymentPercentage, installmentCount]);

  // Döviz Kuru Bilgi Metni Oluşturma
  const generateCurrencyInfoString = (): string => {
    const today = format(new Date(), 'dd.MM.yyyy');
    let info = `------ DÖVIZ DÖNÜŞÜM BİLGİLERİ (${today}) ------\n`;
    info += `Teklif Para Birimi: ${selectedCurrency}\n`;
    info += `Güncel Kurlar (${selectedCurrency} Bazında):\n`;
    
    const targetCurrencies: Currency[] = ['TRY', 'USD', 'EUR'];
    targetCurrencies.forEach(target => {
      if (target !== selectedCurrency) {
        // Kurları exchangeRates sabitinden al
        const rate = exchangeRates[selectedCurrency]?.[target]; 
        if (rate) {
          info += `1 ${selectedCurrency} = ${rate.toFixed(4)} ${target}\n`;
        }
      }
    });
    info += `-----------------------------------------------\n\n`;
    return info;
  };
  
  // handleSubmit fonksiyonu (finalNotes kullanımıyla)
  const handleSubmit = async () => {
    if (!selectedClinic) {
      Alert.alert('Uyarı', 'Lütfen bir klinik seçin');
      return;
    }
    if (proposalItems.length === 0) {
      Alert.alert('Uyarı', 'Lütfen en az bir ürün ekleyin');
      return;
    }
    
    try {
      setSubmitting(true);
      const totalAmount = calculatedTotals.totalAfterDiscount;
      const installmentAmount = calculatedTotals.installmentAmount;
      
      console.log("handleSubmit - Orijinal Notlar:", notes);
      const currencyInfo = generateCurrencyInfoString();
      console.log("handleSubmit - Döviz Bilgisi:", currencyInfo);
      const finalNotes = `${currencyInfo}${notes}`;
      console.log("handleSubmit - Son Notlar:", finalNotes);

      const proposalData = {
        clinic_id: selectedClinic.id,
        user_id: currentUser?.id,
        total_amount: totalAmount,
        currency: selectedCurrency,
        discount: parseFloat(generalDiscount || '0'),
        notes: finalNotes, 
        installment_count: installmentCount,
        installment_amount: installmentAmount,
        first_payment_date: firstPaymentDate ? firstPaymentDate.toISOString().split('T')[0] : null,
        down_payment_percentage: parseFloat(downPaymentPercentage || '0'),
        down_payment: calculatedTotals.downPaymentAmount,
        payment_method: paymentMethod,
        campaign_id: selectedCampaign?.id,
        status: 'pending' as const,
        created_at: new Date().toISOString()
      };
      
      console.log("handleSubmit - Kaydedilecek Veri (Notlar):", proposalData.notes); // Kaydedilecek notları logla
      
      const { data: createdProposal, error: proposalError } = await supabase
        .from('proposals')
        .insert(proposalData)
        .select()
        .single();
        
      if (proposalError) throw proposalError;
      if (!createdProposal) throw new Error("Teklif ID'si alınamadı.");
      
      const proposalId = createdProposal.id;
      const itemPromises = proposalItems.map(item => 
        supabase.from('proposal_items').insert({
          proposal_id: proposalId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          excess_percentage: item.excess_percentage,
          excess: item.excess_percentage > 0
        })
      );
      
      const itemResults = await Promise.all(itemPromises);
      const hasItemErrors = itemResults.some(result => result.error);
      
      if (hasItemErrors) {
        console.error('Bazı ürünler eklenirken hata oluştu:', itemResults.filter(r => r.error).map(r => r.error));
        Alert.alert('Uyarı', 'Teklif oluşturuldu ancak bazı ürünler eklenirken sorun oluştu.');
      } else {
        Alert.alert('Başarılı', 'Teklif başarıyla oluşturuldu.');
        navigation.goBack();
      }
    } catch (error: any) {
      console.error('Teklif oluşturulurken hata:', error);
      Alert.alert('Hata', `Teklif oluşturulurken bir sorun oluştu: ${error.message || error}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Para birimi değiştiğinde kalemlerin toplamını yeniden hesapla
  useEffect(() => {
    // Başlangıç yüklemesi sırasında veya ürün yoksa hesaplama yapma
    if (dataLoading || proposalItems.length === 0) {
      return;
    }

    console.log(`Para birimi ${selectedCurrency} olarak değişti, toplamlar yeniden hesaplanıyor...`);
    
    const recalculatedItems = proposalItems.map(item => {
      // Orijinal toplamı ve para birimini kullanarak yeni toplamı hesapla
      const newTotal = convertPrice(item.original_total, item.product_currency, selectedCurrency);
      return {
        ...item,
        total: newTotal, // total alanını güncelle
      };
    });

    setProposalItems(recalculatedItems);

  }, [selectedCurrency]); // Sadece selectedCurrency değiştiğinde çalışsın

  const filteredClinics = useMemo(() => {
    console.log("Filtreleme çalıştı, klinik sayısı:", clinics.length);
    return clinics.filter(clinic => 
      clinic.name.toLowerCase().includes(searchClinic.toLowerCase())
    );
  }, [clinics, searchClinic]);

  useEffect(() => {
    console.log("Filtrelenmiş klinikler:", filteredClinics.length, filteredClinics.map(c => c.name));
  }, [filteredClinics]);

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchProduct.toLowerCase())
  );

  const handleOpenClinicModal = async () => {
    try {
      setLoading(true);
      console.log("Klinik modalı açılıyor...");
      await fetchClinics();
      setTimeout(() => {
        setClinicModalVisible(true);
        setLoading(false);
      }, 100);
    } catch (error) {
      console.error("Klinik modalı açılırken hata:", error);
      setLoading(false);
    }
  };

  const handleOpenProductModal = async () => {
    try {
      setLoading(true);
      console.log("Ürün modalı açılıyor...");
      await fetchProducts();
      setTimeout(() => {
        setProductModalVisible(true);
        setLoading(false);
      }, 100);
    } catch (error) {
      console.error("Ürün modalı açılırken hata:", error);
      setLoading(false);
    }
  };

  // Stil tanımlamaları fonksiyon içine taşındı
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    section: { backgroundColor: 'white', padding: 16, marginBottom: 16, borderRadius: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
    clinicButton: { borderRadius: 8 },
    clinicInfo: { backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8 },
    clinicName: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
    clinicDetail: { fontSize: 14, color: '#4B5563', marginBottom: 4 },
    addItemButton: { borderRadius: 8 },
    emptyState: { padding: 30, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8 },
    emptyText: { marginTop: 12, fontSize: 16, fontWeight: 'bold', color: '#6B7280', textAlign: 'center' },
    emptySubtext: { marginTop: 8, fontSize: 14, color: '#6B7280', textAlign: 'center' },
    modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 16, elevation: 5, borderWidth: 0, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#111827', textAlign: 'center' },
    inputContainer: { marginBottom: 20, width: '100%' },
    inputLabel: { fontSize: 15, fontWeight: '500', color: '#374151', marginBottom: 8 },
    input: { backgroundColor: 'white', fontSize: 15 },
    quantityContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    quantityButton: { width: 35, height: 35, borderRadius: 18, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9f9f9' },
    itemPreview: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F3F4F6', padding: 16, borderRadius: 10, marginBottom: 12 },
    previewLabel: { fontSize: 14, fontWeight: 'bold', color: '#4B5563' },
    previewValue: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    buttonContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 },
    button: { marginLeft: 10, borderRadius: 8, paddingHorizontal: 15 },
    productButton: { marginBottom: 20, paddingVertical: 6, borderRadius: 8 },
    formGroup: { marginBottom: 16 },
    formLabel: { fontSize: 15, fontWeight: '500', color: '#4B5563', marginBottom: 8 },
    formInput: { backgroundColor: '#fff' },
    formTextarea: { backgroundColor: '#fff', minHeight: 80 },
    dropdown: { borderColor: '#D1D5DB', height: 50 },
    dropdownContainer: { borderColor: '#D1D5DB' },
    datePickerButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 14, backgroundColor: '#fff' },
    datePickerButtonText: { fontSize: 14, color: '#4B5563' },
    contentContainer: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
    submitButton: { paddingVertical: 8, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.5, backgroundColor: '#4F46E5', marginTop: 24 },
    submitButtonLabel: { fontSize: 16, fontWeight: 'bold', color: '#ffffff', letterSpacing: 0.5 },
    submitButtonContent: { height: 50, paddingHorizontal: 8 },
    paymentPlanContainer: { marginTop: 16, backgroundColor: '#F3F8FF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#D1E4FF' },
    paymentPlanTitle: { fontSize: 16, fontWeight: 'bold', color: '#3B82F6', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#D1E4FF', paddingBottom: 8 },
    paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#EFF6FF' },
    paymentInfo: { flex: 1 },
    paymentNumber: { fontSize: 15, fontWeight: '500', color: '#1F2937' },
    paymentDate: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    paymentAmount: { fontSize: 15, fontWeight: 'bold', color: '#1F2937' },
    modalContainer: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 10, maxHeight: '80%' },
    modalSearchInput: { marginBottom: 15 },
    modalActivityIndicator: { marginVertical: 20 },
    modalFlatList: { flexGrow: 0 },
    modalListItem: { paddingVertical: 15, paddingHorizontal: 5, flexDirection: 'row', alignItems: 'center' },
    modalListItemContent: { flex: 1 },
    modalListItemTitle: { fontWeight: 'bold', fontSize: 16, color: '#1F2937' },
    modalListItemSubtitle: { color: '#666', fontSize: 14 },
    modalDivider: { backgroundColor: '#eee' },
    modalEmptyState: { padding: 30, alignItems: 'center' },
    modalEmptyText: { color: '#666', marginTop: 10, textAlign: 'center' },
    modalCancelButton: { marginTop: 15 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
    loadingText: { marginTop: 10, fontSize: 16, color: '#6B7280' },
    formRow: { flexDirection: 'row', marginBottom: 16, marginHorizontal: -8 },
    formColumn: { flex: 1, paddingHorizontal: 8 },
    currencyInfoText: { fontSize: 12, color: '#6B7280', textAlign: 'right', marginTop: 30 },
    tableContainer: { marginTop: 16, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, overflow: 'hidden' },
    tableHeader: { flexDirection: 'row', backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    tableHeaderText: { fontSize: 13, fontWeight: 'bold', color: '#4B5563' },
    tableRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', alignItems: 'center' },
    tableCellText: { fontSize: 14, color: '#374151' },
    tableActions: { width: 40, flexDirection: 'row', justifyContent: 'flex-end' },
    summaryLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    summaryLineTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, marginTop: 8 },
    summaryLabel: { fontSize: 14, color: '#4B5563' },
    summaryValue: { fontSize: 14, fontWeight: '500', color: '#1F2937' },
    summaryValueRed: { fontSize: 14, fontWeight: '500', color: theme.colors.error },
    summaryLabelBold: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
    summaryValueBold: { fontSize: 15, fontWeight: 'bold', color: '#1F2937' },
    summaryDivider: { marginVertical: 8, backgroundColor: '#E5E7EB' },
  });

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <Appbar.Header style={{ backgroundColor: sectionBgColor, elevation: 2 }}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Yeni Teklif Oluştur" />
        {(loading || dataLoading) && <ActivityIndicator size="small" color={accentColor} style={{ marginRight: 16 }} />}
      </Appbar.Header>

      {dataLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.container}
          ref={scrollViewRef}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          <View style={styles.container}>
            {/* Klinik Seçimi */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Klinik Bilgileri</Text>
              {selectedClinic ? (
                 <View>
                  <View style={styles.clinicInfo}>
                    <Text style={styles.clinicName}>{selectedClinic.name}</Text>
                    {selectedClinic.contact_person && <Text style={styles.clinicDetail}>İlgili Kişi: {selectedClinic.contact_person}</Text>}
                    {selectedClinic.contact_info && <Text style={styles.clinicDetail}>İletişim: {selectedClinic.contact_info}</Text>}
                    {selectedClinic.address && <Text style={styles.clinicDetail}>Adres: {selectedClinic.address}</Text>}
                  </View>
                  <Button
                    mode="outlined"
                    onPress={handleOpenClinicModal}
                    style={[styles.clinicButton, { marginTop: 12 }]}
                  >
                    Kliniği Değiştir
                  </Button>
                </View>
              ) : (
                <Button mode="outlined" onPress={handleOpenClinicModal} style={styles.clinicButton}>
                  Klinik Seç
                </Button>
              )}
            </View>

            {/* Teklif Genel Bilgileri */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Teklif Bilgileri</Text>

              <View style={styles.formRow}>
                <View style={styles.formColumn}>
                  <Text style={styles.formLabel}>Para Birimi</Text>
                  <DropDownPicker
                    open={openCurrencyPicker}
                    value={selectedCurrency}
                    items={currencyOptions}
                    setOpen={setOpenCurrencyPicker}
                    setValue={setSelectedCurrency}
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropdownContainer}
                    zIndex={3000} zIndexInverse={1000}
                  />
                </View>
                <View style={styles.formColumn}>
                   <Text style={styles.currencyInfoText}>
                    {`1 ${selectedCurrency} = ${exchangeRates[selectedCurrency]?.TRY.toFixed(4)} TRY`}
                  </Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Aktif Kampanya Seç (İsteğe Bağlı)</Text>
                <DropDownPicker
                  open={openCampaignPicker} value={selectedCampaign?.id} 
                  items={[{ label: 'Kampanya Yok', value: null }, ...campaigns.map(c => ({ label: c.name, value: c.id })) ]} 
                  setOpen={setOpenCampaignPicker}
                  onSelectItem={async (item) => {
                    const campaignId = item.value as number | null;
                    const campaign = campaigns.find(c => c.id === campaignId);
                    
                    // Kampanya ve indirim state'lerini ayarla
                    setSelectedCampaign(campaign || null);
                    setGeneralDiscount(campaign?.discount_percentage?.toString() || '0');
                    
                    if (campaignId !== null) {
                      // Seçili kampanyanın ürünlerini getir ve teklife ekle
                      setDataLoading(true); // Yükleme göstergesini başlat
                      try {
                        const campaignProposalItems = await fetchCampaignItems(campaignId);
                        setProposalItems(campaignProposalItems); // Mevcutları değiştir
                        console.log(`${campaignProposalItems.length} kampanya ürünü eklendi.`);
                      } catch (error) {
                        // Hata fetchCampaignItems içinde zaten gösteriliyor
                        setProposalItems([]); // Hata durumunda listeyi boşalt
                      } finally {
                        setDataLoading(false); // Yükleme göstergesini bitir
                      }
                    } else {
                      // "Kampanya Yok" seçildi, ürün listesini boşalt
                      setProposalItems([]);
                    }
                    
                    console.log("Kampanya seçildi:", campaign);
                  }}
                  style={styles.dropdown} dropDownContainerStyle={styles.dropdownContainer} 
                  placeholder="Bir kampanya seçin..." placeholderStyle={{ color: '#9CA3AF' }} 
                  zIndex={2000} zIndexInverse={2000} listMode="MODAL" 
                  modalProps={{ animationType: 'slide' }} searchable={true} searchPlaceholder="Kampanya ara..."
                />
              </View>

              <View style={styles.formRow}>
                <View style={styles.formColumn}>
                  <Text style={styles.formLabel}>Genel İndirim (%)</Text> 
                  <TextInput
                    mode="outlined" value={generalDiscount} onChangeText={setGeneralDiscount} 
                    keyboardType="numeric" style={styles.formInput} 
                    right={<TextInput.Affix text="%" />} disabled={!!selectedCampaign} 
                  />
                  {selectedCampaign && <HelperText type="info" style={{ marginTop: -5, marginBottom: 5 }}>Kampanya indirimi</HelperText>}
                </View>
                <View style={styles.formColumn}>
                  <Text style={styles.formLabel}>Peşinat Oranı (%)</Text>
                  <TextInput
                    mode="outlined" value={downPaymentPercentage} onChangeText={setDownPaymentPercentage} 
                    keyboardType="numeric" style={styles.formInput} right={<TextInput.Affix text="%" />}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                 <View style={styles.formColumn}>
                  <Text style={styles.formLabel}>Ödeme Yöntemi</Text>
                  <DropDownPicker
                    open={openPaymentMethodPicker} value={paymentMethod} items={paymentMethodOptions} 
                    setOpen={setOpenPaymentMethodPicker} setValue={setPaymentMethod} 
                    style={styles.dropdown} dropDownContainerStyle={styles.dropdownContainer} 
                    placeholder="Seçiniz..." placeholderStyle={{ color: '#9CA3AF' }} 
                    zIndex={1500} zIndexInverse={2500}
                  />
                </View>
                <View style={styles.formColumn}>
                   <Text style={styles.formLabel}>Taksit Sayısı</Text>
                  <DropDownPicker
                    open={openInstallmentPicker} value={installmentCount} items={installmentOptions} 
                    setOpen={setOpenInstallmentPicker} setValue={setInstallmentCount} 
                    style={styles.dropdown} dropDownContainerStyle={styles.dropdownContainer} 
                    placeholder="Vade seçiniz" placeholderStyle={{ color: '#9CA3AF' }} 
                    zIndex={1000} zIndexInverse={3000}
                  />
                </View>
              </View>

              {installmentCount > 1 && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>İlk Ödeme Tarihi</Text>
                  <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker(true)} >
                    <Text style={styles.datePickerButtonText}>
                      {firstPaymentDate ? format(firstPaymentDate, 'dd MMMM yyyy', {locale: tr}) : 'Tarih seçiniz'}
                    </Text>
                    <MaterialCommunityIcons name="calendar" size={20} color="#4B5563" />
                  </TouchableOpacity>
                </View>
              )}
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notlar</Text>
                <TextInput
                  mode="outlined" value={notes} onChangeText={setNotes} multiline
                  numberOfLines={4} style={styles.formTextarea} 
                  placeholder="Teklifle ilgili notlarınızı buraya ekleyebilirsiniz..."
                />
              </View>
            </View>

            {/* Ürün Listesi - Tekrar .map kullan */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Teklif Kalemleri</Text>
                <Button mode="contained" onPress={handleOpenProductModal} icon="plus" style={styles.addItemButton}>Ürün Ekle</Button>
              </View>
              {proposalItems.length === 0 ? (
                <View style={styles.emptyState}> 
                  <MaterialCommunityIcons name="package-variant" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyText}>Henüz ürün eklenmedi</Text>
                </View>
              ) : (
                <View style={styles.tableContainer}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, { flex: 3 }]}>Ürün</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Miktar</Text>
                    <Text style={[styles.tableHeaderText, { flex: 2, textAlign: 'right' }]}>Birim Fiyat</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>MF %</Text>
                    <Text style={[styles.tableHeaderText, { flex: 2, textAlign: 'right' }]}>Toplam</Text>
                    <View style={{ width: 40 }} /> 
                  </View>
                  {proposalItems.map((item, index) => (
                    <View key={index} style={styles.tableRow}>
                      <Text style={[styles.tableCellText, { flex: 3 }]}>{item.product_name}</Text>
                      <Text style={[styles.tableCellText, { flex: 1, textAlign: 'center' }]}>{item.quantity}</Text>
                      <Text style={[styles.tableCellText, { flex: 2, textAlign: 'right' }]}>
                        {formatDisplayCurrency(item.unit_price, item.product_currency || selectedCurrency)}
                      </Text>
                      <Text style={[styles.tableCellText, { flex: 1, textAlign: 'center' }]}>{item.excess_percentage || 0}</Text>
                      <Text style={[styles.tableCellText, { flex: 2, textAlign: 'right' }]}>
                        {formatDisplayCurrency(item.total, selectedCurrency)}
                      </Text>
                      <View style={styles.tableActions}>
                        <TouchableOpacity onPress={() => handleEditItem(index)} style={{ marginRight: 5 }}>
                          <MaterialCommunityIcons name="pencil-outline" size={20} color={theme.colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                          <MaterialCommunityIcons name="delete-outline" size={20} color={theme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
            
            {/* Özet Bölümü */} 
            {proposalItems.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Teklif Özeti ({selectedCurrency})</Text>
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLabel}>Ara Toplam:</Text>
                  <Text style={styles.summaryValue}>{formatDisplayCurrency(calculatedTotals.subtotal, selectedCurrency)}</Text>
                </View>
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLabel}>Genel İndirim (%{generalDiscount || 0}):</Text>
                  <Text style={styles.summaryValueRed}>-{formatDisplayCurrency(calculatedTotals.discountAmount, selectedCurrency)}</Text>
                </View>
                <Divider style={styles.summaryDivider} />
                <View style={styles.summaryLineTotal}>
                  <Text style={styles.summaryLabelBold}>Toplam Tutar:</Text>
                  <Text style={styles.summaryValueBold}>{formatDisplayCurrency(calculatedTotals.totalAfterDiscount, selectedCurrency)}</Text>
                </View>
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLabel}>Peşinat (%{downPaymentPercentage || 0}):</Text>
                  <Text style={styles.summaryValue}>{formatDisplayCurrency(calculatedTotals.downPaymentAmount, selectedCurrency)}</Text>
                </View>
                 <View style={styles.summaryLine}>
                  <Text style={styles.summaryLabel}>Kalan Tutar:</Text>
                  <Text style={styles.summaryValue}>{formatDisplayCurrency(calculatedTotals.remainingAmount, selectedCurrency)}</Text>
                </View>
                {installmentCount > 1 && (
                  <View style={styles.summaryLine}>
                    <Text style={styles.summaryLabel}>Taksit Tutarı ({installmentCount} Taksit):</Text>
                    <Text style={styles.summaryValue}>{formatDisplayCurrency(calculatedTotals.installmentAmount, selectedCurrency)}</Text>
                  </View>
                )}
                {selectedCurrency !== 'TRY' && (
                  <View style={styles.summaryLineTotal}>
                    <Text style={styles.summaryLabelBold}>Toplam Tutar (TL Karşılığı):</Text>
                    <Text style={styles.summaryValueBold}>
                      {formatDisplayCurrency(convertPrice(calculatedTotals.totalAfterDiscount, selectedCurrency, 'TRY'), 'TRY')}
                    </Text>
                  </View>
                )}
              </View>
            )}
            
            {/* Gönderme Butonu */} 
            <Button
              mode="contained"
              onPress={handleSubmit}
              disabled={!selectedClinic || proposalItems.length === 0 || submitting}
              style={styles.submitButton}
              labelStyle={styles.submitButtonLabel}
              icon="send"
              loading={submitting}
              contentStyle={styles.submitButtonContent}
            >
              {submitting ? 'Gönderiliyor...' : 'Teklifi Gönder'}
            </Button>
          </View>
        </ScrollView>
      )}

      {/* Modallar */}
      <Portal>
        {/* Klinik Seçme Modal */} 
        <Modal visible={clinicModalVisible} onDismiss={() => setClinicModalVisible(false)} contentContainerStyle={styles.modalContainer} >
          <Text style={styles.modalTitle}>Klinik Seç</Text>
          <TextInput mode="outlined" placeholder="Klinik Ara..." value={searchClinic} onChangeText={setSearchClinic} style={styles.modalSearchInput} left={<TextInput.Icon icon="magnify" />} />
          {loading ? (
            <ActivityIndicator style={styles.modalActivityIndicator} size="large" color={theme.colors.primary} />
          ) : (
            <FlatList 
              data={filteredClinics} 
              keyExtractor={(item) => item.id.toString()} 
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleClinicSelect(item)} style={styles.modalListItem} >
                  <MaterialCommunityIcons name="hospital-building" size={24} color="#6366F1" style={{ marginRight: 10 }} />
                  <View style={styles.modalListItemContent}>
                    <Text style={styles.modalListItemTitle}>{item.name}</Text>
                    {item.contact_person && <Text style={styles.modalListItemSubtitle}>{item.contact_person}</Text>}
                  </View>
                </TouchableOpacity>
              )} 
              ListEmptyComponent={() => (
                <View style={styles.modalEmptyState}>
                  <MaterialCommunityIcons name="hospital-building" size={48} color="#D1D5DB" />
                  <Text style={styles.modalEmptyText}>Klinik bulunamadı</Text>
                </View>
              )}
              ItemSeparatorComponent={() => <Divider style={styles.modalDivider} />} 
              style={styles.modalFlatList}
            />
          )}
          <Button mode="outlined" onPress={() => setClinicModalVisible(false)} style={styles.modalCancelButton}>İptal</Button>
        </Modal>

        {/* Ürün Seçme Modal */} 
        <Modal visible={productModalVisible} onDismiss={() => setProductModalVisible(false)} contentContainerStyle={styles.modalContainer} >
          <Text style={styles.modalTitle}>Ürün Seç</Text>
           <TextInput mode="outlined" placeholder="Ürün Ara..." value={searchProduct} onChangeText={setSearchProduct} style={styles.modalSearchInput} left={<TextInput.Icon icon="magnify" />} />
           {loading ? (
            <ActivityIndicator style={styles.modalActivityIndicator} size="large" color={theme.colors.primary} />
          ) : (
            <FlatList 
              data={filteredProducts} 
              keyExtractor={(item) => item.id.toString()} 
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleProductSelect(item)} style={styles.modalListItem} >
                  <MaterialCommunityIcons name="package-variant" size={24} color="#6366F1" style={{ marginRight: 10 }} />
                  <View style={styles.modalListItemContent}>
                    <Text style={styles.modalListItemTitle}>{item.name}</Text>
                    <Text style={styles.modalListItemSubtitle}>{formatDisplayCurrency(item.price, item.currency || 'TRY')}</Text>
                  </View>
                </TouchableOpacity>
              )} 
              ListEmptyComponent={() => (
                <View style={styles.modalEmptyState}>
                  <MaterialCommunityIcons name="package-variant" size={48} color="#D1D5DB" />
                  <Text style={styles.modalEmptyText}>Ürün bulunamadı</Text>
                </View>
              )}
              ItemSeparatorComponent={() => <Divider style={styles.modalDivider} />} 
              style={styles.modalFlatList}
            />
          )}
          <Button mode="outlined" onPress={() => setProductModalVisible(false)} style={styles.modalCancelButton}>İptal</Button>
        </Modal>

        {/* Ürün Ekleme/Düzenleme Modal */} 
         <Modal visible={itemModalVisible} onDismiss={() => setItemModalVisible(false)} contentContainerStyle={[styles.modalContent, { width: '90%', maxWidth: 500, alignSelf: 'center', maxHeight: '80%', paddingBottom: 16 }]} >
           <ScrollView style={{ width: '100%' }} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
            <Text style={styles.modalTitle}>{editingItemIndex !== null ? 'Ürün Düzenle' : 'Ürün Ekle'}</Text>
            <Button mode={currentProduct ? "outlined" : "contained"} icon="package-variant" onPress={() => { setItemModalVisible(false); setTimeout(() => { handleOpenProductModal(); }, 100); }} style={[styles.productButton, { marginVertical: 15 }]} >
              {currentProduct ? currentProduct.name : 'Ürün Seç'}
            </Button>
            {currentProduct && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Miktar</Text>
                  <View style={styles.quantityContainer}>
                    <TouchableOpacity style={styles.quantityButton} onPress={() => { const current = parseInt(quantity) || 0; if (current > 1) setQuantity((current - 1).toString()); }} ><MaterialCommunityIcons name="minus" size={18} color={theme.colors.primary} /></TouchableOpacity>
                    <TextInput mode="outlined" value={quantity} onChangeText={setQuantity} keyboardType="numeric" style={[styles.input, { flex: 1, marginHorizontal: 8 }]} />
                    <TouchableOpacity style={styles.quantityButton} onPress={() => { const current = parseInt(quantity) || 0; setQuantity((current + 1).toString()); }} ><MaterialCommunityIcons name="plus" size={18} color={theme.colors.primary} /></TouchableOpacity>
                  </View>
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Birim Fiyat ({currentProduct.currency})</Text>
                  <TextInput mode="outlined" value={unitPrice} onChangeText={setUnitPrice} keyboardType="numeric" style={styles.input} disabled={true} />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Mal Fazlası (%)</Text>
                  <TextInput mode="outlined" value={excessPercentage} onChangeText={setExcessPercentage} keyboardType="numeric" style={styles.input} placeholder="0" right={<TextInput.Affix text="%" />} />
                </View>
                <View style={styles.itemPreview}>
                  <Text style={styles.previewLabel}>Toplam ({selectedCurrency}):</Text>
                  <Text style={styles.previewValue}>{formatDisplayCurrency(parseFloat(unitPrice || '0') * parseInt(quantity || '0'), selectedCurrency)}</Text>
                </View>
                {parseFloat(excessPercentage || '0') > 0 && (
                  <View style={[styles.itemPreview, {marginTop: 8, backgroundColor: '#f0f9ff'}]}>
                    <Text style={[styles.previewLabel, {color: '#0369a1'}]}>Toplam Ürün Adedi:</Text>
                    <Text style={[styles.previewValue, {color: '#0369a1'}]}>{calculateTotalQuantity(parseInt(quantity || '0'), parseFloat(excessPercentage || '0')).toLocaleString('tr-TR')} Adet</Text>
                  </View>
                )}
              </>
            )}
            <View style={[styles.buttonContainer, { marginTop: 20 }]}>
              <Button mode="outlined" onPress={() => setItemModalVisible(false)} style={styles.button}>İptal</Button>
              <Button mode="contained" onPress={handleSaveItem} style={styles.button} disabled={!currentProduct}>Kaydet</Button>
            </View>
           </ScrollView>
         </Modal>

        {/* Tarih Seçici Modal */}
        <DatePickerModal
          locale="tr" mode="single" visible={showDatePicker} 
          onDismiss={() => setShowDatePicker(false)} 
          date={firstPaymentDate || new Date()} 
          onConfirm={({ date }) => { if (date) { setFirstPaymentDate(date); setShowDatePicker(false); } }}
        />
      </Portal>
      
    </KeyboardAvoidingView>
  );
}; 