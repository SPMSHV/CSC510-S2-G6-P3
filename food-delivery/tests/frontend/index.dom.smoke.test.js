/** @jest-environment jsdom */
import fs from 'fs';
import path from 'path';

function loadPage(file) {
  const full = path.resolve(process.cwd(), 'public', file);
  const html = fs.readFileSync(full, 'utf8');
  document.documentElement.innerHTML = '<html><head></head><body></body></html>';
  document.body.innerHTML = html;
}

describe('index.html (DOM smoke)', () => {
  beforeAll(() => loadPage('index.html'));

  test('navbar brand exists', () => {
    const brand = document.querySelector('.navbar-brand, a.navbar-brand');
    expect(brand).not.toBeNull();
  });

  test('page has a visible main area (cards OR grid OR key nav CTAs)', () => {
    // Any card-like element
    const cards = document.querySelectorAll(
      '.card, .restaurant-card, [data-testid="restaurant-card"]'
    );

    // Any grid/container that typically wraps restaurants or content
    const gridContainer = document.querySelector(
      '#restaurants, .restaurants, .restaurant-list, [data-testid="restaurant-grid"], main, .container'
    );

    // Any obvious CTA/link that proves the main nav exists
    const cta = document.querySelector(
      'a[href*="orders"], a[href*="cart"], a[href*="login"], a[href*="menu"], a[href*="restaurants"]'
    );

    // Pass if at least one of these is present
    const ok = cards.length > 0 || !!gridContainer || !!cta;
    expect(ok).toBe(true);
  });
});
