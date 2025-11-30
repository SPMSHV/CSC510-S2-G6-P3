// public/js/cart.js

export function addItem(items, item) {
  const next = items.map(x => ({ ...x }));
  const found = next.find(x => x.id === item.id);
  if (found) found.qty += 1;
  else next.push({ ...item, qty: 1 });
  return next;
}

export function removeItem(items, id) {
  const next = items.map(x => ({ ...x }));
  const idx = next.findIndex(x => x.id === id);
  if (idx >= 0) {
    next[idx].qty -= 1;
    if (next[idx].qty <= 0) next.splice(idx, 1);
  }
  return next;
}

export function setQty(items, id, qty) {
  const next = items.map(x => ({ ...x }));
  const it = next.find(x => x.id === id);
  if (!it) return next;
  if (qty <= 0) return next.filter(x => x.id !== id);
  it.qty = qty;
  return next;
}

export function totalAmount(items) {
  return items.reduce((sum, x) => sum + x.price * x.qty, 0);
}

// simple coupon engine: SAVE10 => 10% off, FLAT5 => -5
export function applyCoupon(total, code) {
  if (!code) return Math.max(0, total);
  const c = String(code).trim().toUpperCase();
  let discounted = total;
  if (c === 'SAVE10') discounted = total * 0.9;
  if (c === 'FLAT5') discounted = total - 5;
  // never below zero
  return Math.max(0, Number(discounted.toFixed(2)));
}

export function findItem(items, id) {
  return items.find(x => x.id === id) || null;
}
