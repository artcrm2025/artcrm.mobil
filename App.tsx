import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, TouchableOpacity, Image, StatusBar, SafeAreaView, Platform, Alert, LogBox } from 'react-native';
import { NavigationContainer, useNavigation, NavigationProp } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { Provider as PaperProvider, MD3LightTheme as DefaultTheme, Text, useTheme, Button, Avatar, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from './src/lib/supabase';
import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ProposalsScreen } from './src/screens/ProposalsScreen';
import { SurgeryReportsScreen } from './src/screens/SurgeryReportsScreen';
import { VisitReportsScreen } from './src/screens/VisitReportsScreen';
import { ClinicsScreen } from './src/screens/ClinicsScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { UserManagementScreen } from './src/screens/UserManagementScreen';
import { CreateProposalScreen } from './src/screens/CreateProposalScreen';
import { ProposalDetailScreen } from './src/screens/ProposalDetailScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { CreateSurgeryReportScreen } from './src/screens/CreateSurgeryReportScreen';
import { CreateVisitReportScreen } from './src/screens/CreateVisitReportScreen';
import { RegionManagementScreen } from './src/screens/RegionManagementScreen';
import { User, UserRole } from './src/types';
import { getCurrentUser, isUserLoggedIn, setupAuthListener } from './src/services/authService';
import { ClinicManagementScreen } from './src/screens/ClinicManagementScreen';
import { ProductManagementScreen } from './src/screens/ProductManagementScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { CreateClinicScreen } from './src/screens/CreateClinicScreen';
import TeamPerformanceScreen from './src/screens/TeamPerformanceScreen';
import { SurgeryReportDetailScreen } from './src/screens/SurgeryReportDetailScreen';
import { VisitReportDetailScreen } from './src/screens/VisitReportDetailScreen';
import { EditVisitReportScreen } from './src/screens/EditVisitReportScreen';
import { SafeAreaProvider, SafeAreaView as SafeAreaViewComponent } from 'react-native-safe-area-context';
import { SafeAreaWrapper, SafeContentContainer } from './src/components/SafeAreaWrapper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { UserLocationScreen } from './src/screens/UserLocationScreen';
import { CampaignsScreen } from './src/screens/CampaignsScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import { ClinicDetailScreen } from './src/screens/ClinicDetailScreen';
import { ActivitiesPage } from './src/screens/ActivitiesPage';
import ActivityFeedScreen from './src/screens/ActivityFeedScreen';
import { ArtAiMobileScreen } from './src/screens/ArtAiMobileScreen';
import CampaignDetail from './src/screens/CampaignDetail';
import EditCampaign from './src/screens/EditCampaign';
import CreateCampaign from './src/screens/CreateCampaign';
import { AITestScreen } from './src/screens/AITestScreen';

// Modern tema tanımlaması
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6366F1', // Indigo
    primaryContainer: '#EEF2FF',
    secondary: '#4F46E5', // Daha koyu indigo
    secondaryContainer: '#E0E7FF',
    tertiary: '#10B981', // Yeşil başarı rengi
    tertiaryContainer: '#D1FAE5',
    surface: '#FFFFFF',
    surfaceVariant: '#F3F4F6',
    background: '#F9FAFB',
    error: '#EF4444',
    errorContainer: '#FEE2E2',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#312E81',
    onSecondary: '#FFFFFF',
    onSecondaryContainer: '#312E81',
    onTertiary: '#FFFFFF',
    onTertiaryContainer: '#065F46',
    onSurface: '#1F2937',
    onSurfaceVariant: '#4B5563',
    onError: '#FFFFFF',
    onErrorContainer: '#7F1D1D',
    elevation: {
      level0: 'transparent',
      level1: '#F3F4F6',
      level2: '#E5E7EB',
      level3: '#D1D5DB',
      level4: '#9CA3AF',
      level5: '#6B7280',
    },
  },
  roundness: 12,
  animation: {
    scale: 1.0,
  },
};

// Uygulama içi yönlendirme için stack tiplerini tanımlayalım
type AppStackParamList = {
  Home: undefined;
  Main: undefined;
  Profile: undefined;
  Clinics: undefined;
  CreateClinic: undefined;
  ClinicDetail: { clinicId: number };
  Proposals: undefined;
  ProposalDetail: { id: string };
  CreateProposal: undefined;
  SurgeryReports: undefined;
  CreateSurgeryReport: undefined;
  VisitReports: undefined;
  CreateVisitReport: undefined;
  Calendar: undefined;
  RegionManagement: undefined;
  ClinicManagement: undefined;
  UserManagement: undefined;
  ProductManagement: undefined;
  Notifications: undefined;
  TeamPerformanceScreen: undefined;
  SurgeryReportDetail: { reportId: string };
  VisitReportDetail: { id: string };
  EditVisitReport: undefined;
  Login: undefined;
  UserLocation: undefined;
  Activities: undefined;
  ActivityAnalysis: undefined;
  Campaigns: undefined;
  Analytics: undefined;
  'Ana Menü': undefined;
  CampaignDetail: { campaignId: number };
  EditCampaign: { campaignId: number };
  CreateCampaign: undefined;
};

// Drawer navigasyon tipleri
type DrawerParamList = {
  Home: undefined;
  Reports: undefined;
  Proposals: undefined;
  Clinics: undefined;
  Users?: undefined;
  ActivityFeed: undefined;
  ActivityAnalysis: undefined;
  Campaigns?: undefined;
  Analytics?: undefined;
  ArtAi: undefined;
  Profile: undefined;
  UserLocation?: undefined;
};

// Stack navigatör oluşturalım
const AppStack = createStackNavigator<AppStackParamList>();
const Drawer = createDrawerNavigator<DrawerParamList>();

// Custom Drawer Content
const CustomDrawerContent = (props: any) => {
  const theme = useTheme();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Drawer: Kullanıcı bilgileri yüklenirken hata:', error);
      }
    }
    fetchUser();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("Çıkış Hatası", error.message);
    }
  };

  return (
    <DrawerContentScrollView {...props} style={{ backgroundColor: theme.colors.surface }}>
      <View style={styles.drawerHeader}>
        <Avatar.Icon size={64} icon="account-circle" style={{ backgroundColor: theme.colors.primaryContainer }} color={theme.colors.primary} />
        <Text style={[styles.drawerHeaderText, { color: theme.colors.onSurface }]}>
          {currentUser?.name || 'Kullanıcı'}
        </Text>
        <Text style={[styles.drawerSubText, { color: theme.colors.onSurfaceVariant }]}>
          {currentUser?.role ? getRoleDisplayName(currentUser.role) : ''}
        </Text>
      </View>
      <Divider style={{ backgroundColor: theme.colors.elevation.level2, marginVertical: 8 }}/>
      <DrawerItemList {...props} />
      <DrawerItem
        label="Çıkış Yap"
        icon={({ color, size }) => (
          <MaterialCommunityIcons name="logout" color={theme.colors.error} size={size} />
        )}
        onPress={handleLogout}
        labelStyle={{ color: theme.colors.error, fontWeight: '500' }}
        style={{ marginTop: 20 }}
      />
    </DrawerContentScrollView>
  );
}

// Kullanıcı rolü adını görüntülemek için yardımcı fonksiyon
const getRoleDisplayName = (role: string) => {
  switch (role) {
    case 'admin': return 'Yönetici';
    case 'manager': return 'Bölge Müdürü';
    case 'field': return 'Saha Kullanıcısı';
    default: return 'Kullanıcı';
  }
};

// Drawer navigatör
const DrawerNavigator = () => {
  const [user, setUser] = useState<User | null>(null);
  const theme = useTheme();

  // Kullanıcı bilgilerini al
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('DrawerNavigator: Kullanıcı bilgileri yüklenirken hata:', error);
      }
    };

    fetchUser();
  }, []);

  // Kullanıcı rolüne göre menü elemanlarını göster/gizle
  const shouldShowTabScreen = (routeName: keyof DrawerParamList) => {
    if (!user) return false;

    switch (routeName) {
      case 'Home':
      case 'Proposals':
      case 'Clinics':
      case 'Reports':
      case 'ActivityFeed':
      case 'Profile':
      case 'ArtAi':
        return true;
      case 'Users':
        return user.role === 'admin';
      case 'Campaigns':
        return user.role === 'admin' || user.role === 'manager';
      case 'Analytics':
        return user.role === 'admin' || user.role === 'manager';
      case 'ActivityAnalysis':
        return user.role === 'admin' || user.role === 'manager';
      case 'UserLocation':
        return user.role === 'admin' || user.role === 'manager';
      default:
        return false;
    }
  };

  return (
    <Drawer.Navigator
      initialRouteName="Home"
      drawerContent={props => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: theme.colors.onPrimary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        drawerActiveBackgroundColor: theme.colors.primaryContainer,
        drawerActiveTintColor: theme.colors.primary,
        drawerInactiveTintColor: theme.colors.onSurface,
        drawerLabelStyle: {
          marginLeft: -20,
          fontSize: 15,
          fontWeight: '500',
        },
      }}
    >
      {/* Ana Ekran */}
      {shouldShowTabScreen('Home') && (
        <Drawer.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'Ana Ekran',
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="home" color={color} size={size} />
            ),
          }}
        />
      )}

      {/* Teklifler */}
      {shouldShowTabScreen('Proposals') && (
        <Drawer.Screen
          name="Proposals"
          component={ProposalsScreen}
          options={{
            title: 'Teklifler',
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="file-document-outline" color={color} size={size} />
            ),
          }}
        />
      )}

      {/* Raporlar */}
      {shouldShowTabScreen('Reports') && (
        <Drawer.Screen
          name="Reports"
          component={ReportsNavigator}
          options={{
            title: 'Raporlar',
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="chart-bar" color={color} size={size} />
            ),
          }}
        />
      )}

      {/* Klinikler */}
      {shouldShowTabScreen('Clinics') && (
        <Drawer.Screen
          name="Clinics"
          component={ClinicsScreen}
          options={{
            title: 'Klinikler',
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="hospital-building" color={color} size={size} />
            ),
          }}
        />
      )}

      {/* Aktivite Akışı */}
      {shouldShowTabScreen('ActivityFeed') && (
        <Drawer.Screen
          name="ActivityFeed"
          component={ActivityFeedScreen}
          options={{
            title: 'Aktivite Akışı',
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="bulletin-board" color={color} size={size} />
            ),
          }}
        />
      )}

      {/* Aktivite Analizi */}
      {shouldShowTabScreen('ActivityAnalysis') && (
        <Drawer.Screen
          name="ActivityAnalysis"
          component={ActivitiesPage}
          options={{
            title: 'Aktivite Analizi',
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="chart-timeline-variant" color={color} size={size} />
            ),
          }}
        />
      )}

      {/* Kampanyalar */}
      {shouldShowTabScreen('Campaigns') && (
        <Drawer.Screen
          name="Campaigns"
          component={CampaignsScreen}
          options={{
            title: 'Kampanyalar',
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="tag-multiple-outline" color={color} size={size} />
            ),
          }}
        />
      )}

      {/* Analizler */}
      {shouldShowTabScreen('Analytics') && (
        <Drawer.Screen
          name="Analytics"
          component={AnalyticsScreen}
          options={{
            title: 'Analizler',
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="google-analytics" color={color} size={size} />
            ),
          }}
        />
      )}

      {/* ArtAI */}
      {shouldShowTabScreen('ArtAi') && (
        <Drawer.Screen
          name="ArtAi"
          component={ArtAiMobileScreen}
          options={{
            title: 'Art AI',
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="robot" color={color} size={size} />
            ),
          }}
        />
      )}

      {/* Kullanıcı Takibi */}
      {shouldShowTabScreen('UserLocation') && (
        <Drawer.Screen
          name="UserLocation"
          component={UserLocationScreen}
          options={{
            title: 'Kullanıcı Takibi',
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="map-marker-radius" color={color} size={size} />
            ),
          }}
        />
      )}

      {/* Kullanıcılar (Sadece admin kullanıcılara gösterilir) */}
      {shouldShowTabScreen('Users') && (
        <Drawer.Screen
          name="Users"
          component={UserManagementScreen}
          options={{
            title: 'Kullanıcılar',
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="account-group" color={color} size={size} />
            ),
          }}
        />
      )}

      {/* Profil */}
      {shouldShowTabScreen('Profile') && (
        <Drawer.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            title: 'Profil',
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="account-circle" color={color} size={size} />
            ),
          }}
        />
      )}
    </Drawer.Navigator>
  );
};

// Raporlar için özel navigatör
const ReportsNavigator = () => {
  const theme = useTheme();
  const Stack = createStackNavigator();

  return (
    <Stack.Navigator
      initialRouteName="ReportsHome"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="ReportsHome" component={ReportsHomeScreen} />
      <Stack.Screen name="SurgeryReports" component={SurgeryReportsScreen} />
      <Stack.Screen name="VisitReports" component={VisitReportsScreen} />
      <Stack.Screen name="CreateSurgeryReport" component={CreateSurgeryReportScreen} />
      <Stack.Screen name="CreateVisitReport" component={CreateVisitReportScreen} />
      <Stack.Screen name="SurgeryReportDetail" 
        component={SurgeryReportDetailScreen}
        options={{
          headerTitle: "Ameliyat Rapor Detayı",
          headerShown: true,
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: theme.colors.onPrimary,
        }}
      />
      <Stack.Screen name="VisitReportDetail" 
        component={VisitReportDetailScreen}
        options={{
          headerTitle: "Ziyaret Rapor Detayı",
          headerShown: true,
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: theme.colors.onPrimary,
        }}
      />
      <Stack.Screen name="EditVisitReport" 
        component={EditVisitReportScreen}
        options={{
          headerTitle: "Ziyaret Raporu Düzenle",
          headerShown: true,
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: theme.colors.onPrimary,
        }}
      />
    </Stack.Navigator>
  );
};

// Raporlar ana ekranı
const ReportsHomeScreen = ({ navigation }: any) => {
  const theme = useTheme();

  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        <Text style={styles.pageTitle}>Raporlar</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.reportButton, { backgroundColor: theme.colors.primaryContainer }]}
            onPress={() => navigation.navigate('SurgeryReports')}
          >
            <MaterialCommunityIcons name="medical-bag" size={24} color={theme.colors.primary} />
            <Text style={[styles.reportButtonText, { color: theme.colors.primary }]}>Ameliyat Raporları</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.reportButton, { backgroundColor: theme.colors.secondaryContainer }]}
            onPress={() => navigation.navigate('VisitReports')}
          >
            <MaterialCommunityIcons name="clipboard-text" size={24} color={theme.colors.secondary} />
            <Text style={[styles.reportButtonText, { color: theme.colors.secondary }]}>Ziyaret Raporları</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaWrapper>
  );
};

// Geçici ekran bileşeni
const PlaceholderScreen = () => (
  <SafeAreaWrapper>
    <View style={styles.container}>
      <Text>Bu sayfa yapım aşamasındadır.</Text>
    </View>
  </SafeAreaWrapper>
);

// Ana uygulama navigasyonu
const AppNavigator = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setIsLoggedIn(!!session);

        setupAuthListener({
          onLogin: (newSession) => {
            setSession(newSession);
            setIsLoggedIn(true);
          },
          onLogout: () => {
            setSession(null);
            setIsLoggedIn(false);
          }
        });
      } catch (error) {
        console.error('Oturum kontrolünde hata oluştu:', error);
        setIsLoggedIn(false);
      }
    }

    fetchUser();
  }, []);

  if (isLoggedIn === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <AppStack.Navigator
        screenOptions={{
          headerShown: false
        }}
      >
        {isLoggedIn ? (
          <>
            <AppStack.Screen name="Main" component={DrawerNavigator} />
            <AppStack.Screen 
              name="ProposalDetail" 
              component={ProposalDetailScreen}
              options={{
                headerShown: true,
                headerTitle: "Teklif Detayı",
                headerStyle: {
                  backgroundColor: theme.colors.primary,
                },
                headerTintColor: theme.colors.onPrimary,
              }}
            />
            <AppStack.Screen 
              name="ClinicDetail" 
              component={ClinicDetailScreen}
              options={{
                headerShown: true,
                headerTitle: "Klinik Detayı",
                headerStyle: {
                  backgroundColor: theme.colors.primary,
                },
                headerTintColor: theme.colors.onPrimary,
              }}
            />
            <AppStack.Screen 
              name="CreateProposal" 
              component={CreateProposalScreen}
              options={{
                headerShown: true,
                headerTitle: "Yeni Teklif",
                headerStyle: {
                  backgroundColor: theme.colors.primary,
                },
                headerTintColor: theme.colors.onPrimary,
              }}
            />
            <AppStack.Screen 
              name="CreateClinic" 
              component={CreateClinicScreen}
              options={{
                headerShown: true,
                headerTitle: "Yeni Klinik",
                headerStyle: {
                  backgroundColor: theme.colors.primary,
                },
                headerTintColor: theme.colors.onPrimary,
              }}
            />
            <AppStack.Screen 
              name="CampaignDetail" 
              component={CampaignDetail}
              options={{
                headerShown: true,
                headerTitle: "Kampanya Detayı",
                headerStyle: {
                  backgroundColor: theme.colors.primary,
                },
                headerTintColor: theme.colors.onPrimary,
              }}
            />
            <AppStack.Screen 
              name="EditCampaign" 
              component={EditCampaign}
              options={{
                headerShown: true,
                headerTitle: "Kampanya Düzenle",
                headerStyle: {
                  backgroundColor: theme.colors.primary,
                },
                headerTintColor: theme.colors.onPrimary,
              }}
            />
            <AppStack.Screen 
              name="CreateCampaign" 
              component={CreateCampaign}
              options={{
                headerShown: true,
                headerTitle: "Yeni Kampanya",
                headerStyle: {
                  backgroundColor: theme.colors.primary,
                },
                headerTintColor: theme.colors.onPrimary,
              }}
            />
          </>
        ) : (
          <AppStack.Screen name="Login" component={LoginScreen} />
        )}
      </AppStack.Navigator>
    </NavigationContainer>
  );
};

// Ana uygulama bileşeni
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
          <AppNavigator />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Stil tanımlamaları
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6366F1',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1F2937',
  },
  buttonContainer: {
    gap: 16,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  reportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  drawerHeader: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  drawerHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  drawerSubText: {
    fontSize: 14,
    marginTop: 4,
  },
});