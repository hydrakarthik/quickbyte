import { describe, expect, it } from 'vitest';
import {
  cardBrand,
  displayNameFromEmail,
  hasErrors,
  luhnValid,
  passwordError,
  validateCard,
  validateSignUp,
} from './validation';

describe('sign-up validation', () => {
  it('enforces 8+ characters with a letter and a digit (Requirement 1.2)', () => {
    expect(passwordError('short1')).not.toBeNull();
    expect(passwordError('lettersonly')).not.toBeNull();
    expect(passwordError('12345678')).not.toBeNull();
    expect(passwordError('tasty2024')).toBeNull();
  });

  it('reports every invalid field at once', () => {
    const errors = validateSignUp({ name: '', email: 'nope', phone: '123', password: 'x' });
    expect(Object.keys(errors).sort()).toEqual(['email', 'name', 'password', 'phone']);
  });

  it('accepts a valid sign-up, including +91 phone formats', () => {
    const errors = validateSignUp({ name: 'Priya Sharma', email: 'priya@example.com', phone: '+91 98765-43210', password: 'tasty2024' });
    expect(hasErrors(errors)).toBe(false);
  });

  it('derives a display name from an email address', () => {
    expect(displayNameFromEmail('priya.sharma@example.com')).toBe('Priya Sharma');
  });
});

describe('card validation', () => {
  const now = new Date(2026, 0, 15);

  it('checks card numbers with the Luhn algorithm', () => {
    expect(luhnValid('4242424242424242')).toBe(true);
    expect(luhnValid('4242424242424241')).toBe(false);
  });

  it('detects common brands', () => {
    expect(cardBrand('4242424242424242')).toBe('Visa');
    expect(cardBrand('5555555555554444')).toBe('Mastercard');
    expect(cardBrand('378282246310005')).toBe('Amex');
  });

  it('rejects expired cards and accepts the current month', () => {
    const base = { number: '4242 4242 4242 4242', cvc: '123', name: 'Test User' };
    expect(validateCard({ ...base, expiry: '12/25' }, now).expiry).toBe('This card has expired');
    expect(validateCard({ ...base, expiry: '01/26' }, now)).toEqual({});
  });

  it('requires a 4-digit CVV for Amex', () => {
    expect(validateCard({ number: '378282246310005', expiry: '01/30', cvc: '123', name: 'Test User' }, now).cvc).toBeDefined();
  });
});