-- ENUM Tipleri
CREATE TYPE currency_type AS ENUM ('TRY', 'USD', 'EUR');
CREATE TYPE product_category AS ENUM ('implant', 'accessory', 'tool', 'other');
CREATE TYPE proposal_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
CREATE TYPE status_type AS ENUM ('active', 'inactive');
CREATE TYPE surgery_status AS ENUM ('scheduled', 'completed', 'cancelled');
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'regional_manager', 'field_user');

-- Tablolar
CREATE TABLE regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    status status_type DEFAULT 'active'
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'field_user',
    region_id UUID REFERENCES regions(id),
    status status_type DEFAULT 'active'
);

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
    status status_type DEFAULT 'active'
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    category product_category NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    status status_type DEFAULT 'active',
    currency currency_type DEFAULT 'EUR'
);

CREATE TABLE proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES users(id) NOT NULL,
    clinic_id UUID REFERENCES clinics(id) NOT NULL,
    currency currency_type NOT NULL,
    discount DECIMAL(5,2),
    total_amount DECIMAL(10,2) NOT NULL,
    status proposal_status DEFAULT 'pending',
    notes TEXT,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_by UUID REFERENCES users(id),
    rejected_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE proposal_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    proposal_id UUID REFERENCES proposals(id) NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    excess_percentage DECIMAL(5,2) DEFAULT 0
);

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
    status surgery_status DEFAULT 'scheduled'
);

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

CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES users(id) NOT NULL,
    description TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    activity_type TEXT NOT NULL
);

-- RLS Politikaları
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Regions tablosunu herkes okuyabilir" ON regions
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Regions tablosunu sadece adminler düzenleyebilir" ON regions
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Klinikleri herkes okuyabilir" ON clinics
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Klinikleri yetkili kullanıcılar düzenleyebilir" ON clinics
    FOR ALL TO authenticated USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (users.role = 'admin' OR users.role = 'manager')
        )
    );

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ürünleri herkes okuyabilir" ON products
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ürünleri adminler düzenleyebilir" ON products
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (users.role = 'admin' OR users.role = 'manager')
        )
    );

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teklifleri ilgili kullanıcılar görebilir" ON proposals
    FOR SELECT TO authenticated USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (users.role = 'admin' OR users.role = 'manager')
        )
    );
CREATE POLICY "Teklifleri yetkili kullanıcılar düzenleyebilir" ON proposals
    FOR ALL TO authenticated USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (users.role = 'admin' OR users.role = 'manager')
        )
    );

ALTER TABLE proposal_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teklif kalemlerini ilgili kullanıcılar görebilir" ON proposal_items
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM proposals
            WHERE proposals.id = proposal_items.proposal_id
            AND (
                proposals.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM users
                    WHERE users.id = auth.uid()
                    AND (users.role = 'admin' OR users.role = 'manager')
                )
            )
        )
    );
CREATE POLICY "Teklif kalemlerini yetkili kullanıcılar düzenleyebilir" ON proposal_items
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM proposals
            WHERE proposals.id = proposal_items.proposal_id
            AND (
                proposals.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM users
                    WHERE users.id = auth.uid()
                    AND (users.role = 'admin' OR users.role = 'manager')
                )
            )
        )
    );

ALTER TABLE surgery_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ameliyat raporlarını ilgili kullanıcılar görebilir" ON surgery_reports
    FOR SELECT TO authenticated USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (users.role = 'admin' OR users.role = 'manager')
        )
    );
CREATE POLICY "Ameliyat raporlarını yetkili kullanıcılar düzenleyebilir" ON surgery_reports
    FOR ALL TO authenticated USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (users.role = 'admin' OR users.role = 'manager')
        )
    );

ALTER TABLE visit_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ziyaret raporlarını ilgili kullanıcılar görebilir" ON visit_reports
    FOR SELECT TO authenticated USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (users.role = 'admin' OR users.role = 'manager')
        )
    );
CREATE POLICY "Ziyaret raporlarını yetkili kullanıcılar düzenleyebilir" ON visit_reports
    FOR ALL TO authenticated USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (users.role = 'admin' OR users.role = 'manager')
        )
    );

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aktiviteleri ilgili kullanıcılar görebilir" ON activities
    FOR SELECT TO authenticated USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (users.role = 'admin' OR users.role = 'manager')
        )
    );
CREATE POLICY "Aktiviteleri yetkili kullanıcılar düzenleyebilir" ON activities
    FOR ALL TO authenticated USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (users.role = 'admin' OR users.role = 'manager')
        )
    );

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_insert_policy" ON users
    FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "users_select_policy" ON users
    FOR SELECT TO authenticated USING (
        id = auth.uid() OR
        (current_setting('request.jwt.claims', true)::json->>'role')::text = 'authenticated'
    );
CREATE POLICY "users_update_policy" ON users
    FOR UPDATE TO authenticated USING (
        id = auth.uid() OR
        (current_setting('request.jwt.claims', true)::json->>'role')::text = 'authenticated'
    ) WITH CHECK (
        id = auth.uid() OR
        (current_setting('request.jwt.claims', true)::json->>'role')::text = 'authenticated'
    );
CREATE POLICY "users_delete_policy" ON users
    FOR DELETE TO authenticated USING (
        id = auth.uid() OR
        (current_setting('request.jwt.claims', true)::json->>'role')::text = 'authenticated'
    ); 