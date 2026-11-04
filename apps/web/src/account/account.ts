import { isRecord } from '@/lib/storage';

export const SERVICE_AREAS = ['Koramangala', 'Indiranagar', 'HSR Layout', 'BTM Layout'] as const;
export type ServiceArea = (typeof SERVICE_AREAS)[number];

export const ADDRESS_LABELS = ['Home', 'Work', 'Other'] as const;
export type AddressLabel = (typeof ADDRESS_LABELS)[number];

/** Requirement 3.4: up to 10 saved delivery addresses. */
export const MAX_ADDRESSES = 10;

/** Prototype account. Never contains a password. */
export interface DemoUser {
  name: string;
  email: string;
  phone: string;
}

export interface Address {
  id: string;
  label: AddressLabel;
  line1: string;
  area: ServiceArea;
  city: 'Bengaluru';
}

export interface AccountState {
  user: DemoUser | null;
  addresses: Address[];
  selectedAddressId: string | null;
}

export type AccountAction =
  | { type: 'signIn'; user: DemoUser }
  | { type: 'signOut' }
  | { type: 'addAddress'; address: Address }
  | { type: 'selectAddress'; addressId: string };

export const signedOut: AccountState = { user: null, addresses: [], selectedAddressId: null };

const SAMPLE_ADDRESSES: Address[] = [
  { id: 'addr-home', label: 'Home', line1: 'Flat 402, Palm Grove Apartments, 5th Cross', area: 'Koramangala', city: 'Bengaluru' },
  { id: 'addr-work', label: 'Work', line1: '3rd Floor, Tech Park Tower B, 100 Feet Road', area: 'Indiranagar', city: 'Bengaluru' },
];

export function accountReducer(state: AccountState, action: AccountAction): AccountState {
  switch (action.type) {
    case 'signIn': {
      const addresses = state.addresses.length > 0 ? state.addresses : SAMPLE_ADDRESSES;
      return { user: action.user, addresses, selectedAddressId: state.selectedAddressId ?? addresses[0]?.id ?? null };
    }
    case 'signOut':
      return signedOut;
    case 'addAddress':
      if (state.addresses.length >= MAX_ADDRESSES) return state;
      return { ...state, addresses: [...state.addresses, action.address], selectedAddressId: action.address.id };
    case 'selectAddress':
      return state.addresses.some((address) => address.id === action.addressId)
        ? { ...state, selectedAddressId: action.addressId }
        : state;
  }
}

export function isServiceArea(value: unknown): value is ServiceArea {
  return typeof value === 'string' && (SERVICE_AREAS as readonly string[]).includes(value);
}

function isAddressLabel(value: unknown): value is AddressLabel {
  return typeof value === 'string' && (ADDRESS_LABELS as readonly string[]).includes(value);
}

function isUser(value: unknown): value is DemoUser {
  return isRecord(value) && typeof value.name === 'string' && typeof value.email === 'string' && typeof value.phone === 'string';
}

export function isAddress(value: unknown): value is Address {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    isAddressLabel(value.label) &&
    typeof value.line1 === 'string' &&
    isServiceArea(value.area) &&
    value.city === 'Bengaluru'
  );
}

export function reviveAccount(raw: unknown): AccountState | null {
  if (!isRecord(raw) || !isUser(raw.user)) return null;
  const addresses = Array.isArray(raw.addresses) ? raw.addresses.filter(isAddress).slice(0, MAX_ADDRESSES) : [];
  const stored = raw.selectedAddressId;
  const selectedAddressId =
    typeof stored === 'string' && addresses.some((address) => address.id === stored) ? stored : (addresses[0]?.id ?? null);
  return { user: raw.user, addresses, selectedAddressId };
}