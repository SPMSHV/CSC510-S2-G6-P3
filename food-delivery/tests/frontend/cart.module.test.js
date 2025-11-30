/** @jest-environment jsdom */
import path from 'path';
import { pathToFileURL } from 'url';

let addItem, removeItem, setQty, totalAmount, applyCoupon, findItem;

beforeAll(async () => {
  const abs = path.resolve(process.cwd(), 'public', 'js', 'cart.js');
  const mod = await import(pathToFileURL(abs).href + `?t=${Date.now()}`);

  // Normalize module shape: prefer named exports, else fall back to default
  const api = (mod && Object.keys(mod).length ? mod : mod?.default) || mod?.default || mod;

  addItem = api.addItem;
  removeItem = api.removeItem;
  setQty = api.setQty;
  totalAmount = api.totalAmount;
  applyCoupon = api.applyCoupon;
  findItem = api.findItem;

  // sanity assertions so failures are clear
  if (typeof addItem !== 'function') throw new Error('addItem not found');
  if (typeof removeItem !== 'function') throw new Error('removeItem not found');
  if (typeof setQty !== 'function') throw new Error('setQty not found');
  if (typeof totalAmount !== 'function') throw new Error('totalAmount not found');
  if (typeof applyCoupon !== 'function') throw new Error('applyCoupon not found');
  if (typeof findItem !== 'function') throw new Error('findItem not found');
});

describe('cart.js helpers', () => {
  test('addItem increases qty and adds new ids', () => {
    let items = [];
    items = addItem(items, { id: 'a', price: 10 });
    items = addItem(items, { id: 'a', price: 10 });
    items = addItem(items, { id: 'b', price: 5 });
    expect(items.find(x => x.id==='a').qty).toBe(2);
    expect(items.find(x => x.id==='b').qty).toBe(1);
  });

  test('removeItem decrements and removes when qty hits 0', () => {
    let items = [{ id:'a', price:10, qty:2 }];
    items = removeItem(items, 'a');
    expect(items.find(x => x.id==='a').qty).toBe(1);
    items = removeItem(items, 'a');
    expect(items.find(x => x.id==='a')).toBeUndefined();
  });

  test('setQty updates or removes when set to 0', () => {
    let items = [{ id:'a', price:10, qty:2 }, { id:'b', price:5, qty:1 }];
    items = setQty(items, 'a', 5);
    expect(items.find(x => x.id==='a').qty).toBe(5);
    items = setQty(items, 'b', 0);
    expect(items.find(x => x.id==='b')).toBeUndefined();
  });

  test('totalAmount sums price*qty', () => {
    const items = [{ id:'a', price:10, qty:2 }, { id:'b', price:5, qty:3 }];
    expect(totalAmount(items)).toBe(10*2 + 5*3);
  });

  test('applyCoupon SAVE10 gives 10% off', () => {
    expect(applyCoupon(100, 'SAVE10')).toBe(90);
  });

  test('applyCoupon FLAT5 subtracts 5 and never below zero', () => {
    expect(applyCoupon(12, 'FLAT5')).toBe(7);
    expect(applyCoupon(4, 'FLAT5')).toBe(0);
  });

  test('findItem returns item or null', () => {
    const items = [{ id:'x', price:1, qty:1 }];
    expect(findItem(items, 'x')).toEqual({ id:'x', price:1, qty:1 });
    expect(findItem(items, 'z')).toBeNull();
  });
});
