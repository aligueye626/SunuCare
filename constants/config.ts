/**
 * SunuCare App Configuration
 * Healthcare appointment booking application for Dakar, Senegal
 */

export const APP_CONFIG = {
  name: 'SunuCare',
  tagline: 'Votre santé, plus proche de vous.',
  description: 'Prenez rendez-vous rapidement avec les meilleurs médecins et spécialistes vérifiés à Dakar, Sénégal.',
  currency: {
    code: 'XOF',
    symbol: 'FCFA',
    locale: 'fr-SN',
  },
  location: {
    city: 'Dakar',
    country: 'Sénégal',
    phoneCode: '+221',
  },
  emergencyNumbers: [
    { label: 'SAMU Dakar', number: '1515', desc: 'Urgences médicales' },
    { label: 'Sapeurs-Pompiers', number: '18', desc: 'Secours & Incendie' },
    { label: 'SOS Médecins Dakar', number: '33 889 15 15', desc: 'Médecins à domicile' },
  ],
  roles: {
    patient: 'patient',
    doctor: 'doctor',
  } as const,
  doctorVerificationStatus: {
    pending: 'pending',
    verified: 'verified',
    rejected: 'rejected',
  } as const,
} as const;

export default APP_CONFIG;
