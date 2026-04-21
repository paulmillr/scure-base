import { should } from '@paulmillr/jsbt/test.js';
import { deepStrictEqual as eql } from 'node:assert';

const withUtf8Globals = async (
  globals: { TextEncoder?: any; TextDecoder?: any },
  cb: () => Promise<void>
) => {
  const enc = Object.getOwnPropertyDescriptor(globalThis, 'TextEncoder');
  const dec = Object.getOwnPropertyDescriptor(globalThis, 'TextDecoder');
  Object.defineProperty(globalThis, 'TextEncoder', {
    value: globals.TextEncoder,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'TextDecoder', {
    value: globals.TextDecoder,
    writable: true,
    configurable: true,
  });
  try {
    await cb();
  } finally {
    if (enc) Object.defineProperty(globalThis, 'TextEncoder', enc);
    else delete (globalThis as any).TextEncoder;
    if (dec) Object.defineProperty(globalThis, 'TextDecoder', dec);
    else delete (globalThis as any).TextDecoder;
  }
};

should('utf8 env: import without TextEncoder/TextDecoder', async () => {
  await withUtf8Globals({ TextEncoder: undefined, TextDecoder: undefined }, async () => {
    const mod = await import(`../index.js?utf8-env=${Date.now()}`);
    eql(typeof mod.utf8, 'object');
  });
});

should('utf8 env: methods fall back without TextEncoder/TextDecoder', async () => {
  await withUtf8Globals({ TextEncoder: undefined, TextDecoder: undefined }, async () => {
    const mod = await import(`../index.js?utf8-env=${Date.now() + 1}`);
    eql(mod.utf8.encode(Uint8Array.of(0x61)), 'a');
    eql(mod.utf8.decode('a'), Uint8Array.of(0x61));
  });
});

should('utf8 env: encode falls back when TextDecoder is missing', async () => {
  await withUtf8Globals({ TextEncoder, TextDecoder: undefined }, async () => {
    const mod = await import(`../index.js?utf8-env=${Date.now() + 2}`);
    eql(mod.utf8.encode(Uint8Array.of(0x61)), 'a');
    eql(mod.utf8.decode('a'), Uint8Array.of(0x61));
  });
});

should('utf8 env: decode falls back when TextEncoder is missing', async () => {
  await withUtf8Globals({ TextEncoder: undefined, TextDecoder }, async () => {
    const mod = await import(`../index.js?utf8-env=${Date.now() + 3}`);
    eql(mod.utf8.encode(Uint8Array.of(0x61)), 'a');
    eql(mod.utf8.decode('a'), Uint8Array.of(0x61));
  });
});

should.runWhen(import.meta.url);
