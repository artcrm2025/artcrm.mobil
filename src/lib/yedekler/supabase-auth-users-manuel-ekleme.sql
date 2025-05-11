-- Belirli bir Auth Kullanıcısını (veya kullanıcılarını) Users Tablosuna Manuel Ekleme
-- Bu betik, belirli bir kullanıcıyı auth.users tablosundan users tablosuna aktarır

-- KULLANICI BİLGİLERİNİ GİRİN
DECLARE
  user_email TEXT := 'ornek@example.com'; -- BURAYA KULLANICININ E-POSTA ADRESİNİ GİRİN
BEGIN
  DO $$
  DECLARE
    auth_user RECORD;
    default_region_id INTEGER;
  BEGIN
    -- Kullanıcı bilgilerini al
    SELECT * INTO auth_user FROM auth.users WHERE email = user_email;
    
    IF auth_user.id IS NULL THEN
      RAISE EXCEPTION 'Kullanıcı bulunamadı: %', user_email;
    END IF;
    
    -- Varsayılan bölge
    SELECT id INTO default_region_id FROM regions ORDER BY id LIMIT 1;
    IF default_region_id IS NULL THEN default_region_id := 1; END IF;
    
    -- Kullanıcıyı users tablosuna ekle
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
      COALESCE(auth_user.raw_user_meta_data->>'name', split_part(auth_user.email, '@', 1)),
      'field_user', -- Varsayılan rol
      default_region_id,
      'active',
      auth_user.created_at
    )
    ON CONFLICT (id) DO UPDATE
    SET 
      email = auth_user.email,
      name = COALESCE(auth_user.raw_user_meta_data->>'name', split_part(auth_user.email, '@', 1));
    
    RAISE NOTICE 'Kullanıcı başarıyla eklendi: %', auth_user.email;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Hata oluştu: %', SQLERRM;
  END;
  $$;
END;

-- KULLANIM:
-- 1. Yukarıdaki betikteki "ornek@example.com" yerine eklemek istediğiniz kullanıcının e-posta adresini yazın
-- 2. Bu SQL dosyasını Supabase SQL Editör'ünde çalıştırın (service_role key ile)
-- 3. Çıktıyı kontrol edin

-- Alternatif Yöntem (ID ile ekleme):
/*
DO $$
DECLARE
  user_id UUID := '123e4567-e89b-12d3-a456-426614174000'; -- BURAYA KULLANICININ UUID'SİNİ GİRİN
  auth_user RECORD;
  default_region_id INTEGER;
BEGIN
  -- Kullanıcı bilgilerini al
  SELECT * INTO auth_user FROM auth.users WHERE id = user_id;
  
  IF auth_user.id IS NULL THEN
    RAISE EXCEPTION 'Kullanıcı bulunamadı: %', user_id;
  END IF;
  
  -- Varsayılan bölge
  SELECT id INTO default_region_id FROM regions ORDER BY id LIMIT 1;
  IF default_region_id IS NULL THEN default_region_id := 1; END IF;
  
  -- Kullanıcıyı users tablosuna ekle
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
    COALESCE(auth_user.raw_user_meta_data->>'name', split_part(auth_user.email, '@', 1)),
    'field_user',
    default_region_id,
    'active',
    auth_user.created_at
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = auth_user.email,
    name = COALESCE(auth_user.raw_user_meta_data->>'name', split_part(auth_user.email, '@', 1));
  
  RAISE NOTICE 'Kullanıcı başarıyla eklendi: %', auth_user.email;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Hata oluştu: %', SQLERRM;
END;
$$;
*/ 