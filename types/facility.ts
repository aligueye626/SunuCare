export type FacilityType = 'clinique' | 'hopital' | 'centre_medical' | 'laboratoire';

export interface MedicalFacility {
  id: string;
  name: string;
  type: FacilityType;
  district: string; // Plateau, Almadies, Sacré-Cœur, Mermoz, Fann, Ouakam, Grand Yoff, Parcelles Assainies, Liberté 6, Médina, Yoff, Ngor
  city: string; // Dakar
  address: string;
  phone: string;
  email?: string;
  description?: string;
  rating: number;
  reviewCount: number;
  availableSpecialties: string[];
  availableServices?: string[];
  isOpen24h: boolean;
  emergencyAvailable: boolean;
  latitude?: number;
  longitude?: number;
}
