// Minimal script so page tests can import/execute something real.

async function fetchRestaurants() {
  const resp = await fetch('/api/restaurants');
  if (!resp.ok) throw new Error('Failed to load restaurants');
  const data = await resp.json();
  return data.restaurants || [];
}

export async function renderRestaurants(payload) {
  const container =
    document.querySelector('#restaurants, [data-testid="restaurants"]')
    || document.body.appendChild(Object.assign(document.createElement('div'), { id:'restaurants' }));

  container.innerHTML = '';

  const list = (payload && payload.restaurants) || [];
  if (!list.length) {
    const empty = document.createElement('div');
    empty.setAttribute('data-testid', 'empty-restaurants');
    empty.textContent = 'No restaurants available';
    container.appendChild(empty);
    return;
  }

  for (const r of list) {
    const card = document.createElement('div');
    card.setAttribute('data-testid', 'restaurant-card');
    card.textContent = `${r.name} • ${r.cuisine || ''}`.trim();
    container.appendChild(card);
  }
}

export async function initCustomerPage() {
  try {
    const restaurants = await fetchRestaurants();
    await renderRestaurants({ restaurants });
  } catch {
    await renderRestaurants({ restaurants: [] });
  }
}

// attach for non-module usage too
if (typeof window !== 'undefined') {
  window.initCustomerPage = window.initCustomerPage || initCustomerPage;
  window.renderRestaurants = window.renderRestaurants || renderRestaurants;
}
