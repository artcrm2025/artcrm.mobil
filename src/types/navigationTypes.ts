import { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
  Proposals: { filter?: string };
  ProposalDetail: { id: number };
  CreateProposal: undefined;
  EditProposal: { proposalId: number };
  Clinics: undefined;
  ClinicDetail: { clinicId: number };
  CreateClinic: undefined;
  EditClinic: { clinicId: number };
  Users: undefined;
  UserDetail: { userId: string };
  CreateUser: undefined;
  EditUser: { userId: string };
  Settings: undefined;
  HelpSupport: undefined;
  Profile: undefined;
  Notifications: undefined;
  Activities: undefined;
  VisitReports: { screen?: string };
  VisitReportDetail: { reportId: number };
  CreateVisitReport: undefined;
  EditVisitReport: { reportId: number };
  SurgeryReports: { screen?: string };
  SurgeryReportDetail: { reportId: number };
  CreateSurgeryReport: undefined;
  EditSurgeryReport: { reportId: number };
  ReportsTab: { screen: string };
  ArtAiScreen: undefined;
  ArtAiMobileScreen: undefined;
};

import { RouteProp } from '@react-navigation/native';

export type RootStackRouteProp<T extends keyof RootStackParamList> = RouteProp<
  RootStackParamList,
  T
>;

export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;