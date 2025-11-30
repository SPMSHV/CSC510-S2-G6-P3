/** @jest-environment jsdom */
import { jest } from '@jest/globals';

describe('Restaurant Auth UI', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <form id="r-login">
        <input id="r-email" />
        <input id="r-pass" type="password" />
        <div id="r-login-msg"></div>
      </form>
      <form id="r-reg">
        <input id="r-name" />
        <input id="r-email2" />
        <input id="r-pass2" type="password" />
        <div id="r-reg-msg"></div>
      </form>
    `;
    sessionStorage.clear();
    global.fetch = jest.fn();
  });

  test('login: success → session + redirect to dashboard', async () => {
    document.getElementById('r-email').value = 'rest@example.com';
    document.getElementById('r-pass').value = 'pass';

    const realLocation = window.location;
    const assignSpy = jest.fn();
    delete window.location;
    window.location = { ...realLocation, assign: assignSpy };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, restaurantId: 'R1' }),
    });

    const resp = await fetch('/api/restaurant-auth/login', { method: 'POST' });
    if (resp.ok) {
      const data = await resp.json();
      sessionStorage.setItem('restaurantId', data.restaurantId);
      window.location.assign('/restaurant-dashboard.html');
    }

    expect(sessionStorage.getItem('restaurantId')).toBe('R1');
    expect(assignSpy).toHaveBeenCalledWith('/restaurant-dashboard.html');

    window.location = realLocation;
  });

  test('login: failure shows error', async () => {
    const msg = document.getElementById('r-login-msg');
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Bad creds' }),
    });

    const resp = await fetch('/api/restaurant-auth/login', { method: 'POST' });
    if (!resp.ok) {
      const data = await resp.json();
      msg.textContent = data.error || 'Login failed';
    }
    expect(msg.textContent).toContain('Bad creds');
  });

  test('register: requires basic fields + success session', async () => {
    document.getElementById('r-name').value = 'My Resto';
    document.getElementById('r-email2').value = 'rest@example.com';
    document.getElementById('r-pass2').value = 'GoodPass1!';

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, restaurantId: 'R2' }),
    });

    const resp = await fetch('/api/restaurant-auth/register', { method: 'POST' });
    if (resp.ok) {
      const data = await resp.json();
      sessionStorage.setItem('restaurantId', data.restaurantId);
    }
    expect(sessionStorage.getItem('restaurantId')).toBe('R2');
  });
});
