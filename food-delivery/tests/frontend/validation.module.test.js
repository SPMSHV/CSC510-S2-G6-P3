/** @jest-environment jsdom */
import path from 'path';
import { pathToFileURL } from 'url';

let mod;

beforeAll(async () => {
  const abs = path.resolve(process.cwd(), 'public', 'js', 'validation.js');
  mod = await import(pathToFileURL(abs).href + `?t=${Date.now()}`);
});

describe('validation.js', () => {
  test('validatePassword: accepts strong password', () => {
    expect(mod.validatePassword('GoodPass1!')).toBe(true);
  });

  test('validatePassword: rejects short', () => {
    expect(mod.validatePassword('Ab1!x')).toBe(false);
  });

  test('validatePassword: rejects missing digit', () => {
    expect(mod.validatePassword('NoNumber!!')).toBe(false);
  });

  test('validatePassword: rejects missing special', () => {
    expect(mod.validatePassword('NoSpecial1')).toBe(false);
  });

  test('validateEmail: accepts basic valid emails', () => {
    expect(mod.validateEmail('u@example.com')).toBe(true);
    expect(mod.validateEmail('first.last+tag@sub.domain.io')).toBe(true);
  });

  test('validateEmail: rejects invalid emails', () => {
    expect(mod.validateEmail('bad@domain')).toBe(false);
    expect(mod.validateEmail('bad@@x.com')).toBe(false);
  });

  test('sanitizeText: removes HTML and trims', () => {
    expect(mod.sanitizeText('  <b>Hello</b>  ')).toBe('Hello');
  });

  test('isNonEmpty: false for blank/whitespace', () => {
    expect(mod.isNonEmpty('   ')).toBe(false);
    expect(mod.isNonEmpty('x')).toBe(true);
  });
});
