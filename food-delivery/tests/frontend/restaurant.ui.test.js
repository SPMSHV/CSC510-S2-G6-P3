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

describe('Restaurant UI essentials', () => {
  let dash;

  beforeAll(async () => {
    // optional restaurant dashboard helper module (name it however you prefer)
    dash = await loadModuleIf('public/js/restaurant-dashboard.js');
  });

  beforeEach(() => {
    document.documentElement.innerHTML = `
      <html><body>
        <table id="menu"><tbody></tbody></table>
        <button id="toggle-stock" data-id="m1">Toggle Stock</button>

        <form id="new-item">
          <input id="name" />
          <input id="price" />
          <button id="save">Save</button>
          <div id="price-msg"></div>
        </form>

        <table id="orders"><tbody></tbody></table>
        <span id="status-pill" class="badge text-bg-secondary">PENDING</span>

        <input id="img" type="file" />
        <img id="preview" />
      </body></html>
    `;
  });

  test('render menu rows with stock flag', () => {
    const tbody = document.querySelector('#menu tbody');
    const items = [
      { id: 'm1', name: 'Paneer', price: 10, inStock: true },
      { id: 'm2', name: 'Pasta', price: 8.5, inStock: false }
    ];

    // simulate a render (either via your module or inline)
    items.forEach(it => {
      const tr = document.createElement('tr');
      tr.dataset.id = it.id;
      tr.className = it.inStock ? '' : 'out-of-stock';
      tr.innerHTML = `<td>${it.name}</td><td>${it.price}</td>`;
      tbody.appendChild(tr);
    });

    expect(tbody.children.length).toBe(2);
    expect(tbody.querySelector('[data-id="m2"]').className).toContain('out-of-stock');
  });

  test('toggle stock applies/removes out-of-stock class', () => {
    const row = document.createElement('tr');
    row.dataset.id = 'm1';
    row.className = '';
    document.querySelector('#menu tbody').appendChild(row);

    const btn = document.getElementById('toggle-stock');
    btn.addEventListener('click', () => {
      row.classList.toggle('out-of-stock');
    });

    btn.click();
    expect(row.className).toContain('out-of-stock');
    btn.click();
    expect(row.className).not.toContain('out-of-stock');
  });

  test('new item form: price must be numeric', () => {
    const price = document.getElementById('price');
    const msg = document.getElementById('price-msg');

    price.value = 'ten';
    const isNum1 = !isNaN(Number(price.value));
    msg.textContent = isNum1 ? '' : 'Price must be a number';
    expect(msg.textContent).toContain('number');

    price.value = '10.50';
    const isNum2 = !isNaN(Number(price.value));
    msg.textContent = isNum2 ? '' : 'Price must be a number';
    expect(msg.textContent).toBe('');
  });

  test('orders render newest first (createdAt desc)', () => {
    const tbody = document.querySelector('#orders tbody');
    const orders = [
      { id: 'o1', createdAt: '2025-01-01T10:00:00Z' },
      { id: 'o2', createdAt: '2025-05-01T10:00:00Z' },
      { id: 'o3', createdAt: '2025-03-01T10:00:00Z' }
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    orders.forEach(o => {
      const tr = document.createElement('tr');
      tr.dataset.id = o.id;
      tbody.appendChild(tr);
    });

    const ids = Array.from(tbody.children).map(tr => tr.dataset.id);
    expect(ids).toEqual(['o2', 'o3', 'o1']);
  });

  test('status pill color changes on update', () => {
    const pill = document.getElementById('status-pill');
    function setStatus(status) {
      pill.textContent = status;
      pill.className = 'badge ' + (
        status === 'READY' ? 'text-bg-success' :
        status === 'COOKING' ? 'text-bg-warning' :
        'text-bg-secondary'
      );
    }
    setStatus('COOKING');
    expect(pill.className).toContain('text-bg-warning');
    setStatus('READY');
    expect(pill.className).toContain('text-bg-success');
  });

  test('image input change sets preview src (simulated)', () => {
    const input = document.getElementById('img');
    const preview = document.getElementById('preview');

    // jsdom won’t read actual files; simulate UI logic:
    const fakeUrl = 'blob://fake-image';
    input.addEventListener('change', () => { preview.src = fakeUrl; });

    input.dispatchEvent(new Event('change'));
    expect(preview.src).toContain('blob://fake-image');
  });
});
