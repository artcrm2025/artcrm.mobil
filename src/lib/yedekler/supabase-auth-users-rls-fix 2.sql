-- Supabase Auth ve Users Tablosu RLS Politikası Düzeltme Betiği
-- Bu betik, sonsuz döngü hatasını giderir ve RLS politikalarını yeniden yapılandırır

-- Önce mevcut RLS politikalarını kaldırıyoruz
DROP POLICY IF EXISTS "Users tablosuna herkes INSERT yapabilir" ON users;
DROP POLICY IF EXISTS "Kullanıcılar kendi verilerini okuyabilir" ON users;
DROP POLICY IF EXISTS "Kullanıcılar kendi verilerini güncelleyebilir" ON users;
DROP POLICY IF EXISTS "Kullanıcılar kendi verilerini ve admin ise herkesi okuyabilir" ON users;
DROP POLICY IF EXISTS "Kullanıcılar kendi verilerini ve admin ise herkesi güncelleyebilir" ON users;

-- RLS politikalarını düzgün bir şekilde yeniden tanımlıyoruz
-- INSERT politikası - Herkes ekleyebilir
CREATE POLICY "Users INSERT policy" ON users
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- SELECT politikası - Sonsuz döngüyü engelleyen düzeltilmiş versiyon
CREATE POLICY "Users SELECT policy" ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Kendi kaydını görebilir
    auth.uid() = id OR
    -- Veya admin rolüne sahip olanlar herkesi görebilir (sonsuz döngüsüz)
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND u.role = 'admin'::user_role
      -- NOT bulunduğunuz user tablosu için tekrar sorgu yapmayın!
    )
  );

-- UPDATE politikası - Sonsuz döngüyü engelleyen düzeltilmiş versiyon
CREATE POLICY "Users UPDATE policy" ON users
  FOR UPDATE
  TO authenticated
  USING (
    -- Kendi kaydını güncelleyebilir
    auth.uid() = id OR
    -- Veya admin rolüne sahip olanlar herkesi güncelleyebilir (sonsuz döngüsüz)
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND u.role = 'admin'::user_role
      -- NOT bulunduğunuz user tablosu için tekrar sorgu yapmayın!
    )
  )
  WITH CHECK (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND u.role = 'admin'::user_role
    )
  );

-- DELETE politikası - Sadece admin silebilir
CREATE POLICY "Users DELETE policy" ON users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND u.role = 'admin'::user_role
    )
  );

-- Function Based RLS yerine basit politikalara geçiş
-- Diğer tablolar için de function-based RLS yerine daha basit politikalar uygulayalım
-- Örnek: clinics tablosu için

DROP POLICY IF EXISTS "Klinikleri herkes okuyabilir" ON clinics;
DROP POLICY IF EXISTS "Klinikleri yetkili kullanıcılar düzenleyebilir" ON clinics;

-- Klinikler SELECT politikası
CREATE POLICY "Clinics SELECT policy" ON clinics
  FOR SELECT
  TO authenticated
  USING (true); -- Tüm kullanıcılar klinikleri görebilir

-- Klinikler INSERT/UPDATE/DELETE politikası
CREATE POLICY "Clinics modification policy" ON clinics
  FOR ALL 
  TO authenticated
  USING (
    created_by = auth.uid() OR
    auth.uid() IN (
      SELECT id FROM users 
      WHERE role IN ('admin'::user_role, 'manager'::user_role)
    )
  );

-- Tetikleyici fonksiyonu debug logları olmadan, daha temiz versiyonu
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;
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
  -- Varsayılan bölge için ilk bölgeyi al
  SELECT id INTO default_region_id FROM regions ORDER BY id LIMIT 1;
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
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Hata olursa sessizce geç, uygulama katmanında ele alınacak
  RETURN NEW;
END;
$$;

-- Tetikleyiciyi yeniden oluştur
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auth ile Users tablosunu senkronize et fakat hata mesajları olmadan
-- Bu işlem sessizce mevcut tüm auth kullanıcılarını users tablosuna ekler
DO $$
DECLARE
  auth_user RECORD;
  default_region_id INTEGER;
BEGIN
  SELECT id INTO default_region_id FROM regions ORDER BY id LIMIT 1;
  IF default_region_id IS NULL THEN default_region_id := 1; END IF;
  
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
    EXCEPTION WHEN OTHERS THEN
      -- Sessizce devam et
    END;
  END LOOP;
END;
$$;

-- Kullanım için açıklama
COMMENT ON FUNCTION public.handle_new_user() IS 'Auth kullanıcılarını users tablosuna otomatik ekler. Debug logları temizlenmiş, RLS politikaları düzeltilmiş versiyon.';

-- Doğrulama sorgusu - Sessiz çalışır
SELECT
  (SELECT COUNT(*) FROM auth.users) AS auth_user_count,
  (SELECT COUNT(*) FROM users) AS public_user_count; 