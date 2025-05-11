-- Proposal_items tablosunda excess_percentage alanını ekleme
ALTER TABLE proposal_items
  ADD COLUMN IF NOT EXISTS excess_percentage NUMERIC DEFAULT 0;

-- excess alanı varsa, bu alanı excess_percentage alanına aktaralım (varsa)
UPDATE proposal_items
  SET excess_percentage = 5
  WHERE excess = true AND excess_percentage IS NULL;

-- excess_percentage alanını NULL olmayacak şekilde ayarlayalım
ALTER TABLE proposal_items
  ALTER COLUMN excess_percentage SET DEFAULT 0,
  ALTER COLUMN excess_percentage SET NOT NULL;

-- Artık kullanılmayacak olan excess alanını kaldırabiliriz (isteğe bağlı)
-- ALTER TABLE proposal_items DROP COLUMN IF EXISTS excess;

-- Açıklama: 
-- Bu SQL, proposal_items tablosuna excess_percentage sütunu ekler. 
-- Eğer önceki "excess" boolean alanı doluysa, bu alanı excess_percentage'e dönüştürür.
-- excess=true olan öğeler için varsayılan olarak %5 mal fazlası belirlenir.
-- excess_percentage alanı, mal fazlası yüzdesini tutar (örn: 5 = %5 mal fazlası) 