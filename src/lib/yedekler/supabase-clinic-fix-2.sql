-- created_by sütununu ekleme

-- Sütunu ekle (eğer yoksa)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'clinics' AND column_name = 'created_by') THEN
        ALTER TABLE clinics ADD COLUMN created_by uuid REFERENCES auth.users(id);
        COMMENT ON COLUMN clinics.created_by IS 'Kaydı oluşturan kullanıcının ID''si';
    END IF;
END $$;

-- Tablo yapısını göster
SELECT column_name, data_type, udt_name, column_default, is_nullable
FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'clinics'; 