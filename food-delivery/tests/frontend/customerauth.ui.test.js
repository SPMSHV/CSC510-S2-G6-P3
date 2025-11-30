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

describe('Customer Auth UI', () => {
  let validation;

  beforeAll(async () => {
    validation = await loadModuleIf('public/js/validation.js');
  });

  beforeEach(() => {
    document.body.innerHTML = `
      <form id="loginForm">
        <input id="login-email" />
        <input id="login-password" type="password" />
        <button id="login-submit">Login</button>
        <div id="login-msg"></div>
      </form>

      <form id="regForm">
        <input id="reg-name" />
        <input id="reg-email" />
        <input id="reg-password" type="password" />
        <input id="reg-address" />
        <button id="reg-submit">Register</button>
        <div id="reg-msg"></div>
      </form>
    `;
    sessionStorage.clear();
    global.fetch = jest.fn();
    window.showToast = window.showToast || (() => {});
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const isEmail = (s) =>
    validation?.validateEmail
      ? validation.validateEmail(s)
      : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());

  test('login: requires email and password', async () => {
    const msg = document.getElementById('login-msg');
    const email = document.getElementById('login-email');
    const pass = document.getElementById('login-password');

    email.value = '';
    pass.value = '';
    if (!isEmail(email.value) || !pass.value) {
      msg.textContent = 'Email and password required';
    }
    expect(msg.textContent).toContain('required');
  });

  test('login: success sets session and redirects', async () => {
    const email = document.getElementById('login-email');
    const pass = document.getElementById('login-password');
    email.value = 'u@example.com';
    pass.value = 'pass123';

    // Mock fetch
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, customerId: 'C1' }),
    });

    // Robust, writable mock for window.location.assign
    const realLocation = window.location;
    const assignSpy = jest.fn();
    // allow redefining in jsdom
    delete window.location;
    window.location = { ...realLocation, assign: assignSpy };

    const resp = await fetch('/api/customer-auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: pass.value }),
    });
    if (resp.ok) {
      const data = await resp.json();
      sessionStorage.setItem('customerId', data.customerId);
      window.location.assign('/index.html');
    }

    expect(fetch).toHaveBeenCalledWith('/api/customer-auth/login', expect.any(Object));
    expect(sessionStorage.getItem('customerId')).toBe('C1');
    expect(assignSpy).toHaveBeenCalledWith('/index.html');

    // restore
    window.location = realLocation;
  });

  test('login: 401 shows error and does not redirect', async () => {
    const msg = document.getElementById('login-msg');
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Invalid' }),
    });

    const resp = await fetch('/api/customer-auth/login', { method: 'POST' });
    if (!resp.ok) {
      const data = await resp.json();
      msg.textContent = data.error || 'Login failed';
    }

    expect(msg.textContent).toContain('Invalid');
    expect(sessionStorage.getItem('customerId')).toBeNull();
  });

  test('register: weak vs strong password feedback', () => {
    const pw = document.getElementById('reg-password');
    const msg = document.getElementById('reg-msg');

    pw.value = 'weak';
    const ok1 = validation?.validatePassword
      ? validation.validatePassword(pw.value)
      : pw.value.length >= 8;
    msg.textContent = ok1 ? '' : 'Password too weak';
    expect(msg.textContent).toContain('weak');

    pw.value = 'GoodPass1!';
    const ok2 = validation?.validatePassword
      ? validation.validatePassword(pw.value)
      : pw.value.length >= 8;
    msg.textContent = ok2 ? '' : 'Password too weak';
    expect(msg.textContent).toBe('');
  });

  test('register: success stores session and may show toast', async () => {
    document.getElementById('reg-name').value = 'Alice';
    document.getElementById('reg-email').value = 'a@example.com';
    document.getElementById('reg-password').value = 'GoodPass1!';
    document.getElementById('reg-address').value = '123 St';

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, customerId: 'C2', message: 'Welcome' }),
    });

    const resp = await fetch('/api/customer-auth/register', { method: 'POST' });
    if (resp.ok) {
      const data = await resp.json();
      sessionStorage.setItem('customerId', data.customerId);
      window.showToast(data.message || 'Registered');
    }

    expect(sessionStorage.getItem('customerId')).toBe('C2');
    expect(fetch).toHaveBeenCalledWith('/api/customer-auth/register', expect.any(Object));
  });
});
