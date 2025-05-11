-- Örnek Veriler - NTA İmplant CRM
-- Verilen kullanıcılar için ameliyat raporları, ziyaret raporları ve teklifler

-- Kullanıcılar:
-- a2c184d5-4b51-4092-8ad2-a9e219d0a219 (aa@aa.com - field_user)
-- e4d8623b-5e07-40ea-95ee-69ccfb3537e5 (artmeetstr@gmail.com - admin)
-- ffac7868-d68d-41fb-9cba-17b4e63f4eb6 (bb@bb.com - field_user)

-- ÖNEMLİ: Eğer gerekli tablolar yoksa, bu SQL çalışmadan önce 
-- temel şema dosyasını çalıştırdığınızdan emin olun

-- Örnek Teklifler (Proposals)
INSERT INTO proposals (user_id, clinic_id, currency, discount, total_amount, status, notes, created_at)
VALUES
  -- Art Meets (admin) tarafından oluşturulan teklifler
  ('e4d8623b-5e07-40ea-95ee-69ccfb3537e5', 1, 'TRY', 10, 27000, 'approved', 'Özel Akdeniz Hastanesi için premium implant paketi', CURRENT_TIMESTAMP - INTERVAL '15 days'),
  ('e4d8623b-5e07-40ea-95ee-69ccfb3537e5', 2, 'TRY', 5, 42500, 'pending', 'Marmara Üniversitesi için tam teçhizat paketi', CURRENT_TIMESTAMP - INTERVAL '7 days'),
  ('e4d8623b-5e07-40ea-95ee-69ccfb3537e5', 3, 'USD', 0, 12000, 'rejected', 'Ege Sağlık Merkezi için özel ithal ürünler', CURRENT_TIMESTAMP - INTERVAL '30 days'),

  -- aa@aa.com (field_user) tarafından oluşturulan teklifler
  ('a2c184d5-4b51-4092-8ad2-a9e219d0a219', 1, 'TRY', 7.5, 15800, 'pending', 'Akdeniz Hastanesi için standart implant paketi', CURRENT_TIMESTAMP - INTERVAL '3 days'),
  ('a2c184d5-4b51-4092-8ad2-a9e219d0a219', 3, 'TRY', 0, 8200, 'approved', 'Ege Sağlık için mini implant paketi', CURRENT_TIMESTAMP - INTERVAL '20 days'),

  -- bb@bb.com (field_user) tarafından oluşturulan teklifler
  ('ffac7868-d68d-41fb-9cba-17b4e63f4eb6', 2, 'TRY', 15, 21300, 'approved', 'Marmara Üniversitesi yıllık anlaşma', CURRENT_TIMESTAMP - INTERVAL '10 days'),
  ('ffac7868-d68d-41fb-9cba-17b4e63f4eb6', 3, 'EUR', 10, 9500, 'pending', 'Ege Sağlık için Avrupa ithal ürünler', CURRENT_TIMESTAMP - INTERVAL '2 days');

-- Teklif kalemleri (Proposal Items)
-- Son eklenen tekliflerin ID'lerini alıp kullanacağız
DO $$
DECLARE
    proposal_ids INT[] := ARRAY(SELECT id FROM proposals ORDER BY created_at DESC LIMIT 7);
BEGIN
    -- İlk teklifin kalemleri (Premium)
    INSERT INTO proposal_items (proposal_id, product_id, quantity, excess, unit_price)
    VALUES
        (proposal_ids[7], 1, 15, false, 1200),  -- Premium İmplant x15
        (proposal_ids[7], 5, 10, false, 950),   -- Kemik Grefti x10
        (proposal_ids[7], 7, 8, false, 750);    -- Membran x8

    -- İkinci teklif
    INSERT INTO proposal_items (proposal_id, product_id, quantity, excess, unit_price)
    VALUES
        (proposal_ids[6], 4, 1, false, 15000),  -- Cerrahi set
        (proposal_ids[6], 8, 1, false, 25000),  -- Cerrahi motor
        (proposal_ids[6], 2, 10, true, 750);    -- Standart İmplant x10 (indirimli)

    -- Üçüncü teklif (USD)
    INSERT INTO proposal_items (proposal_id, product_id, quantity, excess, unit_price)
    VALUES
        (proposal_ids[5], 1, 10, false, 120),   -- Premium İmplant x10 (USD)
        (proposal_ids[5], 9, 1, false, 1200),   -- Sterilizasyon cihazı (USD)
        (proposal_ids[5], 5, 15, false, 40);    -- Kemik Grefti x15 (USD)

    -- Dördüncü teklif
    INSERT INTO proposal_items (proposal_id, product_id, quantity, excess, unit_price)
    VALUES
        (proposal_ids[4], 2, 15, false, 800),  -- Standart İmplant x15
        (proposal_ids[4], 10, 10, false, 450); -- Titanyum Vida Seti x10

    -- Beşinci teklif
    INSERT INTO proposal_items (proposal_id, product_id, quantity, excess, unit_price)
    VALUES
        (proposal_ids[3], 3, 10, false, 600),  -- Mini İmplant x10
        (proposal_ids[3], 6, 6, false, 350);   -- Cerrahi Örtü Seti x6

    -- Altıncı teklif
    INSERT INTO proposal_items (proposal_id, product_id, quantity, excess, unit_price)
    VALUES
        (proposal_ids[2], 1, 5, false, 1200),  -- Premium İmplant x5
        (proposal_ids[2], 2, 15, false, 800),  -- Standart İmplant x15
        (proposal_ids[2], 8, 1, true, 22000);  -- Cerrahi Motor x1 (indirimli)

    -- Yedinci teklif (EUR)
    INSERT INTO proposal_items (proposal_id, product_id, quantity, excess, unit_price)
    VALUES
        (proposal_ids[1], 1, 5, false, 110),   -- Premium İmplant x5 (EUR)
        (proposal_ids[1], 5, 10, false, 85),   -- Kemik Grefti x10 (EUR)
        (proposal_ids[1], 7, 10, false, 70);   -- Membran x10 (EUR)
END $$;

-- Ameliyat Raporları (Surgery Reports)
INSERT INTO surgery_reports (user_id, clinic_id, date, time, product_id, patient_name, surgery_type, notes, status)
VALUES
  -- Art Meets (admin) ameliyat raporları
  ('e4d8623b-5e07-40ea-95ee-69ccfb3537e5', 1, CURRENT_DATE - INTERVAL '10 days', '09:30:00', 1, 'Ahmet Yılmaz', 'İmplant Yerleştirme', 'Başarılı bir operasyon, hasta 1 hafta sonra kontrole gelecek', 'completed'),
  ('e4d8623b-5e07-40ea-95ee-69ccfb3537e5', 2, CURRENT_DATE + INTERVAL '3 days', '13:00:00', 2, 'Seda Demir', 'Sinus Lifting ve İmplant', 'Önceden planlanan operasyon', 'scheduled'),
  ('e4d8623b-5e07-40ea-95ee-69ccfb3537e5', 3, CURRENT_DATE - INTERVAL '25 days', '11:15:00', 1, 'Mehmet Kaya', 'İmplant Revizyonu', 'Önceki implant çıkarılıp yenisi yerleştirildi', 'completed'),

  -- aa@aa.com (field_user) ameliyat raporları  
  ('a2c184d5-4b51-4092-8ad2-a9e219d0a219', 1, CURRENT_DATE - INTERVAL '5 days', '14:45:00', 3, 'Ayşe Yıldız', 'Mini İmplant', 'Minimal invaziv teknik kullanıldı', 'completed'),
  ('a2c184d5-4b51-4092-8ad2-a9e219d0a219', 3, CURRENT_DATE + INTERVAL '7 days', '10:00:00', 2, 'Hasan Şahin', 'Standart İmplant', 'Planlanan cerrahi', 'scheduled'),

  -- bb@bb.com (field_user) ameliyat raporları
  ('ffac7868-d68d-41fb-9cba-17b4e63f4eb6', 2, CURRENT_DATE - INTERVAL '2 days', '08:30:00', 1, 'Zeynep Öztürk', 'Premium İmplant', 'İki implant yerleştirildi', 'completed'),
  ('ffac7868-d68d-41fb-9cba-17b4e63f4eb6', 2, CURRENT_DATE - INTERVAL '30 days', '16:00:00', 3, 'Ali Yılmaz', 'Mini İmplant', 'Başarılı operasyon, hasta memnun', 'completed');

-- Ziyaret Raporları (Visit Reports)
INSERT INTO visit_reports (user_id, clinic_id, subject, date, time, contact_person, notes, follow_up_required, follow_up_date)
VALUES
  -- Art Meets (admin) ziyaret raporları
  ('e4d8623b-5e07-40ea-95ee-69ccfb3537e5', 1, 'Yeni Ürün Tanıtımı', CURRENT_DATE - INTERVAL '12 days', '10:30:00', 'Dr. Ahmet Kara', 'Premium implant serisi tanıtıldı, ilgi yüksekti', true, CURRENT_DATE + INTERVAL '30 days'),
  ('e4d8623b-5e07-40ea-95ee-69ccfb3537e5', 2, 'Eğitim Semineri', CURRENT_DATE - INTERVAL '20 days', '14:00:00', 'Prof. Dr. Ayşe Demir', 'İmplant yerleştirme teknikleri konusunda eğitim verildi', false, null),
  ('e4d8623b-5e07-40ea-95ee-69ccfb3537e5', 3, 'Yıllık Değerlendirme', CURRENT_DATE - INTERVAL '5 days', '11:00:00', 'Başhekim Mehmet Özkan', 'Geçen yılın ürün performansı değerlendirildi', true, CURRENT_DATE + INTERVAL '180 days'),

  -- aa@aa.com (field_user) ziyaret raporları
  ('a2c184d5-4b51-4092-8ad2-a9e219d0a219', 1, 'Mevcut Stok Kontrolü', CURRENT_DATE - INTERVAL '3 days', '09:00:00', 'Hemşire Seda Yılmaz', 'Mevcut implant stoğu kontrol edildi, yeni sipariş planlandı', true, CURRENT_DATE + INTERVAL '14 days'),
  ('a2c184d5-4b51-4092-8ad2-a9e219d0a219', 2, 'Teknisyen Eğitimi', CURRENT_DATE - INTERVAL '15 days', '13:30:00', 'Teknisyen Barış Şahin', 'Cerrahi motor kullanımı konusunda eğitim verildi', false, null),

  -- bb@bb.com (field_user) ziyaret raporları
  ('ffac7868-d68d-41fb-9cba-17b4e63f4eb6', 2, 'Sorun Giderme', CURRENT_DATE - INTERVAL '1 day', '15:00:00', 'Dr. Zeynep Kaya', 'Sterilizasyon cihazındaki sorun giderildi', false, null),
  ('ffac7868-d68d-41fb-9cba-17b4e63f4eb6', 3, 'Mini İmplant Tanıtımı', CURRENT_DATE - INTERVAL '8 days', '11:45:00', 'Dr. Hasan Yıldız', 'Yeni mini implant serisi tanıtıldı, demo yapıldı', true, CURRENT_DATE + INTERVAL '21 days');

-- Verilerin eklendiğini kontrol edelim
SELECT 'Teklifler' AS tablo, COUNT(*) AS kayit_sayisi FROM proposals
UNION ALL
SELECT 'Teklif Kalemleri' AS tablo, COUNT(*) AS kayit_sayisi FROM proposal_items
UNION ALL
SELECT 'Ameliyat Raporları' AS tablo, COUNT(*) AS kayit_sayisi FROM surgery_reports
UNION ALL
SELECT 'Ziyaret Raporları' AS tablo, COUNT(*) AS kayit_sayisi FROM visit_reports; 