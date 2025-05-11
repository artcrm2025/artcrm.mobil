import { supabase } from '../lib/supabase';
import { Clinic, Product, ProductCategory, Proposal, ProposalItem, Region, SurgeryReport, User, VisitReport } from '../types';

// Bölge işlemleri
export const regionService = {
  async getAll(): Promise<Region[]> {
    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .order('name');
    
    if (error) throw new Error(error.message);
    return data as Region[];
  },
  
  async getById(id: number): Promise<Region> {
    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw new Error(error.message);
    return data as Region;
  }
};

// Kullanıcı işlemleri
export const userService = {
  async getAll(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name');
    
    if (error) throw new Error(error.message);
    return data as User[];
  },
  
  async getById(id: number): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw new Error(error.message);
    return data as User;
  },
  
  async getByRegion(regionId: number): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('region_id', regionId)
      .order('name');
    
    if (error) throw new Error(error.message);
    return data as User[];
  }
};

// Klinik işlemleri
export const clinicService = {
  async getAll(): Promise<Clinic[]> {
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .order('name');
    
    if (error) throw new Error(error.message);
    return data as Clinic[];
  },
  
  async getById(id: number): Promise<Clinic> {
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw new Error(error.message);
    return data as Clinic;
  },
  
  async getByRegion(regionId: number): Promise<Clinic[]> {
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('region_id', regionId)
      .eq('status', 'active')
      .order('name');
    
    if (error) throw new Error(error.message);
    return data as Clinic[];
  },
  
  async create(clinic: Partial<Clinic>, user?: User): Promise<Clinic> {
    // Eğer kullanıcı bilgisi varsa ve bölge ID'si yoksa, kullanıcının bölge ID'sini kullan
    if (user && !clinic.region_id && user.region_id) {
      clinic.region_id = user.region_id;
    }
    
    // created_by alanı ayarla
    if (user && !clinic.created_by) {
      clinic.created_by = user.id;
    }
    
    // Varsayılan olarak aktif
    if (!clinic.status) {
      clinic.status = 'active';
    }
    
    const { data, error } = await supabase
      .from('clinics')
      .insert(clinic)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data as Clinic;
  },
  
  async update(id: number, clinic: Partial<Clinic>): Promise<Clinic> {
    const { data, error } = await supabase
      .from('clinics')
      .update(clinic)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data as Clinic;
  }
};

// Ürün kategorisi işlemleri
export const productCategoryService = {
  async getAll(): Promise<ProductCategory[]> {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('status', 'active')
      .order('name');
    
    if (error) throw new Error(error.message);
    return data as ProductCategory[];
  }
};

// Ürün işlemleri
export const productService = {
  async getAll(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('status', 'active')
      .order('name');
    
    if (error) throw new Error(error.message);
    return data as Product[];
  },
  
  async getById(id: number): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw new Error(error.message);
    return data as Product;
  }
};

// Teklif işlemleri
export const proposalService = {
  async getAll(user?: User | null): Promise<Proposal[]> {
    let query = supabase
      .from('proposals')
      .select('*, clinics:clinic_id (*)')
      .order('created_at', { ascending: false });
    
    // Rol tabanlı erişim kontrolü
    if (user) {
      if (user.role === 'admin' || user.role === 'manager') {
        // Admin ve Manager tüm verileri görebilir
        // Mevcut sorgu tüm verileri getirecek
      } else if (user.role === 'regional_manager' && user.region_id) {
        // Bölge müdürü kendi bölgesindeki kliniklere ait verileri görebilir
        const { data: clinicIds } = await supabase
          .from('clinics')
          .select('id')
          .eq('region_id', user.region_id);
          
        if (clinicIds && clinicIds.length > 0) {
          const ids = clinicIds.map(c => c.id);
          query = query.or(`clinic_id.in.(${ids.join(',')})`);
        }
      } else {
        // Saha kullanıcıları sadece kendi verilerini görebilir
        query = query.eq('user_id', user.id);
      }
    }
    
    const { data, error } = await query;
    
    if (error) throw new Error(error.message);
    return data as Proposal[];
  },
  
  async getById(id: number): Promise<Proposal> {
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw new Error(error.message);
    return data as Proposal;
  },
  
  async getByUser(userId: number): Promise<Proposal[]> {
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    return data as Proposal[];
  },
  
  async getByRegion(regionId: number): Promise<Proposal[]> {
    const { data, error } = await supabase
      .from('proposals')
      .select(`
        *,
        clinics!inner(region_id)
      `)
      .eq('clinics.region_id', regionId)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    return data as Proposal[];
  },
  
  async create(proposal: Partial<Proposal>, items: Partial<ProposalItem>[]): Promise<Proposal> {
    // Önce teklifi oluştur
    const { data, error } = await supabase
      .from('proposals')
      .insert(proposal)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    
    // Sonra teklif kalemlerini ekle
    const proposalId = data.id;
    const itemsWithProposalId = items.map(item => ({
      ...item,
      proposal_id: proposalId
    }));
    
    const { error: itemsError } = await supabase
      .from('proposal_items')
      .insert(itemsWithProposalId);
    
    if (itemsError) throw new Error(itemsError.message);
    
    return data as Proposal;
  },
  
  async getProposalItems(proposalId: number): Promise<ProposalItem[]> {
    const { data, error } = await supabase
      .from('proposal_items')
      .select(`
        *,
        products(*)
      `)
      .eq('proposal_id', proposalId);
    
    if (error) throw new Error(error.message);
    return data as ProposalItem[];
  },
  
  async updateStatus(id: number, status: string, approvedBy?: number): Promise<void> {
    const updateData: any = { status };
    
    if (status === 'approved' && approvedBy) {
      updateData.approved_by = approvedBy;
      updateData.approved_at = new Date().toISOString();
    }
    
    const { error } = await supabase
      .from('proposals')
      .update(updateData)
      .eq('id', id);
    
    if (error) throw new Error(error.message);
  }
};

// Ameliyat raporu işlemleri
export const surgeryReportService = {
  async getAll(user?: User | null): Promise<SurgeryReport[]> {
    let query = supabase
      .from('surgery_reports')
      .select('*, clinics:clinic_id (*), products:product_id (*)')
      .order('date', { ascending: false });
    
    // Rol tabanlı erişim kontrolü
    if (user) {
      if (user.role === 'admin' || user.role === 'manager') {
        // Admin ve Manager tüm verileri görebilir
        // Mevcut sorgu tüm verileri getirecek
      } else if (user.role === 'regional_manager' && user.region_id) {
        // Bölge müdürü kendi bölgesindeki kliniklere ait verileri görebilir
        const { data: clinicIds } = await supabase
          .from('clinics')
          .select('id')
          .eq('region_id', user.region_id);
          
        if (clinicIds && clinicIds.length > 0) {
          const ids = clinicIds.map(c => c.id);
          query = query.or(`clinic_id.in.(${ids.join(',')})`);
        }
      } else {
        // Saha kullanıcıları sadece kendi verilerini görebilir
        query = query.eq('user_id', user.id);
      }
    }
    
    const { data, error } = await query;
    
    if (error) throw new Error(error.message);
    return data as SurgeryReport[];
  },
  
  async getById(id: number): Promise<SurgeryReport> {
    // ID kontrolü ekle
    if (!id || isNaN(Number(id))) {
      throw new Error('Geçersiz ameliyat raporu ID\'si');
    }
    
    const { data, error } = await supabase
      .from('surgery_reports')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw new Error(error.message);
    return data as SurgeryReport;
  },
  
  async getByUser(userId: number): Promise<SurgeryReport[]> {
    const { data, error } = await supabase
      .from('surgery_reports')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    
    if (error) throw new Error(error.message);
    return data as SurgeryReport[];
  },
  
  async getByRegion(regionId: number): Promise<SurgeryReport[]> {
    const { data, error } = await supabase
      .from('surgery_reports')
      .select(`
        *,
        clinics!inner(region_id)
      `)
      .eq('clinics.region_id', regionId)
      .order('date', { ascending: false });
    
    if (error) throw new Error(error.message);
    return data as SurgeryReport[];
  },
  
  async create(report: Partial<SurgeryReport>): Promise<SurgeryReport> {
    const { data, error } = await supabase
      .from('surgery_reports')
      .insert(report)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data as SurgeryReport;
  }
};

// Ziyaret raporu işlemleri
export const visitReportService = {
  async getAll(user?: User | null): Promise<VisitReport[]> {
    let query = supabase
      .from('visit_reports')
      .select('*, clinics:clinic_id (*)')
      .order('date', { ascending: false });
    
    // Rol tabanlı erişim kontrolü
    if (user) {
      if (user.role === 'admin' || user.role === 'manager') {
        // Admin ve Manager tüm verileri görebilir
        // Mevcut sorgu tüm verileri getirecek
      } else if (user.role === 'regional_manager' && user.region_id) {
        // Bölge müdürü kendi bölgesindeki kliniklere ait verileri görebilir
        const { data: clinicIds } = await supabase
          .from('clinics')
          .select('id')
          .eq('region_id', user.region_id);
          
        if (clinicIds && clinicIds.length > 0) {
          const ids = clinicIds.map(c => c.id);
          query = query.or(`clinic_id.in.(${ids.join(',')})`);
        }
      } else {
        // Saha kullanıcıları sadece kendi verilerini görebilir
        query = query.eq('user_id', user.id);
      }
    }
    
    const { data, error } = await query;
    
    if (error) throw new Error(error.message);
    return data as VisitReport[];
  },
  
  async getById(id: number): Promise<VisitReport> {
    const { data, error } = await supabase
      .from('visit_reports')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw new Error(error.message);
    return data as VisitReport;
  },
  
  async getByUser(userId: number): Promise<VisitReport[]> {
    const { data, error } = await supabase
      .from('visit_reports')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    
    if (error) throw new Error(error.message);
    return data as VisitReport[];
  },
  
  async getByRegion(regionId: number): Promise<VisitReport[]> {
    const { data, error } = await supabase
      .from('visit_reports')
      .select(`
        *,
        clinics!inner(region_id)
      `)
      .eq('clinics.region_id', regionId)
      .order('date', { ascending: false });
    
    if (error) throw new Error(error.message);
    return data as VisitReport[];
  },
  
  async create(report: Partial<VisitReport>): Promise<VisitReport> {
    const { data, error } = await supabase
      .from('visit_reports')
      .insert(report)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data as VisitReport;
  }
}; 