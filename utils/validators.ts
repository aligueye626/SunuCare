/**
 * Validation utilities for SunuCare
 * Location: Dakar, Senegal
 */

/**
 * Validates Senegalese mobile and landline numbers:
 * Prefixes: 70, 75, 76, 77, 78 (mobile), 33 (fixe)
 */
export function isValidSenegalPhone(phone: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');

  // Format with country code: 221XXXXXXXXX (11 or 12 digits)
  if (digits.startsWith('221') && digits.length === 12) {
    const local = digits.slice(3);
    return /^(70|75|76|77|78|33)\d{7}$/.test(local);
  }

  // Local 9-digit format: XXXXXXXXX
  if (digits.length === 9) {
    return /^(70|75|76|77|78|33)\d{7}$/.test(digits);
  }

  return false;
}

/**
 * Format raw input to standard Senegal display format: +221 XX XXX XX XX
 */
export function formatToSenegalPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  let local = digits;
  if (digits.startsWith('221')) {
    local = digits.slice(3);
  }
  if (local.length > 9) {
    local = local.slice(0, 9);
  }
  if (local.length === 0) return '';
  if (local.length <= 2) return `+221 ${local}`;
  if (local.length <= 5) return `+221 ${local.slice(0, 2)} ${local.slice(2)}`;
  if (local.length <= 7)
    return `+221 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
  return `+221 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 7)} ${local.slice(7, 9)}`;
}

/**
 * Validates email structure
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim().toLowerCase());
}

/**
 * Converts Supabase Auth error codes and messages into clear French user messages
 */
export function getSupabaseAuthErrorMessage(error: any): string {
  if (!error) return 'Une erreur inconnue est survenue.';

  const message = (error.message || '').toLowerCase();
  const code = (error.code || '').toLowerCase();

  if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
    return 'Email ou mot de passe incorrect. Veuillez vérifier vos identifiants.';
  }

  if (message.includes('user already registered') || message.includes('already exists')) {
    return 'Un compte existe déjà avec cette adresse email.';
  }

  if (message.includes('password should be at least 6 characters') || code === 'weak_password') {
    return 'Le mot de passe doit comporter au moins 6 caractères.';
  }

  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Trop de tentatives infructueuses. Veuillez patienter quelques instants avant de réessayer.';
  }

  if (message.includes('network') || message.includes('failed to fetch')) {
    return 'Impossible de contacter le serveur. Veuillez vérifier votre connexion Internet.';
  }

  if (message.includes('email not confirmed')) {
    return 'Veuillez confirmer votre adresse email via le lien reçu dans votre boîte de réception.';
  }

  return error.message || 'Une erreur est survenue lors de l’authentification.';
}

