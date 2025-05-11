-- Regions tablosuna status sütunu ekleme
-- Bu SQL Supabase Studio'da çalıştırılmalıdır

-- Önce regions tablosunda status sütunun var olup olmadığını kontrol edelim
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'regions' AND column_name = 'status'
  ) THEN
    -- Sütun yoksa status_type enum tipinde bir sütun ekleyelim
    ALTER TABLE regions 
    ADD COLUMN status status_type NOT NULL DEFAULT 'active';
    
    RAISE NOTICE 'Status sütunu regions tablosuna eklendi!';
  ELSE
    RAISE NOTICE 'Status sütunu zaten mevcut.';
  END IF;
END $$;

-- Regions tablosunda status değerini defaultta 'active' olarak ayarla
UPDATE regions
SET status = 'active'
WHERE status IS NULL;

-- Kontrol - Regions tablosunu listele
SELECT id, name, status, created_at
FROM regions; 