import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { PieChart } from 'react-native-chart-kit';

type ProposalStatusCount = {
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
  contract_received: number;
  in_transfer: number;
  delivered: number;
};

interface ProposalStatusChartProps {
  statusCount: ProposalStatusCount;
}

export const ProposalStatusChart: React.FC<ProposalStatusChartProps> = ({ statusCount }) => {
  const theme = useTheme();
  const screenWidth = Dimensions.get('window').width - 40;
  
  // Durumlar için renkler
  const colors = {
    pending: '#F59E0B', // Amber
    approved: '#10B981', // Yeşil
    rejected: '#EF4444', // Kırmızı
    expired: '#9CA3AF', // Gri
    contract_received: '#8B5CF6', // Mor
    in_transfer: '#3B82F6', // Mavi
    delivered: '#14B8A6', // Yeşil-mavi
  };
  
  // Grafik verilerini hazırla
  const chartData = Object.entries(statusCount).map(([status, count], index) => ({
    name: getStatusDisplayName(status),
    count,
    color: colors[status as keyof ProposalStatusCount],
    legendFontColor: '#7F7F7F',
    legendFontSize: 12,
  })).filter(item => item.count > 0); // Sadece değeri 0'dan büyük olanları göster
  
  // Toplam teklif sayısı
  const totalProposals = Object.values(statusCount).reduce((sum, count) => sum + count, 0);

  // Veri yoksa bilgi mesajı göster
  if (totalProposals === 0) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataText}>Henüz teklif bulunmamaktadır</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Teklif Durumları</Text>
      
      <PieChart
        data={chartData}
        width={screenWidth}
        height={180}
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        accessor="count"
        backgroundColor="transparent"
        paddingLeft="10"
        absolute={false}
        hasLegend={true}
        center={[screenWidth / 5, 0]}
      />
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalProposals}</Text>
          <Text style={styles.statLabel}>Toplam Teklif</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{statusCount.approved}</Text>
          <Text style={styles.statLabel}>Onaylanan</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{statusCount.pending}</Text>
          <Text style={styles.statLabel}>Bekleyen</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{statusCount.rejected}</Text>
          <Text style={styles.statLabel}>Reddedilen</Text>
        </View>
      </View>
    </View>
  );
};

// Durum adlarını Türkçe gösterme yardımcı fonksiyonu
function getStatusDisplayName(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Beklemede',
    approved: 'Onaylandı',
    rejected: 'Reddedildi',
    expired: 'Süresi Doldu',
    contract_received: 'Sözleşme Alındı',
    in_transfer: 'Sevkiyatta',
    delivered: 'Teslim Edildi',
  };
  
  return statusMap[status] || status;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
    minWidth: '22%',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  noDataContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  noDataText: {
    fontSize: 16,
    color: '#64748B',
  },
});