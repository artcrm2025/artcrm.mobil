import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { Clinic, Product, Proposal, SurgeryReport, VisitReport } from '../types';

export type ReportsStackParamList = {
  ReportsHome: undefined;
  SurgeryReports: undefined;
  SurgeryReportDetail: { reportId: number };
  CreateSurgeryReport: { prefillClinicId?: number };
  VisitReports: undefined;
  VisitReportDetail: { reportId: number };
  CreateVisitReport: { prefillClinicId?: number };
  EditVisitReport: { reportId: number };
};

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Dashboard: undefined;
  Settings: undefined;
  HelpSupport: undefined;
  Notifications: undefined;
  Profile: undefined;
  AnalyticsScreen: undefined;
  CreateClinic: undefined;
  EditClinic: { clinicId: number };
  CreateProposal: { prefillClinicId?: number; duplicateProposalId?: number };
  EditProposal: { proposalId: number };
  ProposalDetail: { id: number };
  ProposalPreview: { proposalId: number };
  Proposals: { filter?: string };
  Clinics: undefined;
  ClinicDetail: { clinicId: number };
  Users: undefined;
  UserDetail: { userId: string };
  CreateUser: undefined;
  EditUser: { userId: string };
  Reports: { screen: keyof ReportsStackParamList; params?: any };
  ReportsTab: { screen: keyof ReportsStackParamList };
  TeamPerformanceScreen: undefined;
  ChartScreen: undefined;
  ProductsScreen: undefined;
  Campaigns: undefined;
  CreateCampaign: undefined;
  ArtAiMobileScreen: undefined;
  CampaignDetail: { campaignId: number };
  EditCampaign: { campaignId: number };
};

export type RootStackNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList>,
  NativeStackNavigationProp<ReportsStackParamList>
>;

export type ReportsStackNavigationProp = NativeStackNavigationProp<ReportsStackParamList>; 