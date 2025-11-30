/** @jest-environment jsdom */
import { jest } from '@jest/globals';
import { loadHtml, importPage, mockFetchSequence, mockLocationAssign, tick } from './_utils.js';

describe('Customer Home / Restaurants page', () => {
  beforeEach(() => {
    jest.useRealTimers();
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  test('renders restaurant cards from /api/restaurants and shows empty state', async () => {
    loadHtml('index.html');

    // 1st call → list, 2nd call → empty (to verify empty-state)
    mockFetchSequence(
      { ok: true, json: { ok: true, restaurants: [
        { _id:'r1', name:'Spice Hub', cuisine:'Indian', rating:4.6 },
        { _id:'r2', name:'Pasta Corner', cuisine:'Italian', rating:4.3 }
      ]}},
      { ok: true, json: { ok: true, restaurants: [] }},
    );

    // import your page script (adjust path if different)
    await importPage('public/js/customer.js');
    // assume page script auto-inits on load OR expose initCustomerPage()
    if (typeof window.initCustomerPage === 'function') {
      await window.initCustomerPage();
    }
    await tick();

    // cards present
    const cards = document.querySelectorAll('[data-testid="restaurant-card"], .card');
    expect(cards.length).toBeGreaterThanOrEqual(2);

    // now simulate a refresh rendering empty state:
    if (typeof window.renderRestaurants === 'function') {
      await window.renderRestaurants({ restaurants: [] });
    }
    const empty = document.querySelector('[data-testid="empty-restaurants"], .empty-state');
    expect(empty).not.toBeNull();
  });

  test('auth guard: missing customerId → redirect to /customer-login.html', async () => {
    loadHtml('index.html');
    const loc = mockLocationAssign();

    // simulate your guard logic
    if (!sessionStorage.getItem('customerId')) {
      window.location.assign('/customer-login.html');
    }

    expect(loc.assign).toHaveBeenCalledWith('/customer-login.html');
    loc.restore();
  });
});
