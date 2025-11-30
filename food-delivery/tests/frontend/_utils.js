/** shared frontend test helpers */
import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

export function loadHtml(relPathFromPublic) {
  const abs = path.resolve(process.cwd(), 'public', relPathFromPublic);
  const html = fs.readFileSync(abs, 'utf8');
  document.documentElement.innerHTML = html;
  return abs;
}

export async function importPage(relJsPath) {
  const abs = path.resolve(process.cwd(), relJsPath);
  return await import(pathToFileURL(abs).href + `?t=${Date.now()}`);
}

export async function importPageOptional(relJsPath) {
  try {
    const abs = path.resolve(process.cwd(), relJsPath);
    return await import(pathToFileURL(abs).href + `?t=${Date.now()}`);
  } catch {
    return null; // swallow "Cannot find module"
  }
}

export function mockFetchSequence(...responses) {
  global.fetch = jest.fn();
  for (const r of responses) {
    if (r instanceof Error) {
      fetch.mockRejectedValueOnce(r);
    } else {
      const { ok = true, status = ok ? 200 : 500, json = {} } = r;
      fetch.mockResolvedValueOnce({ ok, status, json: async () => json });
    }
  }
  return fetch;
}

export function mockLocationAssign() {
  const real = window.location;
  const assign = jest.fn();
  // make window.location writable in jsdom
  delete window.location;
  window.location = { ...real, assign };
  return {
    assign,
    restore() { window.location = real; }
  };
}

export const tick = () => new Promise(r => setTimeout(r, 0));
export async function flushTimers(ms) {
  jest.advanceTimersByTime(ms);
  await tick();
}
export function loadHtmlOr(relPathFromPublic, fallbackHtml) {
  try { return loadHtml(relPathFromPublic); }
  catch { document.documentElement.innerHTML = fallbackHtml; return null; }
}