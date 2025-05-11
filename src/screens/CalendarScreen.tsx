import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Appbar, Text, Card, Chip, useTheme, Divider, Surface, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Calendar, DateData } from 'react-native-calendars';

// Karmaşık tip kontrolünü geçici olarak basitleştirelim
type RootStackParamList = any;
type EventType = 'proposal' | 'surgery' | 'visit';

// Etkinlik tipi
interface Event {
  id: number;
  title: string;
  date: string;
  time?: string;
  type: EventType;
  location?: string;
  status?: string;
}

// Navigasyon parametrelerini tanımla
type CalendarScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const CalendarScreen = () => {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [eventFilter, setEventFilter] = useState<EventType | null>(null);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [selectedDateEvents, setSelectedDateEvents] = useState<Event[]>([]);
  const theme = useTheme();
  const navigation = useNavigation<any>();

  // Etkinlikleri yükle fonksiyonu
  const fetchEventsFromDB = async () => {
    setLoading(true);
    
    try {
      // Teklifleri al
      const { data: proposals, error: proposalError } = await supabase
        .from('proposals')
        .select(`
          id,
          total_amount,
          status,
          created_at,
          clinics:clinic_id (name)
        `);

      if (proposalError) throw proposalError;

      // Ameliyatları al - surgery_reports tablosunu kullanalım
      const { data: surgeries, error: surgeryError } = await supabase
        .from('surgery_reports')
        .select(`
          id,
          date,
          time,
          clinics:clinic_id (name),
          products:product_id (name)
        `);

      if (surgeryError) throw surgeryError;

      // Ziyaretleri al - visit_reports tablosunu kullanalım
      const { data: visits, error: visitError } = await supabase
        .from('visit_reports')
        .select(`
          id,
          subject,
          date,
          time,
          clinics:clinic_id (name)
        `);

      if (visitError) throw visitError;

      // Verileri etkinlik formatına dönüştür
      const proposalEvents = proposals?.map((p: any) => ({
        id: p.id,
        title: `Teklif #${p.id}`,
        date: p.created_at.split('T')[0],
        time: p.created_at.split('T')[1].split('.')[0],
        type: 'proposal' as EventType,
        location: p.clinics ? p.clinics.name : undefined,
        status: p.status
      })) || [];

      const surgeryEvents = surgeries?.map((s: any) => ({
        id: s.id,
        title: `Ameliyat: ${s.products ? s.products.name : 'Belirtilmemiş'}`,
        date: s.date,
        time: s.time,
        type: 'surgery' as EventType,
        location: s.clinics ? s.clinics.name : undefined,
        status: 'scheduled'
      })) || [];

      const visitEvents = visits?.map((v: any) => ({
        id: v.id,
        title: v.subject,
        date: v.date,
        time: v.time,
        type: 'visit' as EventType,
        location: v.clinics ? v.clinics.name : undefined
      })) || [];

      // Tüm etkinlikleri birleştir
      const allEvents: Event[] = [...proposalEvents, ...surgeryEvents, ...visitEvents];
      
      // Verileri ayarla
      setEvents(allEvents);
      
      // Takvimde işaretleri ayarla
      const markedDates = allEvents.reduce((acc: any, event: Event) => {
        const dateStr = event.date;
        const color = getEventColor(event.type);
        
        if (!acc[dateStr]) {
          acc[dateStr] = { marked: true, dots: [] };
        }
        
        acc[dateStr].dots.push({
          key: `${event.id}-${event.type}`,
          color: color,
        });
        
        return acc;
      }, {});
      
      setMarkedDates(markedDates);

      // Takvimde günleri işaretle
      const dayEvents = events.filter((event) => event.date === selectedDate);
      setSelectedDateEvents(dayEvents);
    } catch (error) {
      console.error('Etkinlikler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Takvimde işaretlenecek günleri ve o günlerin olaylarını ayarlar
  useEffect(() => {
    fetchEventsFromDB();
  }, []);

  // Takvim günü seçildiğinde çalışacak fonksiyon
  const onDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
    // Seçili gündeki olayları bul
    const dayEvents = events.filter((event) => event.date === day.dateString);
    setSelectedDateEvents(dayEvents);
  };

  // Etkinlikleri getir
  const fetchEvents = async () => {
    setLoading(true);
    
    try {
      // fetchEvents yerine fetchEventsFromDB fonksiyonunu çağıralım
      await fetchEventsFromDB();
    } catch (error) {
      console.error('Etkinlikler çekilirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  // Etkinlik tipine göre renk atar
  const getEventColor = (type: EventType): string => {
    switch (type) {
      case 'proposal': return '#6366F1'; // İndigo (teklifler için)
      case 'surgery': return '#EF4444'; // Kırmızı (ameliyatlar için)
      case 'visit': return '#10B981'; // Yeşil (ziyaretler için)
      default: return '#9CA3AF';
    }
  };

  // Seçili tarihe ait etkinlikleri filtreler
  const getFilteredEvents = (): Event[] => {
    return events
      .filter(event => event.date === selectedDate)
      .filter(event => eventFilter === null || event.type === eventFilter)
      .sort((a, b) => {
        // Zamanı yoksa en sona koy
        if (!a.time) return 1;
        if (!b.time) return -1;
        // Zamana göre sırala
        return a.time.localeCompare(b.time);
      });
  };

  // Olaya göre başlık oluşturur
  const getEventTypeTitle = (type: EventType): string => {
    switch (type) {
      case 'proposal': return 'Teklif';
      case 'surgery': return 'Ameliyat';
      case 'visit': return 'Ziyaret';
      default: return 'Etkinlik';
    }
  };

  // Olaya göre ikon oluşturur
  const getEventIcon = (type: EventType): string => {
    switch (type) {
      case 'proposal': return 'file-document-outline';
      case 'surgery': return 'medical-bag';
      case 'visit': return 'clipboard-text-outline';
      default: return 'calendar';
    }
  };

  // Olaya göre statü metni oluşturur
  const getEventStatusText = (event: Event): string | null => {
    if (!event.status) return null;
    
    if (event.type === 'proposal') {
      switch (event.status) {
        case 'pending': return 'Beklemede';
        case 'approved': return 'Onaylandı';
        case 'rejected': return 'Reddedildi';
        default: return event.status;
      }
    } else if (event.type === 'surgery') {
      switch (event.status) {
        case 'scheduled': return 'Planlandı';
        case 'completed': return 'Tamamlandı';
        case 'cancelled': return 'İptal Edildi';
        default: return event.status;
      }
    }
    
    return event.status;
  };

  // Olaya göre statü rengini belirler
  const getEventStatusColor = (event: Event): string => {
    if (!event.status) return '#9CA3AF';
    
    if (event.type === 'proposal') {
      switch (event.status) {
        case 'pending': return '#F59E0B';
        case 'approved': return '#10B981';
        case 'rejected': return '#EF4444';
        default: return '#9CA3AF';
      }
    } else if (event.type === 'surgery') {
      switch (event.status) {
        case 'scheduled': return '#F59E0B';
        case 'completed': return '#10B981';
        case 'cancelled': return '#EF4444';
        default: return '#9CA3AF';
      }
    }
    
    return '#9CA3AF';
  };

  // Seçili tarihi formatlayıp gösterir
  const formatSelectedDate = (): string => {
    try {
      const date = new Date(selectedDate);
      return format(date, 'd MMMM yyyy, EEEE', { locale: tr });
    } catch (error) {
      return selectedDate;
    }
  };

  // Olaya tıklama işlemi
  const handleEventPress = (event: Event) => {
    if (!navigation) return;
    
    switch (event.type) {
      case 'proposal':
        navigation.navigate('ProposalDetail', { id: event.id });
        break;
      case 'surgery':
        navigation.navigate('SurgeryReportDetail', { reportId: event.id });
        break;
      case 'visit':
        navigation.navigate('VisitReportDetail', { id: event.id });
        break;
    }
  };

  // Etkinlik kartı bileşeni
  const EventCard = ({ event }: { event: Event }) => (
    <Card style={styles.eventCard} elevation={1}>
      <TouchableOpacity onPress={() => handleEventPress(event)}>
        <Card.Content>
          <View style={styles.eventHeader}>
            <View style={styles.eventTypeContainer}>
              <View 
                style={[
                  styles.eventIconContainer, 
                  { backgroundColor: `${getEventColor(event.type)}20` }
                ]}
              >
                <MaterialCommunityIcons 
                  name={getEventIcon(event.type) as any} 
                  size={20} 
                  color={getEventColor(event.type)} 
                />
              </View>
              <View>
                <Text style={styles.eventType}>{getEventTypeTitle(event.type)}</Text>
                <Text style={styles.eventTitle}>{event.title}</Text>
              </View>
            </View>
            
            {event.status && (
              <Chip 
                mode="outlined" 
                style={{ borderColor: getEventStatusColor(event) }}
                textStyle={{ color: getEventStatusColor(event) }}
                compact
              >
                <Text>{getEventStatusText(event)}</Text>
              </Chip>
            )}
          </View>
          
          <Divider style={styles.eventDivider} />
          
          <View style={styles.eventDetails}>
            {event.time && (
              <View style={styles.eventDetailItem}>
                <MaterialCommunityIcons name="clock-outline" size={16} color="#6B7280" />
                <Text style={styles.eventDetailText}>{event.time}</Text>
              </View>
            )}
            
            {event.location && (
              <View style={styles.eventDetailItem}>
                <MaterialCommunityIcons name="map-marker-outline" size={16} color="#6B7280" />
                <Text style={styles.eventDetailText}>{event.location}</Text>
              </View>
            )}
          </View>
        </Card.Content>
      </TouchableOpacity>
      
      <Card.Actions style={styles.eventActions}>
        <Button 
          mode="text" 
          compact 
          icon="eye" 
          onPress={() => handleEventPress(event)}
        >
          Görüntüle
        </Button>
      </Card.Actions>
    </Card>
  );

  // Tarih seçimi için takvim bileşenini eklemek için
  const renderCalendar = () => {
    // Takvimde olayları işaretlemek için tarihleri hazırla
    const markedDates = events.reduce((acc, event) => {
      if (!acc[event.date]) {
        acc[event.date] = { 
          marked: true, 
          dotColor: getEventColor(event.type)
        };
      }
      return acc;
    }, {} as any);

    return (
      <View style={styles.calendarContainer}>
        {/* Takvim Bileşeni */}
        <Calendar
          onDayPress={(day: DateData) => onDayPress(day)}
          markedDates={{
            ...markedDates,
            [selectedDate]: {
              selected: true,
              marked: markedDates[selectedDate]?.marked || false,
              dotColor: markedDates[selectedDate]?.dotColor,
              selectedColor: theme.colors.primary
            }
          }}
          theme={{
            selectedDayBackgroundColor: theme.colors.primary,
            todayTextColor: theme.colors.primary,
            arrowColor: theme.colors.primary,
          }}
        />
      </View>
    );
  };

  // Takvim ve etkinlik listesi
  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Takvim" />
        <Appbar.Action icon="refresh" onPress={fetchEvents} />
      </Appbar.Header>
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Takvim bileşeni */}
        {renderCalendar()}
        
        <View style={styles.filterContainer}>
          <Text style={styles.dateHeader}>{formatSelectedDate()}</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <Chip
              selected={eventFilter === null}
              onPress={() => setEventFilter(null)}
              style={styles.filterChip}
              selectedColor={theme.colors.primary}
            >
              <Text>Tümü</Text>
            </Chip>
            <Chip
              selected={eventFilter === 'proposal'}
              onPress={() => setEventFilter('proposal')}
              style={styles.filterChip}
              selectedColor={getEventColor('proposal')}
            >
              <Text>Teklifler</Text>
            </Chip>
            <Chip
              selected={eventFilter === 'surgery'}
              onPress={() => setEventFilter('surgery')}
              style={styles.filterChip}
              selectedColor={getEventColor('surgery')}
            >
              <Text>Ameliyatlar</Text>
            </Chip>
            <Chip
              selected={eventFilter === 'visit'}
              onPress={() => setEventFilter('visit')}
              style={styles.filterChip}
              selectedColor={getEventColor('visit')}
            >
              <Text>Ziyaretler</Text>
            </Chip>
          </ScrollView>
        </View>
        
        <View style={styles.eventsContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Etkinlikler yükleniyor...</Text>
            </View>
          ) : getFilteredEvents().length > 0 ? (
            getFilteredEvents().map(event => (
              <EventCard key={`${event.type}-${event.id}`} event={event} />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Bu tarihte etkinlik yok</Text>
              <Text style={styles.emptySubText}>Başka bir gün seçin veya yeni etkinlik ekleyin</Text>
            </View>
          )}
        </View>
      </ScrollView>
      
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => {
          // Kullanıcıya seçenekler sunacak bir ActionSheet veya Alert göster
          Alert.alert(
            "Yeni Etkinlik Ekle",
            "Eklemek istediğiniz etkinlik türünü seçin",
            [
              {
                text: "Ameliyat Raporu",
                onPress: () => navigation.navigate('CreateSurgeryReport')
              },
              {
                text: "Ziyaret Raporu",
                onPress: () => navigation.navigate('CreateVisitReport')
              },
              {
                text: "Teklif",
                onPress: () => navigation.navigate('CreateProposal')
              },
              {
                text: "İptal",
                style: "cancel"
              }
            ]
          );
        }}
      >
        <MaterialCommunityIcons name="plus" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContainer: {
    paddingBottom: 80, // FAB için boşluk
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1F2937',
  },
  filterScroll: {
    flexGrow: 0,
    marginBottom: 16,
  },
  filterChip: {
    marginRight: 8,
  },
  eventsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  eventCard: {
    marginBottom: 12,
    borderRadius: 10,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventIconContainer: {
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  eventType: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  eventDivider: {
    marginVertical: 12,
  },
  eventDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  eventDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  eventDetailText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#6B7280',
  },
  eventActions: {
    justifyContent: 'flex-end',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  emptySubText: {
    marginTop: 6,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#6366F1',
    borderRadius: 28,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  calendarContainer: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 10,
    margin: 16,
    marginBottom: 0,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
}); 