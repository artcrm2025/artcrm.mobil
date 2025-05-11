// Kullanıcı rol tipleri
export type UserRole = 'admin' | 'manager' | 'field';

// Kullanıcı tipi
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at?: string;
  last_sign_in_at?: string;
  phone?: string;
  region_id?: number;
  avatar_url?: string;
  active?: boolean;
}

// Klinik tipi
export interface Clinic {
  id: number;
  name: string;
  address: string;
  city: string;
  phone: string;
  email?: string;
  region_id: number;
  region_name?: string;
  created_at: string;
  updated_at?: string;
  doctor_name?: string;
  notes?: string;
  lat?: number;
  lng?: number;
  status?: 'active' | 'inactive';
  image_url?: string;
}

// Bölge tipi
export interface Region {
  id: number;
  name: string;
  manager_id?: string;
  manager_name?: string;
  created_at?: string;
  city_list?: string[];
}

// Teklif durumları
export type ProposalStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'completed';

// Teklif tipi
export interface Proposal {
  id: string;
  title: string;
  clinic_id: number;
  clinic_name?: string;
  user_id: string;
  user_name?: string;
  status: ProposalStatus;
  total_amount: number;
  discount_percentage?: number;
  final_amount: number;
  currency: string;
  created_at: string;
  updated_at?: string;
  approved_at?: string;
  approved_by?: string;
  notes?: string;
  items?: ProposalItem[];
  patient_name?: string;
  operation_date?: string;
  payment_terms?: string;
  valid_until?: string;
}

// Teklif kalemi tipi
export interface ProposalItem {
  id: string;
  proposal_id: string;
  product_id: number;
  product_name?: string;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
  line_total: number;
  created_at?: string;
}

// Ürün tipi
export interface Product {
  id: number;
  name: string;
  code: string;
  category_id: number;
  category_name?: string;
  price: number;
  currency: string;
  description?: string;
  stock_level?: number;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
}

// Kategori tipi
export interface Category {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
}

// Ameliyat raporu tipi
export interface SurgeryReport {
  id: string;
  title: string;
  clinic_id: number;
  clinic_name?: string;
  user_id: string;
  user_name?: string;
  patient_name: string;
  operation_date: string;
  doctor_name: string;
  operation_type: string;
  products_used?: string[];
  notes?: string;
  outcome: 'successful' | 'complication' | 'other';
  created_at: string;
  updated_at?: string;
  image_urls?: string[];
}

// Ziyaret raporu tipi
export interface VisitReport {
  id: string;
  clinic_id: number;
  clinic_name?: string;
  user_id: string;
  user_name?: string;
  visit_date: string;
  contact_person: string;
  purpose: string;
  outcome: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  followup_date?: string;
  duration_minutes?: number;
  status: 'completed' | 'followup_required';
  location?: {
    latitude: number;
    longitude: number;
  };
}

// Kampanya tipi
export interface Campaign {
  id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  discount_percentage?: number;
  products?: number[];
  regions?: number[];
  status: 'active' | 'inactive' | 'draft' | 'expired';
  created_at: string;
  created_by: string;
  updated_at?: string;
  image_url?: string;
}

// Bildirim tipi
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  created_at: string;
  link_type?: 'proposal' | 'surgery_report' | 'visit_report' | 'clinic' | 'campaign';
  link_id?: string;
}