import { assertEquals, assertThrows } from 'https://deno.land/std@0.146.0/testing/asserts.ts';
import { decode } from 'https://deno.land/std/encoding/hex.ts';
import BASE58_VECTORS from './vectors/base58.json' assert { type: 'json' };
import BASE58_XMR_VECTORS from './vectors/base58_xmr.json' assert { type: 'json' };
import { base58, base58xmr, utils } from '../mod.ts';

const hexToArray = (hex: string) => decode(new TextEncoder().encode(hex));

Deno.test('deno: base58: vectors', () => {
  for (let i = 0; i < BASE58_VECTORS.length; i++) {
    const { decodedHex, encoded } = BASE58_VECTORS[i];

    assertEquals(base58.encode(hexToArray(decodedHex)), encoded, `encode ${i}`);
  }
});

Deno.test('deno: base58: xmr vectors (valid)', () => {
  for (let i = 0; i < BASE58_XMR_VECTORS.validAddrs.length; i++) {
    const decAddr = BASE58_XMR_VECTORS.decodedAddrs[i];
    const validAddr = BASE58_XMR_VECTORS.validAddrs[i];

    assertEquals(base58xmr.encode(hexToArray(decAddr)), validAddr, `encode ${i}`);
    assertEquals(base58xmr.decode(validAddr), hexToArray(decAddr), `decode ${i}`);
  }
});

Deno.test('deno: utils: padding', () => {
  const coder = utils.padding(4, '=');

  assertEquals(coder.encode(['1']), ['1', '=']);

  // these check for invalids, so the inputs are meant to be type-unsafe
  assertThrows(() => coder.encode(['1', 1, true] as unknown as string[]));
  assertThrows(() => coder.decode(['1', 1, true, '='] as unknown as string[]));
});
