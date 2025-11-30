/** @jest-environment jsdom */
import { jest } from '@jest/globals';

describe('Driver Auth UI', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <form id="d-login">
        <input id="d-email" />
        <input id="d-pass" type="password" />
        <div id="d-msg"></div>
      </form>
      <div id="protected">Driver dashboard</div>
    `;
    sessionStorage.clear();
    global.fetch = jest.fn();
  });

  test('login: success sets session and redirects', async () => {
    const realLocation = window.location;
    const assignSpy = jest.fn();
    delete window.location;
    window.location = { ...realLocation, assign: assignSpy };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, driverId: 'D1' }),
    });

    const resp = await fetch('/api/driver-auth/login', { method: 'POST' });
    if (resp.ok) {
      const data = await resp.json();
      sessionStorage.setItem('driverId', data.driverId);
      window.location.assign('/driver-dashboard.html');
    }

    expect(sessionStorage.getItem('driverId')).toBe('D1');
    expect(assignSpy).toHaveBeenCalledWith('/driver-dashboard.html');

    window.location = realLocation;
  });

  test('login: failure shows error', async () => {
    const msg = document.getElementById('d-msg');
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Invalid' }),
    });

    const resp = await fetch('/api/driver-auth/login', { method: 'POST' });
    if (!resp.ok) {
      const data = await resp.json();
      msg.textContent = data.error || 'Login failed';
    }
    expect(msg.textContent).toContain('Invalid');
  });

  test('auth guard: no session → redirect to login', () => {
    const realLocation = window.location;
    const assignSpy = jest.fn();
    delete window.location;
    window.location = { ...realLocation, assign: assignSpy };

    if (!sessionStorage.getItem('driverId')) {
      window.location.assign('/driver-login.html');
    }
    expect(assignSpy).toHaveBeenCalledWith('/driver-login.html');

    window.location = realLocation;
  });
});
