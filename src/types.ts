// import { Database } from "./lib/database.types";

export type UserRole = 'admin' | 'manager' | 'regional_manager' | 'field_user';
export type UserStatus = 'active' | 'inactive' | 'pending';

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  region_id?: number;
  status: UserStatus;
  created_at: string;
};

export type Region = {
  id: number;
  name: string;
  status?: 'active' | 'inactive';
  created_at: string;
  created_by?: string;
};

export type Clinic = {
  id: number;
  name: string;
  address?: string;
  contact_person?: string;
  contact_info?: string;
  email?: string;
  region_id: number;
  status: 'active' | 'inactive';
  created_at: string;
  created_by?: string;
};

export type Product = {
  id: number;
  name: string;
  description?: string;
  category: string;
  price: number;
  currency: 'TRY' | 'USD' | 'EUR';
  status: 'active' | 'inactive';
  created_at: string;
  created_by?: string;
};

export type ProductCategory = {
  id: number;
  name: string;
  status: 'active' | 'inactive';
  created_at: string;
  created_by?: string;
};

export interface Proposal {
  id: number;
  user_id: string;
  clinic_id: number;
  currency: string;
  discount: number;
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'contract_received' | 'in_transfer' | 'delivered';
  created_at: string;
  updated_at: string;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  installment_count: number; // Vade sayısı (1 = peşin)
  installment_amount?: number; // Taksit tutarı
  first_payment_date?: string; // İlk ödeme tarihi
  // İlişkili veriler
  users?: { 
    name: string; 
    email: string 
  };
  creator?: {
    name: string;
    email?: string;
  };
  clinics?: { 
    name: string;
    contact_person?: string;
    contact_info?: string;
    address?: string;
  };
}

export type ProposalItem = {
  id: number;
  proposal_id: number;
  product_id: number;
  quantity: number;
  excess: boolean;
  unit_price: number;
  created_at: string;
  products?: Product;
};

export type SurgeryReport = {
  id: number;
  user_id: string;
  clinic_id: number;
  product_id: number;
  date: string;
  time: string;
  patient_name: string;
  surgery_type: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
  clinics?: Clinic;
  products?: Product;
};

export type VisitReport = {
  id: number;
  user_id: string;
  clinic_id: number;
  subject: string;
  date: string;
  time: string;
  contact_person: string;
  notes?: string;
  follow_up_required: boolean;
  follow_up_date?: string;
  created_at: string;
  clinics?: Clinic;
};

export type Campaign = {
  id: number;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status: string; // 'active', 'inactive', 'planned' vb.
  regions?: string; // Belki bir dizi ID veya özel bir format?
  discount_percentage?: number;
  total_amount?: number; // Belki kampanya için minimum tutar?
  created_at: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  // Kampanya türüne göre ek alanlar olabilir (örn. hediye ürün ID'si)
  // free_product_id?: number;
};