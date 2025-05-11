export type UserRole = 'admin' | 'manager' | 'regional_manager' | 'field_user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  region_id: number | null;
  status: string;
  created_at?: string;
}

export type Region = {
  id: number;
  name: string;
};

export type Clinic = {
  id: number;
  name: string;
  contact_person: string;
  contact_info: string;
  address: string;
  region_id: number;
  status: 'active' | 'inactive';
  // İlişkili veriler
  regions?: { name: string };
};

export type Product = {
  id: number;
  name: string;
  category_id?: number | null;
  category?: string;
  description?: string;
  price?: number;
  currency?: 'TRY' | 'USD' | 'EUR';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
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
  // İlişkili veriler
  users?: { 
    name: string; 
    email: string 
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
  excess_percentage?: number; // Mal fazlası yüzdesi
  unit_price: number;
  created_at: string;
  updated_at: string;
  // İlişkili veriler
  products?: Product;
};

export interface SurgeryReport {
  id: number;
  user_id: string;
  clinic_id: number;
  date: string;
  time: string;
  product_id: number | null;
  patient_name: string | null;
  surgery_type: string | null;
  notes: string | null;
  status: 'completed' | 'scheduled' | 'cancelled';
  created_at: string;
  updated_at: string;
  // İlişkili veriler
  users?: { name: string; email: string };
  clinics?: { name: string };
  products?: { name: string; category?: string };
}

export interface VisitReport {
  id: number;
  user_id: string;
  clinic_id: number;
  subject: string;
  date: string;
  time: string;
  contact_person: string | null;
  notes: string | null;
  follow_up_required: boolean;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
  // İlişkili veriler
  users?: { name: string; email: string };
  clinics?: { name: string };
} 