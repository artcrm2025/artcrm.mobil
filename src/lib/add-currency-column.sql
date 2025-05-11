-- Products tablosuna currency sütunu ekleme
ALTER TABLE products ADD COLUMN IF NOT EXISTS currency text DEFAULT 'TRY';
UPDATE products SET currency = 'TRY' WHERE currency IS NULL;
