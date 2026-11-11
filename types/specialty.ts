import { MaterialCommunityIcons } from '@expo/vector-icons';

export interface MedicalSpecialtyItem {
  id: string;
  name: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  doctorCount: number;
  description: string;
  color?: string;
}

