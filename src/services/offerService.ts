import { supabase } from '../lib/supabase';

export type Offer = {
  id: number;
  user_id: string;
  clinic_id: number;
  currency: string;
  discount: number;
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
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
    name: string 
  };
};

/**
 * Tüm teklifleri getirir, RLS sorunları olmadan
 * Özellikle sonsuz özyineleme hatasını önler
 */
export async function getAllOffers(): Promise<Offer[]> {
  try {
    // Direk sorgu yapmak yerine RPC kullanabiliriz veya basit sorgu yap
    const { data, error } = await supabase
      .from('proposals')
      .select(`
        id, 
        user_id,
        clinic_id,
        currency,
        discount, 
        total_amount,
        status,
        created_at,
        updated_at,
        approved_by,
        approved_at,
        notes
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Teklifler çekilirken hata:', error);
      return []; // Hata durumunda boş dizi döndür
    }

    return data || [];
  } catch (error) {
    console.error('Teklifler çekilirken beklenmeyen hata:', error);
    return [];
  }
}

/**
 * Kullanıcının tekliflerini getirir
 */
export async function getUserOffers(): Promise<Offer[]> {
  try {
    // İlişkili tabloları getirme sorunuyla mücadele etmek için
    // Ayrı sorgular yapabilir veya RPC kullanabilirsiniz
    const { data, error } = await supabase
      .from('proposals')
      .select(`
        *,
        clinics:clinic_id (name)
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Kullanıcı teklifleri çekilirken hata:', error);
      // RLS hatası durumunda boş dizi döndür
      return []; 
    }
    
    // İlişkili kullanıcı bilgilerini ayrıca getir
    const userIds = data.map(offer => offer.user_id);
    
    if (userIds.length > 0) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', userIds);
        
      if (!userError && userData) {
        // Kullanıcı bilgilerini tekliflerle birleştir
        return data.map(offer => {
          const user = userData.find(u => u.id === offer.user_id);
          return {
            ...offer,
            users: user ? { name: user.name, email: user.email } : undefined
          };
        });
      }
    }
    
    return data || [];
  } catch (error) {
    console.error('Teklifler çekilirken beklenmeyen hata:', error);
    return [];
  }
}

/**
 * ID'ye göre teklif getirir
 */
export async function getOfferById(id: number): Promise<Offer | null> {
  try {
    const { data, error } = await supabase
      .from('proposals')
      .select(`
        *,
        clinics:clinic_id (name)
      `)
      .eq('id', id)
      .single();
      
    if (error) {
      console.error(`${id} ID'li teklif çekilirken hata:`, error);
      return null;
    }
    
    // Kullanıcı bilgisini ayrıca getir
    if (data) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('id', data.user_id)
        .single();
        
      if (!userError && userData) {
        return {
          ...data,
          users: { name: userData.name, email: userData.email }
        };
      }
    }
    
    return data;
  } catch (error) {
    console.error(`${id} ID'li teklif çekilirken beklenmeyen hata:`, error);
    return null;
  }
}

/**
 * Yeni teklif oluşturur
 */
export async function createOffer(offer: Partial<Offer>): Promise<Offer | null> {
  try {
    const { data, error } = await supabase
      .from('proposals')
      .insert([offer])
      .select()
      .single();
      
    if (error) {
      console.error('Teklif oluşturulurken hata:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Teklif oluşturulurken beklenmeyen hata:', error);
    return null;
  }
}

/**
 * Teklifi günceller
 */
export async function updateOffer(id: number, updates: Partial<Offer>): Promise<Offer | null> {
  try {
    const { data, error } = await supabase
      .from('proposals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error(`${id} ID'li teklif güncellenirken hata:`, error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error(`${id} ID'li teklif güncellenirken beklenmeyen hata:`, error);
    return null;
  }
}

/**
 * Teklif durumunu günceller
 */
export async function updateOfferStatus(
  id: number, 
  status: 'approved' | 'rejected',
  approved_by: string
): Promise<Offer | null> {
  try {
    const updates = {
      status,
      approved_by,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('proposals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error(`${id} ID'li teklif durumu güncellenirken hata:`, error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error(`${id} ID'li teklif durumu güncellenirken beklenmeyen hata:`, error);
    return null;
  }
}

/**
 * Teklifi siler
 */
export async function deleteOffer(id: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('proposals')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error(`${id} ID'li teklif silinirken hata:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`${id} ID'li teklif silinirken beklenmeyen hata:`, error);
    return false;
  }
} 