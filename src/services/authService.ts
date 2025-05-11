import { supabase } from '../lib/supabase';
import { User } from '../types';
import { Session } from '@supabase/supabase-js';

/**
 * Kullanıcının giriş yapmış olup olmadığını kontrol eder
 */
export const isUserLoggedIn = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Oturum kontrol hatası:', error.message);
      return false;
    }
    
    return !!data.session;
  } catch (error) {
    console.error('Oturum kontrolünde beklenmeyen hata:', error);
    return false;
  }
};

/**
 * Kullanıcının oturum açabilmesi için gerekli fonksiyon
 */
export const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    
    return { data, error: null };
  } catch (error: any) {
    console.error('Giriş hatası:', error.message);
    return { data: null, error };
  }
};

/**
 * Çıkış işlemini yapar
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    console.error('Çıkış hatası:', error.message);
    return { error };
  }
};

/**
 * Auth listener kurulumu
 */
interface AuthListenerCallbacks {
  onLogin: (session: Session) => void;
  onLogout: () => void;
}

export const setupAuthListener = (callbacks: AuthListenerCallbacks) => {
  const { onLogin, onLogout } = callbacks;

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      onLogin(session);
    } else if (event === 'SIGNED_OUT') {
      onLogout();
    }
  });

  // Cleanup function
  return () => {
    subscription.unsubscribe();
  };
};

/**
 * Mevcut kullanıcının bilgilerini getirir
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    // Auth bilgisini kontrol et
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    // Kullanıcı detaylarını veritabanından çek
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Kullanıcı bilgileri alınırken hata:', error.message);
      return null;
    }

    return data as User;
  } catch (error) {
    console.error('getCurrentUser hatası:', error);
    return null;
  }
};

/**
 * Kullanıcı profil bilgilerini günceller
 */
export const updateUserProfile = async (userId: string, updates: Partial<User>) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    
    return { data, error: null };
  } catch (error: any) {
    console.error('Profil güncelleme hatası:', error.message);
    return { data: null, error };
  }
};