const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatPaise(paise: number): string {
  return rupees.format(paise / 100);
}

export function formatCount(count: number): string {
  return count >= 1000 ? `${(count / 1000).toFixed(1)}K+` : String(count);
}

export function deliveryLabel(feePaise: number): string {
  return feePaise === 0 ? 'Free delivery' : `${formatPaise(feePaise)} delivery`;
}
const timeFormat = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });
const dateTimeFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatTime(ms: number): string {
  return timeFormat.format(ms);
}

export function formatDateTime(ms: number): string {
  return dateTimeFormat.format(ms);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter((part) => part !== '');
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : [parts[0]];
  return letters
    .map((part) => part?.charAt(0) ?? '')
    .join('')
    .toUpperCase();
}