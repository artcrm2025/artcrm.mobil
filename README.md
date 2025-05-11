# Art CRM Mobil Uygulaması

Art CRM, sağlık sektörü için özelleştirilmiş bir Müşteri İlişkileri Yönetimi (CRM) mobil uygulamasıdır. Saha satış ekipleri, bölge müdürleri ve yöneticilerin klinikler, ürünler ve teklifler gibi verileri yönetmelerine olanak tanır.

## Proje Yapısı

```
src/
├── api/            # API entegrasyonları
├── components/     # Yeniden kullanılabilir UI bileşenleri
├── hooks/          # Özel React hookları
├── lib/            # Temel kütüphaneler ve yapılandırmalar (Supabase)
├── navigation/     # Navigasyon yapılandırması
├── pages/          # Sayfa bileşenleri
├── screens/        # Ekran bileşenleri
├── services/       # Servis katmanı 
├── types/          # TypeScript tip tanımlamaları
├── types.ts        # Ana tip tanımlamaları
└── types.d.ts      # Modül tip tanımlamaları
```

## Özellikler

### Kullanıcı Yönetimi
- Rol tabanlı yetkilendirme (Admin, Yönetici, Bölge Müdürü, Saha Kullanıcısı)
- Güvenli kimlik doğrulama
- Profil yönetimi

### Klinik Yönetimi
- Klinik ekleme, düzenleme ve silme
- Klinik detaylarını görüntüleme 
- Bölgelere göre klinik filtresi

### Teklif Yönetimi
- Yeni teklif oluşturma
- Teklif onay süreci
- Fiyatlandırma ve ürün seçimi
- Teklif tarihçesi ve durum takibi

### Aktivite Takibi
- Ziyaret raporları oluşturma
- Ameliyat raporları oluşturma
- Takvim görünümü ve planlama
- Aktivite bildirim sistemi

### İş Analitiği
- Satış performansı grafikleri
- Bölgesel performans analizi
- Teklif dönüşüm oranları
- Ürün satış analizi

### Art AI Entegrasyonu
- Akıllı öneri sistemi
- Saha raporlarının otomatik analizi
- Süreç optimizasyonu

### Konum Takibi
- Saha personelinin konum takibi
- Rota optimizasyonu
- Ziyaret haritaları

## Teknik Detaylar

### Frontend
- **Framework**: React Native & Expo
- **Dil**: TypeScript
- **UI Kütüphanesi**: React Native Paper
- **Navigasyon**: React Navigation
- **Harita**: React Native Maps
- **Grafikler**: React Native Chart Kit

### Backend
- **BaaS**: Supabase
- **Veritabanı**: PostgreSQL
- **Kimlik Doğrulama**: Supabase Auth
- **Depolama**: Supabase Storage
- **Realtime Updates**: Supabase Realtime

## Kurulum

### Gereksinimler
- Node.js (v18 veya üzeri)
- npm veya yarn
- Expo CLI
- Supabase hesabı

### Adımlar

1. Repoyu klonlayın:
   ```bash
   git clone https://github.com/artcrm2025/artcrm.mobil.git
   cd artcrm.mobil
   ```

2. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

3. `.env` dosyasını oluşturun (`sample.env` dosyasını referans alarak):
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-supabase-url.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. Uygulamayı başlatın:
   ```bash
   npm start
   ```

## Kullanıcı Rolleri ve İzinler

- **Admin**: Tüm sisteme tam erişim, kullanıcı yönetimi, raporlama, sistem ayarları
- **Yönetici**: Kullanıcı, klinik, kampanya ve ürün yönetimi; satış analitiği
- **Bölge Müdürü**: Kendi bölgesindeki klinik ve saha personeli yönetimi; teklif onaylama
- **Saha Kullanıcısı**: Klinik ziyaretleri, teklif oluşturma, ameliyat ve ziyaret raporları

## Mimari Tasarım

Art CRM mobil uygulaması, modern mobil uygulama geliştirme prensiplerini takip eden temiz bir mimari üzerine inşa edilmiştir:

- **Servis Katmanı**: Veritabanı işlemleri için sorumlu katman
- **Bileşen Tabanlı UI**: Yeniden kullanılabilir UI bileşenleriyle modüler tasarım
- **Tip Güvenliği**: TypeScript ile tüm uygulama genelinde tip güvenliği
- **Rol Tabanlı Yetkilendirme**: Kullanıcı rollerine göre ekran ve işlevlere erişim kontrolü
- **Reaktif Veri Yönetimi**: Supabase Realtime ile gerçek zamanlı veri güncellemeleri

## Lisans

Bu proje özel lisanslıdır. Art CRM'nin tüm hakları saklıdır. © 2023-2025 Art CRM