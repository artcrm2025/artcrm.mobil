import React, { useState } from 'react';
import { StyleSheet, View, Image, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { signIn } from '../services/authService';
import { SafeAreaView } from 'react-native-safe-area-context';

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const theme = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'Lütfen email ve şifrenizi girin');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await signIn(email, password);
      
      if (error) {
        let errorMessage = 'Giriş yapılamadı';
        
        if (error.message.includes('Invalid login')) {
          errorMessage = 'Geçersiz email veya şifre';
        } else if (error.message.includes('network')) {
          errorMessage = 'İnternet bağlantısı hatası';
        }
        
        Alert.alert('Giriş Hatası', errorMessage);
      }
    } catch (error: any) {
      console.error('Login hatası:', error.message);
      Alert.alert('Hata', 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/icon.png')} 
              style={styles.logo} 
              resizeMode="contain" 
            />
            <Text style={[styles.title, { color: theme.colors.primary }]}>Art CRM</Text>
            <Text style={styles.subtitle}>Saha Yönetimi</Text>
          </View>
          
          <View style={styles.formContainer}>
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              mode="outlined"
              outlineStyle={{ borderRadius: 12 }}
              left={<TextInput.Icon icon="email" />}
            />
            
            <TextInput
              label="Şifre"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={styles.input}
              mode="outlined"
              outlineStyle={{ borderRadius: 12 }}
              left={<TextInput.Icon icon="lock" />}
              right={
                <TextInput.Icon 
                  icon={showPassword ? "eye-off" : "eye"} 
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />
            
            <TouchableOpacity style={styles.forgotPasswordContainer}>
              <Text style={[styles.forgotPassword, { color: theme.colors.primary }]}>Şifremi Unuttum?</Text>
            </TouchableOpacity>
            
            <Button 
              mode="contained" 
              onPress={handleLogin}
              style={styles.button}
              loading={loading}
              disabled={loading}
            >
              Giriş Yap
            </Button>
          </View>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>Art Meets Healthcare © {new Date().getFullYear()}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  formContainer: {
    width: '100%',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPassword: {
    fontSize: 14,
  },
  button: {
    padding: 5,
    borderRadius: 12,
  },
  footer: {
    marginTop: 48,
    alignItems: 'center',
  },
  footerText: {
    color: '#64748b',
    fontSize: 12,
  },
});