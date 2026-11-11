/**
 * Formatting utilities for SunuCare (Senegal & French locale)
 */

/**
 * Format an amount in FCFA (XOF)
 * Example: 15000 -> "15 000 FCFA"
 */
export function formatFCFA(amount: number): string {
  if (isNaN(amount)) return '0 FCFA';
  const formatted = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} FCFA`;
}

/**
 * Format a Senegalese phone number (+221 XX XXX XX XX)
 */
export function formatSenegalPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('221') && digits.length === 12) {
    const local = digits.slice(3);
    return `+221 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 7)} ${local.slice(7, 9)}`;
  }
  if (digits.length === 9) {
    return `+221 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
  }
  return phone;
}

/**
 * Format a date string in French locale
 * Example: "2026-11-15" -> "Dimanche 15 novembre 2026"
 */
export function formatDateFr(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Format a date string in short French locale
 * Example: "2026-11-15" -> "15 nov. 2026"
 */
export function formatDateShortFr(dateString: string): string {
  try {
    if (!dateString) return '';
    const parts = dateString.split('-').map(Number);
    if (parts.length === 3) {
      const date = new Date(parts[0], parts[1] - 1, parts[2]);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Capitalize first letter of a string
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

