import { supabase } from '../lib/supabase';

// Mesaj tipi tanımlaması
export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
  type?: string;
}

// Prompt tipi seçenekleri
export type PromptType = 
  | 'default' 
  | 'chat'
  | 'crm_analysis' 
  | 'customer_behavior' 
  | 'sales_forecast' 
  | 'meeting_summary'
  | 'clinic_analysis'
  | 'product_recommendation'
  | 'proposal_draft';

// Parametre tipi
export interface AIParameters {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  optimizeLength?: boolean;
}

// Context veri tipi
export interface ContextData {
  [key: string]: any;
}

/**
 * AI analizini gerçekleştiren fonksiyon
 * @param prompt Analiz edilecek metin veya soru
 * @param promptType Prompt tipi
 * @param parameters AI parametreleri
 * @param contextData Bağlam verileri
 * @returns AI tarafından üretilen sonuç
 */
export const analyzeWithAI = async (
  prompt: string, 
  promptType: PromptType = 'default',
  parameters: AIParameters = {},
  contextData: ContextData = {}
) => {
  try {
    console.log(`AI isteği: ${promptType} - ${prompt.substring(0, 30)}...`);
    
    // Supabase Edge Function'ı çağır
    const { data, error } = await supabase.functions.invoke('gemini-ai', {
      body: { 
        prompt, 
        promptType,
        parameters,
        contextData
      },
    });

    if (error) {
      console.error('AI analiz hatası:', error);
      throw new Error(error.message);
    }
    
    if (!data || !data.result) {
      console.error('Geçersiz API yanıtı:', data);
      throw new Error('AI servisi geçerli bir yanıt döndürmedi');
    }
    
    return data;
  } catch (error: any) {
    console.error('AI analiz hatası:', error);
    throw error;
  }
};

/**
 * Sohbet mesajlarını AI'a gönderir ve yanıt alır
 * @param messages Mesaj geçmişi
 * @param systemPrompt Sistem prompt metni
 * @param parameters AI parametreleri
 * @returns AI yanıtı
 */
export const chatWithAI = async (
  messages: Message[],
  systemPrompt: string = 'ART CRM sisteminde bir yardımcı AI asistansın. Sorulara kısa, net ve doğru yanıtlar ver.',
  parameters: AIParameters = {}
) => {
  try {
    console.log(`Sohbet isteği: ${messages.length} mesaj`);
    
    // Supabase Edge Function'ı çağır
    const { data, error } = await supabase.functions.invoke('gemini-ai', {
      body: {
        messageHistory: messages,
        systemPrompt,
        parameters,
        promptType: 'chat'
      },
    });

    if (error) {
      console.error('Sohbet hatası:', error);
      throw new Error(error.message);
    }
    
    if (!data || !data.result) {
      console.error('Geçersiz API yanıtı:', data);
      throw new Error('AI servisi geçerli bir yanıt döndürmedi');
    }
    
    return data;
  } catch (error: any) {
    console.error('Sohbet hatası:', error);
    throw error;
  }
};

/**
 * Kullanıcı davranışlarını analiz eden özel fonksiyon
 * @param userText Kullanıcı davranışını açıklayan metin
 * @returns Analiz sonucu
 */
export const analyzeUserBehavior = async (userText: string) => {
  return analyzeWithAI(
    userText, 
    'customer_behavior',
    { temperature: 0.3 }
  );
};

/**
 * Satış veya işlem trendlerini analiz eden fonksiyon
 * @param data Analiz edilecek veri açıklaması
 * @returns Trend analizi sonucu
 */
export const analyzeSalesTrends = async (data: string) => {
  return analyzeWithAI(
    data,
    'sales_forecast',
    { temperature: 0.2, maxOutputTokens: 800 }
  );
};

/**
 * Metin içeriğini özetleyen fonksiyon
 * @param text Özetlenecek metin
 * @param maxLength İstenilen maksimum özet uzunluğu (kelime sayısı)
 * @returns Özetlenmiş metin
 */
export const summarizeText = async (text: string, maxLength = 100) => {
  return analyzeWithAI(
    text,
    'default',
    { 
      temperature: 0.4,
      maxOutputTokens: maxLength * 5 // Yaklaşık token sayısı
    }
  );
};

/**
 * Satış personeli için konuşma önerileri üreten fonksiyon
 * @param customerInfo Müşteri bilgileri ve durumu
 * @returns Konuşma önerileri
 */
export const generateSalesTips = async (customerInfo: string) => {
  return analyzeWithAI(
    customerInfo,
    'default',
    { temperature: 0.7 }
  );
}; 