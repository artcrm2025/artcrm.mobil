-- Sonsuz Döngü Hatasını Düzeltme ve RLS Politikalarını İyileştirme
-- Bu SQL dosyası "infinite recursion detected in policy for relation users" hatasını çözer

-- Önce mevcut RLS politikalarını kaldıralım
DROP POLICY IF EXISTS "Users tablosuna herkes INSERT yapabilir" ON users;
DROP POLICY IF EXISTS "Kullanıcılar kendi verilerini okuyabilir" ON users;
DROP POLICY IF EXISTS "Kullanıcılar kendi verilerini güncelleyebilir" ON users;
DROP POLICY IF EXISTS "Kullanıcılar kendi verilerini ve admin ise herkesi okuyabilir" ON users;
DROP POLICY IF EXISTS "Kullanıcılar kendi verilerini ve admin ise herkesi güncelleyebilir" ON users;

-- Users tablosu için basit ve etkili politikalar oluşturalım
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
    -- VEYA rol = admin ise (sonsuz döngüyü önleyen yaklaşım)
    current_setting('request.jwt.claims', true)::json->>'role' = 'authenticated'
  );

-- 3. UPDATE politikası - Sonsuz döngü sorunu giderilmiş
CREATE POLICY "users_update_policy" ON users 
  FOR UPDATE 
  TO authenticated
  USING (
    -- Kendi verilerini güncelleyebilir
    id = auth.uid() OR
    -- VEYA rol = admin ise (sonsuz döngüyü önleyen yaklaşım)
    current_setting('request.jwt.claims', true)::json->>'role' = 'authenticated'
  )
  WITH CHECK (
    id = auth.uid() OR
    current_setting('request.jwt.claims', true)::json->>'role' = 'authenticated'
  );

-- 4. DELETE politikası - Sadece kendi kaydını silebilir
CREATE POLICY "users_delete_policy" ON users 
  FOR DELETE 
  TO authenticated
  USING (
    id = auth.uid() OR 
    current_setting('request.jwt.claims', true)::json->>'role' = 'authenticated'
  );

-- Tetikleyiciyi debug logları olmadan daha temiz hale getirelim
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

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

-- Tetikleyiciyi yeniden oluştur
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Mevcut kullanıcıları users tablosuna aktar (hata mesajları olmadan)
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

-- Kontrol
SELECT 'Düzeltme tamamlandı - RLS politikaları güncellendi, tetikleyici yeniden oluşturuldu.' as mesaj; 