-- PostgreSQL Versiyonu: PostgreSQL 15.8 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 13.2.0, 64-bit

-- Mevcut şemayı içe aktar
\i src/lib/supabase-schema.sql

-- Örnek Veriler

-- Regions tablosuna örnek veriler
INSERT INTO regions (id, name, status) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'Marmara Bölgesi', 'active'),
    ('550e8400-e29b-41d4-a716-446655440001', 'Ege Bölgesi', 'active'),
    ('550e8400-e29b-41d4-a716-446655440002', 'İç Anadolu Bölgesi', 'active'),
    ('550e8400-e29b-41d4-a716-446655440003', 'Karadeniz Bölgesi', 'active'),
    ('550e8400-e29b-41d4-a716-446655440004', 'Akdeniz Bölgesi', 'active'),
    ('550e8400-e29b-41d4-a716-446655440005', 'Doğu Anadolu Bölgesi', 'active'),
    ('550e8400-e29b-41d4-a716-446655440006', 'Güneydoğu Anadolu Bölgesi', 'active');

-- Users tablosuna örnek veriler
INSERT INTO users (id, name, email, role, region_id, status) VALUES
    ('660e8400-e29b-41d4-a716-446655440000', 'Admin Kullanıcı', 'admin@example.com', 'admin', '550e8400-e29b-41d4-a716-446655440000', 'active'),
    ('660e8400-e29b-41d4-a716-446655440001', 'Bölge Müdürü', 'manager@example.com', 'regional_manager', '550e8400-e29b-41d4-a716-446655440001', 'active'),
    ('660e8400-e29b-41d4-a716-446655440002', 'Saha Personeli', 'field@example.com', 'field_user', '550e8400-e29b-41d4-a716-446655440002', 'active'),
    ('660e8400-e29b-41d4-a716-446655440003', 'Sistem Yöneticisi', 'sysadmin@example.com', 'admin', '550e8400-e29b-41d4-a716-446655440000', 'active'),
    ('660e8400-e29b-41d4-a716-446655440004', 'Bölge Müdürü 2', 'manager2@example.com', 'regional_manager', '550e8400-e29b-41d4-a716-446655440002', 'active'),
    ('660e8400-e29b-41d4-a716-446655440005', 'Saha Personeli 2', 'field2@example.com', 'field_user', '550e8400-e29b-41d4-a716-446655440003', 'active'),
    ('660e8400-e29b-41d4-a716-446655440006', 'Yönetici', 'manager3@example.com', 'manager', '550e8400-e29b-41d4-a716-446655440004', 'active');

-- Clinics tablosuna örnek veriler
INSERT INTO clinics (id, name, address, contact_person, contact_info, email, region_id, created_by, status) VALUES
    ('770e8400-e29b-41d4-a716-446655440000', 'Özel Hastane A', 'İstanbul, Kadıköy', 'Dr. Ahmet Yılmaz', '+90 555 111 2233', 'info@hastanea.com', '550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440000', 'active'),
    ('770e8400-e29b-41d4-a716-446655440001', 'Özel Hastane B', 'İzmir, Karşıyaka', 'Dr. Mehmet Kaya', '+90 555 222 3344', 'info@hastaneb.com', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'active'),
    ('770e8400-e29b-41d4-a716-446655440002', 'Devlet Hastanesi C', 'Ankara, Çankaya', 'Dr. Ayşe Demir', '+90 555 333 4455', 'info@hastanec.com', '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', 'active'),
    ('770e8400-e29b-41d4-a716-446655440003', 'Üniversite Hastanesi D', 'Bursa, Nilüfer', 'Prof. Dr. Ali Can', '+90 555 444 5566', 'info@hastaned.com', '550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440003', 'active'),
    ('770e8400-e29b-41d4-a716-446655440004', 'Özel Klinik E', 'Antalya, Muratpaşa', 'Dr. Zeynep Ak', '+90 555 555 6677', 'info@klinike.com', '550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440004', 'active');

-- Products tablosuna örnek veriler
INSERT INTO products (id, name, category, price, description, currency, status) VALUES
    ('880e8400-e29b-41d4-a716-446655440000', 'İmplant A', 'implant', 1000.00, 'Titanyum İmplant', 'EUR', 'active'),
    ('880e8400-e29b-41d4-a716-446655440001', 'Cerrahi Alet B', 'tool', 500.00, 'Steril Cerrahi Alet', 'EUR', 'active'),
    ('880e8400-e29b-41d4-a716-446655440002', 'Aksesuar C', 'accessory', 250.00, 'Medikal Aksesuar', 'EUR', 'active'),
    ('880e8400-e29b-41d4-a716-446655440003', 'İmplant X', 'implant', 1500.00, 'Premium Titanyum İmplant', 'USD', 'active'),
    ('880e8400-e29b-41d4-a716-446655440004', 'Cerrahi Set Y', 'tool', 2000.00, 'Komple Cerrahi Set', 'EUR', 'active'),
    ('880e8400-e29b-41d4-a716-446655440005', 'Aksesuar Z', 'accessory', 300.00, 'Premium Medikal Aksesuar', 'TRY', 'active'),
    ('880e8400-e29b-41d4-a716-446655440006', 'Özel İmplant', 'implant', 3000.00, 'Özel Üretim İmplant', 'USD', 'active');

-- Proposals tablosuna örnek veriler
INSERT INTO proposals (id, user_id, clinic_id, currency, discount, total_amount, status, notes) VALUES
    ('990e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440000', 'EUR', 10.00, 2700.00, 'pending', 'Öncelikli teklif'),
    ('990e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', 'EUR', 5.00, 1425.00, 'approved', 'Standart teklif'),
    ('990e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440002', 'USD', 15.00, 4250.00, 'pending', 'Büyük sipariş teklifi'),
    ('990e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440006', '770e8400-e29b-41d4-a716-446655440003', 'TRY', 20.00, 15000.00, 'rejected', 'İptal edilen teklif'),
    ('990e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440004', 'EUR', 8.00, 5600.00, 'approved', 'Acil sipariş teklifi');

-- Proposal Items tablosuna örnek veriler
INSERT INTO proposal_items (id, proposal_id, product_id, quantity, unit_price, excess_percentage) VALUES
    ('aa0e8400-e29b-41d4-a716-446655440000', '990e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440000', 2, 1000.00, 0),
    ('aa0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440001', 1, 500.00, 10),
    ('aa0e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440002', 5, 250.00, 5),
    ('aa0e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440003', 2, 1500.00, 15),
    ('aa0e8400-e29b-41d4-a716-446655440004', '990e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440004', 1, 2000.00, 0),
    ('aa0e8400-e29b-41d4-a716-446655440005', '990e8400-e29b-41d4-a716-446655440003', '880e8400-e29b-41d4-a716-446655440005', 10, 300.00, 20),
    ('aa0e8400-e29b-41d4-a716-446655440006', '990e8400-e29b-41d4-a716-446655440004', '880e8400-e29b-41d4-a716-446655440006', 2, 3000.00, 5);

-- Surgery Reports tablosuna örnek veriler
INSERT INTO surgery_reports (id, user_id, clinic_id, date, time, product_id, patient_name, surgery_type, notes, status) VALUES
    ('bb0e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440000', '2024-03-15', '10:00', '880e8400-e29b-41d4-a716-446655440000', 'Hasta A', 'Diz Protezi', 'Başarılı operasyon', 'completed'),
    ('bb0e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', '2024-03-20', '14:30', '880e8400-e29b-41d4-a716-446655440001', 'Hasta B', 'Kalça Protezi', 'Planlanan operasyon', 'scheduled'),
    ('bb0e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440002', '2024-03-18', '09:15', '880e8400-e29b-41d4-a716-446655440003', 'Hasta C', 'Omuz Protezi', 'Acil operasyon', 'completed'),
    ('bb0e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440006', '770e8400-e29b-41d4-a716-446655440003', '2024-03-25', '11:45', '880e8400-e29b-41d4-a716-446655440004', 'Hasta D', 'Dirsek Protezi', 'İptal edilen operasyon', 'cancelled'),
    ('bb0e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440004', '2024-03-22', '13:00', '880e8400-e29b-41d4-a716-446655440006', 'Hasta E', 'Kalça Revizyonu', 'Kompleks vaka', 'scheduled');

-- Visit Reports tablosuna örnek veriler
INSERT INTO visit_reports (id, user_id, clinic_id, date, time, contact_person, subject, notes, follow_up_required, follow_up_date) VALUES
    ('cc0e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440000', '2024-03-10', '09:00', 'Dr. Ahmet Yılmaz', 'Ürün Tanıtımı', 'Başarılı görüşme', true, '2024-03-25'),
    ('cc0e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', '2024-03-12', '11:00', 'Dr. Mehmet Kaya', 'Fiyat Görüşmesi', 'Teklifler görüşüldü', false, null),
    ('cc0e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440002', '2024-03-14', '14:00', 'Dr. Ayşe Demir', 'Yeni Ürün Sunumu', 'İlgi çekici sunum', true, '2024-03-28'),
    ('cc0e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440006', '770e8400-e29b-41d4-a716-446655440003', '2024-03-16', '10:30', 'Prof. Dr. Ali Can', 'Eğitim Semineri', 'Başarılı eğitim', true, '2024-04-01'),
    ('cc0e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440004', '2024-03-18', '15:45', 'Dr. Zeynep Ak', 'Satış Görüşmesi', 'Olumlu görüşme', false, null);

-- Activities tablosuna örnek veriler
INSERT INTO activities (id, user_id, description, target_type, target_id, activity_type) VALUES
    ('dd0e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440002', 'Yeni teklif oluşturuldu', 'proposal', '990e8400-e29b-41d4-a716-446655440000', 'create'),
    ('dd0e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440000', 'Teklif onaylandı', 'proposal', '990e8400-e29b-41d4-a716-446655440001', 'approve'),
    ('dd0e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', 'Ziyaret raporu eklendi', 'visit_report', 'cc0e8400-e29b-41d4-a716-446655440000', 'create'),
    ('dd0e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440005', 'Ameliyat raporu güncellendi', 'surgery_report', 'bb0e8400-e29b-41d4-a716-446655440002', 'update'),
    ('dd0e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440006', 'Teklif reddedildi', 'proposal', '990e8400-e29b-41d4-a716-446655440003', 'reject'),
    ('dd0e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440002', 'Yeni klinik eklendi', 'clinic', '770e8400-e29b-41d4-a716-446655440004', 'create'),
    ('dd0e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440000', 'Ürün güncellendi', 'product', '880e8400-e29b-41d4-a716-446655440006', 'update'); 