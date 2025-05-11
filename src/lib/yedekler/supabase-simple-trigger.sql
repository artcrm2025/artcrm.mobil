-- Basitleştirilmiş Trigger - Sadece temel işlev
-- Yeni kullanıcıları varsayılan field_user rolüyle ekleyen basit trigger

-- Önce varsa eski triggeri kaldır
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Bölgeler tablosunu kontrol et
SELECT id FROM regions LIMIT 1;

-- Trigger fonksiyonu - temel işlevsellik
CREATE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, region_id, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'field_user',
    1, -- Sabit bölge ID - ilk bölgeyi varsayalım
    'active'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger oluştur
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 