import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';

// Ekranlar
import HomeScreen from '../screens/HomeScreen';
import ProposalsScreen from '../screens/ProposalsScreen';
import SurgeryReportsScreen from '../screens/SurgeryReportsScreen';
import VisitReportsScreen from '../screens/VisitReportsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const theme = useTheme();

  // iPhone X ve sonrası modeller için daha fazla padding
  const isNewIphone = Platform.OS === 'ios' && !Platform.isPad && !Platform.isTVOS && (Platform.constants?.osVersion || 0) >= 11;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceDisabled,
        tabBarStyle: {
          height: isNewIphone ? 88 : 65, // iPhone X ve sonrası için daha yüksek
          paddingTop: 8,
          paddingBottom: isNewIphone ? 28 : 8, // iPhone X ve sonrası için daha fazla alt padding
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 5,
          borderTopWidth: 1,
          borderTopColor: theme.colors.outlineVariant,
        },
        tabBarLabelStyle: {
          fontWeight: '500',
          fontSize: 11,
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;

          if (route.name === 'Ana Sayfa') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Teklifler') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Ameliyatlar') {
            iconName = focused ? 'medkit' : 'medkit-outline';
          } else if (route.name === 'Ziyaretler') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Profil') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Ana Sayfa" component={HomeScreen} />
      <Tab.Screen name="Teklifler" component={ProposalsScreen} />
      <Tab.Screen name="Ameliyatlar" component={SurgeryReportsScreen} />
      <Tab.Screen name="Ziyaretler" component={VisitReportsScreen} />
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  // Eğer gerekirse ek stiller burada
});