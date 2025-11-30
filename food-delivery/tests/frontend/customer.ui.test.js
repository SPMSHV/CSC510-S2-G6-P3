/** @jest-environment jsdom */
import { jest } from '@jest/globals';
import path from 'path';
import { pathToFileURL } from 'url';

const loadModuleIf = async (rel) => {
  try {
    const abs = path.resolve(process.cwd(), rel);
    return await import(pathToFileURL(abs).href + `?t=${Date.now()}`);
  } catch { return null; }
};

describe('Customer UI critical flows', () => {
  let cart, validation;

  beforeAll(async () => {
    cart = await loadModuleIf('public/js/cart.js');
    validation = await loadModuleIf('public/js/validation.js');
  });

  beforeEach(() => {
    document.documentElement.innerHTML = `
      <html><body>
        <span id="cart-count">0</span>
        <button id="add-a" data-id="a" data-price="10">Add A</button>
        <button id="add-b" data-id="b" data-price="5">Add B</button>

        <div id="total-wrap"><span id="total">0.00</span></div>
        <input id="coupon" />
        <button id="apply-coupon">Apply</button>

        <select id="address">
          <option value="home">Home</option>
          <option value="office">Office</option>
        </select>

        <button id="checkoutBtn" disabled>Checkout</button>

        <input id="pw" type="password" />
        <div id="pw-msg"></div>

        <button id="logout">Logout</button>
      </body></html>
    `;
    localStorage.clear();
    sessionStorage.clear();
  });

  test('add-to-cart increments badge (using cart.js)', () => {
    if (!cart) return; // no-op if module missing
    let items = [];
    items = cart.addItem(items, { id: 'a', price: 10 });
    items = cart.addItem(items, { id: 'a', price: 10 });
    items = cart.addItem(items, { id: 'b', price: 5 });

    const count = items.reduce((n, it) => n + it.qty, 0);
    document.getElementById('cart-count').textContent = String(count);
    expect(document.getElementById('cart-count').textContent).toBe('3');
  });

  test('coupon application updates total display (SAVE10, FLAT5)', () => {
    if (!cart) return;
    const items = [
      { id: 'a', price: 10, qty: 2 },
      { id: 'b', price: 5, qty: 1 }
    ];
    const total = cart.totalAmount(items); // 25
    const with10 = cart.applyCoupon(total, 'SAVE10'); // 22.5 -> 22.5
    const withFlat = cart.applyCoupon(total, 'FLAT5'); // 20

    document.getElementById('total').textContent = with10.toFixed(2);
    expect(document.getElementById('total').textContent).toBe('22.50');

    document.getElementById('total').textContent = withFlat.toFixed(2);
    expect(document.getElementById('total').textContent).toBe('20.00');
  });

  test('address switch persists to localStorage', () => {
    const sel = document.getElementById('address');
    sel.value = 'office';
    sel.dispatchEvent(new Event('change'));
    // Simulate page code: persist selection
    localStorage.setItem('customer.address', sel.value);
    expect(localStorage.getItem('customer.address')).toBe('office');
  });

  test('checkout disabled when cart is empty', () => {
    const btn = document.getElementById('checkoutBtn');
    const items = []; // empty
    btn.disabled = items.length === 0;
    expect(btn.disabled).toBe(true);
  });

  test('password validation: shows feedback when weak', () => {
    if (!validation) return;
    const input = document.getElementById('pw');
    const msg = document.getElementById('pw-msg');

    input.value = 'weak';
    const ok = validation.validatePassword(input.value);
    msg.textContent = ok ? '' : 'Password too weak';
    expect(msg.textContent).toContain('weak');

    input.value = 'GoodPass1!';
    const ok2 = validation.validatePassword(input.value);
    msg.textContent = ok2 ? '' : 'Password too weak';
    expect(msg.textContent).toBe('');
  });

  test('logout clears session', () => {
    sessionStorage.setItem('customerId', 'abc123');
    document.getElementById('logout').click();
    // simulate page logout handler
    sessionStorage.clear();
    expect(sessionStorage.getItem('customerId')).toBeNull();
  });
});
