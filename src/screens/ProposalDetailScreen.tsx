import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, RefreshControl, Platform, Linking, Share } from 'react-native';
import { Text, Card, Button, Chip, Divider, ActivityIndicator, useTheme, Dialog, Portal, TextInput, ProgressBar } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Proposal, ProposalItem, Product, Clinic, User } from '../types';
import { getCurrentUser } from '../services/authService';
import { SafeAreaWrapper, SafeContentContainer } from '../components/SafeAreaWrapper';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// Genişletilmiş tipleri tanımlayalım
interface ExtendedProposal extends Proposal {
  creator?: {
    name: string;
    email: string;
  };
  approver?: {
    name: string;
  };
  rejecter?: {
    name: string;
  };
  rejected_by?: string;
  rejected_at?: string;
}

interface ProductWithBasicInfo {
  name: string;
  currency?: string;
}

interface ProposalItemWithProduct extends Omit<ProposalItem, 'products'> {
  products?: ProductWithBasicInfo;
  excess_percentage?: number;
}

export const ProposalDetailScreen = () => {
  const [proposal, setProposal] = useState<ExtendedProposal | null>(null);
  const [proposalItems, setProposalItems] = useState<ProposalItemWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [printing, setPrinting] = useState(false);

  const navigation = useNavigation();
  const route = useRoute();
  const theme = useTheme();
  const { id } = route.params as { id: number };

  useEffect(() => {
    loadCurrentUser();
    fetchProposalDetails();
  }, [id]);

  // Header'a geri butonu ekle
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Button
          icon="arrow-left"
          onPress={() => navigation.goBack()}
          mode="text"
          style={{ marginLeft: -10 }}
        >
          Geri
        </Button>
      ),
    });
  }, [navigation]);

  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Kullanıcı bilgileri yüklenirken hata:', error);
    }
  };

  const fetchProposalDetails = async () => {
    try {
      setLoading(true);
      console.log('Teklif detayları yükleniyor...');

      // Teklif bilgilerini çek
      const { data: proposalData, error: proposalError } = await supabase
        .from('proposals')
        .select(`
          *,
          clinics (name, contact_person, contact_info, address),
          creator:users!proposals_user_id_fkey (name, email),
          approver:users!proposals_approved_by_fkey (name),
          rejecter:users!proposals_rejected_by_fkey (name)
        `)
        .eq('id', id)
        .single();

      if (proposalError) {
        throw new Error(`Teklif detayları yüklenirken hata: ${proposalError.message}`);
      }

      // Teklif kalemlerini çek
      const { data: itemsData, error: itemsError } = await supabase
        .from('proposal_items')
        .select(`
          *,
          products (name)
        `)
        .eq('proposal_id', id);

      if (itemsError) {
        throw new Error(`Teklif kalemleri yüklenirken hata: ${itemsError.message}`);
      }

      // Her iki veri de başarıyla alındıysa state'leri güncelle
      setProposal(proposalData);
      setProposalItems(itemsData || []);

    } catch (error) {
      console.error('Teklif detayları çekilirken hata:', error);
      Alert.alert('Hata', error instanceof Error ? error.message : 'Teklif detayları çekilirken bir sorun oluştu');
      // Hata durumunda state'leri sıfırla
      setProposal(null);
      setProposalItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProposalDetails();
  };

  const handleApprove = async () => {
    if (!currentUser) {
      Alert.alert('Hata', 'Kullanıcı bilgileriniz yüklenemedi');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('proposals')
        .update({
          status: 'approved',
          approved_by: currentUser.id,
          approved_at: new Date().toISOString(),
          notes: notes ? `${proposal?.notes ? proposal.notes + '\n\n' : ''}Onay Notu: ${notes}` : proposal?.notes
        })
        .eq('id', id);

      if (error) {
        console.error('Teklif onaylanırken hata:', error);
        Alert.alert('Hata', 'Teklif onaylanırken bir sorun oluştu');
        return;
      }

      setShowApproveDialog(false);
      Alert.alert('Başarılı', 'Teklif başarıyla onaylandı');
      fetchProposalDetails();
    } catch (error) {
      console.error('Teklif onaylanırken hata:', error);
      Alert.alert('Hata', 'Teklif onaylanırken bir sorun oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!currentUser) {
      Alert.alert('Hata', 'Kullanıcı bilgileriniz yüklenemedi');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('proposals')
        .update({
          status: 'rejected',
          rejected_by: currentUser.id,
          rejected_at: new Date().toISOString(),
          notes: notes ? `${proposal?.notes ? proposal.notes + '\n\n' : ''}Red Notu: ${notes}` : proposal?.notes
        })
        .eq('id', id);

      if (error) {
        console.error('Teklif reddedilirken hata:', error);
        Alert.alert('Hata', 'Teklif reddedilirken bir sorun oluştu');
        return;
      }

      setShowRejectDialog(false);
      Alert.alert('Bilgi', 'Teklif reddedildi');
      fetchProposalDetails();
    } catch (error) {
      console.error('Teklif reddedilirken hata:', error);
      Alert.alert('Hata', 'Teklif reddedilirken bir sorun oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProcess = async () => {
    try {
      setLoading(true);
      
      // Seçili durum bilgisi
      const selectedStep = getProcessSteps().find(s => s.id === selectedStatus);
      if (!selectedStep) {
        throw new Error('Geçersiz durum seçildi.');
      }
      
      // Durum güncellemesini yap
      const { error } = await supabase
        .from('proposals')
        .update({ 
          status: selectedStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      // Güncelleme başarılı, bilgi ver
      const successMessage = `Teklif durumu başarıyla "${selectedStep.label}" olarak güncellendi.`;
      Alert.alert('Başarılı', successMessage);
      
      // Dialog'u kapat ve verileri yenile
      setShowProcessDialog(false);
      setTimeout(() => {
        fetchProposalDetails(); // Verileri yenile
      }, 500);
      
    } catch (error: any) {
      console.error('Teklif durumu güncellenirken hata:', error);
      Alert.alert('Hata', `Teklif durumu güncellenirken bir hata oluştu: ${error.message || 'Beklenmeyen hata'}`);
    } finally {
      setLoading(false);
    }
  };

  const getProcessSteps = () => {
    const steps = [
      { id: 'pending', label: 'Beklemede', icon: 'clock-outline' as any, color: '#F59E0B' },
      { id: 'approved', label: 'Onaylandı', icon: 'check-circle-outline' as any, color: '#10B981' },
      { id: 'contract_received', label: 'Sözleşme Alındı', icon: 'file-document-outline' as any, color: '#6366F1' },
      { id: 'in_transfer', label: 'Transferde', icon: 'truck-outline' as any, color: '#3B82F6' },
      { id: 'delivered', label: 'Teslim Edildi', icon: 'package-variant' as any, color: '#059669' }
    ];
    
    return steps;
  };
  
  const getCurrentStepIndex = () => {
    const steps = getProcessSteps();
    const currentStepIndex = steps.findIndex(step => step.id === proposal?.status);
    return currentStepIndex >= 0 ? currentStepIndex : 0;
  };
  
  const getNextStatus = () => {
    const steps = getProcessSteps();
    const currentIndex = getCurrentStepIndex();
    
    // Eğer son adımda değilsek bir sonraki adımı döndür
    if (currentIndex < steps.length - 1) {
      return steps[currentIndex + 1].id;
    }
    
    return null;
  };
  
  const canUpdateProcess = () => {
    // Kullanıcı yetki kontrolü - admin ve manager rolleri durumu değiştirebilir
    if (!currentUser || !proposal) return false;
    
    // Sadece admin ve manager rolleri süreci ilerletebilir
    const allowedRoles = ['admin', 'manager'];
    if (!allowedRoles.includes(currentUser.role)) return false;
    
    // Reddedilmiş veya süresi dolmuş teklifler güncellenemez
    if (proposal.status === 'rejected' || proposal.status === 'expired') return false;
    
    // Son adımdaysa (delivered) güncelleme gerekmez
    if (proposal.status === 'delivered') return false;
    
    return true;
  };

  const renderProcessSteps = () => {
    const steps = getProcessSteps();
    const currentStepIndex = getCurrentStepIndex();
    
    // proposal null kontrolü
    if (!proposal) return null;
    
    // Önceki kontrolü kaldırıldı, artık tüm durumlar için süreç gösterilecek
    // if (proposal.status === 'pending' || proposal.status === 'rejected' || proposal.status === 'expired') {
    //   return null;
    // }
    
    return (
      <View style={styles.stepsContainer}>
        {steps.map((step, index) => {
          // Reddedilen veya süresi dolan teklifler için özel stil
          const isRejectedOrExpired = proposal.status === 'rejected' || proposal.status === 'expired';
          const isActive = isRejectedOrExpired 
            ? index === 0 // Reddedilen veya süresi dolanlarda sadece ilk adım aktif
            : index <= currentStepIndex;
          
          return (
            <View key={step.id} style={[
              styles.stepItem, 
              isActive ? styles.completedStep : styles.pendingStep
            ]}>
              <MaterialCommunityIcons 
                name={step.icon} 
                size={24} 
                color={isActive ? step.color : '#9CA3AF'} 
              />
              <Text style={[
                styles.stepLabel, 
                isActive ? { color: step.color } : { color: '#9CA3AF' }
              ]}>
                {step.label}
              </Text>
              
              {/* Reddedilen veya süresi dolan tekliflerde ek bilgi göster */}
              {isRejectedOrExpired && index === 0 && (
                <Text style={styles.rejectedLabel}>
                  {proposal.status === 'rejected' ? 'Reddedildi' : 'Süresi Doldu'}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#F59E0B'; // Amber
      case 'approved':
        return '#10B981'; // Emerald
      case 'rejected':
        return '#EF4444'; // Red
      case 'expired':
        return '#6B7280'; // Gray
      case 'contract_received':
        return '#6366F1'; // Indigo
      case 'in_transfer':
        return '#3B82F6'; // Blue
      case 'delivered':
        return '#059669'; // Green
      default:
        return '#9CA3AF'; // Gray
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Beklemede';
      case 'approved':
        return 'Onaylandı';
      case 'rejected':
        return 'Reddedildi';
      case 'expired':
        return 'Süresi Doldu';
      case 'contract_received':
        return 'Sözleşme Alındı';
      case 'in_transfer':
        return 'Transferde';
      case 'delivered':
        return 'Teslim Edildi';
      default:
        return 'Bilinmiyor';
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('tr-TR', { 
      style: 'currency', 
      currency: currency || 'TRY',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Belirtilmemiş';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const calculateSubtotal = () => {
    return proposalItems.reduce((sum, item) => sum + (item.quantity * (item.unit_price || 0)), 0);
  };

  const calculateDiscount = () => {
    return calculateSubtotal() * ((proposal?.discount || 0) / 100);
  };

  const canApproveReject = () => {
    if (!currentUser || !proposal) return false;
    
    // Teklif görüntüleme ekranında her zaman salt okunur olmalı
    // Hiçbir kullanıcı görüntüleme ekranında müdahale edememeli
    return false;
  };

  // PDF Yazdırma fonksiyonu
  const generateAndPrintPDF = async () => {
    try {
      setPrinting(true);
      
      if (!proposal || !proposalItems.length) {
        Alert.alert('Hata', 'Yazdırılacak teklif bilgileri bulunamadı.');
        return;
      }
      
      // Teklif kalemlerinin HTML tablosunu oluştur
      let itemsHTML = '';
      proposalItems.forEach(item => {
        const productName = item.products?.name || 'Ürün';
        const unitPrice = formatCurrency(item.unit_price || 0, proposal.currency);
        const quantity = item.quantity;
        const excessPct = item.excess_percentage || 0;
        const total = formatCurrency(item.quantity * (item.unit_price || 0), proposal.currency);
        
        itemsHTML += `
          <tr>
            <td>${productName}</td>
            <td>${unitPrice}</td>
            <td>${quantity}</td>
            <td>%${excessPct}</td>
            <td>${total}</td>
          </tr>
        `;
      });
      
      // Ödeme tarihleri tablosunu oluştur
      let paymentDatesHTML = '';
      if (proposal.installment_count > 1 && proposal.first_payment_date) {
        const installmentAmount = proposal.total_amount / proposal.installment_count;
        
        for (let i = 0; i < proposal.installment_count; i++) {
          const date = new Date(proposal.first_payment_date);
          date.setMonth(date.getMonth() + i);
          
          const formattedDate = formatDate(date.toISOString());
          const amount = formatCurrency(installmentAmount, proposal.currency);
          
          paymentDatesHTML += `
            <tr>
              <td>${i + 1}. Vade Tarihi</td>
              <td>${formattedDate}</td>
              <td>${amount}</td>
            </tr>
          `;
        }
      } else {
        // Peşin ödeme
        paymentDatesHTML = `
          <tr>
            <td>Peşinat</td>
            <td>${formatDate(new Date().toISOString())}</td>
            <td>${formatCurrency(proposal.total_amount, proposal.currency)}</td>
          </tr>
        `;
      }
      
      // HTML şablonunu oluştur - Her sayfayı ayrı bir div içine koy
      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica', sans-serif; color: #333; line-height: 1.5; margin: 0; padding: 0; }
              .page { page-break-after: always; padding: 30px; }
              .header { display: flex; align-items: center; padding-bottom: 20px; border-bottom: 1px solid #eee; margin-bottom: 30px; }
              .logo { width: 80px; height: 80px; margin-right: 20px; }
              .company-info { flex: 1; }
              h1 { font-size: 24px; color: #333; margin-bottom: 5px; }
              h2 { font-size: 20px; color: #333; margin: 30px 0 15px 0; text-align: center; font-weight: bold; }
              .contact { font-size: 14px; color: #666; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              table, th, td { border: 1px solid #ddd; }
              th, td { padding: 12px; text-align: left; }
              th { background-color: #f2f2f2; }
              .clinic-info { margin: 20px 0; }
              .clinic-info-item { display: flex; margin: 10px 0; }
              .clinic-info-label { width: 150px; font-weight: bold; }
              .clinic-info-value { flex: 1; }
              .clinic-info p { margin: 5px 0; }
              .payment-options { margin: 20px 0; }
              .checkbox { width: 20px; height: 20px; border: 1px solid #333; display: inline-block; margin-right: 10px; text-align: center; }
              .signature-area { margin-top: 30px; display: flex; justify-content: space-between; }
              .signature-box { width: 45%; border-top: 1px solid #333; padding-top: 10px; margin-top: 80px; }
              .note { font-size: 12px; font-style: italic; margin: 20px 0; }
              .payment-option { margin: 10px 0; }
              .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
              .page-number { text-align: center; margin-top: 40px; font-size: 12px; }
              .products { margin-top: 20px; }
              .product-item { margin-bottom: 15px; }
              .product-name { font-weight: bold; font-size: 16px; }
              .product-detail { display: flex; margin-top: 5px; }
              .product-detail-label { width: 120px; color: #666; }
              .product-price { font-weight: bold; font-size: 18px; text-align: right; }
              .process-steps { display: flex; margin: 20px 0; justify-content: space-between; }
              .process-step { flex: 1; text-align: center; position: relative; }
              .process-step-icon { width: 40px; height: 40px; margin: 0 auto; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
              .process-step-line { position: absolute; top: 20px; left: 50%; right: 0; height: 2px; z-index: -1; }
              .process-step-text { margin-top: 10px; font-size: 12px; }
              .action-button { text-align: center; margin: 20px 0; }
              .total-price { font-size: 20px; font-weight: bold; text-align: right; margin-top: 20px; }
            </style>
          </head>
          <body>
            <!-- Sayfa 1: Teklif detayları -->
            <div class="page">
              <div class="header">
                <div class="logo">
                  <svg width="80" height="80" viewBox="0 0 100 100">
                    <rect x="10" y="10" width="80" height="80" fill="#B39D7B" rx="10" />
                    <text x="50" y="55" fill="white" text-anchor="middle" font-size="40">+</text>
                  </svg>
                </div>
                <div class="company-info">
                  <h1>NTA Implant</h1>
                  <div class="contact">
                    <p>info@ntaimplant.com</p>
                    <p>www.ntaimplant.com</p>
                  </div>
                </div>
              </div>
              
              <h2>TEKLİF FORMU</h2>
              
              <div class="clinic-info">
                <div class="clinic-info-item">
                  <div class="clinic-info-label">Teklif ID:</div>
                  <div class="clinic-info-value">#${proposal.id}</div>
                </div>
                <div class="clinic-info-item">
                  <div class="clinic-info-label">Tarih:</div>
                  <div class="clinic-info-value">${formatDate(proposal.created_at)}</div>
                </div>
                <div class="clinic-info-item">
                  <div class="clinic-info-label">Durum:</div>
                  <div class="clinic-info-value">${getStatusText(proposal.status)}</div>
                </div>
              </div>
              
              <h2>KLİNİK BİLGİLERİ</h2>
              
              <div class="clinic-info">
                <div class="clinic-info-item">
                  <div class="clinic-info-label">Klinik Adı:</div>
                  <div class="clinic-info-value">${proposal.clinics?.name || '-'}</div>
                </div>
                <div class="clinic-info-item">
                  <div class="clinic-info-label">İlgili Kişi:</div>
                  <div class="clinic-info-value">${proposal.clinics?.contact_person || '-'}</div>
                </div>
                <div class="clinic-info-item">
                  <div class="clinic-info-label">İletişim:</div>
                  <div class="clinic-info-value">${proposal.clinics?.contact_info || '-'}</div>
                </div>
                <div class="clinic-info-item">
                  <div class="clinic-info-label">Adres:</div>
                  <div class="clinic-info-value">${proposal.clinics?.address || '-'}</div>
                </div>
              </div>
              
              <h2>TEKLİF KALEMLERİ</h2>
              
              <table>
                <tr>
                  <th>Ürün</th>
                  <th>Birim Fiyat</th>
                  <th>Miktar</th>
                  <th>Mal Fazlası</th>
                  <th>Toplam</th>
                </tr>
                ${itemsHTML}
              </table>
              
              <div class="total-price">
                <p>Genel Toplam: ${formatCurrency(proposal.total_amount, proposal.currency)}</p>
              </div>
              
              <div class="page-number">1</div>
            </div>
            
            <!-- Sayfa 2: Ödeme planı -->
            <div class="page">
              <div class="header">
                <div class="logo">
                  <svg width="80" height="80" viewBox="0 0 100 100">
                    <rect x="10" y="10" width="80" height="80" fill="#B39D7B" rx="10" />
                    <text x="50" y="55" fill="white" text-anchor="middle" font-size="40">+</text>
                  </svg>
                </div>
                <div class="company-info">
                  <h1>NTA Implant</h1>
                  <div class="contact">
                    <p>info@ntaimplant.com</p>
                    <p>www.ntaimplant.com</p>
                  </div>
                </div>
              </div>
              
              <h2>ÖDEME PLANI</h2>
              
              <div class="payment-options">
                <div class="payment-option">
                  <span class="checkbox">
                    ${proposal.installment_count === 1 ? '✓' : '&nbsp;'}
                  </span>
                  Peşin
                </div>
                
                <div class="payment-option">
                  <span class="checkbox">
                    ${proposal.installment_count === 6 ? '✓' : '&nbsp;'}
                  </span>
                  6 Vade
                </div>
                
                <div class="payment-option">
                  <span class="checkbox">
                    ${proposal.installment_count !== 1 && proposal.installment_count !== 6 ? '✓' : '&nbsp;'}
                  </span>
                  Diğer ……………………………………..
                </div>
                
                <p>(Vadeli satış ise aşağıdaki tabloyu doldurunuz).</p>
                <p>Peşinat: ……………………………….</p>
              </div>
              
              <table>
                <tr>
                  <th>Vade No</th>
                  <th>Vade Tarihi</th>
                  <th>Tutar</th>
                </tr>
                ${paymentDatesHTML}
              </table>
              
              <p>Onay Veren Ad Soyad: ………………………………..</p>
              
              <div class="note">
                <p>Not: Ödeme planına uyulmadığı takdirde teklifdeki kur değil güncel kur geçerli olacaktır.</p>
              </div>
              
              <div class="signature-area">
                <div class="signature-box">
                  <p>Teklifi Sunan:</p>
                  <p>Ad Soyad: ${proposal.creator?.name || ''}</p>
                  <p>Tarih: ${formatDate(proposal.created_at)}</p>
                  <p>İmza/Kaşe:</p>
                </div>
                
                <div class="signature-box">
                  <p>Teklifi Kabul Eden:</p>
                  <p>Ad Soyad: ${proposal.clinics?.contact_person || ''}</p>
                  <p>Tarih:</p>
                  <p>İmza/Kaşe:</p>
                </div>
              </div>
              
              <div class="page-number">2</div>
            </div>
          </body>
        </html>
      `;
      
      const fileName = `Teklif_${proposal.id}_${proposal.clinics?.name?.replace(/\s+/g, '_') || 'teklif'}`;
      
      try {
        console.log('PDF oluşturuluyor...');
        
        // PDF oluştur
        const { uri } = await Print.printToFileAsync({
          html: htmlContent,
          base64: false
        });
        
        console.log('PDF oluşturuldu:', uri);
        
        // Yazdırma menüsünü göster
        if (Platform.OS === 'ios') {
          await Print.printAsync({ uri });
        } else {
          // Android için paylaşım kullan
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
              mimeType: 'application/pdf',
              dialogTitle: 'Teklif PDF\'ini Paylaş',
              UTI: 'com.adobe.pdf'
            });
          } else {
            Alert.alert(
              'Paylaşım Hatası',
              'Cihazınızda paylaşım özelliği mevcut değil.'
            );
          }
        }
        
        console.log('PDF yazdırma/paylaşma tamamlandı');
        
      } catch (pdfError: any) {
        console.error('PDF oluşturma hatası:', pdfError);
        Alert.alert(
          'PDF Hatası', 
          `PDF oluşturulurken bir sorun oluştu: ${pdfError.message || String(pdfError)}`
        );
      }
      
    } catch (error: any) {
      console.error('PDF yazdırma hatası:', error);
      Alert.alert(
        'Hata', 
        `Teklif yazdırılırken bir sorun oluştu: ${error.message || String(error)}`
      );
    } finally {
      setPrinting(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Teklif detayları yükleniyor...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  if (!proposal) {
    return (
      <SafeAreaWrapper>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>Teklif bulunamadı veya yüklenirken bir hata oluştu.</Text>
          <Button 
            mode="contained" 
            onPress={() => navigation.goBack()}
            style={{ marginTop: 16 }}
          >
            Geri Dön
          </Button>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Teklif Özeti Kartı */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.headerRow}>
              <Text style={styles.cardTitle}>Teklif #{proposal.id}</Text>
              <Chip 
                style={[styles.statusChip, { backgroundColor: `${getStatusColor(proposal.status)}20` }]}
                textStyle={{ color: getStatusColor(proposal.status) }}
              >
                {getStatusText(proposal.status)}
              </Chip>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Oluşturan:</Text>
              <Text style={styles.infoValue}>{proposal.creator?.name || 'Belirtilmemiş'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Oluşturma Tarihi:</Text>
              <Text style={styles.infoValue}>{formatDate(proposal.created_at)}</Text>
            </View>
            
            {proposal.approved_by && proposal.approved_at && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Onaylayan:</Text>
                <Text style={styles.infoValue}>{proposal.approver?.name || 'Belirtilmemiş'}</Text>
              </View>
            )}
            
            {proposal.approved_at && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Onay Tarihi:</Text>
                <Text style={styles.infoValue}>{formatDate(proposal.approved_at)}</Text>
              </View>
            )}
            
            {proposal.rejected_by && proposal.rejected_at && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Reddeden:</Text>
                <Text style={styles.infoValue}>{proposal.rejecter?.name || 'Belirtilmemiş'}</Text>
              </View>
            )}
            
            {proposal.rejected_at && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Red Tarihi:</Text>
                <Text style={styles.infoValue}>{formatDate(proposal.rejected_at)}</Text>
              </View>
            )}
            
            {/* Yazdır butonu - Sadece onaylanmış teklifler için görünür */}
            {proposal.status === 'approved' && (
              <View style={styles.actionButtonContainer}>
                <Button 
                  mode="outlined"
                  icon="printer"
                  loading={printing}
                  disabled={printing}
                  onPress={generateAndPrintPDF}
                  style={styles.printButton}
                >
                  {printing ? 'Yazdırılıyor...' : 'Teklifi Yazdır'}
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Süreç durumu */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Teklif Süreci</Text>
            
            <View style={styles.processContainer}>
              {renderProcessSteps()}
            </View>
            
            <ProgressBar 
              progress={getCurrentStepIndex() / (getProcessSteps().length - 1)} 
              color={theme.colors.primary}
              style={styles.progressBar}
            />
            
            {canUpdateProcess() && (
              <Button 
                mode="contained" 
                onPress={() => {
                  // Bir sonraki durumu otomatik olarak belirle
                  const nextStatus = getNextStatus();
                  if (nextStatus) {
                    setSelectedStatus(nextStatus);
                    setShowProcessDialog(true);
                  } else {
                    Alert.alert('Bilgi', 'Bu teklif son aşamada, daha ileri bir aşama bulunmuyor.');
                  }
                }}
                style={styles.processButton}
              >
                Süreci İlerlet
              </Button>
            )}
          </Card.Content>
        </Card>

        {/* Klinik Bilgileri Kartı */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Klinik Bilgileri</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Klinik Adı:</Text>
              <Text style={styles.infoValue}>{proposal.clinics?.name || 'Belirtilmemiş'}</Text>
            </View>
            
            {proposal.clinics?.contact_person && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>İlgili Kişi:</Text>
                <Text style={styles.infoValue}>{proposal.clinics.contact_person}</Text>
              </View>
            )}
            
            {proposal.clinics?.contact_info && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>İletişim:</Text>
                <Text style={styles.infoValue}>{proposal.clinics.contact_info}</Text>
              </View>
            )}
            
            {proposal.clinics?.address && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Adres:</Text>
                <Text style={styles.infoValue}>{proposal.clinics.address}</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Teklif Kalemleri Kartı */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Teklif Kalemleri</Text>
            
            {proposalItems.length > 0 ? (
              proposalItems.map((item, index) => (
                <View key={item.id} style={styles.itemContainer}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName}>{item.products?.name || 'Ürün'}</Text>
                    <Text style={styles.itemPrice}>
                      {formatCurrency(item.unit_price * item.quantity, proposal.currency)}
                    </Text>
                  </View>
                  
                  <View style={styles.itemDetails}>
                    <View style={styles.itemRow}>
                      <Text style={styles.itemLabel}>Birim Fiyat:</Text>
                      <Text style={styles.itemValue}>
                        {formatCurrency(item.unit_price, proposal.currency)}
                      </Text>
                    </View>
                    
                    <View style={styles.itemRow}>
                      <Text style={styles.itemLabel}>Miktar:</Text>
                      <Text style={styles.itemValue}>{item.quantity}</Text>
                    </View>
                    
                    {item.excess_percentage && item.excess_percentage > 0 && (
                      <View style={styles.itemRow}>
                        <Text style={styles.itemLabel}>Mal Fazlası:</Text>
                        <Text style={styles.itemValue}>%{item.excess_percentage}</Text>
                      </View>
                    )}
                  </View>
                  
                  {index < proposalItems.length - 1 && <Divider style={styles.divider} />}
                </View>
              ))
            ) : (
              <View style={styles.emptyItems}>
                <MaterialCommunityIcons name="package-variant" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>Teklif kalemi bulunamadı</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Teklif Detayları Kartı */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Teklif Detayları</Text>
            
            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Para Birimi:</Text>
                <Text style={styles.summaryValue}>{proposal.currency}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Ara Toplam:</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(calculateSubtotal(), proposal.currency)}
                </Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>İndirim ({proposal.discount}%):</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(calculateDiscount(), proposal.currency)}
                </Text>
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotal}>Genel Toplam:</Text>
                <Text style={styles.summaryTotalValue}>
                  {formatCurrency(proposal.total_amount, proposal.currency)}
                </Text>
              </View>

              {/* Vade Bilgileri */}
              {proposal.installment_count > 1 && (
                <>
                  <Divider style={styles.divider} />
                  
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Vade Sayısı:</Text>
                    <Text style={styles.summaryValue}>{proposal.installment_count} Taksit</Text>
                  </View>
                  
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Taksit Tutarı:</Text>
                    <Text style={styles.summaryValue}>
                      {formatCurrency(proposal.installment_amount || 0, proposal.currency)}
                    </Text>
                  </View>
                  
                  {proposal.first_payment_date && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>İlk Ödeme Tarihi:</Text>
                      <Text style={styles.summaryValue}>
                        {formatDate(proposal.first_payment_date)}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
            
            {proposal.notes && (
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Notlar:</Text>
                <Text style={styles.notes}>{proposal.notes}</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Onay/Red Butonları - Sadece bekleyen teklifler için göster */}
        {proposal.status === 'pending' && canApproveReject() && (
          <View style={styles.actionButtons}>
            <Button 
              mode="contained" 
              icon="check" 
              onPress={() => setShowApproveDialog(true)}
              style={[styles.actionButton, { backgroundColor: '#10B981' }]}
            >
              Onayla
            </Button>
            
            <Button 
              mode="outlined" 
              icon="close" 
              onPress={() => setShowRejectDialog(true)}
              style={styles.actionButton}
              buttonColor="white"
              textColor="#EF4444"
              rippleColor="rgba(239, 68, 68, 0.1)"
            >
              Reddet
            </Button>
          </View>
        )}
      </ScrollView>

      {/* Onay Dialog */}
      <Portal>
        <Dialog visible={showApproveDialog} onDismiss={() => setShowApproveDialog(false)}>
          <Dialog.Title>Teklifi Onayla</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Bu teklifi onaylamak istediğinize emin misiniz?
            </Text>
            <TextInput
              label="Notlar (İsteğe bağlı)"
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.dialogInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowApproveDialog(false)}>İptal</Button>
            <Button onPress={handleApprove}>Onayla</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Red Dialog */}
      <Portal>
        <Dialog visible={showRejectDialog} onDismiss={() => setShowRejectDialog(false)}>
          <Dialog.Title>Teklifi Reddet</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Bu teklifi reddetmek istediğinize emin misiniz?
            </Text>
            <TextInput
              label="Red Nedeni"
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.dialogInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowRejectDialog(false)}>İptal</Button>
            <Button onPress={handleReject}>Reddet</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Süreç Güncelleme Dialog */}
      <Portal>
        <Dialog visible={showProcessDialog} onDismiss={() => setShowProcessDialog(false)}>
          <Dialog.Title>Süreci İlerlet</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Teklif sürecini "
              <Text style={{fontWeight: 'bold', color: theme.colors.primary}}>
                {getProcessSteps().find(s => s.id === selectedStatus)?.label || ''}
              </Text>
              " aşamasına ilerletmek istediğinize emin misiniz?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowProcessDialog(false)}>İptal</Button>
            <Button onPress={handleUpdateProcess} buttonColor={theme.colors.primary} textColor="white">
              Onayla
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80, // iPhone için daha fazla alt boşluk
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  statusChip: {
    height: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    maxWidth: '60%',
    textAlign: 'right',
  },
  itemContainer: {
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  itemDetails: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemLabel: {
    fontSize: 14,
    color: '#374151',
  },
  itemValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  emptyItems: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  summary: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#374151',
  },
  summaryValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  notesContainer: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#4B5563',
  },
  notes: {
    fontSize: 14,
    color: '#111827',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
  },
  divider: {
    marginVertical: 8,
  },
  dialogText: {
    marginBottom: 16,
  },
  dialogInput: {
    marginTop: 8,
  },
  processContainer: {
    marginVertical: 16,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 16,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stepItem: {
    alignItems: 'center',
    width: '20%',
  },
  completedStep: {
    opacity: 1,
  },
  pendingStep: {
    opacity: 0.5,
  },
  stepLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  processButton: {
    marginTop: 16,
  },
  actionButtonContainer: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  printButton: {
    marginTop: 8,
    borderColor: '#6366F1',
  },
  printButtonSecondary: {
    marginTop: 12,
    borderColor: '#6366F1',
  },
  rejectedLabel: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
}); 