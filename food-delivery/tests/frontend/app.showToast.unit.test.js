/** @jest-environment jsdom */
import { jest } from '@jest/globals';
import path from 'path';
import { pathToFileURL } from 'url';

describe('showToast (global attachment via app.js)', () => {
  beforeAll(async () => {
    // fresh DOM
    document.documentElement.innerHTML = '<html><head></head><body></body></html>';

    // Import the actual file as ESM so V8/Jest can attribute coverage to it.
    // Cache-bust to ensure Jest doesn’t reuse a stale module.
    const abs = path.resolve(process.cwd(), 'public', 'js', 'app.js');
    const url = pathToFileURL(abs).href + `?t=${Date.now()}`;
    await import(url);
  });

  test('creates #toast container and message', () => {
    expect(document.getElementById('toast')).toBeNull();
    expect(typeof window.showToast).toBe('function');
    window.showToast('Saved');
    expect(document.getElementById('toast')).not.toBeNull();
    const last = document.getElementById('toast').lastElementChild;
    expect(last).not.toBeNull();
    expect(last.textContent).toContain('Saved');
  });

  test('error variant uses danger class', () => {
    window.showToast('Boom', true);
    const last = document.getElementById('toast').lastElementChild;
    expect(last.className).toMatch(/alert-danger/);
  });

  test('auto-dismiss after timeout', () => {
    jest.useFakeTimers();
    window.showToast('Temp');
    const before = document.getElementById('toast').childElementCount;
    jest.advanceTimersByTime(2100);
    const after = document.getElementById('toast').childElementCount;
    expect(after).toBeLessThan(before);
    jest.useRealTimers();
  });
});
