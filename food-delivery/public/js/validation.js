// public/js/validation.js

// ≥8 chars, at least 1 letter, 1 number, 1 special
export function validatePassword(pw) {
  if (typeof pw !== 'string' || pw.length < 8) return false;
  if (!/[A-Za-z]/.test(pw)) return false;
  if (!/[0-9]/.test(pw)) return false;
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw)) return false;
  return true;
}

export function validateEmail(email) {
  if (typeof email !== 'string') return false;
  // simple, robust-enough pattern; we don’t overfit
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

export function sanitizeText(s) {
  if (typeof s !== 'string') return '';
  // strip tags and trim
  return s.replace(/<[^>]*>/g, '').trim();
}

export function isNonEmpty(s) {
  return typeof s === 'string' && s.trim().length > 0;
}
