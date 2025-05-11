-- clinics tablosunun doğru alanları ekleme kodu

-- Öncelikle eksik alanları kontrol edelim ve ekleyelim
DO $$
BEGIN
    -- contact_name sütunu ekle (eğer yoksa)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'clinics' AND column_name = 'contact_name') THEN
        ALTER TABLE clinics ADD COLUMN contact_name text;
    END IF;

    -- contact_phone sütunu ekle (eğer yoksa)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'clinics' AND column_name = 'contact_phone') THEN
        ALTER TABLE clinics ADD COLUMN contact_phone text;
    END IF;

    -- email sütunu ekle (eğer yoksa)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'clinics' AND column_name = 'email') THEN
        ALTER TABLE clinics ADD COLUMN email text;
    END IF;

    -- contact_person alanından contact_name alanına veri kopyala (eğer contact_person mevcut ise)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'clinics' AND column_name = 'contact_person') THEN
        UPDATE clinics SET contact_name = contact_person WHERE contact_person IS NOT NULL;
    END IF;

    -- contact_info alanından contact_phone alanına veri kopyala (eğer contact_info mevcut ise)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'clinics' AND column_name = 'contact_info') THEN
        UPDATE clinics SET contact_phone = contact_info WHERE contact_info IS NOT NULL;
    END IF;
END $$;

-- Tabloyu doğru yapılandırma
COMMENT ON TABLE clinics IS 'Klinik bilgilerini saklar';
COMMENT ON COLUMN clinics.contact_name IS 'İletişim kişisinin adı';
COMMENT ON COLUMN clinics.contact_phone IS 'İletişim telefon numarası';
COMMENT ON COLUMN clinics.email IS 'Klinik e-posta adresi';

-- Tablo yapısını göster
SELECT column_name, data_type, character_maximum_length, column_default, is_nullable
FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'clinics'; 