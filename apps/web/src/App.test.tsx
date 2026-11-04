import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the homepage with the hero heading, sections and restaurants', () => {
    const html = renderToString(<App />);

    expect(html).toMatch(/<main\b[^>]*>[\s\S]*<h1\b[^>]*>[\s\S]*Hungry\?[\s\S]*<\/h1>[\s\S]*<\/main>/);
    expect(html).toContain('QuickByte');
    expect(html).toContain('Offers for you');
    expect(html).toContain('Slice of Napoli');
  });
});