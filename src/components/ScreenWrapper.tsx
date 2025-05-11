import React from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { SafeAreaWrapper } from './SafeAreaWrapper';

interface ScreenWrapperProps {
  children: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  withScrollView?: boolean;
  contentContainerStyle?: any;
  style?: any;
}

/**
 * Tüm ekranlar için standart bir wrapper bileşeni
 * iPhone notch ve home indicator alanları için güvenli bir yapı sağlar
 */
export function ScreenWrapper({
  children,
  loading = false,
  loadingText = 'Yükleniyor...',
  refreshing = false,
  onRefresh,
  withScrollView = true,
  contentContainerStyle = {},
  style = {},
}: ScreenWrapperProps) {
  const theme = useTheme();

  // Yükleme durumu gösterimi
  if (loading) {
    return (
      <SafeAreaWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{loadingText}</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  // ScrollView ile içerik
  if (withScrollView) {
    return (
      <SafeAreaWrapper>
        <ScrollView
          style={[styles.container, style]}
          contentContainerStyle={[
            styles.contentContainer,
            contentContainerStyle,
          ]}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            ) : undefined
          }
        >
          {children}
          {/* iPhone için alt boşluk */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaWrapper>
    );
  }

  // ScrollView olmadan içerik
  return (
    <SafeAreaWrapper>
      <View style={[styles.container, style]}>
        {children}
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 120 : 80, // iPhone için daha fazla alt boşluk
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  bottomSpacer: {
    height: Platform.OS === 'ios' ? 50 : 20, // iPhone için ekstra boşluk
  },
});