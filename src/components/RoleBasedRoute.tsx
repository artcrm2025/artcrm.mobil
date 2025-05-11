import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { User, UserRole } from '../types';
import { useNavigation } from '@react-navigation/native';

type RoleBasedRouteProps = {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  currentUser: User | null;
};

/**
 * Rol tabanlı rota erişim bileşeni
 * Kullanıcının rolünü kontrol eder ve izin veriliyorsa içeriği gösterir
 */
export const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({ 
  allowedRoles, 
  children, 
  currentUser 
}) => {
  const navigation = useNavigation();

  if (!currentUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Giriş yapmanız gerekiyor</Text>
        <Button 
          mode="contained" 
          onPress={() => navigation.navigate('Login')}
          style={styles.button}
        >
          Giriş Yap
        </Button>
      </View>
    );
  }

  const hasAccess = allowedRoles.includes(currentUser.role);

  if (!hasAccess) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Erişim Reddedildi</Text>
        <Text style={styles.errorText}>
          Bu sayfaya erişim izniniz bulunmamaktadır. Erişim için gerekli yetkilere sahip olmadığınız tespit edildi.
        </Text>
        <Button 
          mode="contained" 
          onPress={() => navigation.goBack()}
          style={styles.button}
        >
          Geri Dön
        </Button>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#4B5563',
  },
  button: {
    marginTop: 16,
  },
});