-- Teklif Kalemleri (proposal_items) Tablosu excess_percentage Sütunu Ekleme
-- Bu SQL Supabase SQL Editör'de çalıştırılmalıdır

-- Bu betik sadece excess_percentage sütununu ekler, tablo zaten var olduğu için
-- tablo oluşturma işlemi yapmaz.

-- ADIM 1: Sütunu mevcut tabloya ekle (IF NOT EXISTS ile güvenli şekilde)
ALTER TABLE proposal_items 
ADD COLUMN IF NOT EXISTS excess_percentage DECIMAL(5, 2) DEFAULT 0;

-- ADIM 2: Sütunu NULL olmayan şekilde ayarla
UPDATE proposal_items 
SET excess_percentage = 0 
WHERE excess_percentage IS NULL;

-- ADIM 3: Mevcut excess alanına göre excess_percentage değerlerini güncelle
-- excess = true ise excess_percentage değerini 0'dan farklı bir değere (örn: 10%) ayarlayalım
UPDATE proposal_items
SET excess_percentage = 10
WHERE excess = true AND excess_percentage = 0;

-- ADIM 4: Sütunu NOT NULL olarak değiştir (artık tüm değerler dolu)
ALTER TABLE proposal_items 
ALTER COLUMN excess_percentage SET NOT NULL;

-- ADIM 5: Kontrol - Bir kaç proposal_items kaydı göster
SELECT id, proposal_id, product_id, quantity, excess, excess_percentage, unit_price
FROM proposal_items
ORDER BY id
LIMIT 10; 