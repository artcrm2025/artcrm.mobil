-- NTA İmplant CRM - Veritabanı Şeması ve Örnek Veriler
-- Düzeltilmiş Versiyon: RLS Politikaları Eklenmiş

-- ÖNEMLİ NOTLAR:
-- 1. Bu SQL dosyası Supabase SQL Editör'de çalıştırılmalıdır
-- 2. Trigger'ların çalışması için admin yetkisiyle çalıştırın (service_role key kullanın)
-- 3. Users tablosuna kaydedilmiş kullanıcılar auth.users'da da bulunmalıdır
-- 4. Row-Level Security (RLS) politikaları veritabanı güvenliğini sağlar, uygulama bu politikalara göre çalışır
-- 5. Eski verilerinizi kaybetmemek için önce yedek alın

-- Bu SQL dosyası, veritabanını sıfırdan oluşturmak için kullanılır.
-- Tüm tablo yapıları, ilişkiler, tetikleyiciler ve örnek verileri içerir.

-- Admin Yetkisiyle Çalışılmalıdır (service_role key gerekir)

-- Varsa mevcut veri ve tabloları temizleyelim
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user;

DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS visit_reports CASCADE;
DROP TABLE IF EXISTS surgery_reports CASCADE;
DROP TABLE IF EXISTS proposal_items CASCADE;
DROP TABLE IF EXISTS proposals CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS clinics CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS regions CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS status_type CASCADE;
DROP TYPE IF EXISTS proposal_status CASCADE;
DROP TYPE IF EXISTS surgery_status CASCADE;
DROP TYPE IF EXISTS currency_type CASCADE;
DROP TYPE IF EXISTS product_category CASCADE;

-----------------
-- ENUM TİPLERİ --
-----------------

-- Kullanıcı Rolleri
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'regional_manager', 'field_user');

-- Durum tipleri
CREATE TYPE status_type AS ENUM ('active', 'inactive');

-- Teklif Durumu
CREATE TYPE proposal_status AS ENUM ('pending', 'approved', 'rejected', 'expired');

-- Ameliyat Raporu Durumu
CREATE TYPE surgery_status AS ENUM ('scheduled', 'completed', 'cancelled');

-- Para Birimi
CREATE TYPE currency_type AS ENUM ('TRY', 'USD', 'EUR');

-- Ürün Kategorileri
CREATE TYPE product_category AS ENUM ('implant', 'accessory', 'tool', 'other');

-----------------
-- TABLOLAR --
-----------------

-- Bölgeler Tablosu
CREATE TABLE regions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Kullanıcılar Tablosu
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'field_user',
    region_id INTEGER REFERENCES regions(id),
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Klinikler Tablosu
CREATE TABLE clinics (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    contact_person VARCHAR(255),
    contact_info VARCHAR(255),
    email VARCHAR(255),
    region_id INTEGER REFERENCES regions(id) NOT NULL,
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Ürünler Tablosu
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category product_category NOT NULL DEFAULT 'implant',
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Teklifler Tablosu
CREATE TABLE proposals (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) NOT NULL,
    clinic_id INTEGER REFERENCES clinics(id) NOT NULL,
    currency currency_type NOT NULL DEFAULT 'TRY',
    discount DECIMAL(5, 2) NOT NULL DEFAULT 0.0,
    total_amount DECIMAL(10, 2) NOT NULL,
    status proposal_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    rejected_by UUID REFERENCES users(id),
    rejected_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Teklif Kalemleri Tablosu
CREATE TABLE proposal_items (
    id SERIAL PRIMARY KEY,
    proposal_id INTEGER REFERENCES proposals(id) NOT NULL,
    product_id INTEGER REFERENCES products(id) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    excess BOOLEAN NOT NULL DEFAULT FALSE,
    unit_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Ameliyat Raporları Tablosu
CREATE TABLE surgery_reports (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) NOT NULL,
    clinic_id INTEGER REFERENCES clinics(id) NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    product_id INTEGER REFERENCES products(id),
    patient_name VARCHAR(255) NOT NULL,
    surgery_type VARCHAR(255) NOT NULL,
    notes TEXT,
    status surgery_status NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Ziyaret Raporları Tablosu
CREATE TABLE visit_reports (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) NOT NULL,
    clinic_id INTEGER REFERENCES clinics(id) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    contact_person VARCHAR(255),
    notes TEXT,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Aktiviteler Tablosu
CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    target_id INTEGER,
    target_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-----------------
-- TETİKLEYİCİLER --
-----------------

-- Auth sistemine kayıt olan kullanıcıları otomatik users tablosuna ekleyen tetikleyici
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_region_id INTEGER;
  user_name TEXT;
BEGIN
  -- Varsayılan bölge için ilk bölgeyi al (eğer hiç bölge yoksa, hata vermesini önler)
  BEGIN
    SELECT id INTO default_region_id FROM regions ORDER BY id LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    default_region_id := 1;
  END;
  
  -- Eğer bölge bulunamazsa, varsayılan 1 kullan
  IF default_region_id IS NULL THEN
    default_region_id := 1;
  END IF;
  
  -- Kullanıcı adını hazırla
  BEGIN
    IF NEW.raw_user_meta_data->>'name' IS NOT NULL AND NEW.raw_user_meta_data->>'name' != '' THEN
      user_name := NEW.raw_user_meta_data->>'name';
    ELSE
      user_name := split_part(NEW.email, '@', 1);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    user_name := coalesce(split_part(NEW.email, '@', 1), 'Yeni Kullanıcı');
  END;
  
  -- Kullanıcı tablosuna ekle (eğer id üzerinde çakışma varsa güncelle)
  BEGIN
    INSERT INTO public.users (id, email, name, role, region_id, status)
    VALUES (
      NEW.id,
      NEW.email,
      user_name,
      'field_user', -- Varsayılan rol
      default_region_id, -- Varsayılan bölge
      'active'
    )
    ON CONFLICT (id) DO UPDATE
    SET email = NEW.email, name = user_name;
  EXCEPTION WHEN OTHERS THEN
    -- Hata durumunda log kaydı tutulabilir veya diğer işlemler yapılabilir
    RAISE NOTICE 'Kullanıcı eklenirken hata: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Mevcut trigger varsa düşür (yeniden oluşturmadan önce)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Trigger oluştur
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Mevcut auth kullanıcıları için users tablosunu senkronize et
-- Yalnızca bu betik ilk kez çalıştırıldığında gereklidir
DO $$
DECLARE
  auth_user RECORD;
  default_region_id INTEGER;
BEGIN
  -- Varsayılan bölge
  SELECT id INTO default_region_id FROM regions ORDER BY id LIMIT 1;
  IF default_region_id IS NULL THEN default_region_id := 1; END IF;
  
  -- Mevcut auth kullanıcılarını tarayarak users tablosuna ekle
  FOR auth_user IN 
    SELECT id, email, raw_user_meta_data->>'name' as name FROM auth.users
  LOOP
    INSERT INTO public.users (id, email, name, role, region_id, status)
    VALUES (
      auth_user.id,
      auth_user.email,
      COALESCE(auth_user.name, split_part(auth_user.email, '@', 1)),
      'field_user',
      default_region_id,
      'active'
    )
    ON CONFLICT (id) DO UPDATE 
    SET email = auth_user.email,
        name = COALESCE(auth_user.name, split_part(auth_user.email, '@', 1));
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Mevcut kullanıcıları senkronize ederken hata: %', SQLERRM;
END;
$$;

-----------------
-- ÖRNEK VERİLER --
-----------------

-- Bölgeler - Türkiye'nin coğrafi bölgeleri
INSERT INTO regions (name) VALUES
    ('Marmara Bölgesi'),
    ('Ege Bölgesi'),
    ('Akdeniz Bölgesi'),
    ('İç Anadolu Bölgesi'),
    ('Karadeniz Bölgesi'),
    ('Doğu Anadolu Bölgesi'),
    ('Güneydoğu Anadolu Bölgesi');

-- Önce Supabase Auth sisteminde kullanıcılar oluştur
-- Not: Auth kullanıcıları oluşturmak için ekstra yetkilere sahipseniz
DO $$
DECLARE
  admin_id UUID;
  user1_id UUID;
  user2_id UUID;
BEGIN
  -- Auth tablosundaki kullanıcıları temizle (opsiyonel, dikkatli kullanın)
  -- DELETE FROM auth.users WHERE email IN ('admin@example.com', 'user1@example.com', 'user2@example.com');
  
  -- Yeni kullanıcılar oluştur (eğer gerekli yetkilere sahipseniz)
  INSERT INTO auth.users (email, raw_user_meta_data, created_at, updated_at, role)
  VALUES
    ('admin@example.com', '{"name": "Admin Kullanıcı"}', NOW(), NOW(), 'authenticated')
  RETURNING id INTO admin_id;
  
  INSERT INTO auth.users (email, raw_user_meta_data, created_at, updated_at, role)
  VALUES
    ('user1@example.com', '{"name": "Saha Kullanıcısı 1"}', NOW(), NOW(), 'authenticated')
  RETURNING id INTO user1_id;
  
  INSERT INTO auth.users (email, raw_user_meta_data, created_at, updated_at, role)
  VALUES
    ('user2@example.com', '{"name": "Saha Kullanıcısı 2"}', NOW(), NOW(), 'authenticated')
  RETURNING id INTO user2_id;
  
  -- Users tablosuna manuel olarak kullanıcıları ekle
  INSERT INTO users (id, email, name, role, region_id, status) VALUES
    (admin_id, 'admin@example.com', 'Admin Kullanıcı', 'admin', 1, 'active'),
    (user1_id, 'user1@example.com', 'Saha Kullanıcısı 1', 'field_user', 3, 'active'),
    (user2_id, 'user2@example.com', 'Saha Kullanıcısı 2', 'field_user', 1, 'active');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Auth kullanıcıları oluşturulamadı: %', SQLERRM;
  
  -- Eğer auth.users oluşturamazsanız, manuel olarak sadece users tablosuna veri ekleyin
  admin_id := 'a1b2c3d4-e5f6-4a5b-9c7d-8e9f0a1b2c3d';
  user1_id := 'b2c3d4e5-f6a7-4a5b-9c7d-8e9f0a1b2c3d';
  user2_id := 'c3d4e5f6-a7b8-4c7d-9e2f-3a4b5c6d7e8f';
  
  INSERT INTO users (id, email, name, role, region_id, status) VALUES
    (admin_id, 'admin@example.com', 'Admin Kullanıcı', 'admin', 1, 'active'),
    (user1_id, 'user1@example.com', 'Saha Kullanıcısı 1', 'field_user', 3, 'active'),
    (user2_id, 'user2@example.com', 'Saha Kullanıcısı 2', 'field_user', 1, 'active')
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Şimdi ilişkili diğer tabloları, oluşturulan user ID'lerini kullanarak güncelleyelim
DO $$
DECLARE
  admin_id UUID;
  user1_id UUID;
  user2_id UUID;
BEGIN
  -- Kullanıcı ID'lerini al
  SELECT id INTO admin_id FROM users WHERE email = 'admin@example.com' LIMIT 1;
  SELECT id INTO user1_id FROM users WHERE email = 'user1@example.com' LIMIT 1;
  SELECT id INTO user2_id FROM users WHERE email = 'user2@example.com' LIMIT 1;
  
  -- Ürünleri ekle
  INSERT INTO products (name, category, price, description, status) VALUES
    ('Premium İmplant (Titanyum)', 'implant', 1200.00, 'Yüksek kaliteli titanyum implant, premium yüzey kaplaması ile', 'active'),
    ('Standart İmplant', 'implant', 800.00, 'Genel kullanım için standart implant', 'active'),
    ('Mini İmplant', 'implant', 600.00, 'Minimal invaziv prosedürler için küçük boyutlu implant', 'active'),
    ('Cerrahi Set (Temel)', 'tool', 15000.00, 'Temel implant cerrahisi için gereken alet seti', 'active'),
    ('Kemik Grefti (5g)', 'accessory', 950.00, 'Sentetik kemik grefti, 5g paket', 'active'),
    ('Cerrahi Örtü Seti', 'accessory', 350.00, 'Steril cerrahi örtü seti, tek kullanımlık', 'active'),
    ('Membran (20x30mm)', 'accessory', 750.00, 'Rezorbe olabilir bariyer membran', 'active'),
    ('Cerrahi Motor', 'tool', 25000.00, 'Yüksek performanslı cerrahi motor', 'active'),
    ('Sterilizasyon Cihazı', 'tool', 18000.00, 'Masa üstü otoklavlı sterilizasyon cihazı', 'active'),
    ('Titanyum Vida Seti', 'accessory', 450.00, 'Çeşitli boylarda titanyum vida seti (10 adet)', 'active'),
    ('Ölçü Malzemeleri Kiti', 'accessory', 350.00, 'Komplet ölçü alma kiti', 'active');
  
  -- Klinikler
  INSERT INTO clinics (name, address, contact_person, contact_info, email, region_id, status, created_by) VALUES
    ('Marmara Üniversitesi Diş Hekimliği', 'Başıbüyük, Maltepe, İstanbul', 'Prof. Dr. Ahmet Yılmaz', '+90 212 555 1234', 'diş@marmara.edu.tr', 1, 'active', admin_id),
    ('Ege Üniversitesi Hastanesi', 'Bornova, İzmir', 'Prof. Dr. Mehmet Kaya', '+90 232 444 5678', 'hastane@ege.edu.tr', 2, 'active', admin_id),
    ('Akdeniz Özel Hastanesi', 'Muratpaşa, Antalya', 'Dr. Ayşe Demir', '+90 242 333 9876', 'info@akdenizhastanesi.com', 3, 'active', user1_id),
    ('Ankara Diş Merkezi', 'Çankaya, Ankara', 'Dr. Zeynep Öztürk', '+90 312 666 4321', 'iletisim@ankaradis.com', 4, 'active', user2_id),
    ('Karadeniz Tıp Merkezi', 'Atakum, Samsun', 'Dr. Hasan Şahin', '+90 362 777 8899', 'info@karadeniztip.com', 5, 'active', admin_id),
    ('Doğu Anadolu Cerrahi Hastanesi', 'Yenişehir, Erzurum', 'Dr. Fatma Yıldız', '+90 442 888 2233', 'iletisim@dahastahanesi.com', 6, 'active', user1_id),
    ('Güneydoğu Sağlık Kompleksi', 'Kayapınar, Diyarbakır', 'Dr. Mustafa Demir', '+90 412 999 4455', 'bilgi@gskompleks.com', 7, 'active', user2_id);
  
  -- Teklifler
  INSERT INTO proposals (user_id, clinic_id, currency, discount, total_amount, status, notes, created_at) VALUES
    (admin_id, 1, 'TRY', 10, 27000, 'approved', 'Marmara Üniversitesi için premium implant paketi', CURRENT_TIMESTAMP - INTERVAL '15 days'),
    (admin_id, 2, 'TRY', 5, 42500, 'pending', 'Ege Üniversitesi için tam teçhizat paketi', CURRENT_TIMESTAMP - INTERVAL '7 days'),
    (admin_id, 3, 'USD', 0, 12000, 'rejected', 'Akdeniz Hastanesi için özel ithal ürünler', CURRENT_TIMESTAMP - INTERVAL '30 days'),
    (user1_id, 3, 'TRY', 7.5, 15800, 'pending', 'Akdeniz Hastanesi için standart implant paketi', CURRENT_TIMESTAMP - INTERVAL '3 days'),
    (user1_id, 4, 'TRY', 0, 8200, 'approved', 'Ankara Diş için mini implant paketi', CURRENT_TIMESTAMP - INTERVAL '20 days'),
    (user2_id, 5, 'TRY', 15, 21300, 'approved', 'Karadeniz Tıp yıllık anlaşma', CURRENT_TIMESTAMP - INTERVAL '10 days'),
    (user2_id, 6, 'EUR', 10, 9500, 'pending', 'Doğu Anadolu için Avrupa ithal ürünler', CURRENT_TIMESTAMP - INTERVAL '2 days');
  
  -- Teklif Kalemleri
  DECLARE
    proposal_ids INT[] := ARRAY(SELECT id FROM proposals ORDER BY created_at DESC LIMIT 7);
  BEGIN
    -- İlk teklif
    INSERT INTO proposal_items (proposal_id, product_id, quantity, excess, unit_price) VALUES
        (proposal_ids[7], 1, 15, false, 1200),  -- Premium İmplant x15
        (proposal_ids[7], 5, 10, false, 950),   -- Kemik Grefti x10
        (proposal_ids[7], 7, 8, false, 750);    -- Membran x8

    -- İkinci teklif
    INSERT INTO proposal_items (proposal_id, product_id, quantity, excess, unit_price) VALUES
        (proposal_ids[6], 4, 1, false, 15000),  -- Cerrahi set
        (proposal_ids[6], 8, 1, false, 25000),  -- Cerrahi motor
        (proposal_ids[6], 2, 10, true, 750);    -- Standart İmplant x10 (indirimli)

    -- Üçüncü teklif
    INSERT INTO proposal_items (proposal_id, product_id, quantity, excess, unit_price) VALUES
        (proposal_ids[5], 1, 10, false, 120),   -- Premium İmplant x10 (USD)
        (proposal_ids[5], 9, 1, false, 1200),   -- Sterilizasyon cihazı (USD)
        (proposal_ids[5], 5, 15, false, 40);    -- Kemik Grefti x15 (USD)

    -- Dördüncü teklif
    INSERT INTO proposal_items (proposal_id, product_id, quantity, excess, unit_price) VALUES
        (proposal_ids[4], 2, 15, false, 800),  -- Standart İmplant x15
        (proposal_ids[4], 10, 10, false, 450); -- Titanyum Vida Seti x10

    -- Beşinci teklif
    INSERT INTO proposal_items (proposal_id, product_id, quantity, excess, unit_price) VALUES
        (proposal_ids[3], 3, 10, false, 600),  -- Mini İmplant x10
        (proposal_ids[3], 6, 6, false, 350);   -- Cerrahi Örtü Seti x6

    -- Altıncı teklif
    INSERT INTO proposal_items (proposal_id, product_id, quantity, excess, unit_price) VALUES
        (proposal_ids[2], 1, 5, false, 1200),  -- Premium İmplant x5
        (proposal_ids[2], 2, 15, false, 800),  -- Standart İmplant x15
        (proposal_ids[2], 8, 1, true, 22000);  -- Cerrahi Motor x1 (indirimli)

    -- Yedinci teklif
    INSERT INTO proposal_items (proposal_id, product_id, quantity, excess, unit_price) VALUES
        (proposal_ids[1], 1, 5, false, 110),   -- Premium İmplant x5 (EUR)
        (proposal_ids[1], 5, 10, false, 85),   -- Kemik Grefti x10 (EUR)
        (proposal_ids[1], 7, 10, false, 70);   -- Membran x10 (EUR)
  END;
  
  -- Ameliyat Raporları
  INSERT INTO surgery_reports (user_id, clinic_id, date, time, product_id, patient_name, surgery_type, notes, status) VALUES
    (admin_id, 1, CURRENT_DATE - INTERVAL '10 days', '09:30:00', 1, 'Ahmet Yılmaz', 'İmplant Yerleştirme', 'Başarılı bir operasyon, hasta 1 hafta sonra kontrole gelecek', 'completed'),
    (admin_id, 2, CURRENT_DATE + INTERVAL '3 days', '13:00:00', 2, 'Seda Demir', 'Sinus Lifting ve İmplant', 'Önceden planlanan operasyon', 'scheduled'),
    (admin_id, 3, CURRENT_DATE - INTERVAL '25 days', '11:15:00', 1, 'Mehmet Kaya', 'İmplant Revizyonu', 'Önceki implant çıkarılıp yenisi yerleştirildi', 'completed'),
    (user1_id, 3, CURRENT_DATE - INTERVAL '5 days', '14:45:00', 3, 'Ayşe Yıldız', 'Mini İmplant', 'Minimal invaziv teknik kullanıldı', 'completed'),
    (user1_id, 4, CURRENT_DATE + INTERVAL '7 days', '10:00:00', 2, 'Hasan Şahin', 'Standart İmplant', 'Planlanan cerrahi', 'scheduled'),
    (user2_id, 5, CURRENT_DATE - INTERVAL '2 days', '08:30:00', 1, 'Zeynep Öztürk', 'Premium İmplant', 'İki implant yerleştirildi', 'completed'),
    (user2_id, 6, CURRENT_DATE - INTERVAL '30 days', '16:00:00', 3, 'Ali Yılmaz', 'Mini İmplant', 'Başarılı operasyon, hasta memnun', 'completed');
  
  -- Ziyaret Raporları
  INSERT INTO visit_reports (user_id, clinic_id, subject, date, time, contact_person, notes, follow_up_required, follow_up_date) VALUES
    (admin_id, 1, 'Yeni Ürün Tanıtımı', CURRENT_DATE - INTERVAL '12 days', '10:30:00', 'Dr. Ahmet Kara', 'Premium implant serisi tanıtıldı, ilgi yüksekti', true, CURRENT_DATE + INTERVAL '30 days'),
    (admin_id, 2, 'Eğitim Semineri', CURRENT_DATE - INTERVAL '20 days', '14:00:00', 'Prof. Dr. Ayşe Demir', 'İmplant yerleştirme teknikleri konusunda eğitim verildi', false, null),
    (admin_id, 3, 'Yıllık Değerlendirme', CURRENT_DATE - INTERVAL '5 days', '11:00:00', 'Başhekim Mehmet Özkan', 'Geçen yılın ürün performansı değerlendirildi', true, CURRENT_DATE + INTERVAL '180 days'),
    (user1_id, 3, 'Mevcut Stok Kontrolü', CURRENT_DATE - INTERVAL '3 days', '09:00:00', 'Hemşire Seda Yılmaz', 'Mevcut implant stoğu kontrol edildi, yeni sipariş planlandı', true, CURRENT_DATE + INTERVAL '14 days'),
    (user1_id, 4, 'Teknisyen Eğitimi', CURRENT_DATE - INTERVAL '15 days', '13:30:00', 'Teknisyen Barış Şahin', 'Cerrahi motor kullanımı konusunda eğitim verildi', false, null),
    (user2_id, 5, 'Sorun Giderme', CURRENT_DATE - INTERVAL '1 day', '15:00:00', 'Dr. Zeynep Kaya', 'Sterilizasyon cihazındaki sorun giderildi', false, null),
    (user2_id, 6, 'Mini İmplant Tanıtımı', CURRENT_DATE - INTERVAL '8 days', '11:45:00', 'Dr. Hasan Yıldız', 'Yeni mini implant serisi tanıtıldı, demo yapıldı', true, CURRENT_DATE + INTERVAL '21 days');
  
  -- Aktiviteler
  INSERT INTO activities (user_id, activity_type, target_id, target_type, description) VALUES
    (admin_id, 'proposal_created', 1, 'proposal', 'Yeni teklif oluşturuldu: Marmara Üniversitesi için premium implant paketi'),
    (admin_id, 'surgery_report', 1, 'surgery_report', 'Ameliyat raporu girildi: Ahmet Yılmaz - İmplant Yerleştirme'),
    (user1_id, 'visit_report', 4, 'visit_report', 'Ziyaret raporu girildi: Mevcut Stok Kontrolü - Akdeniz Hastanesi'),
    (user2_id, 'proposal_created', 6, 'proposal', 'Yeni teklif oluşturuldu: Karadeniz Tıp yıllık anlaşma'),
    (user2_id, 'visit_report', 6, 'visit_report', 'Ziyaret raporu girildi: Sorun Giderme - Karadeniz Tıp Merkezi');
END;
$$;

-- RLS Politikaları
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE surgery_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- RLS Politika Kuralları
-- users tablosu için herkes INSERT yapabilsin (yeni kayıt olanlar için)
CREATE POLICY "Users tablosuna herkes INSERT yapabilir" ON users
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

-- users tablosu için SELECT (sadece kendi verisini görebilir)
CREATE POLICY "Kullanıcılar kendi verilerini okuyabilir" ON users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id OR (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')));

-- users tablosu için UPDATE (admin ve kullanıcının kendisi)
CREATE POLICY "Kullanıcılar kendi verilerini güncelleyebilir" ON users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id OR (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')))
    WITH CHECK (auth.uid() = id OR (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')));

-- regions tablosu
CREATE POLICY "Regions tablosunu herkes okuyabilir" ON regions
    FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "Regions tablosunu sadece adminler düzenleyebilir" ON regions
    FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- clinics tablosu
CREATE POLICY "Klinikleri herkes okuyabilir" ON clinics
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Klinikleri yetkili kullanıcılar düzenleyebilir" ON clinics
    FOR ALL
    TO authenticated
    USING (auth.uid() = created_by OR (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))));

-- products tablosu
CREATE POLICY "Ürünleri herkes okuyabilir" ON products
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Ürünleri adminler düzenleyebilir" ON products
    FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager')));

-- proposals
CREATE POLICY "Teklifleri ilgili kullanıcılar görebilir" ON proposals
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))));

CREATE POLICY "Teklifleri yetkili kullanıcılar düzenleyebilir" ON proposals
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid() OR (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))));

-- proposal_items
CREATE POLICY "Teklif kalemlerini ilgili kullanıcılar görebilir" ON proposal_items
    FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM proposals 
        WHERE proposals.id = proposal_items.proposal_id 
        AND (proposals.user_id = auth.uid() OR EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager')
        ))
    ));

CREATE POLICY "Teklif kalemlerini yetkili kullanıcılar düzenleyebilir" ON proposal_items
    FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM proposals 
        WHERE proposals.id = proposal_items.proposal_id 
        AND (proposals.user_id = auth.uid() OR EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager')
        ))
    ));

-- surgery_reports
CREATE POLICY "Ameliyat raporlarını ilgili kullanıcılar görebilir" ON surgery_reports
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))));

CREATE POLICY "Ameliyat raporlarını yetkili kullanıcılar düzenleyebilir" ON surgery_reports
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid() OR (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))));

-- visit_reports
CREATE POLICY "Ziyaret raporlarını ilgili kullanıcılar görebilir" ON visit_reports
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))));

CREATE POLICY "Ziyaret raporlarını yetkili kullanıcılar düzenleyebilir" ON visit_reports
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid() OR (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))));

-- activities
CREATE POLICY "Aktiviteleri ilgili kullanıcılar görebilir" ON activities
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))));

CREATE POLICY "Aktiviteleri yetkili kullanıcılar düzenleyebilir" ON activities
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid() OR (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))));

-- Veritabanı oluşturma işleminin başarılı olduğunu kontrol et
SELECT 'Veritabanı şeması ve örnek veriler başarıyla oluşturuldu!' AS mesaj;

-- Her tablodaki kayıt sayısını kontrol et
SELECT 'Bölgeler' AS tablo, COUNT(*) AS kayit_sayisi FROM regions
UNION ALL
SELECT 'Kullanıcılar' AS tablo, COUNT(*) AS kayit_sayisi FROM users
UNION ALL
SELECT 'Klinikler' AS tablo, COUNT(*) AS kayit_sayisi FROM clinics
UNION ALL
SELECT 'Ürünler' AS tablo, COUNT(*) AS kayit_sayisi FROM products
UNION ALL
SELECT 'Teklifler' AS tablo, COUNT(*) AS kayit_sayisi FROM proposals
UNION ALL
SELECT 'Teklif Kalemleri' AS tablo, COUNT(*) AS kayit_sayisi FROM proposal_items
UNION ALL
SELECT 'Ameliyat Raporları' AS tablo, COUNT(*) AS kayit_sayisi FROM surgery_reports
UNION ALL
SELECT 'Ziyaret Raporları' AS tablo, COUNT(*) AS kayit_sayisi FROM visit_reports
UNION ALL
SELECT 'Aktiviteler' AS tablo, COUNT(*) AS kayit_sayisi FROM activities;

-- Uygulama İçin Faydalı Bilgiler
/*
   İMPORTANT: Bu bölüm yorum olarak yer alır ve SQL'in bir parçası olarak çalıştırılmaz.
   
   BU SQL DOSYASINI KULLANMAK İÇİN:
   1. Supabase Studio'da SQL Editörünü açın
   2. Bu dosyanın içeriğini kopyalayıp yapıştırın
   3. "RUN" düğmesine tıklayın
   4. Sonuçları kontrol edin
   
   UYGULAMA GELİŞTİRME NOTLARI:
   - Yeni kullanıcı kayıtlarında kullanıcılar otomatik olarak users tablosuna eklenir.
   - MUTLAKA auth.users tablosundaki kullanıcılar için karşılık users tablosunda da kayıt olmalıdır.
   - RLS (Row Level Security) politikaları veritabanı güvenliğini sağlar.
   - Her tablo için uygun erişim kontrolleri tanımlanmıştır.
   
   API KULLANIMI:
   - Supabase client kullanırken şu tablolara erişebilirsiniz:
     * users - Kullanıcı bilgileri
     * regions - Bölge bilgileri
     * clinics - Klinik bilgileri
     * products - Ürün bilgileri
     * proposals - Teklif bilgileri
     * proposal_items - Teklif kalemleri
     * surgery_reports - Ameliyat raporları
     * visit_reports - Ziyaret raporları
     * activities - Kullanıcı aktiviteleri
   
   KULLANICI ROLLERİ:
   - 'admin': Tüm sistemi yönetir
   - 'manager': Bölge yöneticilerini ve saha kullanıcılarını yönetir
   - 'regional_manager': Belirli bir bölgedeki kullanıcıları yönetir
   - 'field_user': Saha satış personeli
   
   YAYGIN HATA ÇÖZÜMLERI:
   - "new row violates row-level security policy for table" hatası alıyorsanız:
     * Kullanıcının oturum açtığından emin olun
     * Kullanıcının ilgili tabloda işlem yapmak için yeterli yetkisi olduğundan emin olun
   
   - "invalid input syntax for type uuid" hatası alıyorsanız:
     * UUID değerlerinin doğru formatlandığından emin olun
     * auth.uid() değerinin geçerli olduğundan emin olun
   
   - foreign key constraint ihlali:
     * İlişkili tablolarda (örneğin users, auth.users) kayıtların doğru sırayla oluşturulduğundan emin olun
*/ 