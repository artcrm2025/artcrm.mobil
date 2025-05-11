-- PostgreSQL 15.8 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 13.2.0, 64-bit
-- Connected to PostgreSQL

-- Güvenli tablo oluşturma fonksiyonu
CREATE OR REPLACE FUNCTION create_table_if_not_exists(create_table_sql text) RETURNS void AS $$
BEGIN
    BEGIN
        EXECUTE create_table_sql;
    EXCEPTION WHEN duplicate_table THEN
        -- Tablo zaten varsa hata verme
        NULL;
    END;
END;
$$ LANGUAGE plpgsql;

-- Güvenli politika oluşturma fonksiyonu
CREATE OR REPLACE FUNCTION create_policy_if_not_exists(
    p_table text,
    p_name text,
    p_action text,
    p_roles text[],
    p_using text,
    p_with_check text DEFAULT NULL
) RETURNS void AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = p_table 
        AND policyname = p_name
    ) THEN
        EXECUTE format(
            'CREATE POLICY %I ON %I FOR %s TO %s USING (%s) %s',
            p_name,
            p_table,
            p_action,
            array_to_string(p_roles, ', '),
            p_using,
            CASE WHEN p_with_check IS NOT NULL 
                THEN format('WITH CHECK (%s)', p_with_check)
                ELSE ''
            END
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ENUM Tipleri
DO $$ BEGIN
    CREATE TYPE currency_type AS ENUM ('TRY', 'USD', 'EUR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE product_category AS ENUM ('implant', 'accessory', 'tool', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE proposal_status AS ENUM ('pending', 'approved', 'rejected', 'expired', 'contract_received', 'in_transfer', 'delivered');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE status_type AS ENUM ('active', 'inactive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE surgery_status AS ENUM ('scheduled', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'regional_manager', 'field_user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tabloları güvenli bir şekilde oluştur
SELECT create_table_if_not_exists('
    CREATE TABLE regions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        name TEXT NOT NULL,
        status status_type DEFAULT ''active''
    );
');

SELECT create_table_if_not_exists('
    CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role user_role NOT NULL DEFAULT ''field_user'',
        region_id UUID REFERENCES regions(id),
        status status_type DEFAULT ''active''
    );
');

SELECT create_table_if_not_exists('
    CREATE TABLE clinics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        name TEXT NOT NULL,
        address TEXT,
        contact_person TEXT,
        contact_info TEXT,
        email TEXT,
        region_id UUID REFERENCES regions(id),
        created_by UUID REFERENCES users(id),
        status status_type DEFAULT ''active''
    );
');

SELECT create_table_if_not_exists('
    CREATE TABLE products (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        name TEXT NOT NULL,
        category product_category NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        description TEXT,
        status status_type DEFAULT ''active'',
        currency currency_type DEFAULT ''EUR''
    );
');

SELECT create_table_if_not_exists('
    CREATE TABLE proposals (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        user_id UUID REFERENCES users(id) NOT NULL,
        clinic_id UUID REFERENCES clinics(id) NOT NULL,
        currency currency_type NOT NULL,
        discount DECIMAL(5,2),
        total_amount DECIMAL(10,2) NOT NULL,
        status proposal_status DEFAULT ''pending'',
        notes TEXT,
        approved_by UUID REFERENCES users(id),
        approved_at TIMESTAMP WITH TIME ZONE,
        rejected_by UUID REFERENCES users(id),
        rejected_at TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE,
        installment_count INTEGER DEFAULT 1, -- Vade sayısı (1 = peşin)
        installment_amount DECIMAL(10,2), -- Taksit tutarı
        first_payment_date DATE -- İlk ödeme tarihi
    );
');

SELECT create_table_if_not_exists('
    CREATE TABLE proposal_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        proposal_id UUID REFERENCES proposals(id) NOT NULL,
        product_id UUID REFERENCES products(id) NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        excess_percentage DECIMAL(5,2) DEFAULT 0
    );
');

SELECT create_table_if_not_exists('
    CREATE TABLE surgery_reports (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        user_id UUID REFERENCES users(id) NOT NULL,
        clinic_id UUID REFERENCES clinics(id) NOT NULL,
        date DATE NOT NULL,
        time TIME NOT NULL,
        product_id UUID REFERENCES products(id),
        patient_name TEXT NOT NULL,
        surgery_type TEXT NOT NULL,
        notes TEXT,
        status surgery_status DEFAULT ''scheduled''
    );
');

SELECT create_table_if_not_exists('
    CREATE TABLE visit_reports (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        user_id UUID REFERENCES users(id) NOT NULL,
        clinic_id UUID REFERENCES clinics(id) NOT NULL,
        date DATE NOT NULL,
        time TIME NOT NULL,
        contact_person TEXT NOT NULL,
        subject TEXT NOT NULL,
        notes TEXT,
        follow_up_required BOOLEAN DEFAULT false,
        follow_up_date DATE
    );
');

SELECT create_table_if_not_exists('
    CREATE TABLE activities (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        user_id UUID REFERENCES users(id) NOT NULL,
        description TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id UUID NOT NULL,
        activity_type TEXT NOT NULL
    );
');

-- RLS Politikaları güvenli bir şekilde oluştur
DO $$ 
BEGIN
    -- Regions tablosu için politikalar
    EXECUTE format('ALTER TABLE regions ENABLE ROW LEVEL SECURITY');
    PERFORM create_policy_if_not_exists(
        'regions',
        'Regions tablosunu herkes okuyabilir',
        'SELECT',
        ARRAY['anon', 'authenticated'],
        'true'
    );
    PERFORM create_policy_if_not_exists(
        'regions',
        'Regions tablosunu sadece adminler düzenleyebilir',
        'ALL',
        ARRAY['authenticated'],
        'EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = ''admin'')'
    );

    -- Clinics tablosu için politikalar
    EXECUTE format('ALTER TABLE clinics ENABLE ROW LEVEL SECURITY');
    PERFORM create_policy_if_not_exists(
        'clinics',
        'Klinikleri herkes okuyabilir',
        'SELECT',
        ARRAY['authenticated'],
        'true'
    );
    PERFORM create_policy_if_not_exists(
        'clinics',
        'Klinikleri yetkili kullanıcılar düzenleyebilir',
        'ALL',
        ARRAY['authenticated'],
        'created_by = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.role = ''admin'' OR users.role = ''manager''))'
    );

    -- Products tablosu için politikalar
    EXECUTE format('ALTER TABLE products ENABLE ROW LEVEL SECURITY');
    PERFORM create_policy_if_not_exists(
        'products',
        'Ürünleri herkes okuyabilir',
        'SELECT',
        ARRAY['authenticated'],
        'true'
    );
    PERFORM create_policy_if_not_exists(
        'products',
        'Ürünleri adminler düzenleyebilir',
        'ALL',
        ARRAY['authenticated'],
        'EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.role = ''admin'' OR users.role = ''manager''))'
    );

    -- Proposals tablosu için politikalar
    EXECUTE format('ALTER TABLE proposals ENABLE ROW LEVEL SECURITY');
    PERFORM create_policy_if_not_exists(
        'proposals',
        'Teklifleri ilgili kullanıcılar görebilir',
        'SELECT',
        ARRAY['authenticated'],
        'user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.role = ''admin'' OR users.role = ''manager''))'
    );
    PERFORM create_policy_if_not_exists(
        'proposals',
        'Teklifleri yetkili kullanıcılar düzenleyebilir',
        'ALL',
        ARRAY['authenticated'],
        'user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.role = ''admin'' OR users.role = ''manager''))'
    );

    -- Proposal_items tablosu için politikalar
    EXECUTE format('ALTER TABLE proposal_items ENABLE ROW LEVEL SECURITY');
    PERFORM create_policy_if_not_exists(
        'proposal_items',
        'Teklif kalemlerini ilgili kullanıcılar görebilir',
        'SELECT',
        ARRAY['authenticated'],
        'EXISTS (SELECT 1 FROM proposals WHERE proposals.id = proposal_items.proposal_id AND (proposals.user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.role = ''admin'' OR users.role = ''manager''))))'
    );
    PERFORM create_policy_if_not_exists(
        'proposal_items',
        'Teklif kalemlerini yetkili kullanıcılar düzenleyebilir',
        'ALL',
        ARRAY['authenticated'],
        'EXISTS (SELECT 1 FROM proposals WHERE proposals.id = proposal_items.proposal_id AND (proposals.user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.role = ''admin'' OR users.role = ''manager''))))'
    );

    -- Surgery_reports tablosu için politikalar
    EXECUTE format('ALTER TABLE surgery_reports ENABLE ROW LEVEL SECURITY');
    PERFORM create_policy_if_not_exists(
        'surgery_reports',
        'Ameliyat raporlarını ilgili kullanıcılar görebilir',
        'SELECT',
        ARRAY['authenticated'],
        'user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.role = ''admin'' OR users.role = ''manager''))'
    );
    PERFORM create_policy_if_not_exists(
        'surgery_reports',
        'Ameliyat raporlarını yetkili kullanıcılar düzenleyebilir',
        'ALL',
        ARRAY['authenticated'],
        'user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.role = ''admin'' OR users.role = ''manager''))'
    );

    -- Visit_reports tablosu için politikalar
    EXECUTE format('ALTER TABLE visit_reports ENABLE ROW LEVEL SECURITY');
    PERFORM create_policy_if_not_exists(
        'visit_reports',
        'Ziyaret raporlarını ilgili kullanıcılar görebilir',
        'SELECT',
        ARRAY['authenticated'],
        'user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.role = ''admin'' OR users.role = ''manager''))'
    );
    PERFORM create_policy_if_not_exists(
        'visit_reports',
        'Ziyaret raporlarını yetkili kullanıcılar düzenleyebilir',
        'ALL',
        ARRAY['authenticated'],
        'user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.role = ''admin'' OR users.role = ''manager''))'
    );

    -- Activities tablosu için politikalar
    EXECUTE format('ALTER TABLE activities ENABLE ROW LEVEL SECURITY');
    PERFORM create_policy_if_not_exists(
        'activities',
        'Aktiviteleri ilgili kullanıcılar görebilir',
        'SELECT',
        ARRAY['authenticated'],
        'user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.role = ''admin'' OR users.role = ''manager''))'
    );
    PERFORM create_policy_if_not_exists(
        'activities',
        'Aktiviteleri yetkili kullanıcılar düzenleyebilir',
        'ALL',
        ARRAY['authenticated'],
        'user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.role = ''admin'' OR users.role = ''manager''))'
    );

    -- Users tablosu için politikalar
    EXECUTE format('ALTER TABLE users ENABLE ROW LEVEL SECURITY');
    PERFORM create_policy_if_not_exists(
        'users',
        'users_insert_policy',
        'INSERT',
        ARRAY['anon', 'authenticated'],
        'WITH CHECK (true)'
    );
    PERFORM create_policy_if_not_exists(
        'users',
        'users_select_policy',
        'SELECT',
        ARRAY['authenticated'],
        'id = auth.uid() OR (current_setting(''request.jwt.claims'', true)::json->>''role'')::text = ''authenticated'''
    );
    PERFORM create_policy_if_not_exists(
        'users',
        'users_update_policy',
        'UPDATE',
        ARRAY['authenticated'],
        'id = auth.uid() OR (current_setting(''request.jwt.claims'', true)::json->>''role'')::text = ''authenticated''',
        'id = auth.uid() OR (current_setting(''request.jwt.claims'', true)::json->>''role'')::text = ''authenticated'''
    );
    PERFORM create_policy_if_not_exists(
        'users',
        'users_delete_policy',
        'DELETE',
        ARRAY['authenticated'],
        'id = auth.uid() OR (current_setting(''request.jwt.claims'', true)::json->>''role'')::text = ''authenticated'''
    );

    -- Vade alanlarını ekle
    DO $$ 
    BEGIN
        -- installment_count sütununu ekle
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'proposals' AND column_name = 'installment_count') THEN
            ALTER TABLE proposals ADD COLUMN installment_count INTEGER DEFAULT 1;
        END IF;

        -- installment_amount sütununu ekle
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'proposals' AND column_name = 'installment_amount') THEN
            ALTER TABLE proposals ADD COLUMN installment_amount DECIMAL(10,2);
        END IF;

        -- first_payment_date sütununu ekle
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'proposals' AND column_name = 'first_payment_date') THEN
            ALTER TABLE proposals ADD COLUMN first_payment_date DATE;
        END IF;
    END $$;

    RAISE NOTICE 'RLS politikaları başarıyla güncellendi.';
END $$;

-- Başarılı mesajı
DO $$ 
BEGIN 
    RAISE NOTICE 'Veritabanı şeması ve politikaları başarıyla güncellendi.';
END $$; 