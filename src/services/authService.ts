import { supabase } from '../lib/supabase';
import { User, UserRole } from '../types';
import { saveUserLocation, startLocationTracking, stopLocationTracking } from './locationService';

export const signIn = async (email: string, password: string): Promise<{ user: User | null; error: string | null }> => {
  try {
    // Giriş işlemi
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (!data?.user) {
      return { user: null, error: 'Kullanıcı bilgileri alınamadı' };
    }

    // Kullanıcı bilgilerini al
    const user = await getUserProfile(data.user.id);

    if (user) {
      // Konum bilgisini kaydet - giriş türü
      saveUserLocation(data.user.id, 'login')
        .then(locationResult => {
          if (locationResult.success) {
            console.log('Giriş konumu kaydedildi');
            
            // Otomatik konum takibini başlat (30 dakikada bir)
            startLocationTracking(data.user.id, 30);
          } else {
            console.error('Giriş konumu kaydedilemedi:', locationResult.error);
          }
        })
        .catch(error => {
          console.error('Konum kaydetme hatası:', error);
        });
    }

    return { user, error: null };
  } catch (error) {
    console.error('Giriş hatası:', error);
    return { 
      user: null, 
      error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    };
  }
};

export const signOut = async (): Promise<{ error: string | null }> => {
  try {
    // Mevcut kullanıcı bilgilerini al (çıkış yapmadan önce)
    const currentUser = await supabase.auth.getUser();
    const userId = currentUser?.data?.user?.id;
    
    // Kullanıcı varsa çıkış konumunu kaydet
    if (userId) {
      // Konum bilgisini kaydet - çıkış türü
      saveUserLocation(userId, 'logout')
        .then(locationResult => {
          if (locationResult.success) {
            console.log('Çıkış konumu kaydedildi');
          } else {
            console.error('Çıkış konumu kaydedilemedi:', locationResult.error);
          }
        })
        .catch(error => {
          console.error('Konum kaydetme hatası:', error);
        });
        
      // Otomatik konum takibini durdur
      stopLocationTracking();
    }

    // Çıkış işlemi
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (error) {
    console.error('Çıkış hatası:', error);
    return { 
      error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    };
  }
};

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
                status: insertedUser.status,
                created_at: insertedUser.created_at
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
            status: emailData.status,
            created_at: emailData.created_at
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
        status: data.status,
        created_at: data.created_at
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
    role: 'field_user' as UserRole,
    region_id: 1, // Varsayılan bölge
    status: 'active',
    created_at: new Date().toISOString()
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

// Kullanıcı kaydı için yeni fonksiyon
export async function signUp(email: string, password: string, name?: string) {
  console.log('Yeni kullanıcı kaydı:', email);

  try {
    // Önce auth sistemine kaydet
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: name || email.split('@')[0] }
      }
    });

    if (error) {
      console.error('Kayıt hatası:', error.message);
      throw new Error(error.message);
    }

    const user = data.user;
    
    if (!user) {
      throw new Error('Kullanıcı oluşturulamadı');
    }
    
    // Şimdi users tablosuna ekleyelim
    try {
      // Önce varsayılan bölgeyi alalım
      const { data: regionData } = await supabase
        .from('regions')
        .select('id')
        .limit(1)
        .single();
        
      const defaultRegionId = regionData?.id || 1;
      
      // Users tablosuna ekle
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          name: name || user.email?.split('@')[0] || 'Yeni Kullanıcı',
          role: 'field_user',
          region_id: defaultRegionId,
          status: 'active'
        })
        .select()
        .single();
        
      if (userError) {
        console.warn('Kullanıcı users tablosuna eklenirken hata:', userError.message);
        // Hatayı göster ama kayıt işlemini iptal etme
      }
      
      console.log('Kullanıcı başarıyla kaydedildi:', user.email);
      return data;
      
    } catch (dbError) {
      console.error('Veritabanı işlemi sırasında hata:', dbError);
      // Auth kaydı başarılı olduğu için kullanıcıyı geri döndür
      return data;
    }
  } catch (error: any) {
    console.error('Kayıt işlemi sırasında hata:', error);
    throw error;
  }
}

// Auth'a giriş yapan kullanıcının users tablosunda olup olmadığını kontrol et ve yoksa ekle
async function ensureUserInDatabase(authUser: any) {
  if (!authUser || !authUser.id || !authUser.email) return;
  
  try {
    // Kullanıcının users tablosunda olup olmadığını kontrol et
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();
      
    if (!data) {
      console.log(`Kullanıcı (${authUser.email}) users tablosunda bulunamadı, ekleniyor...`);
      
      // Varsayılan bölgeyi al
      const { data: regionData } = await supabase
        .from('regions')
        .select('id')
        .limit(1)
        .single();
        
      const defaultRegionId = regionData?.id || 1;
      
      // Kullanıcıyı users tablosuna ekle
      await supabase
        .from('users')
        .insert({
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Yeni Kullanıcı',
          role: 'field_user',
          region_id: defaultRegionId,
          status: 'active'
        });
        
      console.log(`Kullanıcı (${authUser.email}) users tablosuna eklendi`);
    }
  } catch (error) {
    console.error('Kullanıcı veritabanı kontrolü sırasında hata:', error);
  }
}

// Oturum değişikliklerini dinleyip kullanıcı bilgilerini güncelleyen fonksiyon
export async function setupAuthListener(callback?: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth durumu değişti:', event);
    
    if (event === 'SIGNED_IN' && session?.user) {
      // Kullanıcı giriş yaptığında users tablosunda olduğundan emin ol
      await ensureUserInDatabase(session.user);
    }
    
    // Eğer bir callback fonksiyonu verildiyse çağır
    if (callback) {
      callback(event, session);
    }
  });
}

/**
 * Kullanıcı profil bilgilerini al
 */
export const getUserProfile = async (userId: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Kullanıcı profili alınamadı:', error);
      return null;
    }
    
    return data as User;
  } catch (error) {
    console.error('Kullanıcı profili hatası:', error);
    return null;
  }
}; 