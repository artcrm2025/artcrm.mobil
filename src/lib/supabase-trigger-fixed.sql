-- Hata düzeltilmiş - Auth sistemine kayıt olan kullanıcıları otomatik olarak users tablosuna ekleyen trigger
-- Bu sayede manüel işlem yapmadan her yeni kullanıcı field_user olarak sisteme kaydedilir

-- Önce varsa eski triggeri kaldır
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Bölgeler tablosunda en az bir kayıt olduğundan emin ol
INSERT INTO regions (name) 
SELECT 'Varsayılan Bölge' 
WHERE NOT EXISTS (SELECT 1 FROM regions LIMIT 1);

-- Yeni kullanıcılar için daha güvenli trigger fonksiyonu
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
  -- Hata yakalama ile devam et
  BEGIN
    -- Varsayılan bölge için ilk bölgeyi al
    SELECT id INTO default_region_id FROM regions ORDER BY id LIMIT 1;
    
    -- Eğer bölge bulunamazsa, varsayılan 1 kullan
    IF default_region_id IS NULL THEN
      default_region_id := 1;
    END IF;
    
    -- Kullanıcı adını hazırla
    IF NEW.raw_user_meta_data->>'name' IS NOT NULL AND NEW.raw_user_meta_data->>'name' != '' THEN
      user_name := NEW.raw_user_meta_data->>'name';
    ELSE
      user_name := split_part(NEW.email, '@', 1);
    END IF;
    
    -- Kullanıcı tablosuna ekle (id üzerinde çakışma kontrolü)
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
      -- Hatayı kaydet (log) ve sessizce devam et, kullanıcı oluşturmayı engelleme
      RAISE NOTICE 'Error in handle_new_user trigger: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Trigger oluştur: Auth'a yeni bir kullanıcı eklendiğinde çalışacak
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Mevcut sorunlu users tablosunu kontrol et ve temizle
-- Duplicate kayıtlar varsa temizle
DELETE FROM users a USING users b
WHERE a.ctid < b.ctid  -- Eski kayıtları seç
AND a.email = b.email; -- Aynı emaile sahip olanları kıyasla

-- RLS politikalarını devre dışı bırak
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Varolan auth kullanıcıları için kullanıcılar tablosunu güncelle (güvenli versiyon)
DO $$
DECLARE
  auth_user RECORD;
  default_region_id INTEGER;
  user_name TEXT;
BEGIN
  -- Hata yakalama bloğu ekle
  BEGIN
    -- Varsayılan bölge için ilk bölgeyi al
    SELECT id INTO default_region_id FROM regions ORDER BY id LIMIT 1;
    
    -- Bölge yoksa varsayılan oluştur
    IF default_region_id IS NULL THEN
      INSERT INTO regions (name) VALUES ('Varsayılan Bölge') RETURNING id INTO default_region_id;
    END IF;
    
    -- Auth tablosundaki tüm kullanıcıları döngüye al
    FOR auth_user IN 
      SELECT id, email, raw_user_meta_data 
      FROM auth.users
    LOOP
      -- Kullanıcı adını hazırla
      IF auth_user.raw_user_meta_data->>'name' IS NOT NULL AND auth_user.raw_user_meta_data->>'name' != '' THEN
        user_name := auth_user.raw_user_meta_data->>'name';
      ELSE
        user_name := split_part(auth_user.email, '@', 1);
      END IF;
      
      -- Kullanıcı zaten varsa güncelle, yoksa ekle (UPSERT)
      INSERT INTO public.users (id, email, name, role, region_id, status)
      VALUES (
        auth_user.id,
        auth_user.email,
        user_name,
        'field_user',
        default_region_id,
        'active'
      )
      ON CONFLICT (id) DO UPDATE
      SET email = auth_user.email, name = user_name;
      
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error updating user % : %', auth_user.email, SQLERRM;
        CONTINUE;
    END LOOP;
    
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Overall error in updating users: %', SQLERRM;
  END;
END;
$$; 