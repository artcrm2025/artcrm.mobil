import { supabase } from '../lib/supabase';
import { User, UserRole } from '../types';

export async function signIn(email: string, password: string) {
  console.log('Giriş denemesi:', email);

  try {
    console.log('Supabase.auth.signInWithPassword çağrılıyor');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log('Supabase yanıtı:', error ? 'HATA' : 'BAŞARILI', error ? error.message : '');
    
    if (error) {
      console.error('Giriş hatası detayları:', {
        code: error.code,
        message: error.message,
        status: error.status,
      });
      throw new Error(error.message);
    }

    // Kullanıcı bilgilerini kontrol et
    const user = data.user;
    console.log('Giriş başarılı. Kullanıcı:', { 
      id: user?.id,
      email: user?.email,
      appMetadata: user?.app_metadata,
      userMetadata: user?.user_metadata 
    });
    
    return data;
  } catch (error: any) {
    console.error('Beklenmeyen hata:', error);
    throw error;
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    throw new Error(error.message);
  }
  
  return true;
}

// RPC fonksiyonundan dönen yanıt için tip tanımı
interface UserProfileRPC {
  id: string;
  email: string;
  name: string;
  role: string;
  region_id: number | null;
  status: string;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    // Önce Supabase Auth'dan kullanıcı bilgilerini al
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;
    
    try {
      // DÜZELTME: Çoklu kullanıcı hatası için limit eklenip single() yerine maybeSingle() kullanıldı
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .limit(1)
        .maybeSingle(); // single() yerine maybeSingle()
        
      if (error || !data) {
        console.error('Kullanıcı verileri çekilirken hata:', error?.message || 'Veri bulunamadı');
        
        try {
          console.log('Email ile kullanıcı aranıyor:', user.email);
          // Email ile arama yapalım
          const { data: emailData, error: emailError } = await supabase
            .from('users')
            .select('*')
            .eq('email', user.email)
            .limit(1)
            .maybeSingle(); // single() yerine maybeSingle()
              
          if (emailError || !emailData) {
            console.warn('Email ile de kullanıcı bulunamadı:', emailError?.message || 'Veri bulunamadı');
            
            // Kullanıcıyı oluşturmayı deneyelim
            try {
              // Kullanıcı tablosuna ekleyelim
              const { data: insertedUser, error: insertError } = await supabase
                .from('users')
                .insert({
                  id: user.id,
                  email: user.email,
                  name: user.email?.split('@')[0] || 'Kullanıcı',
                  role: 'field_user',
                  status: 'active'
                })
                .select('*')
                .maybeSingle();
                
              if (insertError || !insertedUser) {
                console.warn('Kullanıcı oluşturulamadı:', insertError?.message || 'Ekleme hatası');
                return getDefaultUser(user);
              }
              
              return {
                id: insertedUser.id,
                email: insertedUser.email,
                name: insertedUser.name,
                role: insertedUser.role as UserRole,
                region_id: insertedUser.region_id,
                status: insertedUser.status
              };
            } catch (insertCatchError) {
              console.error('Kullanıcı ekleme hatası:', insertCatchError);
              return getDefaultUser(user);
            }
          }
          
          return {
            id: emailData.id,
            email: emailData.email,
            name: emailData.name || user.email?.split('@')[0] || 'Kullanıcı',
            role: emailData.role as UserRole,
            region_id: emailData.region_id,
            status: emailData.status
          };
        } catch (emailCatchError) {
          console.error('Email sorgulama hatası:', emailCatchError);
          return getDefaultUser(user);
        }
      }
      
      // Kullanıcı bulundu
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role as UserRole,
        region_id: data.region_id,
        status: data.status
      };
      
    } catch (dbError) {
      console.error('Veritabanı sorgusu hatası:', dbError);
      return getDefaultUser(user);
    }
  } catch (error) {
    console.error('Kullanıcı bilgisi alınırken hata:', error);
    return null;
  }
}

function getDefaultUser(authUser: any): User {
  return {
    id: authUser.id,
    email: authUser.email || 'admin@example.com',
    name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Ziyaretçi',
    role: 'field_user',
    region_id: null,
    status: 'active'
  };
}

export async function isUserLoggedIn() {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  
  if (error) {
    throw new Error(error.message);
  }
  
  return true;
} 