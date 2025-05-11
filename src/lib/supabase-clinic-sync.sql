-- Klinik tablosundaki alan senkronizasyonu için SQL 

-- BÖLÜM 1: Mevcut Verileri Senkronize Et
DO $$
BEGIN
    -- contact_person değerlerini contact_name'e kopyala
    UPDATE clinics 
    SET contact_name = contact_person 
    WHERE contact_person IS NOT NULL AND (contact_name IS NULL OR contact_name <> contact_person);
    
    -- contact_name değerlerini contact_person'a kopyala
    UPDATE clinics 
    SET contact_person = contact_name 
    WHERE contact_name IS NOT NULL AND (contact_person IS NULL OR contact_person <> contact_name);
    
    -- contact_info değerlerini contact_phone'a kopyala
    UPDATE clinics 
    SET contact_phone = contact_info 
    WHERE contact_info IS NOT NULL AND (contact_phone IS NULL OR contact_phone <> contact_info);
    
    -- contact_phone değerlerini contact_info'ya kopyala
    UPDATE clinics 
    SET contact_info = contact_phone 
    WHERE contact_phone IS NOT NULL AND (contact_info IS NULL OR contact_info <> contact_phone);
END $$;

-- BÖLÜM 2: Trigger oluştur - Bu, bir alan güncellendiğinde diğer alanı da güncelleyecek
-- contact_person ve contact_name senkronizasyonu için trigger fonksiyonu
CREATE OR REPLACE FUNCTION sync_clinic_contact_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- contact_person güncellenirse contact_name'i güncelle
    IF TG_OP = 'UPDATE' AND OLD.contact_person IS DISTINCT FROM NEW.contact_person THEN
        NEW.contact_name := NEW.contact_person;
    END IF;
    
    -- contact_name güncellenirse contact_person'ı güncelle
    IF TG_OP = 'UPDATE' AND OLD.contact_name IS DISTINCT FROM NEW.contact_name THEN
        NEW.contact_person := NEW.contact_name;
    END IF;
    
    -- contact_info güncellenirse contact_phone'u güncelle
    IF TG_OP = 'UPDATE' AND OLD.contact_info IS DISTINCT FROM NEW.contact_info THEN
        NEW.contact_phone := NEW.contact_info;
    END IF;
    
    -- contact_phone güncellenirse contact_info'yu güncelle
    IF TG_OP = 'UPDATE' AND OLD.contact_phone IS DISTINCT FROM NEW.contact_phone THEN
        NEW.contact_info := NEW.contact_phone;
    END IF;
    
    -- INSERT olayında, verileri kopyala
    IF TG_OP = 'INSERT' THEN
        -- contact_person boş değilse ve contact_name boşsa
        IF NEW.contact_person IS NOT NULL AND NEW.contact_name IS NULL THEN
            NEW.contact_name := NEW.contact_person;
        END IF;
        
        -- contact_name boş değilse ve contact_person boşsa
        IF NEW.contact_name IS NOT NULL AND NEW.contact_person IS NULL THEN
            NEW.contact_person := NEW.contact_name;
        END IF;
        
        -- contact_info boş değilse ve contact_phone boşsa
        IF NEW.contact_info IS NOT NULL AND NEW.contact_phone IS NULL THEN
            NEW.contact_phone := NEW.contact_info;
        END IF;
        
        -- contact_phone boş değilse ve contact_info boşsa
        IF NEW.contact_phone IS NOT NULL AND NEW.contact_info IS NULL THEN
            NEW.contact_info := NEW.contact_phone;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Mevcut trigger varsa kaldır (varsa)
DROP TRIGGER IF EXISTS clinic_contact_sync_trigger ON clinics;

-- Trigger'ı tabloya bağla
CREATE TRIGGER clinic_contact_sync_trigger
BEFORE INSERT OR UPDATE ON clinics
FOR EACH ROW EXECUTE FUNCTION sync_clinic_contact_fields();

-- Kontrol sorgusu
SELECT id, name, contact_person, contact_name, contact_info, contact_phone
FROM clinics
ORDER BY id; 