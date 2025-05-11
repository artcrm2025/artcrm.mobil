# Art CRM Mobile Uygulaması

Sağlık sektörü için özelleştirilmiş bir CRM (Müşteri İlişkileri Yönetimi) uygulaması.

## Özellikler

- Kullanıcı kimlik doğrulama ve yetkilendirme
- Klinik yönetimi
- Teklif oluşturma ve takibi
- Ameliyat raporları
- Ziyaret raporları
- Ürün kataloğu yönetimi
- Rol tabanlı erişim kontrolü

## Teknik Detaylar

- **Frontend**: React Native, Expo
- **UI Kütüphanesi**: React Native Paper
- **Navigasyon**: React Navigation
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Dil**: TypeScript

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

3. `.env` dosyasını oluşturun:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-supabase-url.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. Uygulamayı başlatın:
   ```bash
   npm start
   ```

## Kullanıcı Rolleri

- **Admin**: Tam erişim
- **Yönetici**: Kullanıcı, klinik ve ürün yönetimi
- **Bölge Müdürü**: Bölgesel klinik ve teklif yönetimi
- **Saha Kullanıcısı**: Teklif oluşturma, ameliyat ve ziyaret raporları

## Lisans

Bu proje özel lisanslıdır. Tüm hakları saklıdır.