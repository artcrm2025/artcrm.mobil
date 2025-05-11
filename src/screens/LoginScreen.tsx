import React, { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView, Alert, Image, Dimensions } from 'react-native';
import { Button, Text, TextInput, Surface, ActivityIndicator } from 'react-native-paper';
import { signIn } from '../services/authService';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'E-posta ve şifre alanları boş olamaz');
      return;
    }

    try {
      console.log('Giriş denemesi:', email);
      setLoading(true);
      await signIn(email, password);
      // Başarılı giriş durumunda App.tsx'deki auth listener otomatik olarak yönlendirecek
    } catch (error: any) {
      console.error('Giriş işlemi sırasında hata:', error);
      Alert.alert(
        'Giriş Başarısız', 
        `Giriş yapılamadı: ${error?.message || 'Geçersiz kullanıcı bilgileri'}. Lütfen bilgilerinizi kontrol edin.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'right', 'left']}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#ffffff', '#f4f6f8']}
        style={styles.background}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <Surface style={styles.logoSurface}>
              <MaterialCommunityIcons name="medical-bag" size={40} color="#4e54c8" />
            </Surface>
            <Text style={styles.title}>NTA İmplant CRM</Text>
            <Text style={styles.subtitle}>Sağlık Sektörü Yönetim Sistemi</Text>
          </View>
          
          <Surface style={styles.formContainer}>
            <Text style={styles.formTitle}>Hesabınıza Giriş Yapın</Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                label="E-posta Adresi"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                left={<TextInput.Icon icon="email-outline" color="#4e54c8" />}
                outlineColor="#e0e0e0"
                activeOutlineColor="#4e54c8"
                outlineStyle={{ borderRadius: 12 }}
              />
              
              <TextInput
                label="Şifre"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                mode="outlined"
                secureTextEntry={secureTextEntry}
                left={<TextInput.Icon icon="lock-outline" color="#4e54c8" />}
                right={
                  <TextInput.Icon 
                    icon={secureTextEntry ? "eye-outline" : "eye-off-outline"} 
                    onPress={() => setSecureTextEntry(!secureTextEntry)}
                    color="#4e54c8"
                  />
                }
                outlineColor="#e0e0e0"
                activeOutlineColor="#4e54c8"
                outlineStyle={{ borderRadius: 12 }}
              />
            </View>
            
            <Button
              mode="contained"
              onPress={handleLogin}
              style={styles.button}
              loading={loading}
              disabled={loading}
              buttonColor="#4e54c8"
              contentStyle={styles.buttonContent}
            >
              Giriş Yap
            </Button>
            
            <Text style={styles.forgotPassword}>
              Şifrenizi mi unuttunuz?
            </Text>
          </Surface>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              © 2023 NTA İmplant CRM. Tüm hakları saklıdır.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 50 : 20, // iPhone için daha fazla alt boşluk
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: Platform.OS === 'ios' ? 30 : 0, // iPhone için üst kısımda daha fazla boşluk
  },
  logoSurface: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 16,
    elevation: 4,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 8,
    borderRadius: 12,
    elevation: 0,
  },
  buttonContent: {
    height: 50,
  },
  forgotPassword: {
    marginTop: 16,
    textAlign: 'center',
    color: '#4e54c8',
    fontSize: 14,
  },
  footer: {
    marginTop: 'auto',
    marginBottom: Platform.OS === 'ios' ? 30 : 16, // iPhone için daha fazla alt boşluk
  },
  footerText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
  },
}); 