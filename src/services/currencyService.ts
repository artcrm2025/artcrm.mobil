import { supabase } from '../lib/supabase';

// Desteklenen para birimleri
export type Currency = 'TRY' | 'USD' | 'EUR';

// Sabit kur değerleri (TCMB entegrasyonu olmadığı için şimdilik)
const STATIC_RATES: Record<Currency, number> = {
  TRY: 1,
  USD: 32.5, // 1 USD = 32.5 TRY
  EUR: 35.2, // 1 EUR = 35.2 TRY
};

/**
 * Para birimini dönüştürür
 * @param amount Miktar
 * @param from Kaynak para birimi
 * @param to Hedef para birimi
 * @returns Dönüştürülmüş miktar
 */
export const convertCurrency = (amount: number, from: Currency, to: Currency): number => {
  if (from === to) return amount;
  
  // Önce TRY'ye çevir, sonra hedef para birimine
  const amountInTRY = from === 'TRY' ? amount : amount * STATIC_RATES[from];
  const result = to === 'TRY' ? amountInTRY : amountInTRY / STATIC_RATES[to];
  
  // 2 ondalık basamağa yuvarla
  return Math.round(result * 100) / 100;
};

/**
 * Desteklenen tüm para birimlerini döndürür
 * @returns Para birimleri listesi
 */
export const getSupportedCurrencies = (): Currency[] => {
  return Object.keys(STATIC_RATES) as Currency[];
};

/**
 * Ürünlere ait para birimi bilgilerini günceller
 * NOT: Bu fonksiyon, ürünler tablosuna currency alanı eklendikten sonra kullanılacak
 */
export const updateProductCurrencies = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .update({ currency: 'EUR' })
      .is('currency', null);
      
    if (error) {
      console.error('Ürün para birimleri güncellenirken hata:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Ürün para birimleri güncellenirken hata:', error);
    return false;
  }
}; 