import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Appbar, Card, Paragraph, useTheme } from 'react-native-paper';
import { RouteProp, useRoute } from '@react-navigation/native';
import { SafeAreaWrapper } from '../components/SafeAreaWrapper';

// Navigasyon parametrelerini tanımla (App.tsx'dekiyle eşleşmeli)
type ClinicDetailRouteProp = RouteProp<
  {
    ClinicDetail: { clinicId: number };
  },
  'ClinicDetail'
>;

export const ClinicDetailScreen = () => {
  const route = useRoute<ClinicDetailRouteProp>();
  const { clinicId } = route.params;
  const theme = useTheme();

  // Burada clinicId kullanarak klinik detaylarını fetch edebilirsiniz
  // Şimdilik placeholder içerik

  return (
    <SafeAreaWrapper>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => { /* Geri gitme işlevi eklenecek */ }} />
        <Appbar.Content title="Klinik Detayları" />
      </Appbar.Header>
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Title title="Klinik Adı" subtitle="Klinik Detayları" />
          <Card.Content>
            <Paragraph>Klinik ID: {clinicId}</Paragraph>
            <Paragraph>Burada klinik ile ilgili daha fazla detay gösterilecek.</Paragraph>
            {/* İletişim Bilgileri, Adres, İlgili Kişiler vb. buraya eklenebilir */}
          </Card.Content>
        </Card>
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9fafb', // Arka plan rengi tema ile uyumlu
  },
  card: {
    borderRadius: 12, // Tema ile uyumlu yuvarlaklık
    elevation: 2,
    backgroundColor: '#ffffff',
  },
}); 