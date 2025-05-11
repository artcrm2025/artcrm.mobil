-- Ürünler tablosuna currency alanı ekleme
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'EUR';

-- Mevcut ürünlerin para birimi alanını güncelleme
UPDATE products
  SET currency = 'EUR'
  WHERE currency IS NULL;

-- Yeni ürünlerde currency alanının boş olmamasını sağlamak için
ALTER TABLE products
  ALTER COLUMN currency SET NOT NULL;

-- Açıklama: Bu SQL sorgusu, ürünler tablosuna currency alanı ekler.
-- Default değer olarak EUR (Euro) atanır. 
-- Mevcut ürünlerin currency değeri EUR olarak güncellenir.
-- Son olarak, currency alanı zorunlu (NOT NULL) olarak işaretlenir. 