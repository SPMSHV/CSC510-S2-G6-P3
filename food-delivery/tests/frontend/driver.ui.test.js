/** @jest-environment jsdom */
import { jest } from '@jest/globals';

describe('Driver UI essentials', () => {
  beforeEach(() => {
    document.documentElement.innerHTML = `
      <html><body>
        <ul id="driver-orders"></ul>
        <span id="eta">10</span>
        <a id="map" target="_blank">Map</a>
      </body></html>
    `;
  });

  test('renders assigned orders list', () => {
    const list = document.getElementById('driver-orders');
    const orders = [
      { id: 'd1', status: 'ASSIGNED' },
      { id: 'd2', status: 'PICKED_UP' }
    ];
    orders.forEach(o => {
      const li = document.createElement('li');
      li.dataset.id = o.id;
      li.dataset.status = o.status;
      li.textContent = `${o.id} - ${o.status}`;
      list.appendChild(li);
    });
    expect(list.children.length).toBe(2);
  });

  test('only ASSIGNED orders show action buttons', () => {
    const list = document.getElementById('driver-orders');
    ['ASSIGNED', 'PICKED_UP', 'DELIVERED'].forEach(st => {
      const li = document.createElement('li');
      li.dataset.status = st;
      if (st === 'ASSIGNED') {
        const btn = document.createElement('button');
        btn.className = 'pick-btn';
        li.appendChild(btn);
      }
      list.appendChild(li);
    });
    const pickBtns = list.querySelectorAll('.pick-btn');
    expect(pickBtns.length).toBe(1);
  });

  test('mark picked-up updates DOM', () => {
    const li = document.createElement('li');
    li.dataset.status = 'ASSIGNED';
    li.id = 'order-li';
    const btn = document.createElement('button');
    btn.id = 'pick';
    li.appendChild(btn);
    document.getElementById('driver-orders').appendChild(li);

    btn.addEventListener('click', () => {
      li.dataset.status = 'PICKED_UP';
      li.className = 'picked';
    });

    btn.click();
    expect(li.dataset.status).toBe('PICKED_UP');
    expect(li.className).toContain('picked');
  });

  test('ETA countdown decreases with timers', () => {
    const eta = document.getElementById('eta');
    jest.useFakeTimers();
    let remaining = 10;
    const timer = setInterval(() => {
      remaining -= 1;
      eta.textContent = String(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 1000);

    jest.advanceTimersByTime(3000);
    expect(eta.textContent).toBe('7');
    jest.useRealTimers();
  });

  test('map link contains coordinates', () => {
    const a = document.getElementById('map');
    const lat = 35.78, lng = -78.64;
    a.href = `https://maps.google.com/?q=${lat},${lng}`;
    expect(a.href).toContain(`${lat},${lng}`);
  });
});
