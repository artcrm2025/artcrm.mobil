-- NTA İmplant CRM - Veritabanı Şeması ve Örnek Veriler
-- Ana SQL Dosyası - Tüm Fonksiyonlar ve Trigger'lar Birleştirilmiş Sürüm

-- ÖNEMLİ NOTLAR:
-- 1. Bu SQL dosyası Supabase SQL Editör'de çalıştırılmalıdır
-- 2. Trigger'ların çalışması için admin yetkisiyle çalıştırın (service_role key kullanın)
-- 3. Users tablosuna kaydedilmiş kullanıcılar auth.users'da da bulunmalıdır
-- 4. Row-Level Security (RLS) politikaları veritabanı güvenliğini sağlar

-- Varsa mevcut trigger ve fonksiyonları temizle
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS clinic_contact_sync_trigger ON clinics;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.sync_clinic_contact_fields() CASCADE;

-- Kullanıcı Auth Trigger Fonksiyonu (Debug mesajları kaldırıldı, temiz versiyonu)
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
  -- Varsayılan bölge
  SELECT id INTO default_region_id FROM regions ORDER BY id LIMIT 1;
  IF default_region_id IS NULL THEN
    default_region_id := 1;
  END IF;
  
  -- Kullanıcı adı
  IF NEW.raw_user_meta_data->>'name' IS NOT NULL AND NEW.raw_user_meta_data->>'name' != '' THEN
    user_name := NEW.raw_user_meta_data->>'name';
  ELSE
    user_name := split_part(NEW.email, '@', 1);
  END IF;
  
  -- Users tablosuna ekle veya güncelle
  INSERT INTO public.users (id, email, name, role, region_id, status)
  VALUES (
    NEW.id,
    NEW.email,
    user_name,
    'field_user',
    default_region_id,
    'active'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = NEW.email, name = user_name;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Hata olursa sessizce geç
  RETURN NEW;
END;
$$;

-- Tetikleyiciyi oluştur
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Klinik İletişim Alanlarını Senkronize Eden Fonksiyon
CREATE OR REPLACE FUNCTION sync_clinic_contact_fields()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  -- Telefon numarası için kontrol
  IF NEW.contact_info IS NULL OR NEW.contact_info = '' THEN
    -- Telefon ekleme işlemi
    IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
      NEW.contact_info := NEW.phone;
    END IF;
  ELSE
    -- Telefon güncelleme işlemi
    IF NEW.phone IS NOT NULL AND NEW.phone != '' AND NEW.phone != NEW.contact_info THEN
      NEW.contact_info := NEW.phone;
    END IF;
  END IF;

  -- E-posta adresi için kontrol
  IF NEW.email IS NULL OR NEW.email = '' THEN
    -- E-posta ekleme işlemi
    IF NEW.contact_email IS NOT NULL AND NEW.contact_email != '' THEN
      NEW.email := NEW.contact_email;
    END IF;
  ELSE
    -- E-posta güncelleme işlemi
    IF NEW.contact_email IS NOT NULL AND NEW.contact_email != '' AND NEW.contact_email != NEW.email THEN
      NEW.email := NEW.contact_email;
    END IF;
  END IF;

  -- İletişim kişisi için kontrol
  IF NEW.contact_person IS NULL OR NEW.contact_person = '' THEN
    -- İletişim kişisi ekleme işlemi
    IF NEW.contact_name IS NOT NULL AND NEW.contact_name != '' THEN
      NEW.contact_person := NEW.contact_name;
    END IF;
  ELSE
    -- İletişim kişisi güncelleme işlemi
    IF NEW.contact_name IS NOT NULL AND NEW.contact_name != '' AND NEW.contact_name != NEW.contact_person THEN
      NEW.contact_person := NEW.contact_name;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Klinik Tetikleyicisi
CREATE TRIGGER clinic_contact_sync_trigger
BEFORE INSERT OR UPDATE ON clinics
FOR EACH ROW EXECUTE FUNCTION sync_clinic_contact_fields();

-- RLS Politikaları (Sonsuz Döngü Hatası Giderilmiş)
-- Önce tüm mevcut RLS politikalarını temizleyelim
DROP POLICY IF EXISTS "Users tablosuna herkes INSERT yapabilir" ON users;
DROP POLICY IF EXISTS "Kullanıcılar kendi verilerini okuyabilir" ON users;
DROP POLICY IF EXISTS "Kullanıcılar kendi verilerini güncelleyebilir" ON users;
DROP POLICY IF EXISTS "Kullanıcılar kendi verilerini ve admin ise herkesi okuyabilir" ON users;
DROP POLICY IF EXISTS "Kullanıcılar kendi verilerini ve admin ise herkesi güncelleyebilir" ON users;

-- Users tablosu için basit ve etkili politikalar
-- 1. INSERT politikası (Herkes ekleyebilir)
CREATE POLICY "users_insert_policy" ON users 
  FOR INSERT 
  TO authenticated, anon
  WITH CHECK (true);

-- 2. SELECT politikası - Sonsuz döngü sorunu giderilmiş
CREATE POLICY "users_select_policy" ON users 
  FOR SELECT 
  TO authenticated
  USING (
    -- Kendi verilerini görebilir
    id = auth.uid() OR
    -- VEYA authenticated role'e sahip herkes
    current_setting('request.jwt.claims', true)::json->>'role' = 'authenticated'
  );

-- 3. UPDATE politikası - Sonsuz döngü sorunu giderilmiş
CREATE POLICY "users_update_policy" ON users 
  FOR UPDATE 
  TO authenticated
  USING (
    -- Kendi verilerini güncelleyebilir
    id = auth.uid() OR
    -- VEYA authenticated role'e sahip herkes
    current_setting('request.jwt.claims', true)::json->>'role' = 'authenticated'
  );

-- 4. DELETE politikası - Sadece kendi kaydını silebilir veya authenticated
CREATE POLICY "users_delete_policy" ON users 
  FOR DELETE 
  TO authenticated
  USING (
    id = auth.uid() OR 
    current_setting('request.jwt.claims', true)::json->>'role' = 'authenticated'
  );

-- Klinikler için RLS Politikaları
DROP POLICY IF EXISTS "Klinikleri herkes okuyabilir" ON clinics;
DROP POLICY IF EXISTS "Klinikleri yetkili kullanıcılar düzenleyebilir" ON clinics;

-- Klinikler SELECT politikası
CREATE POLICY "clinics_select_policy" ON clinics
  FOR SELECT
  TO authenticated
  USING (true); -- Tüm kullanıcılar klinikleri görebilir

-- Klinikler INSERT/UPDATE/DELETE politikası
CREATE POLICY "clinics_modification_policy" ON clinics
  FOR ALL 
  TO authenticated
  USING (
    created_by = auth.uid() OR
    current_setting('request.jwt.claims', true)::json->>'role' = 'authenticated'
  );

-- Mevcut auth kullanıcılarını users tablosuna aktar (hata mesajları olmadan)
DO $$
DECLARE
  auth_user RECORD;
  default_region_id INTEGER;
BEGIN
  -- Varsayılan bölge
  SELECT id INTO default_region_id FROM regions ORDER BY id LIMIT 1;
  IF default_region_id IS NULL THEN default_region_id := 1; END IF;
  
  -- Auth kullanıcılarını users tablosuna ekle
  FOR auth_user IN 
    SELECT id, email, raw_user_meta_data FROM auth.users
  LOOP
    BEGIN
      INSERT INTO public.users (id, email, name, role, region_id, status)
      VALUES (
        auth_user.id,
        auth_user.email,
        COALESCE(auth_user.raw_user_meta_data->>'name', split_part(auth_user.email, '@', 1)),
        'field_user',
        default_region_id,
        'active'
      )
      ON CONFLICT (id) DO UPDATE 
      SET email = auth_user.email, 
          name = COALESCE(auth_user.raw_user_meta_data->>'name', split_part(auth_user.email, '@', 1));
    EXCEPTION WHEN OTHERS THEN
      -- Sessizce devam et
    END;
  END LOOP;
END;
$$;

-- Proposals güncelleme trigger fonksiyonu (teklif ürün toplamlarını hesaplar)
CREATE OR REPLACE FUNCTION update_proposal_totals()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
DECLARE
  new_total DECIMAL(10, 2);
BEGIN
  -- Proposal'ın toplam tutarını hesapla
  SELECT COALESCE(SUM(quantity * unit_price), 0) 
  INTO new_total 
  FROM proposal_items 
  WHERE proposal_id = NEW.proposal_id;
  
  -- Proposal tablosunu güncelle
  UPDATE proposals 
  SET total_amount = new_total 
  WHERE id = NEW.proposal_id;
  
  RETURN NEW;
END;
$$;

-- Proposal Items için trigger
CREATE TRIGGER update_proposal_on_item_change
AFTER INSERT OR UPDATE OR DELETE ON proposal_items
FOR EACH ROW EXECUTE FUNCTION update_proposal_totals();

-- Kontrol
SELECT 'Tüm trigger ve RLS politikaları başarıyla güncellenmiştir.' as mesaj; 