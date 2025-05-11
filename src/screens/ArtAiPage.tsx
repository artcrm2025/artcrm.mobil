import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Avatar,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  LinearProgress,
  InputAdornment
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PersonIcon from '@mui/icons-material/Person';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'; // Gemini ikonu
import { aiService } from '../services/aiService';
import { userService } from '../services/userService';
import { clinicService } from '../services/clinicService';
import { proposalService } from '../services/proposalService';
import { regionService } from '../services/regionService';
import { surgeryReportService } from '../services';
import { visitReportService } from '../services';
import { User, Clinic, Region, SurgeryReport, VisitReport, Product, Campaign, Proposal, UserRoleEnum, UserRole, StockLog } from '../types';
import { subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, format, isValid } from 'date-fns';
import { productService } from '../services/productService';
import { campaignService } from '../services/campaignService';
import { stockService } from '../services/stockService';

// Teklif tipi genişletme (import edilen tipi genişletiyoruz)
interface ProposalExtended extends Proposal {
  created_by_id?: string; // User.id string tipinde olduğu için string olarak tanımla
}

// TableData tipini tanımlayalım
interface TableData {
  headers: string[];
  rows: string[][];
  title?: string;
}

// Message arayüzünü genişletelim
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
  dataType?: 'text' | 'table';
  tableData?: TableData;
}

// Tablo bileşeni
const TableResponse: React.FC<{ data: TableData }> = ({ data }) => {
  return (
    <TableContainer component={Paper} sx={{ mb: 2, maxWidth: '100%', overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: 'primary.light' }}>
            {data.headers.map((header, index) => (
              <TableCell key={index} sx={{ fontWeight: 'bold' }}>
                {header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.rows.map((row, rowIndex) => (
            <TableRow key={rowIndex} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f5f5f5' } }}>
              {row.map((cell, cellIndex) => (
                <TableCell key={cellIndex}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const ArtAiPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: Date.now().toString(), 
      sender: 'ai', 
      text: 'Merhaba! Ben ART AI. Size nasıl yardımcı olabilirim?',
      dataType: 'text',
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [proposals, setProposals] = useState<ProposalExtended[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [surgeryReports, setSurgeryReports] = useState<SurgeryReport[]>([]);
  const [visitReports, setVisitReports] = useState<VisitReport[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]); // Yeni state: StockLog[]
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // Zaman periyodu anahtar kelimeleri (genel kullanım için)
  const timeKeywords = ['bugün', 'bu gün', 'dün', 'bu hafta', 'geçen hafta', 'bu ay', 'geçen ay', 'bu yıl', 'geçen yıl'];

  // Bileşen yüklendiğinde tüm gerekli verileri al
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const userPromise = userService.getCurrentUser();
        const clinicsPromise = clinicService.getAll();
        const proposalsPromise = proposalService.getAll();
        const regionsPromise = regionService.getAll();
        const usersPromise = userService.getAllUsers();
        const surgeriesPromise = surgeryReportService.getAll();
        const visitsPromise = visitReportService.getAll();
        const productsPromise = productService.getAll();
        const campaignsPromise = campaignService.getAll();
        const stockLogsPromise = stockService.getStockLogs(); // Yeni çağrı: getStockLogs()

        const [
          user, 
          clinicsData, 
          proposalsData, 
          regionsData, 
          usersData, 
          surgeriesData, 
          visitsData, 
          productsData, 
          campaignsData, 
          stockLogsData // Yeni değişken
        ] = await Promise.all([
          userPromise,
          clinicsPromise,
          proposalsPromise,
          regionsPromise,
          usersPromise,
          surgeriesPromise,
          visitsPromise,
          productsPromise,
          campaignsPromise,
          stockLogsPromise // Yeni promise
        ]);

        setCurrentUser(user);
        setClinics(clinicsData);
        setProposals(proposalsData.map((p: Proposal) => ({
          ...p,
          created_by_id: p.user_id // user_id alanını created_by_id olarak kullan
        })));
        setRegions(regionsData);
        setUsers(usersData);
        setSurgeryReports(surgeriesData);
        setVisitReports(visitsData);
        setProducts(productsData);
        setCampaigns(campaignsData);
        setStockLogs(stockLogsData); // Yeni state güncellendi

      } catch (error) {
        console.error("AI Sayfası: Başlangıç verisi alınamadı:", error);
        setMessages(prev => [...prev, { 
          id: Date.now().toString(), 
          sender: 'ai', 
          text: 'Üzgünüm, başlangıç verilerini yüklerken bir sorun oluştu.', 
          dataType: 'text', 
          timestamp: new Date().toISOString()
        }]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Yardımcı fonksiyon: Para birimini formatla
  const formatCurrency = (amount: number | null | undefined, currency: string = 'TRY'): string => {
    if (amount == null) return '-';
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency || 'TRY'
    }).format(amount);
  };

  // Tarih formatlama fonksiyonu (genel kullanım için)
  const formatDate = (dateInput: string | Date | null | undefined): string => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput instanceof Date ? dateInput : null;
    if (!date || !isValid(date)) return 'Belirtilmemiş'; // Geçersizse belirtilmemiş döndür
    try {
      return format(date, 'dd.MM.yyyy'); // format fonksiyonunu date-fns'den al
    } catch (e) {
      console.error("Tarih formatlama hatası:", e);
      return 'Hata';
    }
  };

  // Tarih aralığı belirleme fonksiyonu
  const getDateRange = (timePeriod: string): { start: Date, end: Date } | null => {
    const now = new Date();
    switch (timePeriod) {
      case 'bugün':
      case 'bu gün':
        return { start: new Date(now.setHours(0, 0, 0, 0)), end: new Date(now.setHours(23, 59, 59, 999)) };
      case 'dün':
        const yesterdayStart = new Date(now); 
        yesterdayStart.setDate(now.getDate() - 1);
        yesterdayStart.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date(now); 
        yesterdayEnd.setDate(now.getDate() - 1);
        yesterdayEnd.setHours(23, 59, 59, 999);
        return { start: yesterdayStart, end: yesterdayEnd };
      case 'bu hafta':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'geçen hafta':
        const lastWeekStart = startOfWeek(subDays(now, 7), { weekStartsOn: 1 });
        const lastWeekEnd = endOfWeek(subDays(now, 7), { weekStartsOn: 1 });
        return { start: lastWeekStart, end: lastWeekEnd };
      case 'bu ay':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'geçen ay':
        const lastMonthStart = startOfMonth(subDays(startOfMonth(now), 1));
        const lastMonthEnd = endOfMonth(subDays(startOfMonth(now), 1));
        return { start: lastMonthStart, end: lastMonthEnd };
      case 'bu yıl':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'geçen yıl':
        const lastYearStart = startOfYear(subDays(startOfYear(now), 1));
        const lastYearEnd = endOfYear(subDays(startOfYear(now), 1));
        return { start: lastYearStart, end: lastYearEnd };
      default:
        return null;
    }
  };

  // AI yanıtını analiz edip tablo içerip içermediğini tespit eden fonksiyon
  const detectTableInText = (text: string): { isTable: boolean, tableData?: TableData } => {
    // Markdown tablosu kontrolü
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    // En az 2 satır ve | karakteri içeren bir satır olmalı
    if (lines.length >= 2 && lines.some(line => line.includes('|'))) {
      const tableLines = lines.filter(line => line.includes('|'));
      // Ayırıcı satır kontrolü (---) varsa klasik markdown tablosu
      const hasSeparator = tableLines.some(line => 
        line.replace(/\|/g, '').trim().split(' ').every(cell => cell === '' || cell.match(/^-+$/))
      );

      if (tableLines.length >= 2 || (tableLines.length >= 1 && hasSeparator)) {
        // Tablo başlık ve satırlarını ayıkla
        let headers: string[] = [];
        let rows: string[][] = [];
        
        // Başlıkları al
        const headerLine = tableLines[0];
        headers = headerLine
          .split('|')
          .map(cell => cell.trim())
          .filter(cell => cell !== '');
        
        // Ayırıcı satırı atla
        const dataStartIndex = hasSeparator ? 2 : 1;
        
        // Veri satırlarını al
        for (let i = dataStartIndex; i < tableLines.length; i++) {
          const rowCells = tableLines[i]
            .split('|')
            .map(cell => cell.trim())
            .filter(cell => cell !== '');
          
          if (rowCells.length > 0) {
            rows.push(rowCells);
          }
        }
        
        if (headers.length > 0 && rows.length > 0) {
          return { 
            isTable: true, 
            tableData: { 
              headers, 
              rows 
            } 
          };
        }
      }
    }
    
    // Liste kontrolü ve tablo dönüşümü
    const listPattern = /^(\d+\.|[-*•]) .+/;
    const listLines = lines.filter(line => listPattern.test(line.trim()));
    
    if (listLines.length >= 3) { // En az 3 liste öğesi varsa tablo olarak değerlendir
      const header = "Öğeler";
      const rows = listLines.map(line => {
        // Liste işaretini kaldır ve temizle
        const item = line.replace(/^\s*(\d+\.|[-*•])\s*/, '').trim();
        return [item];
      });
      
      return {
        isTable: true,
        tableData: {
          headers: [header],
          rows
        }
      };
    }
    
    return { isTable: false };
  };

  // Yanıt metninden tablo verilerini ayrıştıran fonksiyon
  const parseTableDataFromResponse = (text: string): { isTable: boolean, tableData?: TableData } => {
    // Düzenli ve tanımlanmış tablo formatı algılama
    const tableStart = text.indexOf('[TABLE:');
    const tableEnd = text.indexOf(']', tableStart);
    
    if (tableStart >= 0 && tableEnd > tableStart) {
      const tableContent = text.substring(tableStart + 7, tableEnd);
      const rows = tableContent.split('|');
      if (rows.length >= 2) { // En az başlık ve bir veri satırı olmalı
        const headers = rows[0].split(',');
        const dataRows = rows.slice(1).map(row => row.split(','));
        
        return {
          isTable: true,
          tableData: {
            headers,
            rows: dataRows,
          }
        };
      }
    }
    
    // Alternatif olarak Markdown tablosu arama
    const lines = text.split('\n').filter(line => line.trim() !== '');
    // En az 2 satır ve | karakteri içeren bir satır olmalı
    if (lines.length >= 2 && lines.some(line => line.includes('|'))) {
      const tableLines = lines.filter(line => line.includes('|'));
      if (tableLines.length >= 2) { // En az başlık ve bir veri satırı
        // Başlık satırını bul
        const headerLine = tableLines[0];
        // Ayırıcı satırı atla (varsa)
        const hasSeparator = tableLines[1].replace(/\|/g, '').trim().split(' ').every(cell => cell === '' || cell.match(/^-+$/));
        const startIndex = hasSeparator ? 2 : 1;
        
        if (tableLines.length >= startIndex) {
          // Başlıkları ayıkla
          const headers = headerLine
            .split('|')
            .map(cell => cell.trim())
            .filter(cell => cell !== '');
          
          // Veri satırlarını ayıkla
          const rows = tableLines.slice(startIndex).map(line => 
            line.split('|')
                .map(cell => cell.trim())
                .filter(cell => cell !== '')
          );
          
          return {
            isTable: true,
            tableData: {
              headers,
              rows,
            }
          };
        }
      }
    }
    
    return { isTable: false };
  };

  // AI yanıtını işleme fonksiyonu
  const processAIResponse = (responseText: string): Message => {
    const id = Date.now().toString();
    const timestamp = new Date().toISOString();

    // Tabloya dönüştürülebilecek verileri kontrol et
    const tableMatch = responseText.match(/Toplam (\d+) (.*?) bulundu\.[\s\S]*?((- .*\n)+)/);

    if (tableMatch) {
      // Tablo formatında veri bulundu
      const rows = tableMatch[3].trim().split('\n').map(line => {
        // Her satırı temizle ve parçalara ayır
        return line.replace(/^- /, '').split(/,\s+/).map(cell => cell.trim());
      });

      // Sütun başlıklarını tespit et
      const headers: string[] = [];
      if (rows.length > 0) {
        // İlk satırdan başlıkları çıkar (örn: "ID: 123" -> "ID")
        const firstRow = rows[0];
        firstRow.forEach(cell => {
          const parts = cell.split(':');
          if (parts.length > 1) {
            headers.push(parts[0].trim());
          } else {
            // Eğer ":" yoksa, tüm hücreyi başlık olarak kullan
            headers.push(cell);
          }
        });
      }

      // Veriyi temizle ve formatlı hale getir
      const formattedRows = rows.map(row => {
        return row.map(cell => {
          const parts = cell.split(':');
          return parts.length > 1 ? parts.slice(1).join(':').trim() : cell;
        });
      });

      return {
        id,
        sender: 'ai',
        text: responseText,
        timestamp,
        dataType: 'table',
        tableData: {
          headers,
          rows: formattedRows,
          title: tableMatch[2] // "teklif", "klinik", vs.
        }
      };
    }

    // Normal metin yanıtı
    return {
      id,
      sender: 'ai',
      text: responseText,
      dataType: 'text',
      timestamp
    };
  };

  // İş ile ilgili soru kontrolü
  const isBusinessRelated = (message: string): boolean => {
    // İş ile ilgili anahtar kelimeler
    const businessKeywords = [
      // Genel CRM terimleri
      'crm', 'müşteri', 'satış', 
      // Varlık isimleri ve yaygın yazım hataları
      'klinik', 'klnik', 'kli̇ni̇k', 'kllink', 'kllinik', 'klinlik', 'kilink',
      'teklif', 'tekklif', 'tekliff', 
      'rapor', 'repor', 'rapo', 
      'ameliyat', 'amaliyat', 'amelyat', 
      'ziyaret', 'ziyart', 'ziyret', 
      'ürün', 'uru', 'urun', 'ürn', 
      'kampanya', 'kampania', 'kampnya',
      'kullanıcı', 'bölge', 'takım', 'doktor', 'hasta', 'implant',
      // Eylemler
      'listele', 'göster', 'filtreleme', 'detay', 'adres', 'iletişim',
      // Tarihler, sayılar
      'bu ay', 'geçen ay', 'bu hafta', 'bugün', 'kaç tane', 'toplam',
      // Durumlar
      'onay', 'bekleyen', 'durum', 'aktif', 'pasif', 'tamamlanan', 'planlanmış',
      // Yardım
      'yardım', 'yapabilirsin', 'özellik', 'nasıl'
    ];
    
    // İş ile ilgili klinik adı kalıpları - klinik adı gibi görünen her şeyi iş ile ilgili sayalım
    const hasPotentialClinicName = /\w+\s*(klinik|kliniği|dental|dent|hospital|hastanesi|tıp|merkezi)/i.test(message);
    if (hasPotentialClinicName) return true;

    // "x kliniği" veya "x kliniğin" gibi kalıplar
    const clinicPattern = /(\w+)\s+(kliniği|kliniğin|klinik|hastanesi|hastanesinin)/i;
    if (clinicPattern.test(message)) return true;
    
    // Yaklaşık eşleşme için Levenshtein mesafesi kontrol fonksiyonu
    const levenshteinDistance = (a: string, b: string): number => {
      const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

      for (let i = 0; i <= a.length; i++) {
        matrix[0][i] = i;
      }

      for (let j = 0; j <= b.length; j++) {
        matrix[j][0] = j;
      }

      for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
          const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
          matrix[j][i] = Math.min(
            matrix[j][i - 1] + 1, // silme
            matrix[j - 1][i] + 1, // ekleme
            matrix[j - 1][i - 1] + indicator // değiştirme
          );
        }
      }

      return matrix[b.length][a.length];
    };
    
    // Mesajı kelimelere ayır
    const words = message.split(/\s+/);
    
    // Anahtar kelime tam eşleşmesi kontrolü
    const hasBusinessKeyword = businessKeywords.some(keyword => message.includes(keyword));
    if (hasBusinessKeyword) return true;
    
    // Yaklaşık eşleşme kontrolü (yazım hatalarına tolerans için)
    const hasApproximateMatch = words.some(word => {
      return businessKeywords.some(keyword => {
        if (word.length < 3) return false; // Çok kısa kelimeleri atla
        if (keyword.length < 3) return false;
        
        const maxDistance = Math.floor(keyword.length / 4) + 1; // Uzunluğa göre tolerans
        const distance = levenshteinDistance(word, keyword);
        
        return distance <= maxDistance;
      });
    });
    
    // CRM ile ilgili regex kalıpları
    const businessPatterns = [
      /kaç .*(?:klinik|kli̇ni̇k|kllinik|teklif|rapor|ziyaret|ürün|kampanya)/i, // sayma soruları
      /#(\d+)/i, // ID ile sorgular
      /\b(id|numara).*: *(\d+)/i, // ID formatları
      /(?:en çok|en az|karşılaştır)/i, // Karşılaştırma soruları
      /(?:benim|senin) (?:tekliflerim|raporlarım|ziyaretlerim)/i // Kişisel sorgular
    ];
    
    // Regex kalıplarını kontrol et
    const matchesBusinessPattern = businessPatterns.some(pattern => pattern.test(message));
    
    return hasBusinessKeyword || hasApproximateMatch || matchesBusinessPattern;
  };

  const handleSendMessage = async () => {
    const userMessage = input.trim().toLowerCase(); 
    if (!userMessage || isLoading) return;

    const userName = currentUser?.name || 'Kullanıcı';

    // Kullanıcı mesajını ekle
    const newUserMessage: Message = { 
      id: Date.now().toString(), 
      sender: 'user', 
      text: input.trim(), 
      dataType: 'text', 
      timestamp: new Date().toISOString() 
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    setIsLoading(true);

    // Klinik sorgusu için pattern tanımlamaları (Klinik listeleme için gerekli)
    const hasClinicKeyword = /k[l]+[i]?n[i]?[k]+/i.test(userMessage) || 
                              userMessage.includes('klinik') || 
                              userMessage.includes('kilink');
    const isListRequest = userMessage.includes('listele') || 
                        userMessage.includes('göster') || 
                        /^k[l]+[i]?n[i]?[k]+[a-zçşğüıö]*$/i.test(userMessage); // Sadece "klinikler" yazıldığında

    // İş ile ilgili olup olmadığını kontrol et
    if (!isBusinessRelated(userMessage)) {
      // Eğer iş ile ilgili değilse, kibarca reddet
      const aiResponseMessage: Message = {
        id: Date.now().toString(),
        sender: 'ai',
        text: 'Üzgünüm, sadece CRM sistemi ile ilgili konularda (klinikler, teklifler, raporlar, ziyaretler, ürünler, kampanyalar vb.) yardımcı olabilirim. Lütfen iş ile ilgili bir soru sorunuz.',
        dataType: 'text',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiResponseMessage]);
      setIsLoading(false);
      return;
    }

    try {
      // Veri işleme mantığı
      let retrievedDataInfo = '';
      let dataWasRetrieved = false;
      let identifiedProposalId: number | null = null;

      // 1. ADIM: Sayısal ID Referansını Kontrol Et
      const numberMatch = userMessage.match(/^(\d+)(\s+(?:detay|bilgi|detaylar|bilgiler)i?)?$/i);
      if (numberMatch) {
        const potentialId = parseInt(numberMatch[1], 10);
        // Son AI mesajını kontrol et, listede bu ID var mı?
        const lastAiMessage = messages.filter(m => m.sender === 'ai').pop();
        if (lastAiMessage?.text.includes(`ID: ${potentialId}`)) {
          // Eğer ID son AI mesajında geçiyorsa, bunu teklif ID'si olarak kabul et
          const proposalExists = proposals.some(p => p.id === potentialId);
          if (proposalExists) {
            identifiedProposalId = potentialId;
            console.log(`Implicit Proposal ID detected: ${identifiedProposalId}`);
          }
        }
      }

      // Sorgu Öncelikleri:
      // ÖNCELİK 1: Açık/Örtük Teklif ID Sorgusu
      const explicitProposalIdMatch = userMessage.match(/(\bid\s*[:=]?\s*|teklif\s+|#)(\d+)/) || userMessage.match(/(\d+)(\s+numaral[ıi]|\.|\s+id'?li|\s+no'?lu|\s+nolu)\s+teklif/);
      const proposalIdToFetch = identifiedProposalId || (explicitProposalIdMatch ? parseInt(explicitProposalIdMatch[2] || explicitProposalIdMatch[1], 10) : null);

      if (proposalIdToFetch) {
          dataWasRetrieved = true;
          const proposal = proposals.find(p => p.id === proposalIdToFetch) as ProposalExtended;
          
          if (proposal) {
            const clinic = clinics.find(c => c.id === proposal.clinic_id);
            const creator = users.find(u => String(u.id) === proposal.created_by_id);
            
            retrievedDataInfo = `Teklif #${proposalIdToFetch} Detayları:`;
            retrievedDataInfo += `\n- Teklif Numarası: ${proposal.id}`;
            retrievedDataInfo += `\n- Durum: ${proposal.status || 'Belirtilmemiş'}`;
            retrievedDataInfo += `\n- Klinik: ${clinic?.name || 'Belirtilmemiş'}`;
            retrievedDataInfo += `\n- Oluşturan: ${creator?.name || 'Belirtilmemiş'}`;
            retrievedDataInfo += `\n- Tarih: ${proposal.created_at || 'Belirtilmemiş'}`;
            retrievedDataInfo += `\n- Toplam Tutar: ${formatCurrency(proposal.total_amount, proposal.currency)}`;
            retrievedDataInfo += `\n- Para Birimi: ${proposal.currency || 'TRY'}`;
            
            if (proposal.items && proposal.items.length > 0) {
              retrievedDataInfo += `\n\nTeklifteki Ürünler:`;
              proposal.items.forEach((item, index) => {
                const product = products.find(p => p.id === item.product_id);
                retrievedDataInfo += `\n- ${index + 1}. ${product?.name || 'Bilinmeyen Ürün'}`
                retrievedDataInfo += `\n  Miktar: ${item.quantity || 0}`;
                retrievedDataInfo += `\n  Birim Fiyat: ${formatCurrency(item.unit_price, proposal.currency)}`;
                retrievedDataInfo += `\n  Toplam: ${formatCurrency(item.quantity * item.unit_price, proposal.currency)}`;
              });
            } else {
              retrievedDataInfo += `\n\nBu teklifte ürün bilgisi bulunamadı.`;
            }
            
            if (proposal.installment_count) {
              retrievedDataInfo += `\n\nÖdeme Planı: ${proposal.installment_count} taksit, İlk Ödeme Tarihi: ${proposal.first_payment_date || 'Belirtilmemiş'}`;
            }
            
            if (proposal.notes) {
              retrievedDataInfo += `\n\nNotlar: ${proposal.notes}`;
            }
          } else {
            retrievedDataInfo = `Teklif #${proposalIdToFetch} ile ilgili bilgi bulunamadı.`;
          }
      }
      // ÖNCELİK 2: Klinik Detay Sorgulaması (İsme Göre veya 'hakkında')
      // Mesajda klinik adı ve detay isteği anahtar kelimeleri var mı?
      const detailKeywords = ['durum', 'veri', 'detay', 'bilgi', 'ziyaret', 'teklif', 'ameliyat', 'hakkında'];
      let foundClinicForDetail: Clinic | null = null;
      let isDetailRequest = detailKeywords.some(keyword => userMessage.includes(keyword));
      let clinicNameUsedInQuery = ''; // Hangi klinik adının eşleştiğini tutalım

      if (isDetailRequest) {
        for (const clinic of clinics) { // `clinics` state'ini kullan
          if (userMessage.includes(clinic.name.toLowerCase())) {
            foundClinicForDetail = clinic;
            clinicNameUsedInQuery = clinic.name; // Eşleşen adı kaydet
            break; // İlk eşleşen kliniği al
          }
        }
      }
      
      // Teklif ID sorgusu çalışmadıysa VE klinik adı bulunduysa VE detay isteği varsa
      if (!proposalIdToFetch && foundClinicForDetail) { 
        dataWasRetrieved = true;
        const foundClinic = foundClinicForDetail;

        // Daha okunaklı formatlama
        retrievedDataInfo = `**${foundClinic.name} Kliniği Detayları:**`;
        retrievedDataInfo += `\n- **ID:** ${foundClinic.id}`;
        retrievedDataInfo += `\n- **Adres:** ${foundClinic.address || 'Belirtilmemiş'}`;
        retrievedDataInfo += `\n- **İletişim Kişisi:** ${foundClinic.contact_person || 'Belirtilmemiş'}`;
        retrievedDataInfo += `\n- **İletişim Bilgisi:** ${foundClinic.contact_info || 'Belirtilmemiş'}`;
        retrievedDataInfo += `\n- **E-posta:** ${foundClinic.email || 'Belirtilmemiş'}`;
        retrievedDataInfo += `\n- **Durum:** ${foundClinic.status || 'Belirtilmemiş'}`;
        retrievedDataInfo += `\n- **Bölge:** ${foundClinic.region?.name || 'Belirtilmemiş'}`;

        // Son 1 Ay Aktivite Detayları
        const oneMonthAgo = startOfMonth(subDays(new Date(), 0));
        const now = new Date();
        const monthInterval = { start: oneMonthAgo, end: now };

        // Son 1 Ay Ziyaretler
        const recentVisits = visitReports.filter(v => 
          v.clinic_id === foundClinic?.id && 
          v.date && isWithinInterval(new Date(v.date), monthInterval)
        );
        retrievedDataInfo += `\n\n**Son 1 Ay Ziyaretleri (${recentVisits.length} adet):**`;
        if (recentVisits.length > 0) {
          recentVisits.slice(0, 5).forEach(v => {
            const visitor = users.find(u => String(u.id) === String(v.user_id))?.name || 'Bilinmiyor';
            retrievedDataInfo += `\n  - ${formatDate(v.date)}: ${v.subject} (Gerçekleştiren: ${visitor})${v.follow_up_required ? ' [Takip Gerekli]' : ''}`;
          });
          if (recentVisits.length > 5) retrievedDataInfo += `\n  - ...ve ${recentVisits.length - 5} diğer ziyaret.`;
        } else {
          retrievedDataInfo += `\n  - Ziyaret bulunamadı.`;
        }

        // Son 1 Ay Ameliyatlar
        const recentSurgeries = surgeryReports.filter(s => 
          s.clinic_id === foundClinic?.id && 
          s.date && isWithinInterval(new Date(s.date), monthInterval)
        );
        retrievedDataInfo += `\n\n**Son 1 Ay Ameliyatları (${recentSurgeries.length} adet):**`;
        if (recentSurgeries.length > 0) {
          recentSurgeries.slice(0, 5).forEach(s => {
             const creator = users.find(u => String(u.id) === String(s.user_id))?.name || 'Bilinmiyor';
            retrievedDataInfo += `\n  - ${formatDate(s.date)}: ${s.patient_name} (${s.doctor_name || 'Doktor belirtilmemiş'}) - Durum: ${s.status} (Raporlayan: ${creator})`;
          });
          if (recentSurgeries.length > 5) retrievedDataInfo += `\n  - ...ve ${recentSurgeries.length - 5} diğer ameliyat.`;
        } else {
          retrievedDataInfo += `\n  - Ameliyat bulunamadı.`;
        }

        // Son 1 Ay Teklifler
        const recentProposals = proposals.filter(p => 
          p.clinic_id === foundClinic?.id && 
          p.created_at && isWithinInterval(new Date(p.created_at), monthInterval)
        );
        retrievedDataInfo += `\n\n**Son 1 Ay Teklifleri (${recentProposals.length} adet):**`;
        if (recentProposals.length > 0) {
          recentProposals.slice(0, 5).forEach(p => {
            const creator = users.find(u => String(u.id) === p.user_id)?.name || 'Bilinmiyor';
            retrievedDataInfo += `\n  - #${p.id} (${formatDate(p.created_at)}): ${formatCurrency(p.total_amount, p.currency)} - Durum: ${p.status} (Oluşturan: ${creator})`;
          });
          if (recentProposals.length > 5) retrievedDataInfo += `\n  - ...ve ${recentProposals.length - 5} diğer teklif.`;
        } else {
          retrievedDataInfo += `\n  - Teklif bulunamadı.`;
        }

      } // Klinik detay sorgusu bitti
      // ÖNCELİK 3: Kullanıcı Aktivite Sorgulaması
      const userKeywords = ['kullanıcı', 'çalışan', 'personel', 'ekip üyesi', 'satış temsilcisi'];
      const activityKeywords = ['aktivite', 'performans', 'ne yaptı', 'yaptıkları', 'raporları', 'teklifleri', 'ziyaretleri', 'hakkında', 'bilgi', 'detay']; 
      let foundUserForDetail: User | null = null; // Bu değişkeni blok dışında tanımla
      let isUserDetailIntent = false; // Bu değişkeni blok dışında tanımla

      // Önce mesajda belirli bir kullanıcı adı var mı diye bulalım
      for (const user of users) { 
        if (user.name && userMessage.includes(user.name.toLowerCase())) {
          foundUserForDetail = user;
          break; // İlk eşleşen kullanıcı yeterli
        }
      }

      // Şimdi, detay veya aktivite isteği var mı kontrol edelim (eğer kullanıcı bulunduysa)
      if (foundUserForDetail) { 
          isUserDetailIntent = activityKeywords.some(keyword => userMessage.includes(keyword));
      }
      
      // Eğer önceki sorgular çalışmadıysa VE bir kullanıcı bulunduysa VE detay isteği varsa
      if (!proposalIdToFetch && !foundClinicForDetail && foundUserForDetail && isUserDetailIntent) {
         dataWasRetrieved = true; // Bu değişken daha önce tanımlanmış olmalı
         const targetUser = foundUserForDetail;
         const userRegion = regions.find(r => r.id === targetUser.region_id)?.name || 'Belirtilmemiş';

         retrievedDataInfo = `**${targetUser.name} Kullanıcısı Detayları ve Son Aktiviteleri:**`; // Bu değişken daha önce tanımlanmış olmalı
         retrievedDataInfo += `\n- **ID:** ${targetUser.id}`;
         retrievedDataInfo += `\n- **İsim:** ${targetUser.name || '-'}`;
         retrievedDataInfo += `\n- **E-posta:** ${targetUser.email || '-'}`;
         retrievedDataInfo += `\n- **Rol:** ${targetUser.role || '-'}`;
         retrievedDataInfo += `\n- **Bölge:** ${userRegion}`;
         retrievedDataInfo += `\n- **Durum:** ${targetUser.status || '-'}`;

         // Son 1 Ay Aktiviteler
         const oneMonthAgo = startOfMonth(subDays(new Date(), 0));
          const now = new Date();
         const monthInterval = { start: oneMonthAgo, end: now };

         // Son 1 Ay Teklifler (Bu kullanıcı tarafından oluşturulan)
         const userProposals = proposals.filter(p => 
           String(p.user_id) === String(targetUser.id) && 
           p.created_at && isWithinInterval(new Date(p.created_at), monthInterval)
         );
         retrievedDataInfo += `\n\n**Son 1 Ay Teklifleri (${userProposals.length} adet):**`;
         if (userProposals.length > 0) {
           userProposals.slice(0, 5).forEach(p => {
             const clinicName = clinics.find(c => c.id === p.clinic_id)?.name || 'Bilinmiyor';
             retrievedDataInfo += `\n  - #${p.id} (${formatDate(p.created_at)}) -> Klinik: ${clinicName}, Tutar: ${formatCurrency(p.total_amount, p.currency)}, Durum: ${p.status}`;
           });
           if (userProposals.length > 5) retrievedDataInfo += `\n  - ...ve ${userProposals.length - 5} diğer teklif.`;
         } else {
           retrievedDataInfo += `\n  - Teklif bulunamadı.`;
         }

         // Son 1 Ay Ziyaretler (Bu kullanıcı tarafından gerçekleştirilen)
         const userVisits = visitReports.filter(v => 
           String(v.user_id) === String(targetUser.id) && 
           v.date && isWithinInterval(new Date(v.date), monthInterval)
         );
         retrievedDataInfo += `\n\n**Son 1 Ay Ziyaretleri (${userVisits.length} adet):**`;
         if (userVisits.length > 0) {
           userVisits.slice(0, 5).forEach(v => {
             const clinicName = clinics.find(c => c.id === v.clinic_id)?.name || 'Bilinmiyor';
             retrievedDataInfo += `\n  - ${formatDate(v.date)} -> Klinik: ${clinicName}, Konu: ${v.subject}${v.follow_up_required ? ' [Takip Gerekli]' : ''}`;
           });
           if (userVisits.length > 5) retrievedDataInfo += `\n  - ...ve ${userVisits.length - 5} diğer ziyaret.`;
          } else {
           retrievedDataInfo += `\n  - Ziyaret bulunamadı.`;
         }

         // Son 1 Ay Ameliyat Raporları (Bu kullanıcı tarafından raporlanan)
         const userSurgeries = surgeryReports.filter(s => 
           String(s.user_id) === String(targetUser.id) && 
           s.created_at && isWithinInterval(new Date(s.created_at), monthInterval) // created_at kullanıldı, ameliyat tarihi (s.date) de olabilir
         );
         retrievedDataInfo += `\n\n**Son 1 Ay Raporlanan Ameliyatlar (${userSurgeries.length} adet):**`;
         if (userSurgeries.length > 0) {
           userSurgeries.slice(0, 5).forEach(s => {
             const clinicName = clinics.find(c => c.id === s.clinic_id)?.name || 'Bilinmiyor';
             retrievedDataInfo += `\n  - Rapor #${s.id} (${formatDate(s.created_at)}): Klinik: ${clinicName}, Hasta: ${s.patient_name}, Durum: ${s.status}`;
           });
           if (userSurgeries.length > 5) retrievedDataInfo += `\n  - ...ve ${userSurgeries.length - 5} diğer ameliyat raporu.`;
        } else {
           retrievedDataInfo += `\n  - Raporlanan ameliyat bulunamadı.`;
         }

          // İsteğe bağlı: Kullanıcının zimmetindeki stoklar eklenebilir (stockLogs kullanılarak)
          const userStock = stockLogs.filter(log => String(log.user_id) === String(targetUser.id) && log.status === 'assigned');
          // Burada userStock kullanılarak bir özet eklenebilir.

      } // Kullanıcı detay sorgusu bitti
      // ÖNCELİK 4: Klinik Listeleme (Eğer önceki sorgular çalışmadıysa)
      // Buradaki koşula foundUserForDetail kontrolünü ekle
      else if (!proposalIdToFetch && !foundClinicForDetail && !foundUserForDetail && hasClinicKeyword && isListRequest) { 
        dataWasRetrieved = true;
        let filteredClinics = [...clinics];
        let regionFilter: Region | undefined = undefined;
        let statusFilter: string | null = null;
        let filterDescription = '';

        // Aktif/Pasif durumu kontrolü
        if (userMessage.includes('aktif')) {
          statusFilter = 'active';
          filterDescription = 'Aktif ';
        } else if (userMessage.includes('pasif')) {
          statusFilter = 'inactive';
          filterDescription = 'Pasif ';
        }

        // Mesajda bilinen bir bölge adı var mı diye kontrol et
        for (const region of regions) { // `regions` state'ini kullan
          if (userMessage.includes(region.name.toLowerCase())) {
            regionFilter = region;
            filterDescription += `${region.name} Bölgesi `;
            break;
          }
        }
        
        // Bölge adlarını esnek kontrol et - ek olarak "ege bölgesi" vb. tanımlı bölgeleri de ara
        if (!regionFilter) {
          const regionKeywords: {[key: string]: string[]} = {
            "ege": ["ege", "izmir", "aydin", "muğla", "denizli", "manisa", "uşak", "afyon"],
            "marmara": ["marmara", "istanbul", "bursa", "kocaeli", "balıkesir", "tekirdağ", "edirne"],
            "akdeniz": ["akdeniz", "antalya", "mersin", "adana", "hatay", "osmaniye", "burdur"],
            "iç anadolu": ["iç anadolu", "ankara", "konya", "kayseri", "eskişehir", "sivas"],
            "karadeniz": ["karadeniz", "samsun", "trabzon", "rize", "ordu", "giresun"],
            "doğu anadolu": ["doğu anadolu", "erzurum", "malatya", "van", "kars", "ağrı"],
            "güneydoğu anadolu": ["güneydoğu anadolu", "diyarbakır", "gaziantep", "şanlıurfa", "mardin"]
          };
          
          for (const [regionName, keywords] of Object.entries(regionKeywords)) {
            if (keywords.some(k => userMessage.includes(k.toLowerCase()))) {
              const matchingRegion = regions.find(r => 
                r.name.toLowerCase().includes(regionName) || 
                regionName.includes(r.name.toLowerCase())
              );
              
              if (matchingRegion) {
                regionFilter = matchingRegion;
                filterDescription += `${matchingRegion.name} Bölgesi `;
              } else {
                 // Eşleşme bulunamasa bile bölge adını göstermek için kullanabiliriz
                 filterDescription += `${regionName.charAt(0).toUpperCase() + regionName.slice(1)} Bölgesi `;
              }
              break; // İlk eşleşen bölge yeterli
            }
          }
        }

        // Filtreleri uygula
        if (regionFilter) {
          filteredClinics = filteredClinics.filter(c => c.region_id === regionFilter?.id);
        }
        if (statusFilter) {
          filteredClinics = filteredClinics.filter(c => c.status === statusFilter);
        }

        // Sonuçları Formatla
        retrievedDataInfo = `Klinik Bilgileri (${filterDescription.trim() || 'Tümü'}):`;

        if (filteredClinics.length > 0) {
          retrievedDataInfo += `\nToplam ${filteredClinics.length} klinik bulundu.`;
          const clinicList = filteredClinics.slice(0, 10).map(c => `- ${c.name} (${c.region?.name || regionFilter?.name || 'Bölge Yok'})`).join('\n');
           if (filteredClinics.length > 10) {
             retrievedDataInfo += `\nİlk 10 Klinik:\n${clinicList}`;
           } else {
             retrievedDataInfo += `\nKlinikler:\n${clinicList}`;
           }
        } else {
          retrievedDataInfo += filterDescription
            ? `\nSistemde '${filterDescription.trim()}' kriterlerine uygun klinik bulunmuyor.`
            : '\nSistemde kayıtlı klinik bulunmuyor.';
        }
      }
      // ÖNCELİK 5: Teklif Listeleme (Eğer önceki sorgular çalışmadıysa)
      // Buradaki koşula foundUserForDetail ve foundClinicForDetail kontrolünü ekle
      else if (!proposalIdToFetch && !foundClinicForDetail && !foundUserForDetail && (userMessage.includes('teklif') || userMessage.match(/^teklifler$/i))) {
        dataWasRetrieved = true;
        let filteredProposals = [...proposals];
        let filterDescriptions: string[] = [];

        // Durum Filtresi
        let statusFilter: string | null = null;
        if (userMessage.includes('onaylan')) statusFilter = 'approved';
        else if (userMessage.includes('bekleyen') || userMessage.includes('pending')) statusFilter = 'pending';
        else if (userMessage.includes('reddedilen') || userMessage.includes('rejected')) statusFilter = 'rejected';
        else if (userMessage.includes('süresi dol') || userMessage.includes('expired')) statusFilter = 'expired';
        else if (userMessage.includes('tamamlanan') || userMessage.includes('teslim') || userMessage.includes('delivered')) statusFilter = 'delivered';
        else if (userMessage.includes('sözleşme') && userMessage.includes('alındı')) statusFilter = 'contract_received';
        else if (userMessage.includes('transfer')) statusFilter = 'in_transfer';
        
        if (statusFilter) {
          filteredProposals = filteredProposals.filter(p => p.status === statusFilter);
          filterDescriptions.push(`Durum: ${statusFilter}`);
        }

        // Klinik Filtresi
        let clinicFilter: Clinic | undefined = undefined;
        for (const clinic of clinics) {
          // Klinik adının tam veya kısmi eşleşmesini kontrol et
          if (userMessage.includes(clinic.name.toLowerCase())) {
            clinicFilter = clinic;
            break;
          }
        }
        if (clinicFilter) {
          filteredProposals = filteredProposals.filter(p => p.clinic_id === clinicFilter?.id);
          filterDescriptions.push(`Klinik: ${clinicFilter.name}`);
        }
        
        // Kullanıcı Filtresi (Mesajda kullanıcı adı geçiyorsa VEYA "benim" geçiyorsa)
        let userFilter: User | undefined = undefined;
        const isMyRequest = userMessage.includes('benim') || userMessage.includes('bana ait');

        if (isMyRequest && currentUser) {
            userFilter = currentUser;
        } else {
            for (const user of users) {
              if (user.name && userMessage.includes(user.name.toLowerCase())) {
                  userFilter = user;
                  break;
              }
            }
        }

        if (userFilter) {
          filteredProposals = filteredProposals.filter(p => String(p.user_id) === String(userFilter?.id)); // ID karşılaştırması string olarak yapılıyor
          filterDescriptions.push(`Oluşturan: ${isMyRequest ? 'Siz' : userFilter.name}`);
        }

        // Kampanya Filtresi
        let campaignFilter: Campaign | undefined = undefined;
        for (const campaign of campaigns) {
            // Kampanya adının tam veya kısmi eşleşmesini kontrol et
            if (campaign.name && userMessage.includes(campaign.name.toLowerCase())) {
                campaignFilter = campaign;
                break;
            }
        }
        if (campaignFilter) {
            // Kampanya ID'sine göre filtreleme. Teklif verisinde kampanya ID'si olmalı.
            // Varsayım: Teklif objesinde campaign_id alanı var.
            filteredProposals = filteredProposals.filter(p => p.campaign_id === campaignFilter?.id);
            filterDescriptions.push(`Kampanya: ${campaignFilter.name}`);
        }

        // Zaman Aralığı Filtresi (Teklifler için)
        let dateRangeFilter: { start: Date, end: Date } | null = null;
        for (const keyword of timeKeywords) {
            if (userMessage.includes(keyword)) {
                dateRangeFilter = getDateRange(keyword);
                if (dateRangeFilter) {
                    filterDescriptions.push(`Zaman: ${keyword}`);
                    break;
                }
            }
        }
        if (dateRangeFilter) {
            const { start, end } = dateRangeFilter;
            filteredProposals = filteredProposals.filter(p => {
                if (!p.created_at) return false;
                try {
                    const proposalDate = new Date(p.created_at);
                    return isWithinInterval(proposalDate, { start, end });
                } catch (e) {
                    console.error("Tarih parse hatası:", p.created_at, e);
                    return false;
                }
            });
        }

        // Sonuçları Formatla
        retrievedDataInfo = `Teklif Bilgileri (${filterDescriptions.length > 0 ? filterDescriptions.join(', ') : 'Tümü'}):`;
        if (filteredProposals.length > 0) {
          retrievedDataInfo += `\nToplam ${filteredProposals.length} teklif bulundu.`;
          const proposalList = filteredProposals.slice(0, 15).map(p => { // İlk 15 teklifi göster
            const clinicName = clinics.find(c => c.id === p.clinic_id)?.name || 'Bilinmiyor';
            const creatorName = users.find(u => String(u.id) === p.user_id)?.name || 'Bilinmiyor';
            return `- ID: ${p.id}, Klinik: ${clinicName}, Oluşturan: ${creatorName}, Durum: ${p.status}, Tutar: ${formatCurrency(p.total_amount, p.currency)}`;
          }).join('\n');
           if (filteredProposals.length > 15) {
             retrievedDataInfo += `\nİlk 15 Teklif:\n${proposalList}`;
           } else {
             retrievedDataInfo += `\nTeklifler:\n${proposalList}`;
           }
        } else {
          retrievedDataInfo += `\nBelirtilen kriterlere (${filterDescriptions.join(', ') || 'Tümü'}) uygun teklif bulunamadı.`;
        }
      }
      // ÖNCELİK 6: Ameliyat Raporları Listeleme/Filtreleme
      else if (!proposalIdToFetch && !foundClinicForDetail && !foundUserForDetail && (userMessage.includes('ameliyat') || userMessage.includes('cerrahi') || userMessage.match(/raporlar[ı]?$/i))) {
          dataWasRetrieved = true;
          let filteredSurgeries = [...surgeryReports];
          let surgeryFilterDescriptions: string[] = [];

          // Durum Filtresi (Planlanmış, Tamamlanan)
          let surgeryStatusFilter: string | null = null;
          if (userMessage.includes('planlanmış') || userMessage.includes('planlanan')) surgeryStatusFilter = 'planned';
          else if (userMessage.includes('tamamlan')) surgeryStatusFilter = 'completed';

          if (surgeryStatusFilter) {
              filteredSurgeries = filteredSurgeries.filter(s => s.status === surgeryStatusFilter);
              surgeryFilterDescriptions.push(`Durum: ${surgeryStatusFilter}`);
          }

          // Klinik Filtresi
          let surgeryClinicFilter: Clinic | undefined = undefined;
          for (const clinic of clinics) {
              if (userMessage.includes(clinic.name.toLowerCase())) {
                  surgeryClinicFilter = clinic;
                  break;
              }
          }
          if (surgeryClinicFilter) {
              filteredSurgeries = filteredSurgeries.filter(s => s.clinic_id === surgeryClinicFilter?.id);
              surgeryFilterDescriptions.push(`Klinik: ${surgeryClinicFilter.name}`);
          }

          // Kullanıcı Filtresi ("benim" raporlarım)
          const isMySurgeryRequest = userMessage.includes('benim') || userMessage.includes('bana ait');
          if (isMySurgeryRequest && currentUser) {
              // Varsayım: SurgeryReport objesinde user_id alanı var
              filteredSurgeries = filteredSurgeries.filter(s => String(s.user_id) === String(currentUser.id));
              surgeryFilterDescriptions.push('Oluşturan: Siz');
          }

          // Zaman Aralığı Filtresi
          let surgeryDateRangeFilter: { start: Date, end: Date } | null = null;
          for (const keyword of timeKeywords) {
              if (userMessage.includes(keyword)) {
                  surgeryDateRangeFilter = getDateRange(keyword);
                  if (surgeryDateRangeFilter) {
                      surgeryFilterDescriptions.push(`Zaman: ${keyword}`);
                      break;
                  }
              }
          }
          if (surgeryDateRangeFilter) {
              const { start, end } = surgeryDateRangeFilter;
              filteredSurgeries = filteredSurgeries.filter(s => {
                  if (!s.date) return false;
                  try {
                      const surgeryDate = new Date(s.date);
                      return isWithinInterval(surgeryDate, { start, end });
                  } catch (e) {
                      console.error("Ameliyat Tarihi parse hatası:", s.date, e);
                      return false;
                  }
              });
          }


          // Sonuçları Formatla
          retrievedDataInfo = `Ameliyat Rapor Bilgileri (${surgeryFilterDescriptions.length > 0 ? surgeryFilterDescriptions.join(', ') : 'Tümü'}):`;
          if (filteredSurgeries.length > 0) {
              retrievedDataInfo += `\nToplam ${filteredSurgeries.length} ameliyat raporu bulundu.`;
              const surgeryList = filteredSurgeries.slice(0, 15).map(s => {
                  const clinicName = clinics.find(c => c.id === s.clinic_id)?.name || 'Bilinmiyor';
                  const userName = users.find(u => String(u.id) === String(s.user_id))?.name || 'Bilinmiyor'; // user_id varsayımı
                  // doctor_name alanı SurgeryReport tipinde tanımlı olmalı
                  return `- ID: ${s.id}, Klinik: ${clinicName}, Doktor: ${s.doctor_name || '-'}, Tarih: ${s.date || '-'}, Durum: ${s.status}, Oluşturan: ${userName}`;
              }).join('\n');
              if (filteredSurgeries.length > 15) {
                  retrievedDataInfo += `\nİlk 15 Rapor:\n${surgeryList}`;
              } else {
                  retrievedDataInfo += `\nRaporlar:\n${surgeryList}`;
              }
          } else {
              retrievedDataInfo += `\nBelirtilen kriterlere (${surgeryFilterDescriptions.join(', ') || 'Tümü'}) uygun ameliyat raporu bulunamadı.`;
          }

      }
      // ÖNCELİK 7: Ziyaret Raporları Listeleme/Filtreleme
      else if (!proposalIdToFetch && !foundClinicForDetail && !foundUserForDetail && (userMessage.includes('ziyaret') || userMessage.match(/ziyaretlerim/i))) {
          dataWasRetrieved = true;
          let filteredVisits = [...visitReports];
          let visitFilterDescriptions: string[] = [];

          // Klinik Filtresi
          let visitClinicFilter: Clinic | undefined = undefined;
          for (const clinic of clinics) {
              if (userMessage.includes(clinic.name.toLowerCase())) {
                  visitClinicFilter = clinic;
                  break;
              }
          }
          if (visitClinicFilter) {
              filteredVisits = filteredVisits.filter(v => v.clinic_id === visitClinicFilter?.id);
              visitFilterDescriptions.push(`Klinik: ${visitClinicFilter.name}`);
          }

          // Kullanıcı Filtresi ("benim" ziyaretlerim)
          const isMyVisitRequest = userMessage.includes('benim') || userMessage.includes('bana ait');
          if (isMyVisitRequest && currentUser) {
              filteredVisits = filteredVisits.filter(v => String(v.user_id) === String(currentUser.id));
              visitFilterDescriptions.push('Gerçekleştiren: Siz');
          }

          // Takip Gerektirenler Filtresi
          if (userMessage.includes('takip')) {
              filteredVisits = filteredVisits.filter(v => v.follow_up_required === true);
              visitFilterDescriptions.push('Takip Gerekiyor');
          }

          // Zaman Aralığı Filtresi
          let visitDateRangeFilter: { start: Date, end: Date } | null = null;
          for (const keyword of timeKeywords) {
              if (userMessage.includes(keyword)) {
                  visitDateRangeFilter = getDateRange(keyword);
                  if (visitDateRangeFilter) {
                      visitFilterDescriptions.push(`Zaman: ${keyword}`);
                      break;
                  }
              }
          }
          if (visitDateRangeFilter) {
              const { start, end } = visitDateRangeFilter;
              filteredVisits = filteredVisits.filter(v => {
                  if (!v.date) return false;
                  try {
                      const visitDate = new Date(v.date);
                      return isWithinInterval(visitDate, { start, end });
                  } catch (e) {
                      console.error("Ziyaret Tarihi parse hatası:", v.date, e);
                      return false;
                  }
              });
          }

          // Takip Tarihi Geçmiş Olanları Filtrele
          if (userMessage.includes('takip') && userMessage.includes('geçmiş')) {
              const now = new Date();
              filteredVisits = filteredVisits.filter(v => 
                  v.follow_up_required === true && 
                  v.follow_up_date && 
                  new Date(v.follow_up_date) < now
              );
              // Mevcut filtre açıklamalarına ekleme yapabilir veya ayrı bir açıklama tutulabilir.
              visitFilterDescriptions.push('Takip Tarihi Geçmiş');
          }

          // Sonuçları Formatla
          retrievedDataInfo = `Ziyaret Rapor Bilgileri (${visitFilterDescriptions.length > 0 ? visitFilterDescriptions.join(', ') : 'Tümü'}):`;
          if (filteredVisits.length > 0) {
              retrievedDataInfo += `\nToplam ${filteredVisits.length} ziyaret raporu bulundu.`;
              // Son ziyareti bulma mantığı (eğer spesifik bir klinik için istenirse)
              if (visitClinicFilter && userMessage.includes('son ziyaret')) {
                  filteredVisits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  const lastVisit = filteredVisits[0];
                  const userName = users.find(u => String(u.id) === String(lastVisit.user_id))?.name || 'Bilinmiyor';
                  retrievedDataInfo = `${visitClinicFilter.name} kliniğine yapılan son ziyaret:`;
                  retrievedDataInfo += `\n- ID: ${lastVisit.id}, Gerçekleştiren: ${userName}, Tarih: ${lastVisit.date}, Konu: ${lastVisit.subject}`;
              } else {
                  // Genel listeleme
                  const visitList = filteredVisits.slice(0, 15).map(v => {
                      const clinicName = clinics.find(c => c.id === v.clinic_id)?.name || 'Bilinmiyor';
                      const userName = users.find(u => String(u.id) === String(v.user_id))?.name || 'Bilinmiyor';
                      const followUp = v.follow_up_required ? ` (Takip: ${v.follow_up_date || 'Evet'})` : '';
                      return `- ID: ${v.id}, Klinik: ${clinicName}, Gerçekleştiren: ${userName}, Tarih: ${v.date}, Konu: ${v.subject}${followUp}`;
                  }).join('\n');
                  if (filteredVisits.length > 15) {
                      retrievedDataInfo += `\nİlk 15 Rapor:\n${visitList}`;
                  } else {
                      retrievedDataInfo += `\nRaporlar:\n${visitList}`;
                  }
              }
          } else {
              retrievedDataInfo += `\nBelirtilen kriterlere (${visitFilterDescriptions.join(', ') || 'Tümü'}) uygun ziyaret raporu bulunamadı.`;
          }
      }
      // ÖNCELİK 8: Ürünler Listeleme/Filtreleme
      else if (!proposalIdToFetch && !foundClinicForDetail && !foundUserForDetail && (userMessage.includes('ürün') || userMessage.match(/ürünler[i]?$/i))) {
          dataWasRetrieved = true;
          let filteredProducts = [...products];
          let productFilterDescriptions: string[] = [];

          // Kategori Filtresi
          const categoryKeywords = ['implant', 'accessory', 'tool', 'other'];
          let categoryFilter: string | null = null;
          for (const keyword of categoryKeywords) {
              if (userMessage.includes(keyword)) {
                  categoryFilter = keyword;
                  break;
              }
          }
          if (categoryFilter) {
              filteredProducts = filteredProducts.filter(p => p.category?.name === categoryFilter);
              productFilterDescriptions.push(`Kategori: ${categoryFilter}`);
          }

          // Durum Filtresi (Aktif)
          // Product tipinde status olmadığı için bu filtre kaldırıldı.
          /*
          if (userMessage.includes('aktif')) {
              filteredProducts = filteredProducts.filter(p => p.status === 'active');
              productFilterDescriptions.push('Durum: Aktif');
          }
          */

          // Para Birimi Filtresi
          const currencyKeywords = ['TRY', 'USD', 'EUR'];
          let currencyFilter: string | null = null;
          for (const keyword of currencyKeywords) {
              if (userMessage.includes(keyword)) {
                  currencyFilter = keyword;
                  break;
              }
          }
          if (currencyFilter) {
              filteredProducts = filteredProducts.filter(p => p.currency === currencyFilter);
              productFilterDescriptions.push(`Para Birimi: ${currencyFilter}`);
          }

          // Ürün Adı ile Fiyat Sorgulama
          let productNameQuery: string | null = null;
          for (const product of products) {
            if (userMessage.includes(product.name.toLowerCase()) && (userMessage.includes('fiyat') || userMessage.includes('ne kadar'))) {
                productNameQuery = product.name;
                filteredProducts = products.filter(p => p.name === productNameQuery);
                break;
            }
          }

          // Sonuçları Formatla
          if (productNameQuery) {
              if (filteredProducts.length > 0) {
                  const product = filteredProducts[0];
                  retrievedDataInfo = `${product.name} ürününün fiyatı: ${formatCurrency(product.price, product.currency)}`;
              } else {
                  retrievedDataInfo = `'${productNameQuery}' adında bir ürün bulunamadı.`;
              }
          } else {
              retrievedDataInfo = `Ürün Bilgileri (${productFilterDescriptions.length > 0 ? productFilterDescriptions.join(', ') : 'Tümü'}):`;
              if (filteredProducts.length > 0) {
                  retrievedDataInfo += `\nToplam ${filteredProducts.length} ürün bulundu.`;
                  const productList = filteredProducts.slice(0, 15).map(p => {
                      return `- ${p.name} (Kategori: ${p.category?.name || 'Belirtilmemiş'}, Fiyat: ${formatCurrency(p.price, p.currency)})`; // p.currency tipi dönüşümü kaldırıldı
                  }).join('\n');
                  if (filteredProducts.length > 15) {
                      retrievedDataInfo += `\nİlk 15 Ürün:\n${productList}`;
                  } else {
                      retrievedDataInfo += `\nÜrünler:\n${productList}`;
                  }
              } else {
                  retrievedDataInfo += `\nBelirtilen kriterlere (${productFilterDescriptions.join(', ') || 'Tümü'}) uygun ürün bulunamadı.`;
              }
          }
      }
      // ÖNCELİK 9: Kampanyalar Listeleme/Filtreleme
      else if (!proposalIdToFetch && !foundClinicForDetail && !foundUserForDetail && (userMessage.includes('kampanya') || userMessage.match(/kampanyalar[ı]?$/i))) {
          dataWasRetrieved = true;
          let filteredCampaigns = [...campaigns];
          let campaignFilterDescriptions: string[] = [];

          // Durum Filtresi (Aktif, Süresi Dolmuş)
          let campaignStatusFilter: 'active' | 'inactive' | null = null;
          if (userMessage.includes('aktif')) {
              campaignStatusFilter = 'active';
          } else if (userMessage.includes('süresi dolmuş') || userMessage.includes('geçmiş') || userMessage.includes('eski')) {
              campaignStatusFilter = 'inactive'; // Varsayım: süresi dolmuş = inactive
          }

          if (campaignStatusFilter) {
              filteredCampaigns = filteredCampaigns.filter(c => c.status === campaignStatusFilter);
              campaignFilterDescriptions.push(`Durum: ${campaignStatusFilter === 'active' ? 'Aktif' : 'Süresi Dolmuş'}`);
          }

          // Bölge Filtresi
          let campaignRegionFilter: Region | undefined = undefined;
           for (const region of regions) {
             if (userMessage.includes(region.name.toLowerCase())) {
               campaignRegionFilter = region;
               break;
             }
           }
           if (campaignRegionFilter) {
               // Varsayım: Campaign tipinde target_regions alanı number[] tipinde bölge IDlerini tutuyor
               filteredCampaigns = filteredCampaigns.filter(c =>
                   c.target_regions?.includes(campaignRegionFilter!.id)
               );
               campaignFilterDescriptions.push(`Bölge: ${campaignRegionFilter.name}`);
           }

          // Kampanya Detay Sorgusu (İsme Göre)
          let campaignNameQuery: string | null = null;
          for (const campaign of campaigns) {
               if (userMessage.includes(campaign.name.toLowerCase()) && (userMessage.includes('detay') || userMessage.includes('bilgi'))) {
                   campaignNameQuery = campaign.name;
                   filteredCampaigns = campaigns.filter(c => c.name === campaignNameQuery);
                   break;
               }
          }

          // Sonuçları Formatla
           if (campaignNameQuery && filteredCampaigns.length > 0) {
               const campaign = filteredCampaigns[0];
               retrievedDataInfo = `${campaign.name} Kampanyası Detayları:`;
               retrievedDataInfo += `\n- Açıklama: ${campaign.description || 'Yok'}`;
               retrievedDataInfo += `\n- Başlangıç: ${campaign.start_date}`;
               retrievedDataInfo += `\n- Bitiş: ${campaign.end_date}`;
               retrievedDataInfo += `\n- Durum: ${campaign.status}`;
               const targetRegions = campaign.target_regions?.map(id => regions.find(r => r.id === id)?.name).filter(Boolean).join(', ') || 'Tüm Bölgeler';
               retrievedDataInfo += `\n- Hedef Bölgeler: ${targetRegions}`;
               // İndirim, tutar gibi ek bilgiler eklenebilir
           } else {
               retrievedDataInfo = `Kampanya Bilgileri (${campaignFilterDescriptions.length > 0 ? campaignFilterDescriptions.join(', ') : 'Tümü'}):`;
               if (filteredCampaigns.length > 0) {
                   retrievedDataInfo += `\nToplam ${filteredCampaigns.length} kampanya bulundu.`;
                   const campaignList = filteredCampaigns.slice(0, 15).map(c => {
                       const targetRegions = c.target_regions?.map(id => regions.find(r => r.id === id)?.name).filter(Boolean).join(', ') || 'Tümü';
                       return `- ${c.name} (Durum: ${c.status}, Bitiş: ${c.end_date}, Bölgeler: ${targetRegions})`;
                   }).join('\n');
                   if (filteredCampaigns.length > 15) {
                       retrievedDataInfo += `\nİlk 15 Kampanya:\n${campaignList}`;
                   } else {
                       retrievedDataInfo += `\nKampanyalar:\n${campaignList}`;
                   }
               } else {
                   retrievedDataInfo += `\nBelirtilen kriterlere (${campaignFilterDescriptions.join(', ') || 'Tümü'}) uygun kampanya bulunamadı.`;
               }
           }
       }
       // ÖNCELİK 10: Kullanıcılar/Takım Listeleme/Detay
       else if (!proposalIdToFetch && !foundClinicForDetail && !foundUserForDetail && (userMessage.includes('kullanıcı') || userMessage.includes('takım') || userMessage.includes('ekip'))) {
          dataWasRetrieved = true;
          let filteredUsers = [...users];
          let userFilterDescriptions: string[] = [];
          let specificUserDetailQuery: User | null = null;

          // Yetki Kontrolü (Admin/Manager/Bölge Müdürü rolleri gerekli olabilir)
          const canViewAllUsers = currentUser && (
              currentUser.role === UserRoleEnum.ADMIN || 
              currentUser.role === UserRoleEnum.MANAGER || 
              currentUser.role === UserRoleEnum.REGIONAL_MANAGER
          );

          // Bölge Filtresi
          let userRegionFilter: Region | undefined = undefined;
          for (const region of regions) {
              if (userMessage.includes(region.name.toLowerCase())) {
                  userRegionFilter = region;
                  break;
              }
          }
          if (userRegionFilter) {
              // Kullanıcının doğrudan region_id'si veya user_regions ilişkisi üzerinden filtrele
              filteredUsers = filteredUsers.filter(u =>
                  u.region_id === userRegionFilter!.id ||
                  u.user_regions?.some(ur => ur.region_id === userRegionFilter!.id)
              );
              userFilterDescriptions.push(`Bölge: ${userRegionFilter.name}`);
          }

          // Rol Filtresi (örn: "saha ekibi")
          let roleFilter: UserRole | null = null;
          if (userMessage.includes('saha') || userMessage.includes('field')) {
              roleFilter = UserRoleEnum.FIELD_USER;
          } else if (userMessage.includes('yönetici') || userMessage.includes('manager')) {
              roleFilter = UserRoleEnum.MANAGER;
          } // Diğer roller eklenebilir

          if (roleFilter) {
              filteredUsers = filteredUsers.filter(u => u.role === roleFilter);
              userFilterDescriptions.push(`Rol: ${roleFilter}`);
          }

          // Spesifik Kullanıcı Detay Sorgusu (isimle)
          for (const user of users) {
               if (user.name && userMessage.includes(user.name.toLowerCase()) && (userMessage.includes('detay') || userMessage.includes('bilgi') || userMessage.includes('iletişim') || userMessage.includes('sorumlu olduğu bölge') || userMessage.includes('bölgesi'))) {
                   specificUserDetailQuery = user;
                   break;
               }
          }

          // Yetki Kontrolü (Detay ve Liste için)
          if (!canViewAllUsers && (userRegionFilter || roleFilter || !specificUserDetailQuery)) {
              retrievedDataInfo = 'Bu bilgiyi görüntüleme yetkiniz bulunmamaktadır.';
          } else if (specificUserDetailQuery) {
               retrievedDataInfo = `${specificUserDetailQuery.name} Kullanıcısı Detayları:`;
               retrievedDataInfo += `\n- İsim: ${specificUserDetailQuery.name || '-'}`;
               retrievedDataInfo += `\n- E-posta: ${specificUserDetailQuery.email || '-'}`;
               retrievedDataInfo += `\n- Telefon: ${specificUserDetailQuery.phone || '-'}`;
               retrievedDataInfo += `\n- Rol: ${specificUserDetailQuery.role || '-'}`;
               const userRegionName = regions.find(r => r.id === specificUserDetailQuery?.region_id)?.name || 'Belirtilmemiş';
               // user_regions ilişkisinden de bölgeler eklenebilir
               retrievedDataInfo += `\n- Bölge: ${userRegionName}`;
               retrievedDataInfo += `\n- Durum: ${specificUserDetailQuery.status || '-'}`;
          } else {
               retrievedDataInfo = `Kullanıcı Bilgileri (${userFilterDescriptions.length > 0 ? userFilterDescriptions.join(', ') : 'Tümü'}):`;
               if (filteredUsers.length > 0) {
                   retrievedDataInfo += `\nToplam ${filteredUsers.length} kullanıcı bulundu.`;
                   const userList = filteredUsers.slice(0, 15).map(u => {
                       const regionName = regions.find(r => r.id === u.region_id)?.name || '-';
                       return `- ${u.name || u.email} (Rol: ${u.role}, Bölge: ${regionName}, Durum: ${u.status})`;
                   }).join('\n');
                   if (filteredUsers.length > 15) {
                       retrievedDataInfo += `\nİlk 15 Kullanıcı:\n${userList}`;
                   } else {
                       retrievedDataInfo += `\nKullanıcılar:\n${userList}`;
                   }
               } else {
                   retrievedDataInfo += `\nBelirtilen kriterlere (${userFilterDescriptions.join(', ') || 'Tümü'}) uygun kullanıcı bulunamadı.`;
               }
          }
      }
      // ÖNCELİK 11: Sayma ve Özetleme Sorguları
      else if (!proposalIdToFetch && !foundClinicForDetail && !foundUserForDetail && (userMessage.includes('kaç') || userMessage.includes('toplam') || userMessage.includes('ne kadar'))) {
          dataWasRetrieved = true;

           // Toplam Klinik Sayısı
          if (userMessage.includes('klinik') && userMessage.includes('toplam')) {
              retrievedDataInfo = `Toplam klinik sayısı: ${clinics.length}.`;
          }
          // Bölgeye Göre Klinik Sayısı
          else if (userMessage.includes('klinik') && regions.some(r => userMessage.includes(r.name.toLowerCase()))) {
              let regionFilter: Region | undefined = undefined;
              for (const region of regions) {
                  if (userMessage.includes(region.name.toLowerCase())) {
                      regionFilter = region;
                      break;
                  }
              }
              if (regionFilter) {
                  const count = clinics.filter(c => c.region_id === regionFilter!.id).length;
                  retrievedDataInfo = `${regionFilter.name} bölgesindeki klinik sayısı: ${count}.`;
              } else {
                  retrievedDataInfo = 'Belirtilen bölge bulunamadı.';
              }
          }
          // Zaman Aralığına Göre Yeni Teklif Sayısı
          else if (userMessage.includes('teklif') && timeKeywords.some(k => userMessage.includes(k))) {
              let dateRangeFilter: { start: Date, end: Date } | null = null;
              let timeKeywordUsed = '';
              for (const keyword of timeKeywords) {
                  if (userMessage.includes(keyword)) {
                      dateRangeFilter = getDateRange(keyword);
                      timeKeywordUsed = keyword;
                      break;
                  }
              }
              if (dateRangeFilter) {
                  const { start, end } = dateRangeFilter;
                  const count = proposals.filter(p => {
                      if (!p.created_at) return false;
                      try {
                          const proposalDate = new Date(p.created_at);
                          return isWithinInterval(proposalDate, { start, end });
                      } catch { return false; }
                  }).length;
                  retrievedDataInfo = `${timeKeywordUsed.charAt(0).toUpperCase() + timeKeywordUsed.slice(1)} oluşturulan yeni teklif sayısı: ${count}.`;
              } else {
                  retrievedDataInfo = 'Geçerli bir zaman aralığı belirtilmedi.';
              }
          }
          // Duruma Göre Teklif Sayısı (örn: bekleyen)
          else if (userMessage.includes('teklif') && (userMessage.includes('bekleyen') || userMessage.includes('onaylanan') || userMessage.includes('reddedilen'))) {
               let statusFilter: string | null = null;
               let statusKeyword = '';
               if (userMessage.includes('bekleyen')) { statusFilter = 'pending'; statusKeyword = 'Bekleyen'; }
               else if (userMessage.includes('onaylanan')) { statusFilter = 'approved'; statusKeyword = 'Onaylanan'; }
               else if (userMessage.includes('reddedilen')) { statusFilter = 'rejected'; statusKeyword = 'Reddedilen'; }

               if (statusFilter) {
                   const count = proposals.filter(p => p.status === statusFilter).length;
                   retrievedDataInfo = `${statusKeyword} teklif sayısı: ${count}.`;
               } else {
                    retrievedDataInfo = 'Teklif durumu belirtilmedi.';
               }
          }
           // Onaylanan Tekliflerin Toplam Değeri
          else if (userMessage.includes('onaylanan teklif') && userMessage.includes('toplam değer')) {
               const approvedProposals = proposals.filter(p => p.status === 'approved');
               const totalValueByCurrency: { [key: string]: number } = {};
               approvedProposals.forEach(p => {
                   const currency = p.currency || 'TRY';
                   totalValueByCurrency[currency] = (totalValueByCurrency[currency] || 0) + (p.total_amount || 0);
               });
               if (Object.keys(totalValueByCurrency).length > 0) {
                   retrievedDataInfo = 'Onaylanan tekliflerin toplam değeri:';
                   for (const [currency, total] of Object.entries(totalValueByCurrency)) {
                       retrievedDataInfo += `\n- ${formatCurrency(total, currency)}`;
                   }
               } else {
                   retrievedDataInfo = 'Henüz onaylanmış teklif bulunmamaktadır.';
               }
          }
          // Zaman Aralığına Göre Ziyaret Sayısı
          else if (userMessage.includes('ziyaret') && timeKeywords.some(k => userMessage.includes(k))) {
              let dateRangeFilter: { start: Date, end: Date } | null = null;
              let timeKeywordUsed = '';
              for (const keyword of timeKeywords) {
                  if (userMessage.includes(keyword)) {
                      dateRangeFilter = getDateRange(keyword);
                      timeKeywordUsed = keyword;
                      break;
                  }
              }
              if (dateRangeFilter) {
                  const { start, end } = dateRangeFilter;
                  const count = visitReports.filter(v => {
                      if (!v.date) return false;
                      try {
                          const visitDate = new Date(v.date);
                          return isWithinInterval(visitDate, { start, end });
                      } catch { return false; }
                  }).length;
                  retrievedDataInfo = `${timeKeywordUsed.charAt(0).toUpperCase() + timeKeywordUsed.slice(1)} yapılan ziyaret sayısı: ${count}.`;
              } else {
                  retrievedDataInfo = 'Geçerli bir zaman aralığı belirtilmedi.';
              }
          }
          // Ürünün Kaç Teklifte Kullanıldığı
          else if (userMessage.includes('ürün') && userMessage.includes('teklifte kullan')) {
               let productFilter: Product | undefined = undefined;
               for (const product of products) {
                   if (userMessage.includes(product.name.toLowerCase())) {
                       productFilter = product;
                       break;
                   }
               }
               if (productFilter) {
                   let count = 0;
                   proposals.forEach(p => {
                       if (p.items?.some(item => item.product_id === productFilter!.id)) {
                           count++;
                       }
                   });
                   retrievedDataInfo = `${productFilter.name} ürünü ${count} teklifte kullanılmış.`;
               } else {
                   retrievedDataInfo = 'Sorgulanacak ürün adı belirtilmedi veya bulunamadı.';
               }
          }
          // Bilinmeyen sayma sorgusu
          else {
               dataWasRetrieved = false; // AI'nın genel yanıt vermesine izin ver
          }


      }
      
      // ÖNCELİK 4.1: Son [Zaman Dilimi] İçindeki Teklifler
      else if (!proposalIdToFetch && !foundClinicForDetail && !foundUserForDetail && userMessage.includes('son') && userMessage.includes('teklif')) {
        dataWasRetrieved = true;
        let filteredProposals = [...proposals];
        let periodFilterDescription = '';

        // Zaman dilimi tespiti için regex kalıpları
        const weekPattern = /son\s+(\d+)\s*hafta/i; // "son 2 hafta", "son 1 haftadaki" gibi
        const dayPattern = /son\s+(\d+)\s*gün/i; // "son 5 gün", "son 3 gündeki" gibi
        const monthPattern = /son\s+(\d+)\s*ay/i; // "son 3 ay", "son 1 aydaki" gibi
        
        let dateRangeFilter: { start: Date, end: Date } | null = null;
        let customPeriod = false;
        
        // Özel zaman dilimi kontrolleri
        const weekMatch = userMessage.match(weekPattern);
        const dayMatch = userMessage.match(dayPattern);
        const monthMatch = userMessage.match(monthPattern);
        
        if (weekMatch && weekMatch[1]) {
          const weekCount = parseInt(weekMatch[1], 10);
          if (!isNaN(weekCount) && weekCount > 0) {
            const now = new Date();
            const start = subDays(now, weekCount * 7);
            dateRangeFilter = { start, end: now };
            periodFilterDescription = `Son ${weekCount} Hafta`;
            customPeriod = true;
          }
        } else if (dayMatch && dayMatch[1]) {
          const dayCount = parseInt(dayMatch[1], 10);
          if (!isNaN(dayCount) && dayCount > 0) {
            const now = new Date();
            const start = subDays(now, dayCount);
            dateRangeFilter = { start, end: now };
            periodFilterDescription = `Son ${dayCount} Gün`;
            customPeriod = true;
          }
        } else if (monthMatch && monthMatch[1]) {
          const monthCount = parseInt(monthMatch[1], 10);
          if (!isNaN(monthCount) && monthCount > 0) {
            const now = new Date();
            now.setDate(now.getDate() + 1); // Bugünü de dahil etmek için
            const start = new Date(now);
            start.setMonth(start.getMonth() - monthCount);
            dateRangeFilter = { start, end: now };
            periodFilterDescription = `Son ${monthCount} Ay`;
            customPeriod = true;
          }
        }
        
        // Standart zaman aralıkları için kontrol (özel bir aralık bulunamadıysa)
        if (!customPeriod) {
          for (const keyword of timeKeywords) {
            if (userMessage.includes(keyword)) {
              dateRangeFilter = getDateRange(keyword);
              if (dateRangeFilter) {
                periodFilterDescription = keyword.charAt(0).toUpperCase() + keyword.slice(1);
                break;
              }
            }
          }
        }
        
        // Tarih aralığına göre filtreleme
        if (dateRangeFilter) {
          const { start, end } = dateRangeFilter;
          filteredProposals = filteredProposals.filter(p => {
            if (!p.created_at) return false;
            try {
              const proposalDate = new Date(p.created_at);
              return isWithinInterval(proposalDate, { start, end });
            } catch (e) {
              console.error("Tarih parse hatası:", p.created_at, e);
              return false;
            }
          });
        } else {
          // Varsayılan olarak son 1 hafta
          const now = new Date();
          const lastWeek = subDays(now, 7);
          filteredProposals = filteredProposals.filter(p => {
            if (!p.created_at) return false;
            try {
              const proposalDate = new Date(p.created_at);
              return proposalDate >= lastWeek && proposalDate <= now;
            } catch (e) {
              return false;
            }
          });
          periodFilterDescription = 'Son 1 Hafta';
        }
        
        // Sonuçları formatlama
        retrievedDataInfo = `Teklif Bilgileri (${periodFilterDescription}):`;
        if (filteredProposals.length > 0) {
          retrievedDataInfo += `\nToplam ${filteredProposals.length} teklif bulundu.`;
          // Teklifleri tarihe göre sıralama (en yeniden en eskiye)
          filteredProposals.sort((a, b) => 
            new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
          );
          
          const proposalList = filteredProposals.slice(0, 15).map(p => {
            const createdAt = p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Belirtilmemiş';
            const clinicName = clinics.find(c => c.id === p.clinic_id)?.name || 'Bilinmiyor';
            const creatorName = users.find(u => String(u.id) === p.user_id)?.name || 'Bilinmiyor';
            return `- ID: ${p.id}, Tarih: ${createdAt}, Klinik: ${clinicName}, Oluşturan: ${creatorName}, Durum: ${p.status}, Tutar: ${formatCurrency(p.total_amount, p.currency)}`;
          }).join('\n');
          
          if (filteredProposals.length > 15) {
            retrievedDataInfo += `\nİlk 15 Teklif:\n${proposalList}`;
          } else {
            retrievedDataInfo += `\nTeklifler:\n${proposalList}`;
          }
        } else {
          retrievedDataInfo += `\n${periodFilterDescription} içinde oluşturulmuş teklif bulunamadı.`;
        }
      }
      
      // AI servisine istek gönder
      let prompt = '';
      if (dataWasRetrieved) {
        // Prompt metnini düzelt ve formatlama talimatı ekle
        prompt = 
`Sen ART AI, bir CRM asistanısın. Kullanıcının adı ${userName}. \
Kullanıcının sorusunu yanıtlamak için aşağıdaki CRM verilerini kullan:\
\
${retrievedDataInfo}\
\
Kullanıcının Sorusu: \"${input.trim()}\"\
\
Yanıtını şu şekilde formatla: 
- Başlıkları kalın (markdown **Başlık**) olarak kullan.
- Listeleri madde işareti (-) ile oluştur.
- Bölümler arasında bir satır boşluk bırak.

Cevabını sadece kullanıcı sorusuna odakla ve sağlanan veriyi kullanarak doğrudan ve eksiksiz bir yanıt ver. Eğer bir klinik detayı istendiyse, hem klinik bilgilerini hem de ilişkili son 1 aylık aktiviteleri (ziyaret, ameliyat, teklif) özetle. Veri özetini tekrarlama veya ek açıklama isteme. İstenen tüm bilgileri açıkça listele veya özetle. Eğer belirli bir bilgi veride yoksa, 'Belirtilmemiş' veya 'Bulunamadı' de.`;
      } else {
        // Veri bulunamadıysa veya basit bir selamlama/alakasız soru ise
        prompt = 
`Sen ART AI, bir CRM asistanısın. Kullanıcının adı ${userName}. Kullanıcının şu sorusuna cevap ver: \"${input.trim()}\". Eğer soru CRM sistemiyle ilgili değilse (klinik, teklif, rapor, ziyaret, ürün, kampanya, kullanıcı, takım vb.), kibarca sadece CRM ile ilgili yardımcı olabileceğini belirt. Eğer soru genel bir CRM sorusuysa ve spesifik veri gerektirmiyorsa (örn: 'neler yapabilirsin?'), yeteneklerini özetle. Eğer spesifik veri isteniyorsa ama veri bulunamadıysa veya soru anlaşılamadıysa, bilginin sistemde olmadığını veya soruyu anlayamadığını belirt.`;
      }
      
      console.log("Generated Prompt:", prompt);
      
      // AI yanıtını oluştur
      const aiResponseText = await aiService.generateContent(prompt);
      
      // AI yanıtını işle
      const aiResponseMessage = processAIResponse(aiResponseText);
      setMessages(prev => [...prev, aiResponseMessage]);
    } catch (error) {
      // Hata durumunda kullanıcıya bilgi ver
      const errorMessage: Message = {
        id: Date.now().toString(),
        sender: 'ai',
        text: 'Üzgünüm, isteğinizi işlerken bir hata oluştu. Lütfen tekrar deneyin.',
        dataType: 'text',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      console.error("Mesaj gönderilirken AI hatası:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  // Mesajları render etme fonksiyonu
  const renderMessages = () => {
    return messages.map((message) => (
      <ListItem 
        key={message.id}
        alignItems="flex-start" 
        sx={{ 
          flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
          mb: 1
        }}
      >
        <Avatar 
          sx={{ 
            bgcolor: message.sender === 'user' ? 'primary.main' : 'secondary.main',
            marginLeft: message.sender === 'user' ? 1 : 0,
            marginRight: message.sender === 'user' ? 0 : 1
          }}
        >
          {message.sender === 'user' ? <PersonIcon /> : <AutoAwesomeIcon />}
        </Avatar>
        <Box 
          sx={{ 
            backgroundColor: message.sender === 'user' ? 'primary.light' : '#f5f5f5',
            borderRadius: 2,
            padding: 2,
            maxWidth: '80%',
            textAlign: message.sender === 'user' ? 'right' : 'left'
          }}
        >
          {message.dataType === 'table' && message.tableData ? (
            <>
              <Typography variant="body1" component="div" sx={{ mb: 2 }}>
                {message.text.replace(/\[TABLE:.*?\]/, '').trim()}
              </Typography>
              <TableResponse data={message.tableData} />
            </>
          ) : (
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {message.text}
            </Typography>
          )}
        </Box>
      </ListItem>
    ));
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '80vh' }}>
        <Typography variant="h6" gutterBottom>
          ART AI Asistanı
        </Typography>
        
        <Divider sx={{ mb: 2 }} />
        
        <Box sx={{ 
          flexGrow: 1, 
          overflow: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          mb: 2
        }}>
          <List sx={{ width: '100%' }}>
            {renderMessages()}
          </List>
          {isLoading && (
            <Box sx={{ width: '100%', mt: 2 }}>
              <LinearProgress />
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Box>
        
        <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Mesajınızı yazın..."
            value={input}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            multiline
            maxRows={4}
            disabled={isLoading}
            sx={{ mr: 1, bgcolor: 'white' }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            sx={{ height: '40px' }}
          >
            <SendIcon />
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ArtAiPage; 