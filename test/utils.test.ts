import * as random from '@paulmillr/jsbt/random.js';
import { describe, it } from '@paulmillr/jsbt/test.js';
import { deepStrictEqual, throws } from 'node:assert';
import { __TESTS, hex } from '../index.ts';
import { alphabetSlow, convertRadix, convertRadix2, join, paddingSlow } from './slow.ts';
import { getTypeTests } from './utils.ts';

function hexa() {
  const items = '0123456789abcdef';
  return random.integer({ min: 0, max: 15 }).map((n) => items[n]);
}
function hexaString(constraints = {}) {
  return random.string({ ...constraints, unit: hexa() });
}

// const concatBytes = utils.concatBytes;
const hexToBytes = hex.decode;
const bytesToHex = hex.encode;

describe('utils', () => {
  const staticHexVectors = [
    { bytes: Uint8Array.from([]), hex: '' },
    { bytes: Uint8Array.from([0xbe]), hex: 'be' },
    { bytes: Uint8Array.from([0xca, 0xfe]), hex: 'cafe' },
    { bytes: Uint8Array.from(new Array(1024).fill(0x69)), hex: '69'.repeat(1024) },
  ];
  it('hexToBytes', () => {
    for (let v of staticHexVectors) deepStrictEqual(hexToBytes(v.hex), v.bytes);
    for (let v of staticHexVectors) deepStrictEqual(hexToBytes(v.hex.toUpperCase()), v.bytes);
    for (let [v, repr] of getTypeTests()) {
      if (repr === '""') continue;
      throws(() => hexToBytes(v));
    }
  });
  it('bytesToHex', () => {
    for (let v of staticHexVectors) deepStrictEqual(bytesToHex(v.bytes), v.hex);
    for (let [v, repr] of getTypeTests()) {
      if (repr.startsWith('ui8a')) continue;
      throws(() => bytesToHex(v));
    }
  });
  it('hexToBytes <=> bytesToHex roundtrip', () =>
    random.assert(
      random.property(hexaString({ minLength: 2, maxLength: 64 }), (hex) => {
        if (hex.length % 2 !== 0) return;
        deepStrictEqual(hex, bytesToHex(hexToBytes(hex)));
        deepStrictEqual(hex, bytesToHex(hexToBytes(hex.toUpperCase())));
        if (typeof Buffer !== 'undefined')
          deepStrictEqual(hexToBytes(hex), Uint8Array.from(Buffer.from(hex, 'hex')));
      })
    ));
  it('validator constructors', () => {
    const { alphabet, radix58, radix2, checksum } = __TESTS;
    // Slow reference implementations (test/slow.ts)
    throws(() => alphabetSlow('abc').encode('x' as any), TypeError);
    throws(() => join(1 as any), TypeError);
    throws(() => join().encode([1] as any), TypeError);
    throws(() => join().decode(1 as any), TypeError);
    throws(() => paddingSlow('5' as any), TypeError);
    throws(() => paddingSlow(5, 1 as any), TypeError);
    throws(() => convertRadix([1], 1, 10), RangeError);
    throws(() => convertRadix([1], 10, 1), RangeError);
    throws(() => convertRadix2([1], 0, 8, false), RangeError);
    throws(() => convertRadix2([1], 8, 33, false), RangeError);
    // Fast links shipped in index.ts. No aArr guard here: bogus digits hit the
    // undefined-table-slot check, which throws plain Error.
    throws(() => alphabet('abc').encode('x' as any));
    throws(() => radix58.encode('x' as any), TypeError);
    throws(() => radix58.decode(['x'] as any), TypeError);
    throws(() => radix58.decode(Uint8Array.of(58)), /invalid integer/);
    throws(() => radix2(0), RangeError);
    throws(() => radix2(9), RangeError);
    throws(() => radix2(5).encode('x' as any), TypeError);
    throws(() => checksum(0, (data) => data), RangeError);
    throws(() => checksum(-1, (data) => data), RangeError);
    throws(() => checksum(1, 1 as any), TypeError);
    throws(() => checksum(1, (data) => data).encode('x' as any), TypeError);
    throws(() => checksum(1, (data) => data).decode('x' as any), TypeError);
  });
  // it('concatBytes', () => {
  //   const a = 1;
  //   const b = 2;
  //   const c = 0xff;
  //   const aa = Uint8Array.from([a]);
  //   const bb = Uint8Array.from([b]);
  //   const cc = Uint8Array.from([c]);
  //   deepStrictEqual(concatBytes(), Uint8Array.of());
  //   deepStrictEqual(concatBytes(aa, bb), Uint8Array.from([a, b]));
  //   deepStrictEqual(concatBytes(aa, bb, cc), Uint8Array.from([a, b, c]));
  //   for (let [v, repr] of getTypeTests()) {
  //     if (repr.startsWith('ui8a')) continue;
  //     throws(() => {
  //       concatBytes(v);
  //     });
  //     throws(() => {
  //       concatBytes(aa, v);
  //     });
  //   }
  // });
  // it('concatBytes random', () =>
  //   fc.assert(
  //     fc.property(fc.uint8Array(), fc.uint8Array(), fc.uint8Array(), (a, b, c) => {
  //       const expected = Uint8Array.from(Buffer.concat([a, b, c]));
  //       deepStrictEqual(concatBytes(a.slice(), b.slice(), c.slice()), expected);
  //     })
  //   )
  // );
});

// ESM is broken.
// import url from 'node:url';
// if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
//   should.run();
// }
it.runWhen(import.meta.url);
