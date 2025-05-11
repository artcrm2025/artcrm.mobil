/**
 * Projeye özel özel tür tanımlamaları
 */

// @react-native-community/netinfo için geçici tip tanımları
declare module '@react-native-community/netinfo' {
  export interface NetInfoState {
    type: string;
    isConnected: boolean;
    isInternetReachable: boolean;
    details: {
      isConnectionExpensive?: boolean;
      ipAddress?: string;
      subnet?: string;
      cellularGeneration?: string;
      carrier?: string;
    };
  }

  export function fetch(): Promise<NetInfoState>;
  export function addEventListener(
    listener: (state: NetInfoState) => void
  ): () => void;
}

// MaterialCommunityIcons için özel tip tanımları
declare module '@expo/vector-icons' {
  export interface IconProps {
    size?: number;
    color?: string;
    style?: any;
  }

  export class MaterialCommunityIcons extends React.Component<IconProps & { name: string }> {}
  export class Ionicons extends React.Component<IconProps & { name: string }> {}
  export class FontAwesome extends React.Component<IconProps & { name: string }> {}
}

// expo-device için geçici tip tanımları
declare module 'expo-device' {
  export const isDevice: boolean;
  export const brand: string | null;
  export const modelName: string | null;
} 