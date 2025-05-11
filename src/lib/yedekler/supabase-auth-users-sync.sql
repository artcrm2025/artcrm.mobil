-- Supabase Auth ve Users Tablosu Senkronizasyon Betikleri
-- Bu betik auth.users tablosundaki kullanıcıları users tablosuna aktarır
-- ve gelecekteki kullanıcılar için tetikleyiciyi düzeltir.

-- 1. Mevcut Tetikleyiciyi Sıfırlayalım
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Yeni Tetikleyiciyi Oluşturalım (geliştirilmiş versiyonu)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_region_id INTEGER;
  user_name TEXT;
  log_message TEXT;
BEGIN
  -- Log tut
  log_message := 'YENİ KULLANICI İŞLENİYOR: ' || NEW.email;
  RAISE NOTICE '%', log_message;
  
  -- Varsayılan bölge için ilk bölgeyi al
  SELECT id INTO default_region_id FROM regions ORDER BY id LIMIT 1;
  
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
  
  -- Kullanıcı tablosuna ekle
  BEGIN
    INSERT INTO public.users (id, email, name, role, region_id, status)
    VALUES (
      NEW.id,
      NEW.email,
      user_name,
      'field_user', -- Varsayılan rol
      default_region_id,
      'active'
    )
    ON CONFLICT (id) DO UPDATE
    SET email = NEW.email, name = user_name;
    
    RAISE NOTICE 'KULLANICI BAŞARIYLA EKLENDİ: %', NEW.email;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'KULLANICI EKLENME HATASI: % - %', NEW.email, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- 3. Tetikleyiciyi Yeniden Bağla
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Mevcut Auth Kullanıcılarını Kullanıcı Tablosuna Aktar
DO $$
DECLARE
  auth_user RECORD;
  default_region_id INTEGER;
  sync_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'MEVCUT KULLANICILARI SENKRONIZE ETME İŞLEMİ BAŞLATILIYOR...';
  
  -- Varsayılan bölge
  SELECT id INTO default_region_id FROM regions ORDER BY id LIMIT 1;
  IF default_region_id IS NULL THEN default_region_id := 1; END IF;
  
  -- Mevcut auth kullanıcılarını tarayarak users tablosuna ekle
  FOR auth_user IN 
    SELECT id, email, raw_user_meta_data, created_at FROM auth.users
  LOOP
    BEGIN
      INSERT INTO public.users (
        id, 
        email, 
        name, 
        role, 
        region_id, 
        status,
        created_at
      )
      VALUES (
        auth_user.id,
        auth_user.email,
        COALESCE(
          auth_user.raw_user_meta_data->>'name', 
          split_part(auth_user.email, '@', 1)
        ),
        'field_user',
        default_region_id,
        'active',
        auth_user.created_at
      )
      ON CONFLICT (id) DO UPDATE 
      SET 
        email = auth_user.email,
        name = COALESCE(
          auth_user.raw_user_meta_data->>'name', 
          split_part(auth_user.email, '@', 1)
        );
      
      sync_count := sync_count + 1;
      RAISE NOTICE 'KULLANICI SENKRONİZE EDİLDİ: %', auth_user.email;
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      RAISE NOTICE 'KULLANICI SENKRONIZASYON HATASI: % - %', auth_user.email, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'SENKRONIZASYON TAMAMLANDI: % kullanıcı senkronize edildi, % hata oluştu', sync_count, error_count;
END;
$$;

-- 5. RLS Politikalarını Güncelle (users tablosu için)
DROP POLICY IF EXISTS "Users tablosuna herkes INSERT yapabilir" ON users;
DROP POLICY IF EXISTS "Kullanıcılar kendi verilerini okuyabilir" ON users;
DROP POLICY IF EXISTS "Kullanıcılar kendi verilerini güncelleyebilir" ON users;

-- INSERT politikası (Herkes ekleyebilir - yeni kayıtlar için)
CREATE POLICY "Users tablosuna herkes INSERT yapabilir" ON users
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- SELECT politikası (Kullanıcı kendi verisini görebilir)
CREATE POLICY "Kullanıcılar kendi verilerini ve admin ise herkesi okuyabilir" ON users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR 
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- UPDATE politikası (Kullanıcı kendi verisini güncelleyebilir)
CREATE POLICY "Kullanıcılar kendi verilerini ve admin ise herkesi güncelleyebilir" ON users
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR 
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    auth.uid() = id OR 
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- 6. Kontrol Sorguları
SELECT 'Auth Kullanıcı Sayısı' AS bilgi, COUNT(*) AS sayı FROM auth.users
UNION ALL
SELECT 'Users Tablosundaki Kullanıcı Sayısı' AS bilgi, COUNT(*) AS sayı FROM public.users
UNION ALL
SELECT 'Eşleşmeyen Kullanıcı Sayısı' AS bilgi, 
  (SELECT COUNT(*) FROM auth.users) - (SELECT COUNT(*) FROM public.users WHERE id IN (SELECT id FROM auth.users)) AS sayı;

-- KULLANIM TALİMATLARI:
-- 1. Bu SQL dosyasını Supabase SQL Editör'ünde çalıştırın (service_role key ile)
-- 2. Log mesajlarını kontrol edin
-- 3. Kontrol sorgularıyla tüm kullanıcıların aktarıldığından emin olun 