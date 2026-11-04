import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('lets the later conflicting Tailwind class win', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('drops falsy conditional values', () => {
    const isActive = false;
    expect(cn('base', isActive && 'active', null, undefined, 0, '', 'end')).toBe('base end');
  });
});
