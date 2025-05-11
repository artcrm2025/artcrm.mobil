import React, { ReactNode } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from 'react-native-paper';

interface SafeAreaWrapperProps {
  children: ReactNode;
  style?: any;
}

/**
 * iOS ve Android için güvenli alan sağlayan wrapper bileşeni.
 * Özellikle iPhone notch ve home indicator alanları için güvenli bir alan sağlar.
 */
export const SafeAreaWrapper = ({ children, style }: SafeAreaWrapperProps) => {
  const theme = useTheme();
  
  return (
    <SafeAreaView 
      style={[
        styles.safeArea, 
        { backgroundColor: theme.colors.background },
        style
      ]} 
      edges={['top', 'left', 'right']}
    >
      {children}
    </SafeAreaView>
  );
};

/**
 * İçerik konteynerı için güvenli alanlar sağlayan bileşen
 */
export const SafeContentContainer = ({ children, style }: SafeAreaWrapperProps) => {
  const theme = useTheme();
  
  return (
    <View 
      style={[
        styles.container, 
        { backgroundColor: theme.colors.background },
        // iPhone için ekstra alt padding
        Platform.OS === 'ios' ? styles.iosExtraPadding : {},
        style
      ]}
    >
      {children}
    </View>
  );
};

/**
 * Sabit alt navigasyon için güvenli alan sağlayan bileşen
 */
export const SafeBottomTabArea = ({ children, style }: SafeAreaWrapperProps) => {
  const theme = useTheme();
  
  return (
    <SafeAreaView 
      style={[
        styles.bottomTabContainer, 
        { backgroundColor: theme.colors.surface },
        style
      ]} 
      edges={['bottom']}
    >
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 16, // iPhone için ekstra padding
  },
  bottomTabContainer: {
    backgroundColor: 'white',
    paddingBottom: Platform.OS === 'ios' ? 8 : 0, // iPhone home indicator için ekstra padding
  },
  iosExtraPadding: {
    paddingBottom: 30, // iPhone home indicator için ekstra padding
  }
});