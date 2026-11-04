export type FieldErrors<K extends string> = Partial<Record<K, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;

export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

/** Strips spaces, dashes and a +91 / 0 prefix. */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s-]/g, '').replace(/^(\+91|0)/, '');
}

/** Requirement 1.2: at least 8 characters with at least one letter and one digit. */
export function passwordError(password: string): string | null {
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Use at least 8 characters with a letter and a number';
  }
  return null;
}

export interface SignUpInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export function validateSignUp(input: SignUpInput): FieldErrors<keyof SignUpInput> {
  const errors: FieldErrors<keyof SignUpInput> = {};
  if (input.name.trim().length < 2) errors.name = 'Enter your full name';
  if (!isValidEmail(input.email)) errors.email = 'Enter a valid email address';
  if (!INDIAN_MOBILE_PATTERN.test(normalizePhone(input.phone))) errors.phone = 'Enter a valid 10-digit mobile number';
  const password = passwordError(input.password);
  if (password) errors.password = password;
  return errors;
}

export function validateSignIn(input: { email: string; password: string }): FieldErrors<'email' | 'password'> {
  const errors: FieldErrors<'email' | 'password'> = {};
  if (!isValidEmail(input.email)) errors.email = 'Enter a valid email address';
  if (input.password === '') errors.password = 'Enter your password';
  return errors;
}

/** "priya.sharma@example.com" becomes "Priya Sharma". */
export function displayNameFromEmail(email: string): string {
  const local = email.trim().split('@')[0] ?? '';
  const words = local
    .split(/[._-]+/)
    .filter((word) => /[a-z]/i.test(word))
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  return words.length > 0 ? words.join(' ') : 'QuickByte Foodie';
}

export function validateAddress(input: { line1: string }): FieldErrors<'line1'> {
  return input.line1.trim().length < 8 ? { line1: 'Add your flat or house number, building and street' } : {};
}

export interface CardInput {
  number: string;
  expiry: string;
  cvc: string;
  name: string;
}

export type CardBrand = 'Visa' | 'Mastercard' | 'RuPay' | 'Amex' | 'Card';

export function cardBrand(digits: string): CardBrand {
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
  if (/^(60|65|81|82|508)/.test(digits)) return 'RuPay';
  if (/^3[47]/.test(digits)) return 'Amex';
  return 'Card';
}

export function luhnValid(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits.charAt(i));
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

/** Client-side checks only. Real card data goes straight to the payment processor in a later phase. */
export function validateCard(input: CardInput, now: Date): FieldErrors<keyof CardInput> {
  const errors: FieldErrors<keyof CardInput> = {};
  const digits = input.number.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19 || !luhnValid(digits)) errors.number = 'Enter a valid card number';

  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(input.expiry.trim());
  if (!match) {
    errors.expiry = 'Use MM/YY';
  } else {
    const month = Number(match[1]);
    const year = 2000 + Number(match[2]);
    const firstDayAfterExpiry = new Date(year, month, 1);
    if (firstDayAfterExpiry <= now) errors.expiry = 'This card has expired';
  }

  const cvcLength = cardBrand(digits) === 'Amex' ? 4 : 3;
  if (!new RegExp(`^\\d{${String(cvcLength)}}$`).test(input.cvc)) errors.cvc = `Enter the ${String(cvcLength)}-digit CVV`;
  if (input.name.trim().length < 2) errors.name = 'Enter the name on the card';
  return errors;
}