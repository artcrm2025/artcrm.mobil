import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Ekranlar
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ProposalsScreen } from '../screens/ProposalsScreen';
import { ProposalDetailScreen } from '../screens/ProposalDetailScreen';
import { SurgeryReportsScreen } from '../screens/SurgeryReportsScreen';
import { VisitReportsScreen } from '../screens/VisitReportsScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { LocationMapScreen } from '../screens/LocationMapScreen';

// Tab navigator
const Tab = createBottomTabNavigator();

// Proposal navigator
const ProposalStack = createNativeStackNavigator();
const ProposalNavigator = () => {
  return (
    <ProposalStack.Navigator screenOptions={{ headerShown: false }}>
      <ProposalStack.Screen name="ProposalsList" component={ProposalsScreen} />
      <ProposalStack.Screen name="ProposalDetail" component={ProposalDetailScreen} />
    </ProposalStack.Navigator>
  );
};

// Reports navigator
const ReportStack = createNativeStackNavigator();
const ReportNavigator = () => {
  return (
    <ReportStack.Navigator screenOptions={{ headerShown: false }}>
      <ReportStack.Screen name="SurgeryReports" component={SurgeryReportsScreen} />
      <ReportStack.Screen name="VisitReports" component={VisitReportsScreen} />
    </ReportStack.Navigator>
  );
};

// Ana tab navigator
const MainNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
      initialRouteName="Home"
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Ana Sayfa',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      
      <Tab.Screen
        name="ProposalsTab"
        component={ProposalNavigator}
        options={{
          tabBarLabel: 'Teklifler',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="file-document-outline" color={color} size={size} />
          ),
        }}
      />
      
      <Tab.Screen
        name="ReportsTab"
        component={ReportNavigator}
        options={{
          tabBarLabel: 'Raporlar',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="clipboard-text-outline" color={color} size={size} />
          ),
        }}
      />
      
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarLabel: 'Takvim',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-month" color={color} size={size} />
          ),
        }}
      />
      
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
      
      {/* Konum Ekranı */}
      <Tab.Screen 
        name="LocationMap" 
        component={LocationMapScreen} 
        options={{
          tabBarLabel: 'Konum',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map-marker" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;