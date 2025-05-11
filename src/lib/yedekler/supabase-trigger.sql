-- Auth sistemine kayıt olan kullanıcıları otomatik olarak users tablosuna ekleyen trigger
-- Bu sayede manüel işlem yapmadan her yeni kullanıcı field_user olarak sisteme kaydedilir

-- Önce varsa eski triggeri kaldır
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Yeni kullanıcılar için trigger fonksiyonu
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_region_id INTEGER;
BEGIN
  -- Varsayılan bölge için ilk bölgeyi al
  SELECT id INTO default_region_id FROM regions ORDER BY id LIMIT 1;

  -- Kullanıcı tablosuna ekle
  INSERT INTO public.users (id, email, name, role, region_id, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'field_user', -- Varsayılan rol
    default_region_id, -- Varsayılan bölge
    'active'
  )
  -- Aynı email ile kayıt varsa güncelleme yapma, çakışma olursa yeni kayıt ekleme
  ON CONFLICT (email) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger oluştur: Auth'a yeni bir kullanıcı eklendiğinde çalışacak
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Varolan auth kullanıcıları için kullanıcılar tablosunu güncelle
-- Bu kısım bir kez çalıştırılır, varolan auth kullanıcılarını public.users tablosuna ekler
DO $$
DECLARE
  auth_user RECORD;
  default_region_id INTEGER;
BEGIN
  -- Varsayılan bölge için ilk bölgeyi al
  SELECT id INTO default_region_id FROM regions ORDER BY id LIMIT 1;

  -- Auth tablosundaki tüm kullanıcıları döngüye al
  FOR auth_user IN 
    SELECT id, email, raw_user_meta_data 
    FROM auth.users
  LOOP
    -- Kullanıcı zaten varsa atla yoksa ekle
    INSERT INTO public.users (id, email, name, role, region_id, status)
    VALUES (
      auth_user.id,
      auth_user.email,
      COALESCE(auth_user.raw_user_meta_data->>'name', split_part(auth_user.email, '@', 1)),
      'field_user',
      default_region_id,
      'active'
    )
    -- Çakışma durumunda güncelleme yapma
    ON CONFLICT (email) DO NOTHING;
  END LOOP;
END;
$$; 